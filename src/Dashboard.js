import React, { useState, useEffect, useCallback } from 'react';
import { money } from './lib/format';
import { invoiceTotal } from './lib/invoiceTotals';
import { 
  Plus, 
  DollarSign, 
  Clock, 
  Users, 
  TrendingUp, 
  FileText,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Search,
  ChevronDown,
  UserPlus,
  Package,
  CreditCard
} from 'lucide-react';
import PaymentHistory from './PaymentHistory';
import PurchaseOrders from './PurchaseOrders';

const Dashboard = ({ onNavigate, savedInvoices, onEditInvoice, onDeleteInvoice, onUpdateInvoice, onCreateInvoiceForCustomer, currentBusiness, customers = [], userId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstandingPayments: 0,
    monthlyIncome: 0,
    activeClients: 0,
    revenueChange: 0,
    outstandingChange: 0
  });

  const calculateStats = useCallback((invoiceList) => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    let totalRevenue = 0;
    let outstandingPayments = 0;
    let monthlyIncome = 0;
    const clientSet = new Set();

    invoiceList.forEach(invoice => {
      const amount = (invoice.items || []).reduce((sum, item) => sum + (item.quantity * item.rate), 0) +
        (((invoice.items || []).reduce((sum, item) => sum + (item.quantity * item.rate), 0) * (invoice.tax || 0)) / 100) -
        (((invoice.items || []).reduce((sum, item) => sum + (item.quantity * item.rate), 0) * (invoice.discount || 0)) / 100);
      
      // Add to total revenue if sent or paid
      if (invoice.status === 'paid') {
        totalRevenue += amount;
        
        // Check if paid this month
        const paidDate = invoice.paidDate ? new Date(invoice.paidDate) : null;
        if (paidDate && paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear) {
          monthlyIncome += amount;
        }
      } else if (invoice.status === 'sent' || invoice.status === 'viewed') {
        outstandingPayments += amount;
      }
      
      // Count unique clients
      if (invoice.client?.name) {
        clientSet.add(invoice.client.name);
      }
    });

    // Calculate changes (mock data for demo - in real app, compare with previous period)
    const revenueChange = 12.5; // Percentage
    const outstandingChange = -8.3; // Percentage

    setStats({
      totalRevenue,
      outstandingPayments,
      monthlyIncome,
      activeClients: clientSet.size,
      revenueChange,
      outstandingChange
    });
  }, []);

  useEffect(() => {
    // Initialize invoices with status
    const invoicesWithStatus = savedInvoices.map(inv => ({
      ...inv,
      status: inv.status || 'draft',
      paidAmount: inv.paidAmount || 0,
      viewedDate: inv.viewedDate || null,
      sentDate: inv.sentDate || null,
      paidDate: inv.paidDate || null
    }));
    setInvoices(invoicesWithStatus);
    calculateStats(invoicesWithStatus);
  }, [savedInvoices, calculateStats]);

  const updateInvoiceStatus = (invoiceId, newStatus) => {
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === invoiceId) {
        const updates = { ...inv, status: newStatus };
        
        // Add timestamps based on status
        const now = new Date().toISOString();
        switch(newStatus) {
          case 'sent':
            updates.sentDate = now;
            break;
          case 'viewed':
            updates.viewedDate = now;
            break;
          case 'paid':
            updates.paidDate = now;
            break;
          default:
            break;
        }
        
        return updates;
      }
      return inv;
    });
    
    setInvoices(updatedInvoices);
    calculateStats(updatedInvoices);
    
    const changed = updatedInvoices.find(inv => inv.id === invoiceId);
    if (onUpdateInvoice && changed) {
      onUpdateInvoice(invoiceId, changed);
    } else if (userId) {
      localStorage.setItem(`savedInvoices:${userId}`, JSON.stringify(updatedInvoices));
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'draft': return 'bg-gray-600';
      case 'sent': return 'bg-blue-600';
      case 'viewed': return 'bg-yellow-600';
      case 'paid': return 'bg-green-600';
      case 'overdue': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'draft': return <FileText size={16} />;
      case 'sent': return <Send size={16} />;
      case 'viewed': return <Eye size={16} />;
      case 'paid': return <CheckCircle size={16} />;
      case 'overdue': return <AlertCircle size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const isOverdue = (invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'draft') return false;
    const dueDate = new Date(invoice.invoice?.dueDate);
    return dueDate < new Date();
  };

  const getInvoicesByStatus = (status) => {
    return invoices.filter(inv => {
      if (status === 'overdue') {
        return isOverdue(inv);
      }
      return inv.status === status;
    });
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                          (filterStatus === 'overdue' ? isOverdue(inv) : inv.status === filterStatus);
    return matchesSearch && matchesFilter;
  });


  return (
    <div className="text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent tracking-tight">
            Invoice Dashboard
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-1">Manage your invoices and track payments</p>
        </div>

        {/* Stats Bar - 2 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 sm:p-2.5 bg-green-500/20 rounded-xl">
                <DollarSign size={20} className="text-green-400" />
              </div>
              <span className={`text-xs sm:text-sm font-medium flex items-center gap-0.5 ${stats.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.revenueChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {Math.abs(stats.revenueChange)}%
              </span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold font-mono tabular-nums tracking-tight">{money(stats.totalRevenue)}</h3>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Total Revenue</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 sm:p-2.5 bg-yellow-500/20 rounded-xl">
                <Clock size={20} className="text-yellow-400" />
              </div>
              <span className={`text-xs sm:text-sm font-medium flex items-center gap-0.5 ${stats.outstandingChange <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.outstandingChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {Math.abs(stats.outstandingChange)}%
              </span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold font-mono tabular-nums tracking-tight">{money(stats.outstandingPayments)}</h3>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Outstanding</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 sm:p-2.5 bg-purple-500/20 rounded-xl">
                <TrendingUp size={20} className="text-purple-400" />
              </div>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar size={14} />
              </span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold font-mono tabular-nums tracking-tight">{money(stats.monthlyIncome)}</h3>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">This Month</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 sm:p-2.5 bg-blue-500/20 rounded-xl">
                <Users size={20} className="text-blue-400" />
              </div>
              <span className="text-xs text-gray-400 font-medium">Active</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold font-mono tabular-nums tracking-tight">{stats.activeClients}</h3>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Clients</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Touch-friendly and horizontally scrollable on mobile */}
        <div className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 border-b border-gray-700/80 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`min-h-[44px] px-4 sm:px-6 py-2.5 sm:py-3 font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 text-sm sm:text-base ${
              activeTab === 'overview' 
                ? 'text-purple-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <FileText size={18} />
            Overview
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('payments')}
            className={`min-h-[44px] px-4 sm:px-6 py-2.5 sm:py-3 font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 text-sm sm:text-base ${
              activeTab === 'payments' 
                ? 'text-purple-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <CreditCard size={18} />
            Payment History
            {activeTab === 'payments' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('purchase-orders')}
            className={`min-h-[44px] px-4 sm:px-6 py-2.5 sm:py-3 font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 text-sm sm:text-base ${
              activeTab === 'purchase-orders' 
                ? 'text-purple-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Package size={18} />
            Purchase Orders
            {activeTab === 'purchase-orders' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Quick Actions Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-700/80 shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-purple-300">Quick Actions</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => onNavigate('create')}
                  className="w-full min-h-[52px] p-3.5 sm:p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 rounded-xl transition-all duration-200 flex items-center gap-3 text-left"
                >
                  <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                    <Plus size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm sm:text-base">Create Invoice</p>
                    <p className="text-xs text-gray-400">Start a new blank or templated invoice</p>
                  </div>
                </button>

                {/* Manage Customers Button */}
                <button
                  onClick={() => onNavigate('customers')}
                  className="w-full min-h-[52px] p-3.5 sm:p-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 rounded-xl transition-all duration-200 flex items-center gap-3 text-left"
                >
                  <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm sm:text-base">Manage Customers</p>
                    <p className="text-xs text-gray-400">View customer list & billing details</p>
                  </div>
                </button>

                {/* Customer Selection Dropdown */}
                <div className="pt-3 border-t border-gray-700/80">
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">
                    Quick Invoice for:
                  </label>
                  <div className="relative">
                    <button
                      className="w-full min-h-[44px] px-4 py-2.5 bg-gray-700/60 border border-gray-600/60 rounded-xl text-left hover:bg-gray-700 transition-colors flex justify-between items-center text-sm"
                      onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    >
                      <span className="text-gray-200 truncate">
                        {selectedCustomer ? selectedCustomer.name : 'Select a customer'}
                      </span>
                      <ChevronDown size={18} className="text-gray-400 shrink-0 ml-2" />
                    </button>
                    
                    {showCustomerDropdown && (
                      <div className="absolute top-full mt-1.5 w-full bg-gray-800 rounded-xl shadow-2xl z-20 max-h-64 overflow-auto border border-gray-700">
                        <button
                          className="w-full min-h-[44px] px-4 py-3 text-left hover:bg-gray-700/70 flex items-center gap-2 border-b border-gray-700"
                          onClick={() => {
                            setShowCustomerDropdown(false);
                            onNavigate('customers');
                          }}
                        >
                          <Plus size={16} className="text-purple-400" />
                          <span className="font-medium text-sm text-purple-400">Add New Customer</span>
                        </button>
                        {customers.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs sm:text-sm text-gray-500">
                            No customers yet. Click above to add one.
                          </div>
                        ) : (
                          customers.map(customer => (
                            <button
                              key={customer.id}
                              className="w-full min-h-[44px] px-4 py-3 text-left hover:bg-gray-700/70 border-b border-gray-700/50 last:border-b-0 transition-colors"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowCustomerDropdown(false);
                                if (onCreateInvoiceForCustomer) {
                                  onCreateInvoiceForCustomer(customer);
                                }
                              }}
                            >
                              <div className="font-medium text-sm text-gray-200 truncate">{customer.name}</div>
                              {customer.company && (
                                <div className="text-xs text-gray-400 truncate">{customer.company}</div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Status Summary */}
              <div className="mt-5 pt-5 border-t border-gray-700/80">
                <p className="text-xs sm:text-sm font-medium text-gray-400 mb-3">Status Overview</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-300">Draft</span>
                    <span className="px-2.5 py-0.5 bg-gray-700 rounded-full text-xs font-mono">{getInvoicesByStatus('draft').length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-300">Sent</span>
                    <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-mono">{getInvoicesByStatus('sent').length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-300">Viewed</span>
                    <span className="px-2.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-mono">{getInvoicesByStatus('viewed').length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-300">Paid</span>
                    <span className="px-2.5 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-mono">{getInvoicesByStatus('paid').length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-300">Overdue</span>
                    <span className="px-2.5 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-mono">{getInvoicesByStatus('overdue').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Pipeline */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-700/80 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-purple-300">Invoice Pipeline</h2>
                
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-700/60 border border-gray-600/60 rounded-xl focus:border-purple-500 focus:outline-none text-sm min-h-[40px]"
                    />
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-gray-700/60 border border-gray-600/60 rounded-xl focus:border-purple-500 focus:outline-none text-sm min-h-[40px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Pipeline Columns: Horizontal swipe with snap on mobile, 4-col grid on desktop */}
              <div className="flex lg:grid lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 snap-x snap-mandatory">
                {['draft', 'sent', 'viewed', 'paid'].map(status => (
                  <div key={status} className="w-[260px] sm:w-[280px] shrink-0 lg:w-auto snap-start bg-gray-700/40 rounded-xl p-3 sm:p-4 border border-gray-600/40">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs sm:text-sm font-semibold capitalize text-gray-200">{status}</h3>
                      <span className={`px-2 py-0.5 ${getStatusColor(status)} text-white rounded-md text-xs font-mono`}>
                        {getInvoicesByStatus(status).length}
                      </span>
                    </div>
                    
                    <div className="space-y-2.5">
                      {getInvoicesByStatus(status).slice(0, 3).map(invoice => (
                        <div
                          key={invoice.id}
                          className={`p-3 bg-gray-800/90 rounded-xl hover:bg-gray-800 border transition-colors cursor-pointer ${
                            isOverdue(invoice) ? 'border-red-500/50' : 'border-gray-700/60 hover:border-gray-600'
                          }`}
                          onClick={() => {
                            onEditInvoice(invoice);
                            onNavigate('create');
                          }}
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <span className="text-xs font-semibold text-purple-400 font-mono">
                              #{invoice.invoice?.number}
                            </span>
                            {isOverdue(invoice) && (
                              <AlertCircle size={14} className="text-red-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-300 truncate font-medium">
                            {invoice.client?.name || 'No client'}
                          </p>
                          <p className="text-xs sm:text-sm font-semibold mt-1.5 font-mono tabular-nums text-gray-100">
                            {money(invoiceTotal(invoice))}
                          </p>
                        </div>
                      ))}
                      
                      {getInvoicesByStatus(status).length > 3 && (
                        <button className="w-full text-center py-1 text-xs text-purple-400 hover:text-purple-300 font-medium">
                          +{getInvoicesByStatus(status).length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Invoices List */}
              <div className="mt-6 pt-6 border-t border-gray-700/80">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Activity</h3>
                <div className="space-y-2.5">
                  {filteredInvoices.slice(0, 5).map(invoice => (
                    <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-gray-700/30 hover:bg-gray-700/50 rounded-xl gap-2.5 sm:gap-3 border border-gray-600/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${getStatusColor(invoice.status)} text-white rounded-lg shrink-0`}>
                          {getStatusIcon(invoice.status)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            Invoice #{invoice.invoice?.number}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {invoice.client?.name || 'No client'} • <span className="font-mono tabular-nums text-gray-300">{money(invoiceTotal(invoice))}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-600/30">
                        <select
                          value={invoice.status}
                          onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white focus:outline-none min-h-[36px]"
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="viewed">Viewed</option>
                          <option value="paid">Paid</option>
                        </select>
                        
                        <button
                          onClick={() => {
                            onEditInvoice(invoice);
                            onNavigate('create');
                          }}
                          className="p-2 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Edit Invoice"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No invoices found matching criteria
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
        
        {/* Payment History Tab */}
        {activeTab === 'payments' && (
          <PaymentHistory businessId={currentBusiness?.id} />
        )}
        
        {/* Purchase Orders Tab */}
        {activeTab === 'purchase-orders' && (
          <PurchaseOrders businessId={currentBusiness?.id} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;