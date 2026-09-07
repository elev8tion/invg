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
    <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-700/80 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Payment History</h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Track payments and receivables</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors shadow-sm text-sm"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/40">
          <div className="flex items-center gap-2 text-green-400 mb-1.5">
            <DollarSign size={18} />
            <span className="text-xs sm:text-sm font-medium">Received</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
            {money(totalReceived)}
          </p>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/40">
          <div className="flex items-center gap-2 text-yellow-400 mb-1.5">
            <Clock size={18} />
            <span className="text-xs sm:text-sm font-medium">Pending</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
            {money(totalPending)}
          </p>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/40">
          <div className="flex items-center gap-2 text-red-400 mb-1.5">
            <AlertCircle size={18} />
            <span className="text-xs sm:text-sm font-medium">Overdue</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
            {money(totalOverdue)}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by customer or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-700/70 border border-gray-600/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 text-sm min-h-[44px]"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-700/70 border border-gray-600/60 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm min-h-[44px]"
        >
          <option value="all">All Payments</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="text-left text-gray-400 text-xs sm:text-sm border-b border-gray-700/80">
              <th className="pb-3 pr-4">Invoice</th>
              <th className="pb-3 pr-4">Customer</th>
              <th className="pb-3 pr-4">Amount</th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Method</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Reference</th>
            </tr>
          </thead>
          <tbody className="text-white text-sm divide-y divide-gray-700/50">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="py-3 pr-4">
                  <span className="font-mono text-xs sm:text-sm text-purple-400 font-semibold">{payment.invoice_number}</span>
                </td>
                <td className="py-3 pr-4 font-medium text-gray-200">{payment.customer_name}</td>
                <td className="py-3 pr-4 font-mono tabular-nums font-semibold text-gray-100">{money(payment.amount)}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-xs sm:text-sm">
                      {payment.payment_date || payment.due_date}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs sm:text-sm text-gray-300">
                    {payment.payment_method || '-'}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(payment.status)}`}></span>
                    <span className="text-xs sm:text-sm capitalize font-medium">{payment.status}</span>
                    {getStatusIcon(payment.status)}
                  </div>
                </td>
                <td className="py-3">
                  <span className="text-xs text-gray-400 font-mono">
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