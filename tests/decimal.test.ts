import { validateDecimal } from '../src/decimal/validate';

describe('validateDecimal', () => {
  it('accepts valid decimal strings', () => {
    expect(validateDecimal('5000.0000000', 'amount').ok).toBe(true);
    expect(validateDecimal('0.0025000', 'amount').ok).toBe(true);
    expect(validateDecimal('0', 'amount').ok).toBe(true);
  });

  it('rejects numbers', () => {
    const r = validateDecimal(5000, 'amount');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('DECIMAL_INVALID_TYPE');
  });

  it('rejects empty string', () => {
    const r = validateDecimal('', 'amount');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('DECIMAL_EMPTY_VALUE');
  });

  it('rejects null', () => {
    const r = validateDecimal(null, 'amount');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('DECIMAL_EMPTY_VALUE');
  });

  it('rejects scientific notation strings', () => {
    const r = validateDecimal('1e10', 'amount');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('DECIMAL_INVALID_FORMAT');
  });

  it('rejects out-of-range values', () => {
    const r = validateDecimal('9999999999999999', 'amount');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('DECIMAL_OUT_OF_RANGE');
  });
});
