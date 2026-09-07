import React, { useState } from 'react';
import { money } from '../lib/format';
import { invoiceTotal } from '../lib/invoiceTotals';
import { Send, X, Mail, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import emailService from '../services/emailService';

const EmailModal = ({ isOpen, onClose, invoice, customer, business }) => {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', null
  const [emailOptions, setEmailOptions] = useState({
    to: customer?.email || '',
    subject: `Invoice #${invoice?.invoice?.number || ''} from ${business?.name || 'Your Business'}`,
    message: '',
    attachPDF: true,
    sendCopy: false
  });

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!emailOptions.to) {
      setStatus({ type: 'error', message: 'Please enter an email address' });
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      const result = await emailService.sendInvoice(
        invoice,
        { ...customer, email: emailOptions.to },
        business,
        {
          subject: emailOptions.subject,
          attachPDF: emailOptions.attachPDF,
          customMessage: emailOptions.message
        }
      );

      if (result.success) {
        setStatus({ type: 'success', message: 'Invoice sent successfully!' });
        
        // Send copy to business if requested
        if (emailOptions.sendCopy && business?.email) {
          await emailService.sendInvoice(
            invoice,
            { name: business.name, email: business.email },
            business,
            {
              subject: `[Copy] ${emailOptions.subject}`,
              attachPDF: emailOptions.attachPDF
            }
          );
        }

        setTimeout(() => {
          onClose();
          setStatus(null);
        }, 2000);
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to send email' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gray-800 rounded-2xl p-5 sm:p-6 w-full max-w-md border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail size={24} className="text-purple-400" />
            Send Invoice
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* To Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Send To
            </label>
            <input
              type="email"
              value={emailOptions.to}
              onChange={(e) => setEmailOptions({ ...emailOptions, to: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              placeholder="customer@example.com"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={emailOptions.subject}
              onChange={(e) => setEmailOptions({ ...emailOptions, subject: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message (optional)
            </label>
            <textarea
              value={emailOptions.message}
              onChange={(e) => setEmailOptions({ ...emailOptions, message: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
              rows="3"
              placeholder="Add a personal message..."
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={emailOptions.attachPDF}
                onChange={(e) => setEmailOptions({ ...emailOptions, attachPDF: e.target.checked })}
                className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm">Attach invoice as PDF</span>
            </label>
            
            {business?.email && (
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailOptions.sendCopy}
                  onChange={(e) => setEmailOptions({ ...emailOptions, sendCopy: e.target.checked })}
                  className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm">Send copy to {business.email}</span>
              </label>
            )}
          </div>

          {/* Status Message */}
          {status && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              status.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {status.message}
            </div>
          )}

          {/* Preview Section */}
          <div className="bg-gray-700/50 rounded-lg p-3 text-sm text-gray-400">
            <p className="font-medium text-gray-300 mb-1">Invoice Details:</p>
            <p>Invoice #{invoice?.invoice?.number}</p>
            <p>Amount: {money(invoiceTotal(invoice))}</p>
            <p>Due: {invoice?.invoice?.dueDate}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !emailOptions.to}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Invoice
                </>
              )}
            </button>
          </div>

          {/* API Key Warning */}
          {!process.env.REACT_APP_EMAILIT_API_KEY && (
            <div className="text-xs text-yellow-400 text-center">
              ⚠️ Email API not configured. Add REACT_APP_EMAILIT_API_KEY to .env
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailModal;