/**
 * Shared NoCodeBackend REST helper for the setup/maintenance scripts.
 *
 * Scripts run on your machine, not in the browser, so they talk to NCB
 * directly with the instance key from .env -- no proxy in between.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

export const NCB_BASE = process.env.NCB_BASE_URL || 'https://api.nocodebackend.com';
export const NCB_INSTANCE = process.env.NCB_INSTANCE;
export const NCB_API_KEY = process.env.NCB_SECRET_KEY || process.env.NCB_API_KEY;

export const TABLES = [
  'businesses',
  'app_users',
  'business_users',
  'customers',
  'invoices',
  'invoice_items',
  'payments',
  'purchase_orders',
  'po_items',
  'email_log',
  'invoice_templates',
];

export function requireConfig() {
  if (!NCB_INSTANCE || !NCB_API_KEY) {
    console.error('Missing NCB_INSTANCE or NCB_SECRET_KEY.');
    console.error('Copy .env.example to .env and fill them in from the NCB dashboard.');
    process.exit(1);
  }
}

export async function ncbRequest(method, path, body) {
  const url = `${NCB_BASE}/${path}${path.includes('?') ? '&' : '?'}Instance=${NCB_INSTANCE}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${NCB_API_KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    const detail = payload?.message || payload?.raw || res.statusText;
    throw new Error(`${method} ${path} -> ${res.status}: ${detail}`);
  }
  return payload;
}

export const create = (table, record) => ncbRequest('POST', `create/${table}`, record);
export const readAll = (table, limit = 100) =>
  ncbRequest('GET', `read/${table}?limit=${limit}`).then((r) => r?.data ?? []);
export const readOne = (table, id) => ncbRequest('GET', `read/${table}/${id}`).then((r) => r?.data);
export const search = (table, filters) =>
  ncbRequest('POST', `search/${table}`, filters).then((r) => r?.data ?? []);
export const update = (table, id, record) => ncbRequest('PUT', `update/${table}/${id}`, record);
export const remove = (table, id) => ncbRequest('DELETE', `delete/${table}/${id}`);

/** NCB reports the new row id inconsistently across endpoints. */
export const newId = (payload) =>
  payload?.id ?? payload?.data?.id ?? payload?.insertId ?? payload?.data?.insertId ?? null;
