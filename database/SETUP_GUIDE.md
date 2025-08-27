# Database Setup Guide

## Overview
This invoice generator now supports multiple businesses with comprehensive features including payment tracking, purchase orders, email integration, and sequential numbering.

## Database Features
✅ **Multi-Business Support** - Switch between multiple businesses
✅ **Payment History** - Track partial payments and payment methods
✅ **Purchase Orders** - Create and convert POs to invoices
✅ **Email Tracking** - Log sent emails and track opens
✅ **Sequential Numbering** - Automatic invoice/PO numbering per business
✅ **Invoice Templates** - Save and reuse common invoice formats
✅ **User Permissions** - Role-based access control

## Setting Up Supabase

### 1. Create Your Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project (or use existing)
3. Note your project URL and anon key from Settings → API

### 2. Run the Database Schema
1. Go to SQL Editor in your Supabase dashboard
2. Copy the entire contents of `database/schema.sql`
3. Paste and run it in the SQL editor
4. This creates all tables, indexes, and functions

### 3. Configure Your App
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Update `.env` with your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=https://yourproject.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Set Up Row Level Security (RLS) Policies
For now, we'll use simple policies. Run this in SQL Editor:

```sql
-- Allow authenticated users to read their business data
CREATE POLICY "Users can view their businesses" ON businesses
  FOR SELECT USING (
    id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated users to manage their business invoices
CREATE POLICY "Users can manage business invoices" ON invoices
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid()
    )
  );

-- Similar policies for other tables...
```

## Database Structure

### Core Tables
- **businesses** - Your different businesses/companies
- **users** - User accounts
- **business_users** - Links users to businesses with roles
- **customers** - Customer/client information per business

### Invoice Management
- **invoices** - Main invoice records with status tracking
- **invoice_items** - Line items for each invoice
- **payments** - Payment history with amounts and methods
- **invoice_templates** - Reusable invoice templates

### Purchase Orders
- **purchase_orders** - PO records
- **po_items** - Line items for POs

### Communication
- **email_log** - Track sent emails, opens, and delivery

## Key Features Implemented

### 1. Sequential Invoice Numbering
Each business has its own sequence:
- Format: `INV-000001`, `INV-000002`, etc.
- Customizable prefix per business
- Automatic increment on creation

### 2. Payment Tracking
- Record partial payments
- Track payment methods (check, card, transfer, etc.)
- Automatic status updates (partially_paid, paid)
- Payment history with dates and references

### 3. Status Workflow
Invoices flow through statuses:
- `draft` → `sent` → `viewed` → `partially_paid`/`paid`
- Automatic `overdue` status based on due date

### 4. Multi-Business Support
- Switch between businesses from dashboard
- Each business has separate:
  - Customers
  - Invoice sequences
  - Settings (tax rate, payment terms, etc.)

### 5. Purchase Orders
- Create POs with line items
- Convert POs directly to invoices
- Track fulfillment status

## Next Steps

1. **Test the connection**: The app will now connect to Supabase instead of localStorage
2. **Create your first business**: Use the businessService.createBusiness() function
3. **Import existing data**: We can migrate your localStorage data to Supabase
4. **Set up authentication**: Add Supabase Auth for user management

## Migration from LocalStorage

To migrate your existing invoices from localStorage to Supabase:

```javascript
// Run this once after setting up Supabase
const migrateData = async () => {
  // Get data from localStorage
  const savedInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
  const customers = JSON.parse(localStorage.getItem('customers') || '[]');
  
  // Create a default business first
  const business = await businessService.createBusiness({
    name: 'Your Business Name',
    // ... other details
  });
  
  // Migrate customers
  for (const customer of customers) {
    await customerService.createCustomer({
      ...customer,
      business_id: business.id
    });
  }
  
  // Migrate invoices
  for (const invoice of savedInvoices) {
    await invoiceService.createInvoice({
      ...invoice,
      business_id: business.id
    }, invoice.items);
  }
};
```

## Support for Your Requirements

✅ **Payment History** - Full tracking in `payments` table
✅ **Purchase Orders** - Complete PO management with conversion to invoices
✅ **Email Integration** - Ready for SendGrid/other email service integration
✅ **Invoice Status Tracking** - Comprehensive status workflow with timestamps
✅ **Sequential Numbering** - Automatic per-business numbering
✅ **Multi-User** - User roles and permissions structure in place

## Questions?
The database is designed to scale with your business needs. All the features you requested are supported in the schema.