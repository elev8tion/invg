/**
 * Seed an admin user, a business, and a sample customer so the app has
 * something to load on first run.  node scripts/seed.mjs
 *
 * Idempotent: re-running reuses existing rows instead of duplicating them.
 */

import { requireConfig, search, create, newId, readOne, NCB_INSTANCE } from './ncb.mjs';

requireConfig();

console.log(`Seeding instance: ${NCB_INSTANCE}\n`);

async function findOrCreate(table, matchFilters, record, label) {
  const existing = await search(table, matchFilters);
  if (existing.length > 0) {
    console.log(`  reused   ${label} (id ${existing[0].id})`);
    return existing[0];
  }
  const created = await create(table, record);
  const id = newId(created);
  const row = id ? await readOne(table, id) : null;
  console.log(`  created  ${label} (id ${id})`);
  return row ?? { ...record, id };
}

const user = await findOrCreate(
  'app_users',
  { email: 'admin@example.com' },
  { email: 'admin@example.com', full_name: 'Admin User', role: 'admin', is_active: 1, pin_code: '1234' },
  'user admin@example.com'
);

const business = await findOrCreate(
  'businesses',
  { name: 'My Company' },
  {
    name: 'My Company',
    email: 'billing@mycompany.com',
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    invoice_prefix: 'INV',
    next_invoice_number: 1,
    po_prefix: 'PO',
    next_po_number: 1,
    default_payment_terms: 'Net 30',
    default_tax_rate: 0,
    currency: 'USD',
    is_active: 1,
  },
  'business "My Company"'
);

await findOrCreate(
  'business_users',
  { business_id: business.id, user_id: user.id },
  { business_id: business.id, user_id: user.id, role: 'owner', is_default: 1 },
  'business_users link (owner)'
);

await findOrCreate(
  'customers',
  { business_id: business.id, name: 'Acme Corp' },
  {
    business_id: business.id,
    name: 'Acme Corp',
    company: 'Acme Corporation',
    email: 'ap@acme.example',
    city: 'San Diego',
    state: 'CA',
    country: 'USA',
    payment_terms: 'Net 30',
    is_active: 1,
  },
  'customer "Acme Corp"'
);

console.log('\nSeed complete.');
