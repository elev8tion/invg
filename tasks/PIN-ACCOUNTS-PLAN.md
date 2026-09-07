# PIN accounts plan (no breaking changes)

Status: **implemented**. Confirmed: PIN-only lock, in-app People admin, admin start PIN `1234`, admin can change PIN.

This is app-level isolation on the existing `app_users` + `business_users` + `business_id` model. It does **not** turn on NCB `ncba_*` auth.

---

## Questions (answer only if you want to change a default)

1. Login is **PIN only** (no name/email on the lock screen). PINs must be unique. OK?
2. You create people **in-app** (admin-only People panel: name + PIN). OK?
3. Admin start PIN: **1234**. Admin uses the same Change PIN flow as everyone else.

---

## What exists today (live `36905_invg`)

| Table | Rows |
|---|---|
| `app_users` | id=1, `admin@example.com`, Admin User, role=admin |
| `businesses` | id=1, My Company |
| `business_users` | user 1 owns business 1 |

Live `app_users` columns: `id`, `email` (UNIQUE NOT NULL), `full_name`, `role`, `is_active`, NCB `user_id`, timestamps. **No pin column.**

There is **no login UI**. `BusinessSwitcher` calls `getAllBusinesses()`, so anyone using the app sees every business.

Data is already scoped by `business_id` in customers / invoices / POs / payments. `businessService.getUserBusinesses(userId)` already exists and is unused.

`userService` is create / getByEmail / update only.

`BusinessModal` on create tries to insert an `app_users` row with **wrong fields** (`name`, `business_id`) and never writes `business_users`. That path is broken and unused in the happy path because seed already created admin.

NCB proxy (`server.js` + `netlify/functions/ncb.js`) allowlists full CRUD on `app_users`. There is no row-level security. Isolation will be **enforced in the UI/services**, same trust model as today (anyone with the running app can still hit the proxy). Out of scope to add real server sessions unless you ask later.

`email` stays required by the live schema. PIN-only people will get a unique placeholder email (`pin-XXXX@invg.local`) so we do not drop NOT NULL / UNIQUE.

---

## Goal

- You create an account (name + unique 4-digit PIN) for each person you allow.
- They unlock the app with that PIN.
- They can change their PIN.
- After login they see **only their** businesses and everything under those businesses.
- No shared data with anyone else.
- Existing admin + My Company keep working.

---

## Defaults (used unless you change them)

- Unlock: 4 digits only. No user list on the lock screen.
- Session: `localStorage` key `invg.session` `{ userId }` so refresh stays logged in. Logout clears it and current business.
- Admin (`role === 'admin'`) can add/deactivate people and reset a PIN.
- New people get **no** business until they create one (or you create one while logged in as them). They never see My Company.
- Existing My Company stays linked only to admin.
- PIN stored as `CHAR(4)` on `app_users.pin_code`, UNIQUE. Simple, searchable via NCB `{ pin_code }`. Not hashed (4-digit space is tiny anyway; hashing would not help through this proxy).
- Inactive users (`is_active = 0`) cannot log in.

---

## Non-breaking rules

- Additive DB column only. No table renames. No drops.
- Do not change invoice / customer / payment / PO service signatures.
- Keep `userService.createUser` / `getUserByEmail` / `updateUser`.
- Keep `getAllBusinesses` but **stop calling it from the switcher**.
- Do not enable NCB auth / RLS in this pass.
- Do not rewrite localStorage invoice leftovers except to key them by user so User A cannot see User B’s browser drafts.

---

## DB change (MCP `execute_sql` on `36905_invg`)

```sql
ALTER TABLE app_users
  ADD COLUMN pin_code CHAR(4) NULL;

CREATE UNIQUE INDEX uq_app_users_pin ON app_users (pin_code);
```

Then set admin PIN (value from you) and keep email/name/role.

Reference copy: add the same column on `users` in `database/schema.ncb.sql` plus a comment that live table is `app_users`.

No new tables. `business_users` is the isolation join.

---

## Files to change

