import { supabase } from '../src/lib/supabase.js';

async function checkExistingSchema() {
  console.log('Checking existing Supabase schema...\n');

  try {
    // Check for existing tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('Checking tables using RPC...');
      // Try alternative method using RPC
      const { data: rpcTables, error: rpcError } = await supabase.rpc('get_tables');
      
      if (rpcError) {
        console.error('Error fetching tables:', rpcError);
        
        // Let's try to query known tables directly
        console.log('\nTrying to detect tables by querying...\n');
        
        const tablesToCheck = [
          'businesses', 'users', 'customers', 'invoices', 
          'invoice_items', 'payments', 'purchase_orders'
        ];
        
        for (const table of tablesToCheck) {
          try {
            const { count, error } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true });
            
            if (!error) {
              console.log(`✓ Table '${table}' exists (${count || 0} rows)`);
            } else if (error.code === '42P01') {
              console.log(`✗ Table '${table}' does not exist`);
            } else {
              console.log(`? Table '${table}': ${error.message}`);
            }
          } catch (e) {
            console.log(`? Table '${table}': ${e.message}`);
          }
        }
      } else {
        console.log('Tables found:', rpcTables);
      }
    } else {
      console.log('Existing tables in public schema:');
      if (tables && tables.length > 0) {
        tables.forEach(table => {
          console.log(`  - ${table.table_name}`);
        });
      } else {
        console.log('  No tables found in public schema');
      }
    }

    // Try to check a specific table structure
    console.log('\n--- Checking for invoices table structure ---');
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1);

    if (!invoiceError) {
      console.log('Invoices table exists with columns:');
      if (invoiceData && invoiceData.length > 0) {
        console.log(Object.keys(invoiceData[0]));
      } else {
        console.log('Table exists but is empty');
      }
    } else {
      console.log('Invoices table error:', invoiceError.message);
    }

    // Check for customers table
    console.log('\n--- Checking for customers table structure ---');
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);

    if (!customerError) {
      console.log('Customers table exists with columns:');
      if (customerData && customerData.length > 0) {
        console.log(Object.keys(customerData[0]));
      } else {
        console.log('Table exists but is empty');
      }
    } else {
      console.log('Customers table error:', customerError.message);
    }

  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkExistingSchema();