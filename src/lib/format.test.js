import { formatDate, money, num } from './format';

describe('num', () => {
  test('coerces numeric strings', () => {
    expect(num('12.5')).toBe(12.5);
  });

  test('turns every non-number into 0 rather than NaN', () => {
    [null, undefined, '', 'abc', NaN, {}].forEach((value) => {
      expect(num(value)).toBe(0);
    });
  });
});

describe('money', () => {
  test('always shows two decimals and a thousands separator', () => {
    expect(money(1340.5)).toBe('$1,340.50');
    expect(money(2100)).toBe('$2,100.00');
    expect(money(0.5)).toBe('$0.50');
  });

  // The bug this replaced: `${x.toLocaleString()}` rendered 1340.5 as "$1,340.5"
  // on the purchase order and payment screens.
  test('does not drop a trailing zero', () => {
    expect(money(1340.5)).not.toBe('$1,340.5');
  });

  test('formats blanks as zero instead of $NaN', () => {
    expect(money(undefined)).toBe('$0.00');
    expect(money('')).toBe('$0.00');
  });
});

describe('formatDate', () => {
  // `new Date('2026-09-01')` is UTC midnight, which renders as 8/31 in any US
  // timezone. Every invoice date in this app is a plain YYYY-MM-DD string.
  test('reads a date-only string as a local date, not UTC midnight', () => {
    expect(formatDate('2026-09-01')).toBe('9/1/2026');
    expect(formatDate('2026-01-31')).toBe('1/31/2026');
    expect(formatDate('2026-12-31')).toBe('12/31/2026');
  });

  test('handles timestamps and Date objects', () => {
    expect(formatDate(new Date(2026, 8, 7))).toBe('9/7/2026');
    expect(formatDate('2026-09-07 14:30:00')).toBe('9/7/2026');
  });

  test('returns empty for blanks and echoes unparseable input', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate('not a date')).toBe('not a date');
  });
});
