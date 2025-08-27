// Email Service using Emailit API
// Documentation: https://docs.emailit.com/

class EmailService {
  constructor() {
    this.apiKey = process.env.REACT_APP_EMAILIT_API_KEY;
    this.apiUrl = 'https://api.emailit.com/v1';
    
    if (!this.apiKey) {
      console.warn('⚠️ Emailit API key not configured. Emails will not be sent.');
    }
  }

  // Send invoice email to customer
  async sendInvoice(invoice, customer, business, options = {}) {
    if (!this.apiKey) {
      console.log('📧 Email Preview (API key not configured):');
      console.log('To:', customer.email);
      console.log('Subject:', `Invoice #${invoice.invoice.number} from ${business.name}`);
      return { success: false, error: 'Email API not configured' };
    }

    // Format according to Emailit API specification
    const emailData = {
      from: business.email ? 
        `${business.name} <${business.email}>` : 
        `${business.name} <${process.env.REACT_APP_DEFAULT_FROM_EMAIL || 'noreply@invoices.com'}>`,
      to: customer.email,
      subject: options.subject || `Invoice #${invoice.invoice.number} from ${business.name}`,
      html: this.generateInvoiceHTML(invoice, customer, business),
      text: this.generateInvoicePlainText(invoice, customer, business),
      reply_to: business.email || undefined,
      // Attachments format for Emailit
      attachments: options.attachPDF ? [{
        filename: `invoice-${invoice.invoice.number}.pdf`,
        content: await this.preparePDFAttachment(invoice),
        content_type: 'application/pdf'
      }] : undefined,
      // Custom headers for tracking
      headers: {
        'X-Invoice-ID': String(invoice.id || ''),
        'X-Business-ID': String(business.id || ''),
        'X-Customer-ID': String(customer.id || '')
      }
    };

    try {
      const response = await fetch(`${this.apiUrl}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log to email_log table
      await this.logEmail({
        ...emailData,
        status: 'sent',
        email_id: result.id,
        sent_at: new Date().toISOString()
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      
      // Log failed attempt
      await this.logEmail({
        ...emailData,
        status: 'failed',
        error: error.message,
        attempted_at: new Date().toISOString()
      });

      return { success: false, error: error.message };
    }
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(payment, invoice, customer, business) {
    if (!this.apiKey) {
      console.log('📧 Payment Confirmation Preview (API key not configured):');
      console.log('To:', customer.email);
      console.log('Subject:', `Payment Received - Invoice #${invoice.invoice.number}`);
      return { success: false, error: 'Email API not configured' };
    }

    const emailData = {
      from: business.email ? 
        `${business.name} <${business.email}>` : 
        `${business.name} <${process.env.REACT_APP_DEFAULT_FROM_EMAIL || 'noreply@invoices.com'}>`,
      to: customer.email,
      subject: `Payment Received - Invoice #${invoice.invoice.number}`,
      html: this.generatePaymentHTML(payment, invoice, customer, business),
      text: this.generatePaymentPlainText(payment, invoice, customer, business),
      reply_to: business.email || undefined,
      headers: {
        'X-Payment-ID': String(payment.id || ''),
        'X-Invoice-ID': String(invoice.id || ''),
        'X-Business-ID': String(business.id || '')
      }
    };

    try {
      const response = await fetch(`${this.apiUrl}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to send payment confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  // Send reminder email for overdue invoice
  async sendReminder(invoice, customer, business, daysOverdue) {
    if (!this.apiKey) {
      console.log('📧 Reminder Preview (API key not configured):');
      console.log('To:', customer.email);
      console.log('Subject:', `Reminder: Invoice #${invoice.invoice.number} is ${daysOverdue} days overdue`);
      return { success: false, error: 'Email API not configured' };
    }

    const emailData = {
      from: business.email ? 
        `${business.name} <${business.email}>` : 
        `${business.name} <${process.env.REACT_APP_DEFAULT_FROM_EMAIL || 'noreply@invoices.com'}>`,
      to: customer.email,
      subject: `Reminder: Invoice #${invoice.invoice.number} is ${daysOverdue} days overdue`,
      html: this.generateReminderHTML(invoice, customer, business, daysOverdue),
      text: this.generateReminderPlainText(invoice, customer, business, daysOverdue),
      reply_to: business.email || undefined,
      headers: {
        'X-Invoice-ID': String(invoice.id || ''),
        'X-Business-ID': String(business.id || ''),
        'X-Days-Overdue': String(daysOverdue)
      }
    };

    try {
      const response = await fetch(`${this.apiUrl}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to send reminder:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate HTML email template for invoice
  generateInvoiceHTML(invoice, customer, business) {
    const total = this.calculateTotal(invoice);
    const itemsHTML = invoice.items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.rate.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.quantity * item.rate).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Invoice</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">#${invoice.invoice.number}</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
            <div>
              <h3 style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">FROM</h3>
              <strong>${business.name}</strong><br>
              ${business.address ? `${business.address}<br>` : ''}
              ${business.city ? `${business.city}, ${business.state} ${business.zip}<br>` : ''}
              ${business.email}<br>
              ${business.phone || ''}
            </div>
            
            <div>
              <h3 style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">TO</h3>
              <strong>${customer.name || customer.company}</strong><br>
              ${customer.address || ''}<br>
              ${customer.email}<br>
              ${customer.phone || ''}
            </div>
          </div>
          
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
            <table style="width: 100%;">
              <tr>
                <td><strong>Invoice Date:</strong> ${invoice.invoice.date}</td>
                <td><strong>Due Date:</strong> ${invoice.invoice.dueDate}</td>
              </tr>
              <tr>
                <td><strong>Terms:</strong> ${invoice.invoice.terms}</td>
                <td><strong>Status:</strong> <span style="color: #f59e0b;">Pending</span></td>
              </tr>
            </table>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left;">Description</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Rate</th>
                <th style="padding: 12px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 12px; text-align: right; font-size: 20px; color: #7c3aed; font-weight: bold;">$${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          ${invoice.notes ? `
            <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-radius: 8px;">
              <strong>Notes:</strong><br>
              ${invoice.notes}
            </div>
          ` : ''}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
            <p>Thank you for your business!</p>
            <p style="font-size: 12px;">This invoice was sent from ${business.name}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate plain text version of invoice
  generateInvoicePlainText(invoice, customer, business) {
    const total = this.calculateTotal(invoice);
    const itemsList = invoice.items.map(item => 
      `  - ${item.description}: ${item.quantity} x $${item.rate.toFixed(2)} = $${(item.quantity * item.rate).toFixed(2)}`
    ).join('\n');

    return `
INVOICE #${invoice.invoice.number}

FROM:
${business.name}
${business.address || ''}
${business.city ? `${business.city}, ${business.state} ${business.zip}` : ''}
${business.email}
${business.phone || ''}

TO:
${customer.name || customer.company}
${customer.address || ''}
${customer.email}
${customer.phone || ''}

Invoice Date: ${invoice.invoice.date}
Due Date: ${invoice.invoice.dueDate}
Terms: ${invoice.invoice.terms}

ITEMS:
${itemsList}

TOTAL: $${total.toFixed(2)}

${invoice.notes ? `Notes: ${invoice.notes}` : ''}

Thank you for your business!
    `.trim();
  }

  // Generate payment confirmation HTML
  generatePaymentHTML(payment, invoice, customer, business) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Payment Received!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your payment</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p>Hi ${customer.name || customer.company},</p>
          
          <p>We've received your payment of <strong>$${payment.amount.toFixed(2)}</strong> for Invoice #${invoice.invoice.number}.</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #059669;">Payment Details</h3>
            <table style="width: 100%;">
              <tr><td>Amount:</td><td><strong>$${payment.amount.toFixed(2)}</strong></td></tr>
              <tr><td>Invoice:</td><td>#${invoice.invoice.number}</td></tr>
              <tr><td>Date:</td><td>${new Date().toLocaleDateString()}</td></tr>
              <tr><td>Reference:</td><td>${payment.reference || 'N/A'}</td></tr>
            </table>
          </div>
          
          <p>Your account has been updated and the invoice has been marked as paid.</p>
          
          <p>Best regards,<br>
          ${business.name}</p>
        </div>
      </body>
      </html>
    `;
  }

  generatePaymentPlainText(payment, invoice, customer, business) {
    return `
Payment Received!

Hi ${customer.name || customer.company},

We've received your payment of $${payment.amount.toFixed(2)} for Invoice #${invoice.invoice.number}.

Payment Details:
- Amount: $${payment.amount.toFixed(2)}
- Invoice: #${invoice.invoice.number}
- Date: ${new Date().toLocaleDateString()}
- Reference: ${payment.reference || 'N/A'}

Your account has been updated and the invoice has been marked as paid.

Best regards,
${business.name}
    `.trim();
  }

  // Generate reminder HTML
  generateReminderHTML(invoice, customer, business, daysOverdue) {
    const total = this.calculateTotal(invoice);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Payment Reminder</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Invoice #${invoice.invoice.number} - ${daysOverdue} days overdue</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p>Hi ${customer.name || customer.company},</p>
          
          <p>This is a friendly reminder that Invoice #${invoice.invoice.number} for <strong>$${total.toFixed(2)}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #d97706;">Invoice Details</h3>
            <table style="width: 100%;">
              <tr><td>Invoice Number:</td><td><strong>#${invoice.invoice.number}</strong></td></tr>
              <tr><td>Amount Due:</td><td><strong>$${total.toFixed(2)}</strong></td></tr>
              <tr><td>Due Date:</td><td>${invoice.invoice.dueDate}</td></tr>
              <tr><td>Days Overdue:</td><td><strong>${daysOverdue} days</strong></td></tr>
            </table>
          </div>
          
          <p>Please make payment at your earliest convenience to avoid any late fees or service interruptions.</p>
          
          <p>If you've already sent payment, please disregard this notice. If you have any questions or concerns, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          ${business.name}</p>
        </div>
      </body>
      </html>
    `;
  }

  generateReminderPlainText(invoice, customer, business, daysOverdue) {
    const total = this.calculateTotal(invoice);
    
    return `
Payment Reminder

Hi ${customer.name || customer.company},

This is a friendly reminder that Invoice #${invoice.invoice.number} for $${total.toFixed(2)} is now ${daysOverdue} days overdue.

Invoice Details:
- Invoice Number: #${invoice.invoice.number}
- Amount Due: $${total.toFixed(2)}
- Due Date: ${invoice.invoice.dueDate}
- Days Overdue: ${daysOverdue} days

Please make payment at your earliest convenience to avoid any late fees or service interruptions.

If you've already sent payment, please disregard this notice. If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
${business.name}
    `.trim();
  }

  // Calculate invoice total
  calculateTotal(invoice) {
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const tax = subtotal * (invoice.tax / 100);
    const discount = subtotal * (invoice.discount / 100);
    return subtotal + tax - discount;
  }

  // Prepare PDF attachment
  async preparePDFAttachment(invoice) {
    // This would integrate with your existing PDF generation
    // For now, returning a placeholder
    return {
      filename: `invoice-${invoice.invoice.number}.pdf`,
      content: 'base64_encoded_pdf_content',
      type: 'application/pdf'
    };
  }

  // Log email to database (will integrate with Supabase)
  async logEmail(emailData) {
    // TODO: Save to Supabase email_log table
    console.log('📧 Email log:', {
      to: emailData.to[0].email,
      subject: emailData.subject,
      status: emailData.status,
      timestamp: emailData.sent_at || emailData.attempted_at
    });
  }
}

// Export singleton instance
export default new EmailService();