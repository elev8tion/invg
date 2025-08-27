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

async function setupTestData() {
  console.log('Setting up test data...\n');

  try {
    // Check existing user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*');
    
    if (users && users.length > 0) {
      console.log('Existing user found:', users[0]);
      const userId = users[0].id;

      // Check if businesses exist
      const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('*');
      
      if (!businesses || businesses.length === 0) {
        console.log('\nNo businesses found. Creating test businesses...\n');

        // Create two test businesses
        const testBusinesses = [
          {
            name: 'Tech Solutions Inc',
            address: '123 Tech Street',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            country: 'USA',
            email: 'info@techsolutions.com',
            phone: '(415) 555-0100',
            website: 'www.techsolutions.com',
            tax_number: 'EIN-12-3456789',
            invoice_prefix: 'TSI',
            next_invoice_number: 1,
            po_prefix: 'PO-TSI',
            next_po_number: 1,
            default_payment_terms: 'Net 30',
            default_tax_rate: 8.5,
            currency: 'USD'
          },
          {
            name: 'Creative Studio LLC',
            address: '456 Design Ave',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'USA',
            email: 'hello@creativestudio.com',
            phone: '(212) 555-0200',
            website: 'www.creativestudio.com',
            tax_number: 'EIN-98-7654321',
            invoice_prefix: 'CS',
            next_invoice_number: 1,
            po_prefix: 'PO-CS',
            next_po_number: 1,
            default_payment_terms: 'Net 15',
            default_tax_rate: 8.875,
            currency: 'USD'
          }
        ];

        for (const business of testBusinesses) {
          const { data: newBusiness, error: createError } = await supabase
            .from('businesses')
            .insert(business)
            .select()
            .single();
          
          if (newBusiness) {
            console.log(`✓ Created business: ${newBusiness.name}`);
            
            // Link user to business
            const { data: link, error: linkError } = await supabase
              .from('business_users')
              .insert({
                business_id: newBusiness.id,
                user_id: userId,
                role: 'owner',
                is_default: testBusinesses.indexOf(business) === 0
              })
              .select();
            
            if (link) {
              console.log(`  ✓ Linked user to ${newBusiness.name} as owner`);
            } else {
              console.log(`  ✗ Error linking user:`, linkError?.message);
            }
          } else {
            console.log(`✗ Error creating business:`, createError?.message);
          }
        }

        // Create some test customers for the first business
        const { data: firstBusiness } = await supabase
          .from('businesses')
          .select('*')
          .limit(1)
          .single();

        if (firstBusiness) {
          console.log('\nCreating test customers...\n');
          
          const testCustomers = [
            {
              business_id: firstBusiness.id,
              name: 'John Smith',
              company: 'ABC Corporation',
              address: '789 Business Blvd',
              city: 'Los Angeles',
              state: 'CA',
              zip: '90001',
              email: 'john@abccorp.com',
              phone: '(310) 555-1234',
              payment_terms: 'Net 30',
              created_by: userId
            },
            {
              business_id: firstBusiness.id,
              name: 'Sarah Johnson',
              company: 'XYZ Industries',
              address: '321 Industry Way',
              city: 'Chicago',
              state: 'IL',
              zip: '60601',
              email: 'sarah@xyzind.com',
              phone: '(312) 555-5678',
              payment_terms: 'Net 45',
              created_by: userId
            }
          ];

          for (const customer of testCustomers) {
            const { data: newCustomer, error: custError } = await supabase
              .from('customers')
              .insert(customer)
              .select()
              .single();
            
            if (newCustomer) {
              console.log(`✓ Created customer: ${newCustomer.name} (${newCustomer.company})`);
            } else {
              console.log(`✗ Error creating customer:`, custError?.message);
            }
          }
        }

      } else if (businesses && businesses.length > 0) {
        console.log('\nBusinesses already exist:');
        businesses.forEach(biz => {
          console.log(`- ${biz.name} (${biz.invoice_prefix})`);
        });
      }

    } else {
      console.log('No users found. Please create a user first.');
    }

  } catch (error) {
    console.error('Error setting up test data:', error);
  }

  console.log('\n--- Setup complete ---');
}

setupTestData();