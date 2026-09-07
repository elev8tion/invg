/**
 * Data access layer, backed by NoCodeBackend.
 *
 * Drop-in replacement for the old `src/lib/supabase.js`: every exported
 * service keeps the same method names, arguments and return shapes, so the
 * components consuming them did not need to change.
 *
 * Two behaviours differ underneath, because NCB is CRUD-only:
 *   - Relations are stitched client-side (NCB cannot join).
 *   - Multi-row writes are NOT transactional (NCB has no transaction API).
 *     Where a partial failure would leave orphans, we clean up on the way out.
 */

import ncb from './ncbClient';
import { isValidPin, normalizePin } from './pin';

const TRUE = 1;
const FALSE = 0;

const num = (v) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

const today = () => new Date().toISOString().split('T')[0];
const nowStamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

/** Case-insensitive ascending sort by a string field. */
const byName = (field) => (a, b) =>
  String(a?.[field] ?? '').localeCompare(String(b?.[field] ?? ''), undefined, { sensitivity: 'base' });

/** Descending sort by a date-ish field. */
const byDateDesc = (field) => (a, b) =>
  new Date(b?.[field] ?? 0) - new Date(a?.[field] ?? 0);

/** Index rows by id for O(1) client-side joins. */
const indexById = (rows) => new Map(rows.map((r) => [r.id, r]));

/** Group rows by a foreign-key column. */
function groupBy(rows, key) {
  const out = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(row);
  }
  return out;
}

/** Inclusive date-range filter, applied client-side (NCB search is equality-only). */
function withinRange(value, startDate, endDate) {
  if (!value) return !startDate && !endDate;
  const d = String(value).slice(0, 10);
  if (startDate && d < String(startDate).slice(0, 10)) return false;
  if (endDate && d > String(endDate).slice(0, 10)) return false;
  return true;
}

// =====================================================
// Businesses
// =====================================================

export const businessService = {
  async getUserBusinesses(userId) {
    const links = await ncb.search('business_users', { user_id: userId });
    if (links.length === 0) return [];
    const businesses = await Promise.all(
      links.map((link) => ncb.readOne('businesses', link.business_id))
    );
    return businesses.filter(Boolean);
  },

  async getAllBusinesses() {
    const businesses = await ncb.search('businesses', { is_active: TRUE });
    return businesses.sort(byName('name'));
  },

  async getBusiness(businessId) {
    return ncb.readOne('businesses', businessId);
  },

  async createBusiness(business) {
    const { id, created_at, updated_at, user_id, ...record } = business || {};
    return ncb.createAndFetch('businesses', {
      ...record,
      is_active: record.is_active === undefined ? TRUE : Number(record.is_active) ? TRUE : FALSE,
    });
  },

  async linkUser(businessId, userId, role = 'owner') {
    const existing = await ncb.search('business_users', {
      business_id: businessId,
      user_id: userId,
    });
    if (existing[0]) return existing[0];
    return ncb.createAndFetch('business_users', {
      business_id: businessId,
      user_id: userId,
      role,
      is_default: TRUE,
    });
  },

  async updateBusiness(businessId, updates) {
    return ncb.update('businesses', businessId, updates);
  },

  /**
   * Format the next invoice number and bump the counter.
   *
   * Read-modify-write, so two people creating an invoice at the same instant
   * can collide. The `uq_invoice_number (business_id, invoice_number)` unique
   * key in the schema turns that into a visible insert error rather than two
   * invoices silently sharing a number.
   */
  async getNextInvoiceNumber(businessId) {
    const business = await ncb.readOne('businesses', businessId);
    if (!business) throw new Error(`Business ${businessId} not found`);

    const prefix = business.invoice_prefix || 'INV';
    const next = num(business.next_invoice_number) || 1;
    const invoiceNumber = `${prefix}-${String(next).padStart(6, '0')}`;

    await ncb.update('businesses', businessId, { next_invoice_number: next + 1 });
    return invoiceNumber;
  },

  async getNextPoNumber(businessId) {
    const business = await ncb.readOne('businesses', businessId);
    if (!business) throw new Error(`Business ${businessId} not found`);

    const prefix = business.po_prefix || 'PO';
    const next = num(business.next_po_number) || 1;
    const poNumber = `${prefix}-${String(next).padStart(6, '0')}`;

    await ncb.update('businesses', businessId, { next_po_number: next + 1 });
    return poNumber;
  },
};

// =====================================================
// Customers
// =====================================================

export const customerService = {
  async getCustomers(businessId) {
    const customers = await ncb.search('customers', { business_id: businessId, is_active: TRUE });
    return customers.sort(byName('name'));
  },

  async createCustomer(customer) {
    return ncb.createAndFetch('customers', customer);
  },

  async updateCustomer(customerId, updates) {
    return ncb.update('customers', customerId, updates);
  },

  /** Soft delete, matching the previous behaviour. */
  async deleteCustomer(customerId) {
    await ncb.update('customers', customerId, { is_active: FALSE });
  },
};

