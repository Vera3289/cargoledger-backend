import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const MAX_MESSAGE_BYTES = 4096;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 30;
const HEARTBEAT_INTERVAL_MS = 30_000;
const DEDUP_CACHE_MAX = 10_000;

interface ClientMeta {
  id: string;
  subscriptions: Set<string>;
  messageCount: number;
  windowStart: number;
  alive: boolean;
}

export interface ShipmentEvent {
  type: 'shipment_update';
  shipmentId: string;
  eventId: string;
  payload: Record<string, unknown>;
}

export class StreamHub {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientMeta>();
  private dedupCache = new Map<string, number>();
  private dedupOrder: string[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval>;
  private closed = false;

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/shipments' });
    this.wss.on('connection', (ws) => this.onConnect(ws));
    this.heartbeatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_INTERVAL_MS);
  }

  get connectionCount() {
    return this.clients.size;
  }

  broadcast(event: ShipmentEvent) {
    const key = `${event.shipmentId}:${event.eventId}`;
    if (this.dedupCache.has(key)) return;
    this.addToDedup(key);

    const msg = JSON.stringify(event);
    for (const [ws, meta] of this.clients) {
      if (ws.readyState === WebSocket.OPEN && meta.subscriptions.has(event.shipmentId)) {
        ws.send(msg);
      }
    }
  }

  close() {
    this.closed = true;
    clearInterval(this.heartbeatTimer);
    this.wss.removeAllListeners();
    for (const ws of this.clients.keys()) ws.terminate();
    this.clients.clear();
    this.wss.close();
  }

  private onConnect(ws: WebSocket) {
    const meta: ClientMeta = {
      id: uuidv4(),
      subscriptions: new Set(),
      messageCount: 0,
      windowStart: Date.now(),
      alive: true,
    };
    this.clients.set(ws, meta);
    console.log(JSON.stringify({ level: 'info', msg: 'ws:connect', connectionId: meta.id, total: this.clients.size }));

    ws.on('message', (data, isBinary) => this.onMessage(ws, meta, data, isBinary));
    ws.on('pong', () => { meta.alive = true; });
    ws.on('close', () => {
      this.clients.delete(ws);
      if (!this.closed) {
        console.log(JSON.stringify({ level: 'info', msg: 'ws:disconnect', connectionId: meta.id, total: this.clients.size }));
      }
    });
  }

  private onMessage(ws: WebSocket, meta: ClientMeta, data: unknown, isBinary: boolean) {
    if (isBinary) {
      this.sendError(ws, 'BINARY_NOT_SUPPORTED', 'Binary frames are not supported');
      return;
    }

    const raw = data?.toString() ?? '';
    if (Buffer.byteLength(raw) > MAX_MESSAGE_BYTES) {
      this.sendError(ws, 'PAYLOAD_TOO_LARGE', 'Message exceeds 4096 bytes');
      ws.close(1009);
      return;
    }

    const now = Date.now();
    if (now - meta.windowStart > RATE_LIMIT_WINDOW_MS) {
      meta.messageCount = 0;
      meta.windowStart = now;
    }
    meta.messageCount++;
    if (meta.messageCount > RATE_LIMIT_MAX) {
      this.sendError(ws, 'RATE_LIMIT_EXCEEDED', 'Too many messages');
      return;
    }

    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.sendError(ws, 'INVALID_JSON', 'Message is not valid JSON');
      return;
    }

    if (typeof msg !== 'object' || msg === null) {
      this.sendError(ws, 'INVALID_MESSAGE', 'Message must be a JSON object');
      return;
    }

    const { type, shipmentId } = msg as Record<string, unknown>;
    if (typeof shipmentId !== 'string' || !shipmentId) {
      this.sendError(ws, 'INVALID_MESSAGE', 'shipmentId must be a non-empty string');
      return;
    }

    if (type === 'subscribe') {
      meta.subscriptions.add(shipmentId);
    } else if (type === 'unsubscribe') {
      meta.subscriptions.delete(shipmentId);
    } else {
      this.sendError(ws, 'UNKNOWN_TYPE', `Unknown message type: ${String(type)}`);
    }
  }

  private sendError(ws: WebSocket, code: string, message: string) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', code, message }));
    }
  }

  private heartbeat() {
    for (const [ws, meta] of this.clients) {
      if (!meta.alive) { ws.terminate(); return; }
      meta.alive = false;
      ws.ping();
    }
  }

  private addToDedup(key: string) {
    if (this.dedupOrder.length >= DEDUP_CACHE_MAX) {
      const evicted = this.dedupOrder.shift()!;
      this.dedupCache.delete(evicted);
    }
    this.dedupCache.set(key, Date.now());
    this.dedupOrder.push(key);
  }
}
