import { invoiceSubtotal, invoiceTotal, invoiceTotals } from './invoiceTotals';

const invoice = {
  items: [
    { quantity: 10, rate: 150 },
    { quantity: 5, rate: 100 },
  ],
  tax: 10,
  discount: 5,
};

describe('invoiceTotals', () => {
  test('breaks an invoice into subtotal, tax, discount and total', () => {
    expect(invoiceTotals(invoice)).toEqual({
      subtotal: 2000,
      taxAmount: 200,
      discountAmount: 100,
      total: 2100, // 2000 + 200 - 100
    });
  });

  test('zero tax and discount leave the subtotal alone', () => {
    expect(invoiceTotal({ ...invoice, tax: 0, discount: 0 })).toBe(2000);
  });

  // The four hand-rolled copies of this maths multiplied raw fields, so a blank
  // tax field produced NaN in the customer's email while the dashboard beside it
  // showed a number.
  test('missing, blank and string fields never produce NaN', () => {
    expect(invoiceTotal({ items: [{ quantity: '2', rate: '10.5' }] })).toBe(21);
    expect(invoiceTotal({ items: [{ quantity: 2, rate: 10 }], tax: '', discount: null })).toBe(20);
    expect(invoiceTotal({ items: [{ quantity: undefined, rate: 10 }] })).toBe(0);
  });

  test('tolerates a missing or malformed invoice', () => {
    expect(invoiceTotal(undefined)).toBe(0);
    expect(invoiceTotal({})).toBe(0);
    expect(invoiceTotal({ items: null })).toBe(0);
  });

  test('invoiceSubtotal is the pre-tax line-item sum', () => {
    expect(invoiceSubtotal(invoice)).toBe(2000);
  });
});
