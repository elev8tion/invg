/** 4-digit account PIN helpers. */

export const PIN_RE = /^\d{4}$/;

export function normalizePin(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 4);
}

export function isValidPin(value) {
  return PIN_RE.test(normalizePin(value));
}
