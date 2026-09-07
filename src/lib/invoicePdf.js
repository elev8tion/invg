/**
 * Vector invoice PDF renderer.
 *
 * Replaces the old html2canvas path, which screenshotted `#invoice-preview` and
 * embedded the picture: raster text, multi-megabyte files, a layout that
 * depended on the browser window, and page breaks that cut line items in half.
 *
 * The on-screen preview in App.js renders the same document from the same
 * helpers (`src/lib/format.js`, `src/lib/invoiceTotals.js`), so what the user
 * sees and what downloads cannot drift apart.
 *
 * This draws the document instead. It takes the plain `invoiceData` object the
 * generator keeps in state -- no DOM, no React -- so the output is identical on
 * every machine and at every window size, and the text stays selectable.
 *
 * Units are millimetres on A4 portrait; font sizes are points, as jsPDF expects.
 */

import { jsPDF } from 'jspdf';

import { formatDate, money, num } from './format';
import { invoiceTotals } from './invoiceTotals';

// ---------------------------------------------------------------------------
// Page geometry
// ---------------------------------------------------------------------------

const PAGE = { width: 210, height: 297 };
const MARGIN = { top: 16, right: 18, bottom: 18, left: 18 };

const CONTENT_LEFT = MARGIN.left;
const CONTENT_RIGHT = PAGE.width - MARGIN.right;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT; // 174mm

/** Baseline of the footer rule; body content must stop above this. */
const FOOTER_TOP = PAGE.height - MARGIN.bottom;
const BODY_BOTTOM = FOOTER_TOP - 6;

// ---------------------------------------------------------------------------
// Palette -- mirrors the on-screen preview so the PDF is recognisably the same
// document (purple-600 accent, gray-800 body, gray-100 table header).
// ---------------------------------------------------------------------------

const INK = [31, 41, 55]; // gray-800
const MUTED = [107, 114, 128]; // gray-500
const FAINT = [156, 163, 175]; // gray-400
const ACCENT = [124, 58, 237]; // purple-600
const DANGER = [220, 38, 38]; // red-600
const RULE = [229, 231, 235]; // gray-200
const RULE_STRONG = [209, 213, 219]; // gray-300
const HEADER_FILL = [243, 244, 246]; // gray-100

// ---------------------------------------------------------------------------
// Table columns -- widths sum to CONTENT_WIDTH (74 + 24 + 16 + 26 + 34 = 174)
// ---------------------------------------------------------------------------

const COLUMNS = [
  { key: 'description', label: 'Description', width: 74, align: 'left' },
  { key: 'date', label: 'Date', width: 24, align: 'center' },
  { key: 'quantity', label: 'Qty', width: 16, align: 'center' },
  { key: 'rate', label: 'Rate', width: 26, align: 'right' },
  { key: 'amount', label: 'Amount', width: 34, align: 'right' },
];

const CELL_PAD = 2.5;
const ROW_LINE_HEIGHT = 4.4;
const ROW_MIN_HEIGHT = 9;
const TABLE_HEADER_HEIGHT = 8;

/** Left edge of each column, accumulated once from the widths above. */
let columnCursor = CONTENT_LEFT;
const COLUMN_X = COLUMNS.map((col) => {
  const left = columnCursor;
  columnCursor += col.width;
  return left;
});

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

/** Drop blank lines so an empty address does not leave a gap. */
const compact = (lines) => lines.map((line) => String(line ?? '').trim()).filter(Boolean);

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

const setText = (doc, size, style, color) => {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
};

const hairline = (doc, y, color = RULE, width = 0.2) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(width);
  doc.line(CONTENT_LEFT, y, CONTENT_RIGHT, y);
};

/** Draw a stack of lines from `y`, returning the y below the last one. */
const textBlock = (doc, lines, x, y, lineHeight, align = 'left') => {
  let cursor = y;
  for (const line of lines) {
    doc.text(line, x, cursor, { align });
    cursor += lineHeight;
  }
  return cursor;
};

/** Align a cell's text inside its column, honouring the column's alignment. */
const cellX = (index) => {
  const col = COLUMNS[index];
  const left = COLUMN_X[index];
  if (col.align === 'right') return left + col.width - CELL_PAD;
  if (col.align === 'center') return left + col.width / 2;
  return left + CELL_PAD;
};

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * Company block, logo, and the invoice metadata column.
 * Returns the y coordinate below the header rule.
 */
