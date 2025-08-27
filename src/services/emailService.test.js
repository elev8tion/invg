// Test file for EmailService
import emailService from './emailService';

describe('EmailService', () => {
  // Mock environment variables
  beforeAll(() => {
    process.env.REACT_APP_EMAILIT_API_KEY = 'test-api-key-12345';
    process.env.REACT_APP_DEFAULT_FROM_EMAIL = 'test@example.com';
  });

  // Test data
  const mockInvoice = {
    id: 1,
    invoice: {
      number: 'INV-001',
      date: '2024-01-15',
      dueDate: '2024-02-15',
      terms: 'Net 30'
    },
    items: [
      {
        description: 'Web Development Services',
        quantity: 10,
        rate: 150.00
      },
      {
        description: 'Design Services',
        quantity: 5,
        rate: 100.00
      }
    ],
    tax: 10,
    discount: 5,
    notes: 'Thank you for your business!'
  };

  const mockCustomer = {
    id: 1,
    name: 'John Doe',
    company: 'Test Company Inc.',
    email: 'john@testcompany.com',
    address: '123 Test St',
    phone: '555-123-4567'
  };

  const mockBusiness = {
    id: 1,
    name: 'My Business LLC',
    email: 'billing@mybusiness.com',
    address: '456 Business Ave',
    city: 'Business City',
    state: 'BC',
    zip: '12345',
    phone: '555-987-6543'
  };

  const mockPayment = {
    id: 1,
    amount: 1595.00,
    reference: 'PAY-123456'
  };

  describe('Email Template Generation', () => {
    test('should generate invoice HTML template correctly', () => {
      const html = emailService.generateInvoiceHTML(mockInvoice, mockCustomer, mockBusiness);
      
      expect(html).toContain('Invoice');
      expect(html).toContain('#INV-001');
      expect(html).toContain('My Business LLC');
      expect(html).toContain('John Doe');
      expect(html).toContain('Web Development Services');
      expect(html).toContain('$1,595.00'); // Total after tax and discount
      expect(html).toContain('Thank you for your business!');
    });

    test('should generate invoice plain text correctly', () => {
      const text = emailService.generateInvoicePlainText(mockInvoice, mockCustomer, mockBusiness);
      
      expect(text).toContain('INVOICE #INV-001');
      expect(text).toContain('My Business LLC');
      expect(text).toContain('John Doe');
      expect(text).toContain('Web Development Services');
      expect(text).toContain('TOTAL: $1595.00');
    });

    test('should generate payment confirmation HTML correctly', () => {
      const html = emailService.generatePaymentHTML(mockPayment, mockInvoice, mockCustomer, mockBusiness);
      
      expect(html).toContain('Payment Received!');
      expect(html).toContain('$1,595.00');
      expect(html).toContain('#INV-001');
      expect(html).toContain('PAY-123456');
      expect(html).toContain('John Doe');
    });

    test('should generate reminder HTML correctly', () => {
      const daysOverdue = 15;
      const html = emailService.generateReminderHTML(mockInvoice, mockCustomer, mockBusiness, daysOverdue);
      
      expect(html).toContain('Payment Reminder');
      expect(html).toContain('#INV-001');
      expect(html).toContain('15 days overdue');
      expect(html).toContain('$1,595.00');
      expect(html).toContain('John Doe');
    });
  });

  describe('Email Calculation', () => {
    test('should calculate invoice total correctly', () => {
      const total = emailService.calculateTotal(mockInvoice);
      // Subtotal: (10 * 150) + (5 * 100) = 2000
      // Tax: 2000 * 0.10 = 200
      // Discount: 2000 * 0.05 = 100
      // Total: 2000 + 200 - 100 = 2100
      expect(total).toBe(2100);
    });

    test('should handle zero tax and discount', () => {
      const invoiceNoTaxDiscount = {
        ...mockInvoice,
        tax: 0,
        discount: 0
      };
      const total = emailService.calculateTotal(invoiceNoTaxDiscount);
      expect(total).toBe(2000); // Just subtotal
    });
  });

  describe('Email API Integration', () => {
    // Mock fetch for testing API calls
    global.fetch = jest.fn();

    beforeEach(() => {
      fetch.mockClear();
    });

    test('should send invoice email with correct API call', async () => {
      // Mock successful API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'email-123',
          status: 'sent'
        })
      });

      const result = await emailService.sendInvoice(mockInvoice, mockCustomer, mockBusiness);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.emailit.com/v1/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key-12345',
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('email-123');
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error response
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      const result = await emailService.sendInvoice(mockInvoice, mockCustomer, mockBusiness);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    test('should handle network errors', async () => {
      // Mock network error
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await emailService.sendInvoice(mockInvoice, mockCustomer, mockBusiness);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Email Service Configuration', () => {
    test('should handle missing API key', async () => {
      // Temporarily remove API key
      const originalKey = process.env.REACT_APP_EMAILIT_API_KEY;
      delete process.env.REACT_APP_EMAILIT_API_KEY;

      // Create new instance without API key
      const emailServiceWithoutKey = new (emailService.constructor)();
      
      const result = await emailServiceWithoutKey.sendInvoice(mockInvoice, mockCustomer, mockBusiness);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email API not configured');

      // Restore API key
      process.env.REACT_APP_EMAILIT_API_KEY = originalKey;
    });

    test('should use default from email when business email not provided', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-123' })
      });

      const businessWithoutEmail = {
        ...mockBusiness,
        email: null
      };

      await emailService.sendInvoice(mockInvoice, mockCustomer, businessWithoutEmail);

      const callArgs = fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.from).toContain('test@example.com');
    });
  });

  describe('Email Data Structure', () => {
    test('should structure email data correctly for Emailit API', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-123' })
      });

      await emailService.sendInvoice(mockInvoice, mockCustomer, mockBusiness);

      const callArgs = fetch.mock.calls[0][1];
      const emailData = JSON.parse(callArgs.body);

      expect(emailData).toHaveProperty('from');
      expect(emailData).toHaveProperty('to');
      expect(emailData).toHaveProperty('subject');
      expect(emailData).toHaveProperty('html');
      expect(emailData).toHaveProperty('text');
      expect(emailData).toHaveProperty('reply_to');
      expect(emailData).toHaveProperty('headers');

      expect(emailData.from).toContain('My Business LLC');
      expect(emailData.to).toBe('john@testcompany.com');
      expect(emailData.subject).toContain('Invoice #INV-001');
      expect(emailData.headers['X-Invoice-ID']).toBe('1');
      expect(emailData.headers['X-Business-ID']).toBe('1');
      expect(emailData.headers['X-Customer-ID']).toBe('1');
    });
  });
});