# Migrate invg from Supabase → NoCodeBackend

## Decisions (confirmed with user)
- **API key placement**: server-side proxy (Express `server.js` locally, Netlify Function in prod). No key in the browser bundle.
- **Primary keys**: `INT AUTO_INCREMENT` (NCB/MariaDB native). DB starts empty, no data migration.
- **Joins**: client-side stitching inside the service layer. Component API surface unchanged.

## Constraints discovered
- NCB REST is **CRUD-only**: `create/read/read-one/search/update/delete`. No SQL, no schema endpoints, no joins.
- `POST /search/{table}` takes a **flat `{field: value}` equality body**. No `gte`/`lte`/`order`.
  → date-range filters and sorting happen client-side.
- NCB runs **MariaDB**, not Postgres: no `uuid_generate_v4()`, no `JSONB`, no `TIMESTAMP WITH TIME ZONE`.
- **Two-token model**: instance key = data CRUD (REST); user token = schema DDL (MCP only).
- Schema DDL requires the NCB MCP server (`npx -y -p @nocodebackend/mcp nocodebackend-mcp-node`), which is **not connected in this session**.

## Tasks
- [x] 1. `database/schema.ncb.sql` — MariaDB DDL for all 11 tables + indexes
- [x] 2. `src/lib/ncbClient.js` — low-level REST wrapper pointed at the proxy
- [x] 3. `src/lib/db.js` — all 6 service objects, identical signatures, client-side joins
- [x] 4. Repoint the 5 component imports; delete `src/lib/supabase.js`
- [x] 5. `server.js` — `/api/ncb/*` proxy, key read from `.env` server-side
- [x] 6. `netlify/functions/ncb.js` + `netlify.toml` redirect (prod parity)
- [x] 7. `package.json` — drop `@supabase/supabase-js`, add CRA dev `proxy`
- [x] 8. `.env.example` + `database/SETUP_GUIDE.md` rewritten for NCB
- [x] 9. `scripts/` — NCB versions of the check/seed scripts
- [x] 10. Verify: build compiles, proxy responds, no `supabase` references remain

## Blocked on user
- ~~Create the NCB instance in the dashboard~~ — **done via MCP `create_database`.**
  My earlier claim that this was dashboard-only was wrong: the tool exists.
  Live database is `36905_invg`, schema applied, seeded, round-trip verified.

## Review

### Done
All 10 tasks complete. The migration is code-complete and verified as far as it
can be without a live instance.

**Files added**
- `database/schema.ncb.sql` — 11 tables, MariaDB, INT AUTO_INCREMENT PKs, FKs + indexes
- `src/lib/ncbClient.js` — REST wrapper; numeric coercion; pagination
- `src/lib/db.js` — the 6 services, same signatures as before, client-side joins
- `netlify/functions/ncb.js` — production proxy
- `scripts/ncb.mjs`, `scripts/verify-schema.mjs`, `scripts/seed.mjs`

**Files changed**
- `server.js` — `/api/ncb/*` proxy with operation + table allowlists, `/api/health`
- `netlify.toml` — functions dir, `/api/ncb/*` redirect ahead of the SPA catch-all
- `package.json` — dropped `@supabase/supabase-js`; added dev `proxy`, `api`, `db:verify`, `db:seed`
- `.env.example`, `database/SETUP_GUIDE.md` — rewritten for NCB
- 5 components — import path only (`./lib/supabase` → `./lib/db`)

**Files removed**
- `src/lib/supabase.js`, 5 Supabase-only scripts, `scripts/reset-and-create-schema.sql`

### Verified
- `npx react-scripts build` succeeds; only the pre-existing lint warnings remain
- Built bundle contains zero `supabase` references; no `@supabase/supabase-js` imports anywhere
- `/api/health` → `{"ok":true,...}`; SPA catch-all still serves 200
- Proxy without credentials → 503 with an actionable message
- Both route shapes resolve (`read/customers` and `read/invoices/12`)
- Table allowlist rejects `secrets` → 400; operation allowlist rejects `execute_sql` → 400
- Path traversal (`../../etc`) rejected by the table allowlist → 400