### Database / scripts
- Live MariaDB via NCB MCP (above)
- `database/schema.ncb.sql` — document `pin_code`
- `scripts/seed.mjs` — include `pin_code` on admin so re-seed stays idempotent
- `scripts/ncb.mjs` — no table list change

### Data layer
- `src/lib/db.js` `userService` add:
  - `getUserByPin(pin)` → search `{ pin_code, is_active: 1 }`, return row or null
  - `changePin(userId, currentPin, nextPin)` — verify current, reject non-`/^\d{4}$/`, reject taken PIN, update
  - `listUsers()` — admin only in UI; service just lists `app_users`
  - `createPinUser({ full_name, pin_code, role })` — validate PIN, unique check, placeholder email, `is_active: 1`
- `src/lib/db.js` `businessService`:
  - add `linkUser(businessId, userId, role = 'owner')` writing `business_users`
  - leave `getUserBusinesses` as-is
- `src/lib/ncbClient.js` — no numeric coerce for `pin_code` (string)

### Frontend
- **New** `src/PinLock.js` — 4-digit pad, submit → `getUserByPin`, on success set session
- **New** `src/ChangePin.js` — current + new + confirm
- **New** `src/PeopleAdmin.js` — admin only: list, add name+PIN, deactivate, reset PIN
- `src/App.js`
  - restore session on mount
  - if no session, render `PinLock` only (do not load businesses)
  - hold `currentUser`
  - pass `userId` into `BusinessSwitcher` / `BusinessModal`
  - logout control in the header
  - admin entry to People
  - logged-in user entry to Change PIN
  - key `savedInvoices` as `savedInvoices:${userId}` (migrate old unkeyed key only for admin so current drafts are not lost)
- `src/BusinessSwitcher.js` — `getUserBusinesses(userId)` instead of `getAllBusinesses`. Comment already says “in production, filter by user”.
- `src/BusinessModal.js` — remove the broken auto-`createUser`. On **create**, `linkUser(created.id, currentUser.id, 'owner')`. Needs `currentUserId` prop.
- `src/CustomerPage.js` / `src/Dashboard.js` — if they still read global `savedInvoices`, use the user-keyed key (same helper).

### Not changing
- Proxy allowlists (already include `app_users` / `business_users`)
- Invoice/customer/PO CRUD
- NCB `ncba_user` / RLS
- `getAllBusinesses` implementation (unused by UI after this)

---

## Isolation (how “no shared data” actually works)

```
PIN → app_users row
    → business_users (that user_id only)
    → businesses
    → customers / invoices / POs filtered by business_id
```

A person you create starts with **zero** `business_users` rows, so they see the existing empty state (“Create Your First Business”). That new business is linked to **them**, not to admin.

Admin keeps My Company. Admin does not see other people’s businesses unless you later link them (we will not).

Known limit: the browser can still call `/api/ncb/search/...` on any allowlisted table. This pass does not close that. It stops the **app** from showing or writing across users.

---

## UX

1. Open app → PIN pad.
2. Correct PIN → dashboard as that user, their businesses only.
3. Wrong PIN / inactive → generic “PIN not recognized”.
4. Header: name, Change PIN, Logout. Admin also: People.
5. People: add (full name + PIN), deactivate, reset PIN. No self-signup.

---

## Execute order (when you say begin)

1. Confirm admin PIN from you.
2. `execute_sql` add `pin_code` + unique index. Verify with `get_schema`.
3. Set admin `pin_code`. Confirm My Company still linked.
4. Extend `userService` / `linkUser` in `db.js`.
5. Update seed.
6. PinLock + session gate in `App.js`.
7. Switcher + BusinessModal isolation.
8. Change PIN + People admin.
9. User-key localStorage drafts.
10. Manual check: admin PIN → My Company visible; a second test user PIN → empty, create business, admin cannot see it after logout/login as admin.
11. `vnodes_get_impact_graph` before each kept edit, `vnodes_save_observation` after, `vnodes index` at the end.

---

## Out of scope

- Email/password, magic links, NCB auth components
- Server-side session / hiding `app_users` from the proxy
- Sharing one business across two PIN users
- Hashing PINs
- Public signup
