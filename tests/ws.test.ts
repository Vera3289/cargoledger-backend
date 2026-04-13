import http from 'http';
import WebSocket from 'ws';
import { createServer } from '../src/index';

let server: http.Server;
let hub: ReturnType<typeof createServer>['hub'];
let port: number;

beforeAll((done) => {
  ({ server, hub } = createServer());
  server.listen(0, () => {
    port = (server.address() as { port: number }).port;
    done();
  });
});

afterAll((done) => {
  hub.close();
  server.close(done);
});

function connect(): Promise<WebSocket> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws/shipments`);
    ws.on('open', () => resolve(ws));
  });
}

function nextMessage(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve) => ws.once('message', (data) => resolve(JSON.parse(data.toString()))));
}

describe('WebSocket hub', () => {
  it('accepts connections', async () => {
    const ws = await connect();
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('delivers broadcast to subscribed client', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'subscribe', shipmentId: 'shipment-1' }));
    await new Promise((r) => setTimeout(r, 50));

    const msgPromise = nextMessage(ws);
    hub.broadcast({ type: 'shipment_update', shipmentId: 'shipment-1', eventId: 'evt-1', payload: { status: 'in_transit' } });
    const msg = await msgPromise;
    expect(msg).toMatchObject({ type: 'shipment_update', shipmentId: 'shipment-1', eventId: 'evt-1' });
    ws.close();
  });

  it('deduplicates events with same shipmentId+eventId', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'subscribe', shipmentId: 'shipment-dedup' }));
    await new Promise((r) => setTimeout(r, 50));

    const received: unknown[] = [];
    ws.on('message', (d) => received.push(JSON.parse(d.toString())));

    hub.broadcast({ type: 'shipment_update', shipmentId: 'shipment-dedup', eventId: 'evt-dup', payload: {} });
    hub.broadcast({ type: 'shipment_update', shipmentId: 'shipment-dedup', eventId: 'evt-dup', payload: {} });
    await new Promise((r) => setTimeout(r, 50));

    expect(received).toHaveLength(1);
    ws.close();
  });

  it('rejects oversized messages with PAYLOAD_TOO_LARGE', async () => {
    const ws = await connect();
    const msgPromise = nextMessage(ws);
    ws.send('x'.repeat(4097));
    const msg = await msgPromise as { code: string };
    expect(msg.code).toBe('PAYLOAD_TOO_LARGE');
    ws.close();
  });

  it('rejects binary frames', async () => {
    const ws = await connect();
    const msgPromise = nextMessage(ws);
    ws.send(Buffer.from([0x01, 0x02]));
    const msg = await msgPromise as { code: string };
    expect(msg.code).toBe('BINARY_NOT_SUPPORTED');
    ws.close();
  });

  it('rejects invalid JSON', async () => {
    const ws = await connect();
    const msgPromise = nextMessage(ws);
    ws.send('not json');
    const msg = await msgPromise as { code: string };
    expect(msg.code).toBe('INVALID_JSON');
    ws.close();
  });

  it('does not deliver to unsubscribed client', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'subscribe', shipmentId: 'shipment-unsub' }));
    await new Promise((r) => setTimeout(r, 30));
    ws.send(JSON.stringify({ type: 'unsubscribe', shipmentId: 'shipment-unsub' }));
    await new Promise((r) => setTimeout(r, 30));

    const received: unknown[] = [];
    ws.on('message', (d) => received.push(d));
    hub.broadcast({ type: 'shipment_update', shipmentId: 'shipment-unsub', eventId: 'evt-x', payload: {} });
    await new Promise((r) => setTimeout(r, 50));

    expect(received).toHaveLength(0);
    ws.close();
  });
});
