const DECIMAL_RE = /^\d+(\.\d+)?$/;
const MAX_SAFE_DECIMAL = 1e15;

export type DecimalResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateDecimal(value: unknown, field: string): DecimalResult {
  if (value === null || value === undefined || value === '') {
    return { ok: false, code: 'DECIMAL_EMPTY_VALUE', message: `${field} must not be empty` };
  }
  if (typeof value !== 'string') {
    return { ok: false, code: 'DECIMAL_INVALID_TYPE', message: `${field} must be a decimal string, not a ${typeof value}` };
  }
  if (!DECIMAL_RE.test(value)) {
    return { ok: false, code: 'DECIMAL_INVALID_FORMAT', message: `${field} must match decimal notation (e.g. "1000.0000000")` };
  }
  if (parseFloat(value) > MAX_SAFE_DECIMAL) {
    return { ok: false, code: 'DECIMAL_OUT_OF_RANGE', message: `${field} exceeds maximum supported precision` };
  }
  return { ok: true };
}
