/**
 * Low-level NoCodeBackend REST client.
 *
 * This never talks to api.nocodebackend.com directly -- it calls our own
 * same-origin proxy (`server.js` locally, a Netlify Function in production),
 * which attaches the instance API key server-side. The key must never reach
 * the browser bundle: NCB has no row-level security, so a leaked instance key
 * is full CRUD on every table.
 *
 * NCB exposes CRUD only. There is no SQL, no schema management, no joins, and
 * `search` accepts flat equality filters only ({field: value}). Anything richer
 * -- date ranges, sorting, relations -- happens client-side in `db.js`.
 */

const PROXY_BASE = process.env.REACT_APP_NCB_PROXY_BASE || '/api/ncb';

// NCB returns MariaDB DECIMAL columns as JSON strings. Any column used in
// arithmetic must be coerced or `+=` silently concatenates strings.
const NUMERIC_COLUMNS = {
  businesses: ['id', 'next_invoice_number', 'next_po_number', 'default_tax_rate'],
  app_users: ['id'],
  business_users: ['id', 'business_id', 'user_id'],
  customers: ['id', 'business_id', 'credit_limit', 'created_by'],
  invoices: [
    'id', 'business_id', 'customer_id', 'subtotal', 'tax_rate', 'tax_amount',
    'discount_rate', 'discount_amount', 'total_amount', 'paid_amount',
    'balance_due', 'created_by',
  ],
  invoice_items: ['id', 'invoice_id', 'quantity', 'rate', 'amount', 'tax_rate', 'tax_amount', 'sort_order'],
  payments: ['id', 'invoice_id', 'amount', 'created_by'],
  purchase_orders: ['id', 'business_id', 'customer_id', 'subtotal', 'tax_amount', 'total_amount', 'invoice_id', 'created_by'],
  po_items: ['id', 'po_id', 'quantity', 'rate', 'amount', 'sort_order'],
  email_log: ['id', 'invoice_id', 'open_count', 'sent_by'],
  invoice_templates: ['id', 'business_id', 'tax_rate', 'discount_rate', 'created_by'],
};

function coerce(table, row) {
  if (!row || typeof row !== 'object') return row;
  const numeric = NUMERIC_COLUMNS[table];
  if (!numeric) return row;
  const out = { ...row };
  for (const col of numeric) {
    if (out[col] !== null && out[col] !== undefined && out[col] !== '') {
      const n = Number(out[col]);
      if (!Number.isNaN(n)) out[col] = n;
    }
  }
  return out;
}

function coerceMany(table, rows) {
  return Array.isArray(rows) ? rows.map((r) => coerce(table, r)) : [];
}

export class NcbError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'NcbError';
    this.status = status;
    this.body = body;
  }
}

async function request(method, path, { body, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const res = await fetch(`${PROXY_BASE}/${path}${qs}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!res.ok) {
    const detail = payload?.message || payload?.error || payload?.raw || res.statusText;
    throw new NcbError(`NCB ${method} ${path} failed: ${detail}`, res.status, payload);
  }
  if (payload && payload.status === 'failed') {
    throw new NcbError(`NCB ${method} ${path} failed: ${payload.message || 'unknown error'}`, res.status, payload);
  }
  return payload;
}

/** NCB reports the new row's id inconsistently across endpoints. */
function extractId(payload) {
  if (!payload) return null;
  return payload.id ?? payload.data?.id ?? payload.insertId ?? payload.data?.insertId ?? null;
}

export const ncb = {
  /** Create a row. Returns the raw NCB response -- use `createAndFetch` for the full row. */
  async create(table, record) {
    return request('POST', `create/${table}`, { body: record });
  },

  /**
   * Create a row and read it back, so callers get the same complete object
   * Supabase's `.insert().select().single()` used to return.
   */
  async createAndFetch(table, record) {
    const created = await this.create(table, record);
    const id = extractId(created);
    if (id === null) return coerce(table, created?.data ?? record);
    return this.readOne(table, id);
  },

  /**
   * Read a single row by id.
   *
   * Deliberately uses `search` rather than `GET /read/{table}/{id}`.
   * NCB serves the single-row read from a cache that lags writes: measured
   * over 5 write-then-read trials, `read/{table}/{id}` returned stale data
   * 4 times while `search({id})` was correct every time. Since every write
   * path here reads the row straight back, the cached endpoint is unusable.
   */
  async readOne(table, id) {
    const rows = await this.search(table, { id });
    return rows[0] || null;
  },

  async readPage(table, { limit = 100, page = 1 } = {}) {
    const payload = await request('GET', `read/${table}`, { query: { limit, page } });
    return { rows: coerceMany(table, payload?.data), metadata: payload?.metadata };
  },

  /** Flat equality filters only -- `{business_id: 3, status: 'sent'}`. */
  async search(table, filters) {
    const payload = await request('POST', `search/${table}`, { body: filters });
    return coerceMany(table, payload?.data);
  },

  async update(table, id, record) {
    await request('PUT', `update/${table}/${id}`, { body: record });
    return this.readOne(table, id);
  },

  async remove(table, id) {
    return request('DELETE', `delete/${table}/${id}`);
  },

  /**
   * Read every row of a table, following NCB's pagination.
   * Used where a client-side join needs the full set (NCB has no `IN` filter).
   */
  async readAll(table, { pageSize = 200, maxPages = 50 } = {}) {
    const all = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const { rows, metadata } = await this.readPage(table, { limit: pageSize, page });
      all.push(...rows);
      if (!metadata?.hasMore || rows.length === 0) break;
    }
    return all;
  },
};

export default ncb;