// =====================================================
// Invoices
// =====================================================

export const invoiceService = {
  /**
   * List invoices for a business, each with its customer summary and payments.
   *
   * Costs 3 requests regardless of invoice count: invoices (filtered), the
   * business's customers, and all payments -- then joined in memory.
   */
  async getInvoices(businessId, filters = {}) {
    const query = { business_id: businessId };
    if (filters.status) query.status = filters.status;
    if (filters.customerId) query.customer_id = filters.customerId;
    if (filters.po_number) query.po_number = filters.po_number;

    const [invoices, customers, allPayments] = await Promise.all([
      ncb.search('invoices', query),
      ncb.search('customers', { business_id: businessId }),
      ncb.readAll('payments'),
    ]);

    const customersById = indexById(customers);
    const paymentsByInvoice = groupBy(allPayments, 'invoice_id');

    return invoices
      .filter((inv) => withinRange(inv.invoice_date, filters.startDate, filters.endDate))
      .filter((inv) => (filters.po_number ? inv.po_number === filters.po_number : true))
      .map((inv) => {
        const customer = customersById.get(inv.customer_id);
        return {
          ...inv,
          customer: customer
            ? { name: customer.name, company: customer.company, email: customer.email }
            : null,
          payments: paymentsByInvoice.get(inv.id) || [],
        };
      })
      .sort(byDateDesc('invoice_date'));
  },

  /** Single invoice with full customer, line items and payments. */
  async getInvoice(invoiceId) {
    const invoice = await ncb.readOne('invoices', invoiceId);
    if (!invoice) return null;

    const [customer, items, payments] = await Promise.all([
      invoice.customer_id ? ncb.readOne('customers', invoice.customer_id) : Promise.resolve(null),
      ncb.search('invoice_items', { invoice_id: invoiceId }),
      ncb.search('payments', { invoice_id: invoiceId }),
    ]);

    return {
      ...invoice,
      customer,
      items: items.sort((a, b) => num(a.sort_order) - num(b.sort_order)),
      payments: payments.sort(byDateDesc('payment_date')),
    };
  },

  /**
   * Create an invoice and its line items.
   *
   * NCB has no transactions and no bulk insert, so items go in one at a time.
   * If any item fails we delete the invoice and its already-written items,
   * rather than leaving a half-built invoice behind.
   */
  async createInvoice(invoice, items = []) {
    const created = await ncb.createAndFetch('invoices', invoice);

    try {
      for (const [index, item] of items.entries()) {
        await ncb.create('invoice_items', {
          ...item,
          invoice_id: created.id,
          sort_order: item.sort_order ?? index,
        });
      }
    } catch (error) {
      await this._deleteItems(created.id);
      await ncb.remove('invoices', created.id).catch(() => {});
      throw error;
    }

    return created;
  },

  async updateInvoice(invoiceId, updates, items = null) {
    const updated = await ncb.update('invoices', invoiceId, updates);

    if (items) {
      await this._deleteItems(invoiceId);
      for (const [index, item] of items.entries()) {
        await ncb.create('invoice_items', {
          ...item,
          invoice_id: invoiceId,
          sort_order: item.sort_order ?? index,
        });
      }
    }

    return updated;
  },

  async _deleteItems(invoiceId) {
    const existing = await ncb.search('invoice_items', { invoice_id: invoiceId });
    await Promise.all(existing.map((item) => ncb.remove('invoice_items', item.id)));
  },

  /** Mark an invoice sent and log the email. */
  async sendInvoice(invoiceId, recipientEmail) {
    await ncb.update('invoices', invoiceId, {
      status: 'sent',
      sent_date: nowStamp(),
    });

    return ncb.createAndFetch('email_log', {
      invoice_id: invoiceId,
      recipient_email: recipientEmail,
      subject: 'Invoice from Your Company',
      status: 'sent',
      sent_at: nowStamp(),
    });
  },

  /**
   * Mark as viewed, but only from the `sent` state.
   * Supabase enforced that with a second `.eq()`; NCB updates by id only,
   * so the guard is a read-then-check here.
   */
  async markAsViewed(invoiceId) {
    const invoice = await ncb.readOne('invoices', invoiceId);
    if (!invoice || invoice.status !== 'sent') return;

    await ncb.update('invoices', invoiceId, {
      status: 'viewed',
      viewed_date: nowStamp(),
    });
  },

  async deleteInvoice(invoiceId) {
    // invoice_items and payments cascade via their FK constraints.
    await ncb.remove('invoices', invoiceId);
  },
};

