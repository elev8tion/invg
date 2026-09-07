/**
 * Display formatting, in one place.
 *
 * The codebase had grown five different ways to print the same dollar amount --
 * `toFixed(2)` (no thousands separator), bare `toLocaleString()` (which drops
 * the trailing zero, so $1,340.50 printed as $1,340.5), an ad-hoc
 * `toLocaleString('en-US', { minimumFractionDigits: 2 })`, and a private
 * `formatCurrency` inside emailService. The same invoice could show three
 * different amounts depending on which screen you were looking at.
 *
 * Everything that renders money or a date goes through here now.
 */

/** Coerce anything to a finite number; `null`, `''`, `undefined` and NaN all become 0. */
export const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/** `1340.5` -> `"$1,340.50"`. Always two decimals, always a thousands separator. */
export const money = (value) => currencyFormatter.format(num(value));

/**
 * Format a date for display.
 *
 * `new Date('2026-09-01')` parses as UTC midnight, which renders as the
 * *previous* day everywhere west of Greenwich -- every date in this app is a
 * plain `YYYY-MM-DD` string, so that bug hit every invoice. Date-only strings
 * are therefore split by hand and rebuilt as a local date; full timestamps and
 * anything else fall through to the normal Date parser.
 */
export const formatDate = (value) => {
  if (!value) return '';

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US');
};