### Not verified (blocked on a live instance)
Real CRUD round-trips, the exact shape of NCB's create response (`ncbClient.extractId`
handles the four known variants), and whether DECIMAL columns come back as strings
(handled defensively by `NUMERIC_COLUMNS` coercion either way).

### Deliberate behaviour changes
- **Payment totals are recomputed from payment rows**, not adjusted by delta. The old
  code did `paid_amount += amount`, which drifts permanently if any single write fails.
- **`markAsViewed` guards with an explicit read**, since NCB updates by id only.
- **Invoice creation rolls back manually** — NCB has no transactions, so a failed line
  item deletes the invoice and its already-written items rather than leaving a stub.

### Pre-existing issue found, not fixed
`App.js` reads `invoice.dbId` (was `invoice.supabaseId`) to decide whether to record a
payment, but nothing anywhere assigns that field — `savedInvoices` lives in local
component state and is never persisted to the database. That branch has never run.
Fixing it means deciding where invoices get persisted, which is a separate change.
Left as-is with a comment marking it.


---

## Follow-up: corrected course after user pushback (same session)

I claimed NCB had no `create_database` and no row-level security, based on a
stale local reference doc rather than the live tool list. Both were wrong. After
registering the MCP server and enumerating its 24 tools, the picture changed:

- `create_database` exists → I created `36905_invg` directly.
- `set_rls_policy` / `get_rls_policies` exist → NCB **does** have RLS.
- NCB also has auth (`ncba_*` tables, better-auth sessions), R2 storage, SMTP
  and monetization tooling.

### What that changed
- MCP server registered at user scope in `~/.claude.json` (not yet exposed to
  this session — needs a restart; drove it over stdio meanwhile).
- Database created with all 11 app tables + NCB auth tables. NCB auto-inferred
  the foreign keys and added `id` / `user_id` to every table.