// =====================================================
// Payments
// =====================================================

export const paymentService = {
  /**
   * All payments across a business, each with its invoice and customer summary.
   * NCB cannot filter payments by a column on the joined invoice, so we scope
   * by the business's own invoice ids in memory.
   */
  async getBusinessPayments(businessId, filters = {}) {
    const [invoices, customers, allPayments] = await Promise.all([
      ncb.search('invoices', { business_id: businessId }),
      ncb.search('customers', { business_id: businessId }),
      ncb.readAll('payments'),
    ]);

    const invoicesById = indexById(invoices);
    const customersById = indexById(customers);

    return allPayments
      .filter((p) => invoicesById.has(p.invoice_id))
      .filter((p) => (filters.status ? p.status === filters.status : true))
      .filter((p) => withinRange(p.payment_date, filters.startDate, filters.endDate))
      .map((p) => {
        const invoice = invoicesById.get(p.invoice_id);
        const customer = customersById.get(invoice.customer_id);
        return {
          ...p,
          invoice: {
            invoice_number: invoice.invoice_number,
            total_amount: invoice.total_amount,
            due_date: invoice.due_date,
            customer: customer
              ? { name: customer.name, company: customer.company, email: customer.email }
              : null,
          },
        };
      })
      .sort(byDateDesc('payment_date'));
  },

  async getPaymentStats(businessId) {
    const invoices = await ncb.search('invoices', { business_id: businessId });

    const stats = { totalReceived: 0, totalPending: 0, totalOverdue: 0 };
    const cutoff = today();

    for (const invoice of invoices) {
      const total = num(invoice.total_amount);
      const balance = num(invoice.balance_due);
      const overdue = invoice.due_date && String(invoice.due_date).slice(0, 10) < cutoff;

      if (invoice.status === 'paid') {
        stats.totalReceived += total;
      } else if (invoice.status === 'sent' || invoice.status === 'viewed') {
        const owed = balance || total;
        if (overdue) stats.totalOverdue += owed;
        else stats.totalPending += owed;
      } else if (invoice.status === 'partially_paid') {
        if (overdue) stats.totalOverdue += balance;
        else stats.totalPending += balance;
      }
    }

    return stats;
  },

  /** Record a payment and roll the invoice's totals and status forward. */
  async recordPayment(payment) {
    const created = await ncb.createAndFetch('payments', {
      ...payment,
      payment_date: payment.payment_date || today(),
    });

    await this._resyncInvoiceTotals(payment.invoice_id);
    return created;
  },

  async getPayments(invoiceId) {
    const payments = await ncb.search('payments', { invoice_id: invoiceId });
    return payments.sort(byDateDesc('payment_date'));
  },

  async deletePayment(paymentId) {
    const payment = await ncb.readOne('payments', paymentId);
    if (!payment) return;

    await ncb.remove('payments', paymentId);
    await this._resyncInvoiceTotals(payment.invoice_id);
  },

  /**
   * Recompute paid_amount / balance_due / status from the payment rows.
   *
   * The Supabase version applied a delta to the stored paid_amount, which
   * drifts permanently if any single write fails. Summing the source rows
   * is self-healing and costs the same one extra request.
   */
  async _resyncInvoiceTotals(invoiceId) {
    const [invoice, payments] = await Promise.all([
      ncb.readOne('invoices', invoiceId),
      ncb.search('payments', { invoice_id: invoiceId }),
    ]);
    if (!invoice) return;

    const paidAmount = payments.reduce((sum, p) => sum + num(p.amount), 0);
    const totalAmount = num(invoice.total_amount);
    const balanceDue = Number((totalAmount - paidAmount).toFixed(2));

    let status;
    if (paidAmount <= 0) status = invoice.sent_date ? 'sent' : 'draft';
    else if (balanceDue <= 0) status = 'paid';
    else status = 'partially_paid';

    await ncb.update('invoices', invoiceId, {
      paid_amount: Number(paidAmount.toFixed(2)),
      balance_due: balanceDue,
      status,
      paid_date: status === 'paid' ? nowStamp() : null,
    });
  },
};

// =====================================================
// Purchase orders
// =====================================================