function drawHeader(doc, data) {
  const company = data.company || {};
  const invoice = data.invoice || {};

  let leftY = MARGIN.top;

  // Logo, if the user uploaded one. Sized to fit a 34x18mm box without
  // distortion; a corrupt data URI must not take the whole download down.
  if (data.logo) {
    try {
      const props = doc.getImageProperties(data.logo);
      const scale = Math.min(34 / props.width, 18 / props.height);
      const width = props.width * scale;
      const height = props.height * scale;
      doc.addImage(data.logo, CONTENT_LEFT, leftY, width, height, undefined, 'FAST');
      leftY += height + 5;
    } catch (error) {
      console.warn('Skipping invoice logo: could not be read', error);
    }
  }

  setText(doc, 12, 'bold', INK);
  doc.text(String(company.name || 'Your Company'), CONTENT_LEFT, leftY + 4);
  leftY += 9;

  setText(doc, 9, 'normal', MUTED);
  const cityLine = compact([company.city, company.state]).join(', ');
  leftY = textBlock(
    doc,
    compact([
      company.address,
      compact([cityLine, company.zip]).join(' '),
      company.email,
      company.phone,
    ]),
    CONTENT_LEFT,
    leftY,
    4.6
  );

  // Right column: wordmark, number, then label/value metadata rows.
  setText(doc, 26, 'bold', INK);
  doc.text('INVOICE', CONTENT_RIGHT, MARGIN.top + 8, { align: 'right' });

  setText(doc, 12, 'bold', ACCENT);
  doc.text(`#${invoice.number || ''}`, CONTENT_RIGHT, MARGIN.top + 15, { align: 'right' });

  const meta = compact([
    invoice.date && `Date|${formatDate(invoice.date)}`,
    invoice.dueDate && `Due|${formatDate(invoice.dueDate)}`,
    invoice.terms && `Terms|${invoice.terms}`,
  ]);

  let rightY = MARGIN.top + 22;
  for (const row of meta) {
    const [label, value] = row.split('|');
    setText(doc, 9, 'normal', MUTED);
    doc.text(`${label}:`, CONTENT_RIGHT - 30, rightY, { align: 'right' });
    setText(doc, 9, 'bold', INK);
    doc.text(value, CONTENT_RIGHT, rightY, { align: 'right' });
    rightY += 4.8;
  }

  const y = Math.max(leftY, rightY) + 3;
  hairline(doc, y, RULE_STRONG, 0.3);
  return y + 8;
}

/** Bill To block. Returns the y below it. */
function drawBillTo(doc, data, y) {
  const client = data.client || {};

  setText(doc, 8, 'bold', FAINT);
  doc.text('BILL TO', CONTENT_LEFT, y);

  setText(doc, 10, 'bold', INK);
  doc.text(String(client.name || 'Client Name'), CONTENT_LEFT, y + 6);

  setText(doc, 9, 'normal', MUTED);
  const below = textBlock(doc, compact([client.address, client.email]), CONTENT_LEFT, y + 11, 4.6);

  return below + 4;
}

/** Table header row. Returns the y below it. */
function drawTableHeader(doc, y) {
  doc.setFillColor(...HEADER_FILL);
  doc.rect(CONTENT_LEFT, y, CONTENT_WIDTH, TABLE_HEADER_HEIGHT, 'F');

  setText(doc, 8, 'bold', INK);
  COLUMNS.forEach((col, index) => {
    doc.text(col.label.toUpperCase(), cellX(index), y + 5.4, { align: col.align });
  });

  return y + TABLE_HEADER_HEIGHT;
}

/**
 * Line items, paginated so a row is never split across a page break and the
 * column header repeats at the top of every page. Returns the y below the table.
 */
function drawItems(doc, items, y) {
  let cursor = drawTableHeader(doc, y);

  const descriptionWidth = COLUMNS[0].width - CELL_PAD * 2;

  for (const item of items) {
    setText(doc, 9, 'normal', INK);
    const description = doc.splitTextToSize(
      String(item.description || '').trim() || 'Item description',
      descriptionWidth
    );
    const height = Math.max(ROW_MIN_HEIGHT, description.length * ROW_LINE_HEIGHT + 4.6);

    // Measure first, break second: the whole row moves to the next page.
    if (cursor + height > BODY_BOTTOM) {
      doc.addPage();
      cursor = drawTableHeader(doc, MARGIN.top);
    }

    const baseline = cursor + 5.8;
    const cells = [
      null, // description is drawn as a wrapped block below
      formatDate(item.date),
      String(num(item.quantity)),
      money(item.rate),
      money(item.amount),
    ];

    setText(doc, 9, 'normal', INK);
    textBlock(doc, description, cellX(0), baseline, ROW_LINE_HEIGHT);

    COLUMNS.forEach((col, index) => {
      if (index === 0) return;
      setText(doc, 9, index === 4 ? 'bold' : 'normal', index === 4 ? INK : MUTED);
      doc.text(cells[index], cellX(index), baseline, { align: col.align });
    });

    cursor += height;
    hairline(doc, cursor);
  }

  return cursor;
}

