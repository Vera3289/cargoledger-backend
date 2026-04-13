import { IndexerState } from '../src/indexer/state';

describe('IndexerState', () => {
  let state: IndexerState;

  beforeEach(() => { state = new IndexerState(); });

  it('starts as not_configured', () => {
    const snap = state.snapshot();
    expect(snap.status).toBe('not_configured');
    expect(snap.lastLedger).toBeNull();
  });

  it('becomes healthy after ingestion', () => {
    state.ingest(1000, 'hash-a');
    const snap = state.snapshot();
    expect(snap.status).toBe('healthy');
    expect(snap.lastLedger).toBe(1000);
    expect(snap.lastSafeLedger).toBe(999);
    expect(snap.reorgDetected).toBe(false);
  });

  it('detects a reorg when hash changes for same ledger', () => {
    state.ingest(1001, 'hash-b');
    state.ingest(1001, 'hash-c'); // same ledger, different hash → reorg
    const snap = state.snapshot();
    expect(snap.reorgDetected).toBe(true);
    expect(snap.lastLedger).toBe(1000); // rolled back
  });

  it('advances lastSafeLedger with safety margin', () => {
    state.ingest(500, 'hash-x');
    state.ingest(501, 'hash-y');
    expect(state.snapshot().lastSafeLedger).toBe(500);
  });
});
