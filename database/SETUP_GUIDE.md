# Database Setup — NoCodeBackend

This app runs on a **NoCodeBackend (NCB)** instance backed by **MariaDB**.
It used to run on Supabase/Postgres; `schema.sql` is kept only as the historical
Postgres reference. **`schema.ncb.sql` is the live schema.**

---

## Already done

The live database **`36905_invg`** is created, schema applied, and seeded. If you
just want to run the app, skip to step 4.

## 1. Create the database (already done)

Created with the NCB **MCP** `create_database` tool — not the dashboard, and not
by running SQL. The MCP server is registered globally:

```bash
claude mcp add nocodebackend -s user -- npx -y -p @nocodebackend/mcp nocodebackend-mcp-node
```

The bare `npx -y @nocodebackend/mcp` form is broken (the bin was renamed); the
`-p ... nocodebackend-mcp-node` form above is the working invocation.

`create_database` takes `{name, tables[], enableAuth}` and does more than create
tables: it **infers foreign keys** from `<table>_id` column names, adds an
`INT AUTO_INCREMENT` `id` to every table, adds a `user_id` VARCHAR column wired
to its RLS system, and provisions the `ncba_*` auth tables.

Two consequences worth knowing:

- The app's user table is **`app_users`**, not `users` — `users` would collide
  with NCB's own `ncba_user`.
- `created_by` came out as a VARCHAR FK to `ncba_user.id`, so it means "NCB auth
  user", not an `app_users` row. The app leaves it NULL.

`created_at` / `updated_at` columns, unique keys and extra indexes were added
afterwards with the MCP `execute_sql` tool.

## 2. Credentials

`create_database` auto-generates one secret key, which is all the app needs:

| Value | Where | Used by |
|---|---|---|
| `NCB_SECRET_KEY` | returned by `create_database`; regenerate in the dashboard | the server-side proxy |
| `NCB_INSTANCE` | `36905_invg` | the server-side proxy |

Schema changes go through the MCP server (`execute_sql`, `get_schema`), which
authenticates separately with your account token — the app never needs it.

## 3. Fill in `.env`

```bash
cp .env.example .env
```

Then set `NCB_INSTANCE` and `NCB_SECRET_KEY`.

Note there is **no `REACT_APP_` prefix** on these. That is deliberate: CRA
inlines any `REACT_APP_*` variable into the JavaScript bundle, and NCB has no
row-level security — a leaked instance key is unrestricted read/write/delete on
every table. The key is used only by the server-side proxy.

## 4. Verify and seed

```bash
npm run db:verify   # confirms all 11 tables are reachable with the instance key
npm run db:seed     # creates an admin user, a business, and a sample customer
```

`db:seed` is idempotent — re-running it reuses existing rows.

## 5. Run the app

The React dev server proxies `/api/*` to the Express API, which holds the key.
Two terminals:

```bash
npm run api     # Express + NCB proxy on :3001
npm start       # React dev server on :3000
```

Production (single process serving the build and the proxy):

```bash
npm run build
npm run serve
```

On Netlify, the proxy is `netlify/functions/ncb.js`, wired up by the
`/api/ncb/*` redirect in `netlify.toml`. Set `NCB_INSTANCE` and `NCB_API_KEY` in
Site settings → Environment variables.

---

## Schema

11 tables. Primary keys are `INT AUTO_INCREMENT` (MariaDB has no
`uuid_generate_v4()`), and foreign keys carry the same `ON DELETE CASCADE`
behaviour the Postgres schema had.

| Table | Purpose |
|---|---|
| `businesses` | Multi-business support; holds invoice/PO numbering counters |
| `app_users` | App users (named to avoid colliding with NCB's `ncba_user`) |
| `business_users` | Which users can access which businesses |
| `customers` | Per-business customer book (soft-deleted via `is_active`) |
| `invoices` | Invoice headers, totals, status |
| `invoice_items` | Invoice line items |
| `payments` | Payments against invoices |
| `purchase_orders` | POs, convertible to invoices |
| `po_items` | PO line items |
| `email_log` | Sent-invoice tracking |
| `invoice_templates` | Reusable invoice presets (`template_items` is `JSON`) |

---

## What NCB cannot do, and how the app compensates

The REST API exposes **CRUD only** — no SQL, no schema endpoints, no joins.
`src/lib/db.js` absorbs all of it, so components see the same service API they
did under Supabase.

| Supabase feature | NCB reality | Where it's handled |
|---|---|---|
| Nested `select('*, customer:customers(*)')` | No joins | Client-side stitching in `db.js` |
| `.gte()` / `.lte()` date filters | `search` is equality-only (`{field: value}`) | Filtered in memory after fetch |
| `.order()` | Not supported | Sorted in memory |
| Transactions | None | Invoice + items writes roll back manually on failure |
| Bulk insert | None | Line items inserted one at a time |
| Row-level security | Exists (`set_rls_policy`), but needs end-user sessions | Server-side proxy with a table allowlist |

Two behaviours were deliberately changed rather than ported literally:

- **Payment totals are recomputed, not adjusted by delta.** The Supabase version
  applied `+= amount` / `-= amount` to the stored `paid_amount`, which drifts
  permanently if any single write fails. `_resyncInvoiceTotals()` sums the actual
  payment rows instead, so it is self-healing.
- **`markAsViewed` guards with a read.** Supabase enforced "only if currently
  sent" with a second `.eq()` in the update. NCB updates by id only, so the
  guard is an explicit read-then-check.

## Concurrency note

`getNextInvoiceNumber()` is a read-modify-write on `businesses.next_invoice_number`,
so two simultaneous invoice creations can read the same counter. The
`uq_invoice_number (business_id, invoice_number)` unique key turns that into a
visible insert error rather than two invoices silently sharing a number. For a
single-operator workflow this is fine; a multi-user deployment should move
numbering into a server-side endpoint that serialises the bump.


---

## NCB quirks found by testing against the live database

Both of these were found by round-tripping real data, not by reading docs.

### `GET /read/{table}/{id}` serves stale data after a write

Measured over 5 write-then-immediately-read trials:

| Endpoint | Stale |
|---|---|
| `GET /read/{table}/{id}` | **4 / 5** |
| `POST /search/{table}` with `{id}` | 0 / 5 |

The write itself always succeeds — `PUT /update/...` returns
`{"status":"success"}` and the change *is* persisted. Only the single-row read
endpoint lags, and it catches up within a few seconds.

This looked exactly like "updates are silently failing", and it will look that
way to you too if you hit it. It is not. `src/lib/ncbClient.js` therefore
implements `readOne()` with `search({id})`, never `read/{table}/{id}`. Every
write path in `db.js` reads the row straight back, so the cached endpoint is
unusable here. **Do not "optimise" `readOne` back to `read/{table}/{id}`.**

### DECIMAL columns come back as strings

`total_amount` reads back as `"1082.50"`, not `1082.50`. Unhandled, every
`+=` on a money column silently concatenates strings. `ncbClient.js` coerces
the columns listed in `NUMERIC_COLUMNS` on the way out — add to that list when
you add a numeric column.

### Bulk endpoints exist

The Swagger spec exposes `/bulk/create`, `/bulk/update` and `/bulk/delete`
(max 500 records). `db.js` currently writes line items one at a time. Switching
to bulk would cut invoice-save round-trips; the proxy allowlist would need a
`bulk` entry, since its path shape is `/bulk/{operation}/{table}`.
