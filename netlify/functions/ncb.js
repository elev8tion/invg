/**
 * Netlify Function mirroring the `/api/ncb/*` proxy in server.js.
 *
 * Production parity: the browser calls the same same-origin path in both
 * environments, and the NCB instance key never leaves the server.
 * Set NCB_INSTANCE and NCB_API_KEY in Netlify -> Site settings -> Environment
 * variables (NOT prefixed with REACT_APP_, or CRA would inline them).
 */

const NCB_BASE = process.env.NCB_BASE_URL || 'https://api.nocodebackend.com';
const NCB_INSTANCE = process.env.NCB_INSTANCE;
const NCB_API_KEY = process.env.NCB_SECRET_KEY || process.env.NCB_API_KEY;

const ALLOWED_OPERATIONS = new Set(['create', 'read', 'search', 'update', 'delete']);

const ALLOWED_TABLES = new Set([
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
]);

const fail = (statusCode, message) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'failed', message }),
});

exports.handler = async (event) => {
  if (!NCB_INSTANCE || !NCB_API_KEY) {
    return fail(503, 'NCB_INSTANCE and NCB_SECRET_KEY are not set in the Netlify environment.');
  }

  // "/.netlify/functions/ncb/update/invoices/12" -> ["update", "invoices", "12"]
  const segments = event.path
    .replace(/^\/\.netlify\/functions\/ncb\/?/, '')
    .replace(/^\/api\/ncb\/?/, '')
    .split('/')
    .filter(Boolean);

  const [operation, table, id] = segments;

  if (!ALLOWED_OPERATIONS.has(operation)) return fail(400, `Unsupported operation: ${operation}`);
  if (!ALLOWED_TABLES.has(table)) return fail(400, `Unknown table: ${table}`);

  const query = new URLSearchParams({
    ...(event.queryStringParameters || {}),
    Instance: NCB_INSTANCE,
  });
  const target = `${NCB_BASE}/${operation}/${table}${id ? `/${id}` : ''}?${query}`;

  const hasBody = event.httpMethod !== 'GET' && Boolean(event.body);

  try {
    const upstream = await fetch(target, {
      method: event.httpMethod,
      headers: {
        Authorization: `Bearer ${NCB_API_KEY}`,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? event.body : undefined,
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    if (upstream.ok && table === 'app_users' && operation === 'read' && contentType.includes('json')) {
      try {
        const parsed = JSON.parse(text);
        const stripPin = (u) => {
          if (u && typeof u === 'object') {
            const { pin_code: _, ...rest } = u;
            return rest;
          }
          return u;
        };
        if (Array.isArray(parsed?.data)) {
          parsed.data = parsed.data.map(stripPin);
        } else if (parsed?.data) {
          parsed.data = stripPin(parsed.data);
        }
        return {
          statusCode: upstream.status,
          headers: { 'Content-Type': contentType },
          body: JSON.stringify(parsed),
        };
      } catch {
        // Fallback to raw text if parsing fails
      }
    }

    return {
      statusCode: upstream.status,
      headers: { 'Content-Type': contentType },
      body: text,
    };
  } catch (error) {
    console.error(`[ncb-proxy] ${event.httpMethod} ${operation}/${table} failed:`, error.message);
    return fail(502, `Upstream NCB request failed: ${error.message}`);
  }
};
