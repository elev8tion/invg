/**
 * Invoice arithmetic, in one place.
 *
 * This sum was implemented five separate times -- `getInvoiceTotal` in App.js,
 * `calculateSubtotal`/`calculateTotal` in the generator, `calculateInvoiceTotal`
 * in Dashboard.js, a module-level `calculateTotal` in EmailModal.js, and
 * `calculateTotal` on EmailService. Four of them multiplied raw fields with no
 * coercion, so an invoice with a blank tax field totalled `NaN` in the email
 * that went to the customer while the dashboard beside it showed a number.
 *
 * One guarded implementation now backs all of them.
 */

import { num } from './format';

/**
 * Break an invoice down into its component amounts.
 *
 * `tax` and `discount` are percentages, matching the stored shape.
 *
 * @param {object} invoice - `{ items: [{ quantity, rate }], tax, discount }`
 * @returns {{subtotal: number, discountAmount: number, taxAmount: number, total: number}}
 */
export function invoiceTotals(invoice) {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];

  const subtotal = items.reduce(
    (sum, item) => sum + num(item?.quantity) * num(item?.rate),
    0
  );

  const discountAmount = (subtotal * num(invoice?.discount)) / 100;
  const taxAmount = (subtotal * num(invoice?.tax)) / 100;

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total: subtotal + taxAmount - discountAmount,
  };
}

/** The amount payable -- subtotal plus tax, less discount. */
export const invoiceTotal = (invoice) => invoiceTotals(invoice).total;

/** Line-item sum, before tax and discount. */
export const invoiceSubtotal = (invoice) => invoiceTotals(invoice).subtotal;
