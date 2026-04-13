export type IndexerStatus = 'healthy' | 'starting' | 'stalled' | 'not_configured';

export interface IndexerSnapshot {
  status: IndexerStatus;
  lastLedger: number | null;
  lastSafeLedger: number | null;
  lagMs: number | null;
  reorgDetected: boolean;
  updatedAt: string | null;
}

const STALL_THRESHOLD_MS = parseInt(process.env.INDEXER_STALL_THRESHOLD_MS ?? '60000', 10);
const SAFETY_MARGIN = parseInt(process.env.INDEXER_SAFETY_MARGIN_LEDGERS ?? '1', 10);

export class IndexerState {
  private lastLedger: number | null = null;
  private lastLedgerHash: string | null = null;
  private lastSafeLedger: number | null = null;
  private updatedAt: Date | null = null;
  private reorgDetected = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    this.timer = setInterval(() => { /* heartbeat placeholder — real impl connects to Horizon */ }, 30_000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  ingest(ledger: number, ledgerHash: string) {
    if (this.lastLedger !== null && ledger <= this.lastLedger && ledgerHash !== this.lastLedgerHash) {
      console.warn(JSON.stringify({
        level: 'warn',
        msg: 'Chain reorg detected',
        existingHash: this.lastLedgerHash,
        incomingHash: ledgerHash,
        ledger,
      }));
      this.reorgDetected = true;
      this.rollback(ledger - 1);
      return;
    }
    this.lastLedger = ledger;
    this.lastLedgerHash = ledgerHash;
    this.lastSafeLedger = Math.max(0, ledger - SAFETY_MARGIN);
    this.updatedAt = new Date();
    this.reorgDetected = false;
  }

  private rollback(toLedger: number) {
    this.lastLedger = toLedger;
    this.lastSafeLedger = Math.max(0, toLedger - SAFETY_MARGIN);
    this.updatedAt = new Date();
  }

  snapshot(): IndexerSnapshot {
    if (this.lastLedger === null) {
      return { status: 'not_configured', lastLedger: null, lastSafeLedger: null, lagMs: null, reorgDetected: false, updatedAt: null };
    }

    const lagMs = this.updatedAt ? Date.now() - this.updatedAt.getTime() : null;
    let status: IndexerStatus = 'healthy';
    if (lagMs === null) status = 'starting';
    else if (lagMs > STALL_THRESHOLD_MS) status = 'stalled';

    return {
      status,
      lastLedger: this.lastLedger,
      lastSafeLedger: this.lastSafeLedger,
      lagMs,
      reorgDetected: this.reorgDetected,
      updatedAt: this.updatedAt?.toISOString() ?? null,
    };
  }
}

export const indexerState = new IndexerState();