/**
 * Totals block, right-aligned. Measured as a unit and moved whole to the next
 * page rather than being orphaned across the break. Returns the y below it.
 */
function drawTotals(doc, data, y) {
  const { subtotal, discountAmount, taxAmount, total } = invoiceTotals(data);

  const rows = [
    { label: 'Subtotal', value: money(subtotal), color: MUTED },
    num(data.discount) > 0 && {
      label: `Discount (${num(data.discount)}%)`,
      value: `-${money(discountAmount)}`,
      color: DANGER,
    },
    num(data.tax) > 0 && {
      label: `Tax (${num(data.tax)}%)`,
      value: money(taxAmount),
      color: MUTED,
    },
  ].filter(Boolean);

  const blockHeight = rows.length * 5.6 + 12;
  let cursor = y + 6;

  if (cursor + blockHeight > BODY_BOTTOM) {
    doc.addPage();
    cursor = MARGIN.top;
  }

  const labelX = CONTENT_RIGHT - 40;

  for (const row of rows) {
    setText(doc, 9, 'normal', row.color);
    doc.text(row.label, labelX, cursor, { align: 'right' });
    setText(doc, 9, 'bold', row.color === DANGER ? DANGER : INK);
    doc.text(row.value, CONTENT_RIGHT, cursor, { align: 'right' });
    cursor += 5.6;
  }

  doc.setDrawColor(...RULE_STRONG);
  doc.setLineWidth(0.3);
  doc.line(CONTENT_RIGHT - 70, cursor - 1.5, CONTENT_RIGHT, cursor - 1.5);
  cursor += 5;

  setText(doc, 12, 'bold', INK);
  doc.text('Total', labelX, cursor, { align: 'right' });
  setText(doc, 13, 'bold', ACCENT);
  doc.text(money(total), CONTENT_RIGHT, cursor, { align: 'right' });

  return cursor + 6;
}

/** Notes block, wrapped and paginated. Returns the y below it. */
function drawNotes(doc, notes, y) {
  const text = String(notes || '').trim();
  if (!text) return y;

  setText(doc, 9, 'normal', MUTED);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  const height = lines.length * 4.6 + 12;

  let cursor = y + 6;
  if (cursor + height > BODY_BOTTOM) {
    doc.addPage();
    cursor = MARGIN.top;
  }

  hairline(doc, cursor, RULE_STRONG, 0.3);
  cursor += 6;

  setText(doc, 8, 'bold', FAINT);
  doc.text('NOTES', CONTENT_LEFT, cursor);
  cursor += 5;

  setText(doc, 9, 'normal', MUTED);
  return textBlock(doc, lines, CONTENT_LEFT, cursor, 4.6);
}

/**
 * Footer on every page. Run last, once the page count is final -- "Page 1 of 3"
 * cannot be written while pages are still being added.
 */
function drawFooters(doc, invoiceNumber) {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    hairline(doc, FOOTER_TOP - 4);

    setText(doc, 8, 'normal', FAINT);
    if (invoiceNumber) {
      doc.text(`Invoice #${invoiceNumber}`, CONTENT_LEFT, FOOTER_TOP);
    }
    doc.text(`Page ${page} of ${pages}`, CONTENT_RIGHT, FOOTER_TOP, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render an invoice to a jsPDF document.
 *
 * @param {object} invoiceData - the generator's state shape: `{ company, client,
 *   invoice, items, notes, tax, discount, logo }`.
 * @returns {jsPDF} the finished document, ready to `save()` or `output()`.
 */
export function buildInvoicePdf(invoiceData) {
  const data = invoiceData || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const invoiceNumber = data.invoice?.number || '';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawHeader(doc, data);
  y = drawBillTo(doc, data, y);
  y = drawItems(doc, items, y);
  y = drawTotals(doc, data, y);
  drawNotes(doc, data.notes, y);
  drawFooters(doc, invoiceNumber);

  doc.setProperties({
    title: `Invoice ${invoiceNumber}`,
    subject: `Invoice for ${data.client?.name || 'Client'}`,
    author: data.company?.name || '',
    keywords: 'invoice, business',
    creator: 'Professional Invoice Generator',
  });

  return doc;
}

/**
 * Build the invoice and hand it to the browser as a download.
 *
 * Unlike the screenshot path this replaces, it needs nothing on screen, so it
 * can be called straight from a list row without switching views first.
 */
export function downloadInvoicePdf(invoiceData) {
  const doc = buildInvoicePdf(invoiceData);
  doc.save(`Invoice-${invoiceData?.invoice?.number || 'draft'}.pdf`);
  return doc;
}

export default buildInvoicePdf;
