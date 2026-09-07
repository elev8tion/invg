import React from 'react';
import { render, screen } from '@testing-library/react';
import InvoicePreview from './InvoicePreview';
import { buildInvoicePdf } from '../lib/invoicePdf';

const invoice = {
  company: { name: 'My Business LLC', city: 'Portland', state: 'OR', zip: '97203' },
  client: { name: 'John Doe', email: 'john@example.com' },
  invoice: { number: 'INV-001', date: '2026-09-01', dueDate: '2026-10-01', terms: 'Net 30' },
  items: [
    { description: 'Web Development Services', date: '2026-09-01', quantity: 10, rate: 150, amount: 1500 },
    { description: 'Design Services', date: '2026-09-02', quantity: 5, rate: 100, amount: 500 },
  ],
  notes: 'Thank you for your business!',
  tax: 10,
  discount: 5,
};

describe('InvoicePreview', () => {
  test('renders the document sections', () => {
    render(<InvoicePreview invoice={invoice} />);

    expect(screen.getByText('INVOICE')).toBeInTheDocument();
    expect(screen.getByText('#INV-001')).toBeInTheDocument();
    expect(screen.getByText('BILL TO')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Web Development Services')).toBeInTheDocument();
    expect(screen.getByText('NOTES')).toBeInTheDocument();
  });

  test('formats money with separators and cents', () => {
    render(<InvoicePreview invoice={invoice} />);

    expect(screen.getByText('$1,500.00')).toBeInTheDocument(); // line amount
    expect(screen.getByText('$2,000.00')).toBeInTheDocument(); // subtotal
    expect(screen.getByText('$200.00')).toBeInTheDocument(); // tax
    expect(screen.getByText('-$100.00')).toBeInTheDocument(); // discount
    expect(screen.getByText('$2,100.00')).toBeInTheDocument(); // total
  });

  test('prints the date entered, not the UTC day before', () => {
    render(<InvoicePreview invoice={invoice} />);
    expect(screen.getAllByText('9/1/2026').length).toBeGreaterThan(0);
  });

  test('hides the tax and discount rows when they are zero', () => {
    render(<InvoicePreview invoice={{ ...invoice, tax: 0, discount: 0 }} />);

    expect(screen.queryByText(/^Tax/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Discount/)).not.toBeInTheDocument();
    // With nothing added or taken off, subtotal and total are the same figure.
    expect(screen.getAllByText('$2,000.00')).toHaveLength(2);
  });

  test('renders an empty invoice without throwing', () => {
    expect(() => render(<InvoicePreview invoice={{}} />)).not.toThrow();
  });

  // The whole point of the rewrite: what the user sees on screen and what
  // downloads are generated from the same helpers and must not drift.
  test('shows the same amounts and dates as the generated PDF', () => {
    render(<InvoicePreview invoice={invoice} />);
    const pdf = Buffer.from(buildInvoicePdf(invoice).output('arraybuffer')).toString('latin1');

    ['$2,000.00', '$200.00', '$2,100.00', '9/1/2026'].forEach((value) => {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
      expect(pdf).toContain(`(${value})`);
    });
  });
});
