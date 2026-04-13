import { signWebhookPayload, verifyWebhookSignature } from '../src/webhooks/signature';

const SECRET      = 'test-secret-key';
const DELIVERY_ID = 'delivery-abc123';
const RAW_BODY    = JSON.stringify({ event: 'shipment.created', shipmentId: 'shipment-1' });

function nowTimestamp() {
  return String(Math.floor(Date.now() / 1000));
}

describe('signWebhookPayload', () => {
  it('produces a hex string', () => {
    const sig = signWebhookPayload(SECRET, '1700000000', RAW_BODY);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const a = signWebhookPayload(SECRET, '1700000000', RAW_BODY);
    const b = signWebhookPayload(SECRET, '1700000000', RAW_BODY);
    expect(a).toBe(b);
  });
});

describe('verifyWebhookSignature', () => {
  function makeInput(overrides: Partial<Parameters<typeof verifyWebhookSignature>[0]> = {}) {
    const timestamp = nowTimestamp();
    const signature = signWebhookPayload(SECRET, timestamp, RAW_BODY);
    return { secret: SECRET, deliveryId: DELIVERY_ID, timestamp, signature, rawBody: RAW_BODY, ...overrides };
  }

  it('returns ok for a valid request', () => {
    expect(verifyWebhookSignature(makeInput()).ok).toBe(true);
  });

  it('fails when secret is missing', () => {
    const result = verifyWebhookSignature(makeInput({ secret: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });

  it('fails when signature is missing', () => {
    const result = verifyWebhookSignature(makeInput({ signature: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('fails on stale timestamp', () => {
    const staleTs = String(Math.floor(Date.now() / 1000) - 400);
    const sig = signWebhookPayload(SECRET, staleTs, RAW_BODY);
    const result = verifyWebhookSignature(makeInput({ timestamp: staleTs, signature: sig }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('STALE_TIMESTAMP');
  });

  it('fails on signature mismatch', () => {
    const result = verifyWebhookSignature(makeInput({ signature: 'a'.repeat(64) }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('SIGNATURE_MISMATCH');
  });

  it('fails on oversized payload', () => {
    const bigBody = 'x'.repeat(256 * 1024 + 1);
    const result = verifyWebhookSignature(makeInput({ rawBody: bigBody }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(413);
  });

  it('fails on duplicate delivery', () => {
    const seen = new Set([DELIVERY_ID]);
    const result = verifyWebhookSignature(makeInput({ isDuplicateDelivery: (id) => seen.has(id) }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('DUPLICATE_DELIVERY');
  });
});
