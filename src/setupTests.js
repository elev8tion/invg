// Jest/jsdom setup, loaded automatically by react-scripts before each suite.
import '@testing-library/jest-dom';

// jsdom ships no TextEncoder/TextDecoder, but Node does. jsPDF's PNG decoder
// reaches for them at import time, so any suite that touches src/lib/invoicePdf.js
// -- directly or through emailService -- fails to even load without this.
import { TextDecoder, TextEncoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
