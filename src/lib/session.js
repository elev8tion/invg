const SESSION_KEY = 'invg.session';

export function invoicesKey(userId) {
  return `savedInvoices:${userId}`;
}

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.userId ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(user) {
  if (!user?.id) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function publicUser(row) {
  if (!row) return null;
  const { pin_code: _pin, ...rest } = row;
  return rest;
}

export function loadInvoices(userId) {
  if (!userId) return [];
  try {
    const keyed = localStorage.getItem(invoicesKey(userId));
    if (keyed) return JSON.parse(keyed);
    if (Number(userId) === 1) {
      const legacy = localStorage.getItem('savedInvoices');
      if (legacy) {
        localStorage.setItem(invoicesKey(userId), legacy);
        return JSON.parse(legacy);
      }
    }
  } catch {
    return [];
  }
  return [];
}

export function saveInvoices(userId, invoices) {
  if (!userId) return;
  localStorage.setItem(invoicesKey(userId), JSON.stringify(invoices));
}
