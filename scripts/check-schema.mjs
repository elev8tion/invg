import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkExistingSchema() {
  console.log('Checking existing Supabase schema...\n');
  console.log('Project URL:', supabaseUrl);
  console.log('-----------------------------------\n');

  try {
    // Try to query common tables to see what exists
    const tablesToCheck = [
      'businesses', 
      'users', 
      'customers', 
      'invoices', 
      'invoice_items', 
      'payments', 
      'purchase_orders',
      'po_items',
      'email_log',
      'invoice_templates',
      'business_users'
    ];
    
    console.log('Checking for tables:\n');
    
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

    // Check if we can get more details about existing tables
    console.log('\n--- Checking existing table structures ---\n');
    
    // Check invoices structure
    const { data: invoicesSample, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1);
    
    if (!invoicesError && invoicesSample) {
      if (invoicesSample.length > 0) {
        console.log('Invoices table columns:', Object.keys(invoicesSample[0]));
      } else {
        const { data: invoiceSchema } = await supabase
          .from('invoices')
          .select()
          .limit(0);
        if (invoiceSchema) {
          console.log('Invoices table exists but is empty');
        }
      }
    }

    // Check customers structure
    const { data: customersSample, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    if (!customersError && customersSample) {
      if (customersSample.length > 0) {
        console.log('Customers table columns:', Object.keys(customersSample[0]));
      } else {
        console.log('Customers table exists but is empty');
      }
    }

  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkExistingSchema();