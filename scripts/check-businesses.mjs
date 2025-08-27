import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBusinesses() {
  console.log('Checking businesses and relationships...\n');

  try {
    // Check businesses
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('*');
    
    console.log('Businesses:', businesses?.length || 0);
    if (businesses && businesses.length > 0) {
      businesses.forEach(biz => {
        console.log(`\n- ${biz.name}`);
        console.log(`  Email: ${biz.email}`);
        console.log(`  Invoice Prefix: ${biz.invoice_prefix}`);
        console.log(`  Next Invoice: ${biz.invoice_prefix}-${String(biz.next_invoice_number).padStart(6, '0')}`);
      });
    }

    // Check business_users relationships
    const { data: relationships, error: relError } = await supabase
      .from('business_users')
      .select('*');
    
    console.log('\n\nBusiness-User Relationships:', relationships?.length || 0);
    
    // Check customers
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('*');
    
    console.log('\nCustomers:', customers?.length || 0);
    if (customers && customers.length > 0) {
      customers.forEach(cust => {
        console.log(`- ${cust.name} (${cust.company || 'No company'})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkBusinesses();