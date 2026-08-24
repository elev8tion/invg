/**
 * Verify every expected table exists and is reachable with the instance key.
 * Run after applying database/schema.ncb.sql:  node scripts/verify-schema.mjs
 */

import { TABLES, requireConfig, readAll, NCB_INSTANCE } from './ncb.mjs';

requireConfig();

console.log(`Verifying schema on instance: ${NCB_INSTANCE}\n`);

let failures = 0;

for (const table of TABLES) {
  try {
    const rows = await readAll(table, 1);
    console.log(`  OK    ${table.padEnd(20)} reachable (${rows.length} row sampled)`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL  ${table.padEnd(20)} ${error.message}`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`${failures}/${TABLES.length} tables unreachable.`);
  console.error('Apply database/schema.ncb.sql via the NCB MCP execute_sql tool using your USER TOKEN.');
  process.exit(1);
}
console.log(`All ${TABLES.length} tables present.`);
