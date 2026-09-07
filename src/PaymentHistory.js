import React, { useState, useEffect, useCallback } from 'react';
import { money } from './lib/format';
import { DollarSign, Calendar, Check, Clock, AlertCircle, Download, Search } from 'lucide-react';
import { invoiceService, paymentService } from './lib/db';

const PaymentHistory = ({ businessId }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0
  });

  const loadPayments = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Get all invoices for the business
      const invoices = await invoiceService.getInvoices(businessId);
      
      // Get payment statistics
      const paymentStats = await paymentService.getPaymentStats(businessId);
      setStats(paymentStats);
      
      // Transform invoices into payment history format
      const paymentHistory = [];
      const today = new Date().toISOString().split('T')[0];
      
      for (const invoice of invoices) {
        // Check if invoice has payments
        if (invoice.payments && invoice.payments.length > 0) {
          // Add each payment as a separate entry
          invoice.payments.forEach(payment => {
            paymentHistory.push({
              id: `payment-${payment.id}`,
              invoice_number: invoice.invoice_number,
              customer_name: invoice.customer?.name || invoice.customer?.company || 'Unknown',
              amount: payment.amount,
              payment_date: payment.payment_date,
              payment_method: payment.payment_method || 'Bank Transfer',
              status: 'completed',
              reference: payment.reference_number || payment.transaction_id || '-',
              type: 'payment'
            });
          });
        }
        
        // Add pending/overdue invoices
        if (invoice.status !== 'paid' && invoice.status !== 'draft') {
          const isDue = invoice.due_date < today;
          paymentHistory.push({
            id: `invoice-${invoice.id}`,
            invoice_number: invoice.invoice_number,
            customer_name: invoice.customer?.name || invoice.customer?.company || 'Unknown',
            amount: invoice.balance_due || invoice.total_amount,
            payment_date: null,
            due_date: invoice.due_date,
            payment_method: null,
            status: isDue ? 'overdue' : 'pending',
            reference: null,
            type: 'invoice'
          });
        }
      }
      
      // Sort by date (payment_date or due_date)
      paymentHistory.sort((a, b) => {
        const dateA = a.payment_date || a.due_date;
        const dateB = b.payment_date || b.due_date;
        return new Date(dateB) - new Date(dateA);
      });
      
      setPayments(paymentHistory);
    } catch (error) {
      console.error('Error loading payments:', error);
      // Fallback to empty array
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Check size={16} />;
      case 'pending':
        return <Clock size={16} />;
      case 'overdue':
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesFilter = filter === 'all' || payment.status === filter;
    const matchesSearch = payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Stats are now loaded from the database in loadPayments()
  const totalReceived = stats.totalReceived;
  const totalPending = stats.totalPending;
  const totalOverdue = stats.totalOverdue;

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert('No payment records to export');
      return;
    }
    const headers = ['Invoice', 'Customer', 'Amount', 'Date', 'Method', 'Status', 'Reference'];
    const rows = filteredPayments.map(p => [
      `"${p.invoice_number || ''}"`,
      `"${p.customer_name || ''}"`,
      p.amount || 0,
      `"${p.payment_date || p.due_date || ''}"`,
      `"${p.payment_method || '-'}"`,
      `"${p.status || ''}"`,
      `"${p.reference || '-'}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payment-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Payment History</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Download size={18} />
          Export
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <DollarSign size={20} />
            <span className="text-sm">Received</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {money(totalReceived)}
          </p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <Clock size={20} />
            <span className="text-sm">Pending</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {money(totalPending)}
          </p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle size={20} />
            <span className="text-sm">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {money(totalOverdue)}
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by customer or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Payments</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm">
              <th className="pb-3">Invoice</th>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Method</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Reference</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="border-t border-gray-700">
                <td className="py-3">
                  <span className="font-mono text-sm">{payment.invoice_number}</span>
                </td>
                <td className="py-3">{payment.customer_name}</td>
                <td className="py-3 font-semibold">{money(payment.amount)}</td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm">
                      {payment.payment_date || payment.due_date}
                    </span>
                  </div>
                </td>
                <td className="py-3">
                  <span className="text-sm text-gray-300">
                    {payment.payment_method || '-'}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(payment.status)}`}></span>
                    <span className="text-sm capitalize">{payment.status}</span>
                    {getStatusIcon(payment.status)}
                  </div>
                </td>
                <td className="py-3">
                  <span className="text-sm text-gray-400 font-mono">
                    {payment.reference || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No payments found matching your criteria
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;