import { buildInvoicePdf } from './invoicePdf';

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

/** The raw PDF, which jsPDF leaves uncompressed, so drawn text is greppable. */
const render = (data) => buildInvoicePdf(data).output('arraybuffer');
const asText = (data) => Buffer.from(render(data)).toString('latin1');

describe('buildInvoicePdf', () => {
  test('draws real text rather than embedding a screenshot', () => {
    const pdf = asText(invoice);
    // Tj/TJ are the PDF text-showing operators. The html2canvas version this
    // replaced had none -- the whole page was one raster image.
    expect(pdf).toContain('Tj');
    expect(pdf).toContain('(My Business LLC)');
    expect(pdf).toContain('(John Doe)');
    expect(pdf).toContain('(Web Development Services)');
  });

  test('totals match the shared calculator and are formatted like everywhere else', () => {
    expect(asText(invoice)).toContain('($2,100.00)');
  });

  test('dates print the day that was entered, not the day before', () => {
    expect(asText(invoice)).toContain('(9/1/2026)');
  });

  test('a short invoice is one page and stays small', () => {
    const doc = buildInvoicePdf(invoice);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.output('arraybuffer').byteLength).toBeLessThan(100 * 1024);
  });

  test('paginates long invoices, repeating the table header and numbering pages', () => {
    const many = {
      ...invoice,
      items: Array.from({ length: 40 }, (_, i) => ({
        description: `Line item ${i + 1}`,
        date: '2026-09-01',
        quantity: 1,
        rate: 100,
        amount: 100,
      })),
    };

    const doc = buildInvoicePdf(many);
    const pages = doc.getNumberOfPages();
    expect(pages).toBeGreaterThan(1);

    const pdf = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    expect(pdf).toContain(`(Page 1 of ${pages})`);
    expect(pdf).toContain(`(Page ${pages} of ${pages})`);
    // Column header drawn once per page.
    expect(pdf.split('(DESCRIPTION)').length - 1).toBe(pages);
  });

  test('survives an empty invoice without throwing', () => {
    expect(() => buildInvoicePdf({})).not.toThrow();
    expect(() => buildInvoicePdf(undefined)).not.toThrow();
  });

  test('a broken logo is skipped rather than failing the download', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => buildInvoicePdf({ ...invoice, logo: 'data:image/png;base64,notreallyanimage' }))
      .not.toThrow();
    console.warn.mockRestore();
  });
});