- `users` → **`app_users`** everywhere (collides with NCB's `ncba_user`).
- Proxy now authenticates with `NCB_SECRET_KEY` (from `create_database`).
- `created_by` left NULL — NCB made it a VARCHAR FK to `ncba_user`.

### Which data API
The modern `app.nocodebackend.com/api/data` route needs end-user sessions and
returned 404 for anonymous access. The legacy `api.nocodebackend.com` REST API
works with the secret key and returns exactly the shape `ncbClient.js` expects,
so the app stays on it. Adopting NCB auth later is a separate product decision.

### Bug found and fixed by live testing
`readOne()` used `GET /read/{table}/{id}`, which serves **stale data after a
write** (4/5 trials). Every write path reads the row straight back, so this
would have surfaced as "updates silently don't work" — which is exactly how it
first presented. `readOne()` now uses `search({id})`, which was fresh 5/5.

Also confirmed live: DECIMAL columns return as **strings**, so the
`NUMERIC_COLUMNS` coercion in `ncbClient.js` was load-bearing, not defensive.

### Verified against the live database
- `npm run db:verify` — all 11 tables reachable
- `npm run db:seed` — created admin user, business, owner link, customer
- 20-check round-trip through the real proxy: invoice numbering + counter bump,
  invoice + line-item creation, customer/items/payments stitching, numeric
  coercion, partial payment → `partially_paid`, full payment → `paid`, payment
  deletion → self-healing resync, unique `invoice_number` rejection, and
  cascade deletes. **All 20 passed.**
- `npx react-scripts build` still compiles.
- Test data cleaned up; database is back to clean seed state.


---

## Follow-up: custom payment terms (same session)

Request: allow a custom number in Default Payment Terms, and have the invoice
reflect whether it is following the business default or overriding it.

### Shared component
`src/components/PaymentTermsField.js` — presets + a `Net N days` custom entry,
used in BOTH places rather than duplicating the logic:
- `BusinessModal` — sets the business-wide default
- `App.js` invoice form — sets terms for one invoice, and passes `defaultTerms`
  so it can label the default option and show follow/override state

Exports `PAYMENT_TERM_PRESETS`, `daysFromTerms`, `termsOptions`,
`isCustomValue`, `validateTerms`.

Stored format stays `Net 75`, identical to the presets, so nothing downstream
needs to know a value was custom.

### Two bugs found and fixed while building this
1. **"Business Settings" was a stub** (`console.log('Navigate to business
   settings')`), so the business edit form was only reachable via "Add New
   Business" — the feature was literally unreachable on an existing business.
   Wired `handleEditBusiness` in App.js through to `BusinessSwitcher`.
2. **A new invoice hardcoded `terms: 'Net 30'`**, ignoring the business default.
   Now seeded from `currentBusiness.default_payment_terms` via an effect, since
   the business loads after the form mounts. A `termsTouched` flag stops the
   default from overwriting a choice the user already made.

### A bug in my own component, caught by browser testing
Selecting "Custom..." snapped straight back to a preset. The sync effect
re-derived custom-mode from `value` on every change, including changes the
component itself had just emitted — so seeding the custom field with a value
that matched a preset immediately flipped custom mode off. Fixed with a
`selfEmitted` ref: only *external* value changes re-derive.

### Verified in the browser (live NCB data)
- Business default set to a NON-preset `Net 75`; invoice dropdown offered
  "Net 75 (business default)" — confirms non-preset defaults fold into the list
- New invoice started at Net 75 and the rendered preview read "Terms: Net 75"
- Following the default shows "Using the business default."
- Choosing Net 15 shows "Overrides the business default (Net 75)." in amber
- Custom -> 120 shows 'Saved as "Net 120"' + the override note
- Business modal: custom 75 saved, persisted to NCB, and reopened as Custom/75
- Business default restored to `Net 30`; DB back to clean seed state

### Pre-existing bug found, NOT fixed (out of scope, reported)
The customer list is empty in the UI even though `Acme Corp` is in the database
and the query returns it. `InvoiceGenerator` seeds `localCustomers` from the
`customers` prop with `useState(customers || [])`, which only reads the prop at
mount — it never re-syncs when the prop arrives. There is also a competing
localStorage load. Needs a decision about which source wins.


---

## Follow-up: customer list fix (same session)

### Root cause
Customers had **five independent sources**, four of them `localStorage`:

| Location | Source |
|---|---|
| `App` top-level `customers` | localStorage on mount, DB only on business *switch* |
| `InvoiceGenerator.localCustomers` | prop at mount (never re-synced) + localStorage |
| `CustomerManagement` | localStorage only, ids from `Date.now()` |
| `CustomerPage` | localStorage only, ids from `Date.now()` |
| `Dashboard` | localStorage only |

So customers created in the UI never reached the database, and the customer
already in the database never reached the UI. `useState(customers || [])` in
InvoiceGenerator only read the prop at mount, so even the one DB fetch that did
run never made it to the list.

### Fix
New `src/hooks/useCustomers.js` — one database-backed hook owning load + create
+ update + soft-delete for a business, used by `CustomerManagement`,
`CustomerPage`, and `App`. `Dashboard` and `InvoiceGenerator` now take the list
as a prop. **All customer localStorage reads/writes are gone** (verified by grep).

Writes go to the database first, then reload — so the list can't drift from it.

### Also fixed
`loading` and `error` are now surfaced in both empty states, so "empty" is never
again ambiguous between *loading*, *failed*, and *genuinely none* — which is the
exact ambiguity that hid this bug.

### Caught during the change
Removing CustomerPage's localStorage effects also removed the effect that called
`calculateStats(customers)`, leaving the function defined but never invoked —
stats would have silently read zero. Spotted via an unused-var warning and
restored as a `[customers]` effect.

### Verified in the browser against live NCB
- "Quick Invoice for" dropdown now lists **Acme Corp** from the database
- Customer Management shows Acme Corp with email/city from the DB, "1 Customers"
  (confirms the restored stats effect)
- Added **Globex Industries** through the UI -> landed in NCB with a real
  auto-increment id (3) and `business_id=1`, not a `Date.now()` id
- Soft delete set `is_active=0`; the row survived and dropped out of the active
  list, as intended
- Test row removed; database back to clean seed state (1 customer)
