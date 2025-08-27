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

async function initializeData() {
  console.log('Initializing user and businesses...\n');

  try {
    // Create a test user first
    const testUser = {
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin',
      is_active: true
    };

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();

    if (newUser) {
      console.log('✓ Created user:', newUser.email);
      const userId = newUser.id;

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

          // Create test customers for each business
          const testCustomers = [
            {
              business_id: newBusiness.id,
              name: business === testBusinesses[0] ? 'John Smith' : 'Alice Brown',
              company: business === testBusinesses[0] ? 'ABC Corporation' : 'Design Partners',
              address: business === testBusinesses[0] ? '789 Business Blvd' : '999 Creative Way',
              city: business === testBusinesses[0] ? 'Los Angeles' : 'Brooklyn',
              state: business === testBusinesses[0] ? 'CA' : 'NY',
              zip: business === testBusinesses[0] ? '90001' : '11201',
              email: business === testBusinesses[0] ? 'john@abccorp.com' : 'alice@designpartners.com',
              phone: business === testBusinesses[0] ? '(310) 555-1234' : '(718) 555-9876',
              payment_terms: 'Net 30',
              created_by: userId
            },
            {
              business_id: newBusiness.id,
              name: business === testBusinesses[0] ? 'Sarah Johnson' : 'Bob Wilson',
              company: business === testBusinesses[0] ? 'XYZ Industries' : 'Creative Co',
              address: business === testBusinesses[0] ? '321 Industry Way' : '555 Art Lane',
              city: business === testBusinesses[0] ? 'Chicago' : 'Manhattan',
              state: business === testBusinesses[0] ? 'IL' : 'NY',
              zip: business === testBusinesses[0] ? '60601' : '10001',
              email: business === testBusinesses[0] ? 'sarah@xyzind.com' : 'bob@creativeco.com',
              phone: business === testBusinesses[0] ? '(312) 555-5678' : '(212) 555-4321',
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
              console.log(`  ✓ Created customer: ${newCustomer.name} (${newCustomer.company})`);
            } else {
              console.log(`  ✗ Error creating customer:`, custError?.message);
            }
          }
        } else {
          console.log(`✗ Error creating business:`, createError?.message);
        }
      }
    } else if (userError?.code === '23505') {
      console.log('User already exists. Running business setup...');
      
      // Get existing user
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'admin@example.com')
        .single();
      
      if (existingUser) {
        console.log('Using existing user:', existingUser.email);
        // Run the setup-test-data script instead
        const { execSync } = await import('child_process');
        execSync('node scripts/setup-test-data.mjs', { stdio: 'inherit' });
      }
    } else {
      console.log('Error creating user:', userError?.message);
    }

  } catch (error) {
    console.error('Error initializing data:', error);
  }

  console.log('\n--- Initialization complete ---');
}

initializeData();