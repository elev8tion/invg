const path = require('path');
const express = require('express');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// NoCodeBackend proxy
// =====================================================
// The instance API key stays here, server-side. NCB has no row-level
// security, so a key in the browser bundle would be full CRUD on every
// table for anyone who opened devtools.

const NCB_BASE = process.env.NCB_BASE_URL || 'https://api.nocodebackend.com';
const NCB_INSTANCE = process.env.NCB_INSTANCE;
const NCB_API_KEY = process.env.NCB_SECRET_KEY || process.env.NCB_API_KEY;

// Only these NCB operations are reachable through the proxy.
const ALLOWED_OPERATIONS = new Set(['create', 'read', 'search', 'update', 'delete']);

// Only these tables. Keeps the proxy from becoming a generic gateway to
// anything that later lands in the instance.
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

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ncbConfigured: Boolean(NCB_INSTANCE && NCB_API_KEY),
    instance: NCB_INSTANCE || null,
  });
});

// Express 5 (path-to-regexp v8) dropped the `:id?` optional-parameter syntax,
// so the two shapes are registered separately.
async function ncbProxy(req, res) {
  const { operation, table, id } = req.params;

  if (!NCB_INSTANCE || !NCB_API_KEY) {
    return res.status(503).json({
      status: 'failed',
      message: 'NCB_INSTANCE and NCB_SECRET_KEY are not set. Copy .env.example to .env and fill them in.',
    });
  }
  if (!ALLOWED_OPERATIONS.has(operation)) {
    return res.status(400).json({ status: 'failed', message: `Unsupported operation: ${operation}` });
  }
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ status: 'failed', message: `Unknown table: ${table}` });
  }

  const query = new URLSearchParams({ ...req.query, Instance: NCB_INSTANCE });
  const target = `${NCB_BASE}/${operation}/${table}${id ? `/${id}` : ''}?${query}`;

  const hasBody = req.method !== 'GET' && req.body && Object.keys(req.body).length > 0;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${NCB_API_KEY}`,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.type(contentType);

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
        return res.json(parsed);
      } catch {
        return res.send(text);
      }
    }

    return res.send(text);
  } catch (error) {
    console.error(`[ncb-proxy] ${req.method} ${operation}/${table} failed:`, error.message);
    return res.status(502).json({ status: 'failed', message: `Upstream NCB request failed: ${error.message}` });
  }
}

app.all('/api/ncb/:operation/:table', ncbProxy);
app.all('/api/ncb/:operation/:table/:id', ncbProxy);

// =====================================================
// Static React app
// =====================================================

const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

// Catch-all for SPA routing.
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving files from: ${buildPath}`);
  console.log(
    NCB_INSTANCE && NCB_API_KEY
      ? `NCB proxy active for instance: ${NCB_INSTANCE}`
      : 'NCB proxy INACTIVE - set NCB_INSTANCE and NCB_SECRET_KEY in .env'
  );
});
