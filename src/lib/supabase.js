import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper functions for common operations

// Business operations
export const businessService = {
  // Get all businesses for current user
  async getUserBusinesses(userId) {
    const { data, error } = await supabase
      .from('business_users')
      .select(`
        business:businesses(*)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data.map(item => item.business);
  },

  // Get all businesses (for now, returns all - in production, filter by user permissions)
  async getAllBusinesses() {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  // Get single business
  async getBusiness(businessId) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new business
  async createBusiness(business) {
    const { data, error } = await supabase
      .from('businesses')
      .insert(business)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update business
  async updateBusiness(businessId, updates) {
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', businessId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get next invoice number
  async getNextInvoiceNumber(businessId) {
    const { data, error } = await supabase
      .from('businesses')
      .select('invoice_prefix, next_invoice_number')
      .eq('id', businessId)
      .single();
    
    if (error) throw error;
    
    const invoiceNumber = `${data.invoice_prefix}-${String(data.next_invoice_number).padStart(6, '0')}`;
    
    // Increment the counter
    await supabase
      .from('businesses')
      .update({ next_invoice_number: data.next_invoice_number + 1 })
      .eq('id', businessId);
    
    return invoiceNumber;
  }
};

// Customer operations
export const customerService = {
  // Get all customers for a business
  async getCustomers(businessId) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  // Create customer
  async createCustomer(customer) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update customer
  async updateCustomer(customerId, updates) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete customer (soft delete)
  async deleteCustomer(customerId) {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: false })
      .eq('id', customerId);
    
    if (error) throw error;
  }
};

// Invoice operations
export const invoiceService = {
  // Get all invoices for a business
  async getInvoices(businessId, filters = {}) {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(name, company, email),
        payments(*)
      `)
      .eq('business_id', businessId);
    
    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters.startDate) {
      query = query.gte('invoice_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('invoice_date', filters.endDate);
    }
    
    const { data, error } = await query.order('invoice_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get single invoice with items
  async getInvoice(invoiceId) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        items:invoice_items(*),
        payments(*)
      `)
      .eq('id', invoiceId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create invoice with items
  async createInvoice(invoice, items) {
    // Start a transaction
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single();
    
    if (invoiceError) throw invoiceError;
    
    // Add invoice_id to each item
    const itemsWithInvoiceId = items.map(item => ({
      ...item,
      invoice_id: invoiceData.id
    }));
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithInvoiceId);
    
    if (itemsError) throw itemsError;
    
    return invoiceData;
  },

  // Update invoice
  async updateInvoice(invoiceId, updates, items = null) {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoiceId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update items if provided
    if (items) {
      // Delete existing items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);
      
      // Insert new items
      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoice_id: invoiceId
      }));
      
      await supabase
        .from('invoice_items')
        .insert(itemsWithInvoiceId);
    }
    
    return data;
  },

  // Send invoice (update status and log email)
  async sendInvoice(invoiceId, recipientEmail) {
    // Update invoice status
    await supabase
      .from('invoices')
      .update({ 
        status: 'sent',
        sent_date: new Date().toISOString()
      })
      .eq('id', invoiceId);
    
    // Log email
    const { data, error } = await supabase
      .from('email_log')
      .insert({
        invoice_id: invoiceId,
        recipient_email: recipientEmail,
        subject: 'Invoice from Your Company',
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Mark invoice as viewed
  async markAsViewed(invoiceId) {
    const { error } = await supabase
      .from('invoices')
      .update({ 
        status: 'viewed',
        viewed_date: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .eq('status', 'sent'); // Only update if currently sent
    
    if (error) throw error;
  }
};

// Payment operations
export const paymentService = {
  // Get all payments for a business
  async getBusinessPayments(businessId, filters = {}) {
    let query = supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          invoice_number,
          total_amount,
          due_date,
          customer:customers(name, company, email)
        )
      `)
      .eq('invoice.business_id', businessId);
    
    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.startDate) {
      query = query.gte('payment_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('payment_date', filters.endDate);
    }
    
    const { data, error } = await query.order('payment_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get payment statistics for a business
  async getPaymentStats(businessId) {
    // Get all invoices for the business to calculate stats
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('status, total_amount, balance_due, due_date')
      .eq('business_id', businessId);
    
    if (error) throw error;
    
    const stats = {
      totalReceived: 0,
      totalPending: 0,
      totalOverdue: 0
    };
    
    const today = new Date().toISOString().split('T')[0];
    
    invoices.forEach(invoice => {
      if (invoice.status === 'paid') {
        stats.totalReceived += invoice.total_amount;
      } else if (invoice.status === 'sent' || invoice.status === 'viewed') {
        if (invoice.due_date < today) {
          stats.totalOverdue += invoice.balance_due || invoice.total_amount;
        } else {
          stats.totalPending += invoice.balance_due || invoice.total_amount;
        }
      } else if (invoice.status === 'partially_paid') {
        if (invoice.due_date < today) {
          stats.totalOverdue += invoice.balance_due || 0;
        } else {
          stats.totalPending += invoice.balance_due || 0;
        }
      }
    });
    
    return stats;
  },

  // Record a payment
  async recordPayment(payment) {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update invoice paid amount
    const { data: invoice } = await supabase
      .from('invoices')
      .select('paid_amount, total_amount')
      .eq('id', payment.invoice_id)
      .single();
    
    const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
    const balanceDue = invoice.total_amount - newPaidAmount;
    const status = balanceDue <= 0 ? 'paid' : 'partially_paid';
    
    await supabase
      .from('invoices')
      .update({ 
        paid_amount: newPaidAmount,
        balance_due: balanceDue,
        status: status,
        paid_date: status === 'paid' ? new Date().toISOString() : null
      })
      .eq('id', payment.invoice_id);
    
    return data;
  },

  // Get payment history for an invoice
  async getPayments(invoiceId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Delete a payment
  async deletePayment(paymentId) {
    // Get payment details first
    const { data: payment } = await supabase
      .from('payments')
      .select('invoice_id, amount')
      .eq('id', paymentId)
      .single();
    
    // Delete the payment
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);
    
    if (error) throw error;
    
    // Update invoice paid amount
    const { data: invoice } = await supabase
      .from('invoices')
      .select('paid_amount, total_amount')
      .eq('id', payment.invoice_id)
      .single();
    
    const newPaidAmount = (invoice.paid_amount || 0) - payment.amount;
    const balanceDue = invoice.total_amount - newPaidAmount;
    const status = newPaidAmount <= 0 ? 'sent' : 'partially_paid';
    
    await supabase
      .from('invoices')
      .update({ 
        paid_amount: newPaidAmount,
        balance_due: balanceDue,
        status: status,
        paid_date: null
      })
      .eq('id', payment.invoice_id);
  }
};

// Purchase Order operations
export const purchaseOrderService = {
  // Get all POs for a business
  async getPurchaseOrders(businessId) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        customer:customers(name, company, email)
      `)
      .eq('business_id', businessId)
      .order('po_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Create PO with items
  async createPurchaseOrder(po, items) {
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .insert(po)
      .select()
      .single();
    
    if (poError) throw poError;
    
    const itemsWithPoId = items.map(item => ({
      ...item,
      po_id: poData.id
    }));
    
    const { error: itemsError } = await supabase
      .from('po_items')
      .insert(itemsWithPoId);
    
    if (itemsError) throw itemsError;
    
    return poData;
  },

  // Convert PO to invoice
  async convertToInvoice(poId, businessId) {
    // Get PO with items
    const { data: po } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        items:po_items(*)
      `)
      .eq('id', poId)
      .single();
    
    // Get next invoice number
    const invoiceNumber = await businessService.getNextInvoiceNumber(businessId);
    
    // Create invoice from PO
    const invoice = {
      business_id: po.business_id,
      customer_id: po.customer_id,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      po_number: po.po_number,
      subtotal: po.subtotal,
      tax_amount: po.tax_amount,
      total_amount: po.total_amount,
      balance_due: po.total_amount,
      status: 'draft'
    };
    
    // Map PO items to invoice items
    const invoiceItems = po.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      sort_order: item.sort_order
    }));
    
    const invoiceData = await invoiceService.createInvoice(invoice, invoiceItems);
    
    // Update PO with invoice reference
    await supabase
      .from('purchase_orders')
      .update({ 
        invoice_id: invoiceData.id,
        status: 'fulfilled'
      })
      .eq('id', poId);
    
    return invoiceData;
  }
};

export const userService = {
  // Create user
  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get user by email
  async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data;
  },

  // Update user
  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

export default supabase;