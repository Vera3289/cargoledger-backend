import crypto from 'crypto';

const MAX_BODY_BYTES = 256 * 1024; // 256 KiB
const TIMESTAMP_TOLERANCE_S = 300;

export interface WebhookVerifyInput {
  secret: string | undefined;
  deliveryId: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: Buffer | string;
  isDuplicateDelivery?: (deliveryId: string) => boolean;
}

export type VerifyResult =
  | { ok: true; deliveryId: string }
  | { ok: false; status: number; code: string; message: string };

export function signWebhookPayload(secret: string, timestamp: string, rawBody: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
}

export function verifyWebhookSignature(input: WebhookVerifyInput): VerifyResult {
  if (!input.secret) {
    return { ok: false, status: 500, code: 'WEBHOOK_SECRET_MISSING', message: 'Webhook secret is not configured' };
  }

  const bodyLen = Buffer.isBuffer(input.rawBody) ? input.rawBody.length : Buffer.byteLength(input.rawBody);
  if (bodyLen > MAX_BODY_BYTES) {
    return { ok: false, status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds 256 KiB limit' };
  }

  if (!input.deliveryId || !input.timestamp || !input.signature) {
    return { ok: false, status: 401, code: 'MISSING_HEADERS', message: 'Missing required webhook headers' };
  }

  const ts = parseInt(input.timestamp, 10);
  if (isNaN(ts)) {
    return { ok: false, status: 400, code: 'INVALID_TIMESTAMP', message: 'x-cargoledger-timestamp is not a valid number' };
  }

  const nowS = Math.floor(Date.now() / 1000);
  if (Math.abs(nowS - ts) > TIMESTAMP_TOLERANCE_S) {
    return { ok: false, status: 401, code: 'STALE_TIMESTAMP', message: 'Timestamp is outside the 300-second tolerance window' };
  }

  if (input.isDuplicateDelivery?.(input.deliveryId)) {
    return { ok: false, status: 409, code: 'DUPLICATE_DELIVERY', message: 'Delivery ID has already been processed' };
  }

  const body = Buffer.isBuffer(input.rawBody) ? input.rawBody.toString('utf8') : input.rawBody;
  const expected = signWebhookPayload(input.secret, input.timestamp, body);

  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(input.signature, 'hex');

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return { ok: false, status: 401, code: 'SIGNATURE_MISMATCH', message: 'Webhook signature verification failed' };
  }

  return { ok: true, deliveryId: input.deliveryId };
}
