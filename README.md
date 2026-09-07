# Professional Invoice Generator

A modern, responsive invoice generator built with React and Tailwind CSS.

## Features

- 🎨 Modern dark theme with gradient accents
- 📱 Fully responsive design
- 💾 Local storage for saving invoices
- 📄 PDF generation and download
- 📅 Date tracking for line items
- 🧮 Automatic calculations
- 💼 Professional QuickBooks-style layout

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Building for Production

```bash
npm run build
```

## Technologies Used

- React 18
- Tailwind CSS
- Lucide React Icons
- jsPDF (vector invoice PDFs -- see `src/lib/invoicePdf.js`)
- Local Storage API