export const purchaseOrderService = {
  async getPurchaseOrders(businessId) {
    const [pos, customers] = await Promise.all([
      ncb.search('purchase_orders', { business_id: businessId }),
      ncb.search('customers', { business_id: businessId }),
    ]);

    const customersById = indexById(customers);

    return pos
      .map((po) => {
        const customer = customersById.get(po.customer_id);
        return {
          ...po,
          customer: customer
            ? { name: customer.name, company: customer.company, email: customer.email }
            : null,
        };
      })
      .sort(byDateDesc('po_date'));
  },

  async getPurchaseOrder(poId) {
    const po = await ncb.readOne('purchase_orders', poId);
    if (!po) return null;

    const [customer, items] = await Promise.all([
      po.customer_id ? ncb.readOne('customers', po.customer_id) : Promise.resolve(null),
      ncb.search('po_items', { po_id: poId }),
    ]);

    return { ...po, customer, items: items.sort((a, b) => num(a.sort_order) - num(b.sort_order)) };
  },

  async createPurchaseOrder(po, items = []) {
    const created = await ncb.createAndFetch('purchase_orders', po);

    try {
      for (const [index, item] of items.entries()) {
        await ncb.create('po_items', {
          ...item,
          po_id: created.id,
          sort_order: item.sort_order ?? index,
        });
      }
    } catch (error) {
      const written = await ncb.search('po_items', { po_id: created.id });
      await Promise.all(written.map((i) => ncb.remove('po_items', i.id)));
      await ncb.remove('purchase_orders', created.id).catch(() => {});
      throw error;
    }

    return created;
  },

  /** Turn a PO into a draft invoice and mark the PO fulfilled. */
  async convertToInvoice(poId, businessId) {
    const po = await ncb.readOne('purchase_orders', poId);
    if (!po) throw new Error(`Purchase order ${poId} not found`);

    const poItems = await ncb.search('po_items', { po_id: poId });
    const invoiceNumber = await businessService.getNextInvoiceNumber(businessId);

    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const invoice = {
      business_id: po.business_id,
      customer_id: po.customer_id,
      invoice_number: invoiceNumber,
      invoice_date: today(),
      due_date: dueDate,
      po_number: po.po_number,
      subtotal: num(po.subtotal),
      tax_amount: num(po.tax_amount),
      total_amount: num(po.total_amount),
      balance_due: num(po.total_amount),
      status: 'draft',
    };

    const invoiceItems = poItems
      .sort((a, b) => num(a.sort_order) - num(b.sort_order))
      .map((item, index) => ({
        description: item.description,
        quantity: num(item.quantity),
        rate: num(item.rate),
        amount: num(item.amount),
        sort_order: item.sort_order ?? index,
      }));

    const created = await invoiceService.createInvoice(invoice, invoiceItems);

    await ncb.update('purchase_orders', poId, {
      invoice_id: created.id,
      status: 'fulfilled',
    });

    return created;
  },
};

// =====================================================
// Users
// =====================================================

export const userService = {
  async createUser(userData) {
    return ncb.createAndFetch('app_users', userData);
  },

  async getUser(userId) {
    return ncb.readOne('app_users', userId);
  },

  /** Returns null when no user matches, mirroring the old PGRST116 handling. */
  async getUserByEmail(email) {
    const matches = await ncb.search('app_users', { email });
    return matches[0] || null;
  },

  async getUserByPin(pin) {
    const code = normalizePin(pin);
    if (!isValidPin(code)) return null;
    const matches = await ncb.search('app_users', { pin_code: code });
    return matches[0] || null;
  },

  async listUsers() {
    const users = await ncb.readAll('app_users');
    return users.sort(byName('full_name'));
  },

  async createPinUser({ full_name, pin_code, role = 'user' }) {
    const pin = normalizePin(pin_code);
    if (!isValidPin(pin)) throw new Error('PIN must be 4 digits');
    const name = String(full_name || '').trim();
    if (!name) throw new Error('Name is required');
    const taken = await this.getUserByPin(pin);
    if (taken) throw new Error('That PIN is already in use');
    return this.createUser({
      email: `pin-${pin}@invg.local`,
      full_name: name,
      role,
      is_active: TRUE,
      pin_code: pin,
    });
  },

  async changePin(userId, currentPin, nextPin) {
    const code = normalizePin(currentPin);
    if (!isValidPin(code)) throw new Error('Current PIN must be 4 digits');
    const matched = await this.getUserByPin(code);
    if (!matched || Number(matched.id) !== Number(userId)) {
      throw new Error('Current PIN is incorrect');
    }
    return this.resetPin(userId, nextPin, userId);
  },

  async resetPin(userId, nextPin, ignoreUserId = null) {
    const pin = normalizePin(nextPin);
    if (!isValidPin(pin)) throw new Error('PIN must be 4 digits');
    const taken = await this.getUserByPin(pin);
    if (taken && Number(taken.id) !== Number(ignoreUserId ?? userId)) {
      throw new Error('That PIN is already in use');
    }
    return this.updateUser(userId, { pin_code: pin });
  },

  async setActive(userId, isActive) {
    return this.updateUser(userId, { is_active: isActive ? TRUE : FALSE });
  },

  async updateUser(userId, updates) {
    return ncb.update('app_users', userId, updates);
  },
};

export { ncb };
export default ncb;
