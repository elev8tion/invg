import React, { useState, useEffect } from 'react';
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
  Filter,
  ChevronDown,
  UserPlus,
  Package,
  CreditCard
} from 'lucide-react';
import PaymentHistory from './PaymentHistory';
import PurchaseOrders from './PurchaseOrders';
import ResponsiveWrapper, { ResponsiveGrid, ResponsiveCard, ResponsiveButton, ResponsiveHeading } from './components/ResponsiveWrapper';

const Dashboard = ({ onNavigate, savedInvoices, onEditInvoice, onCreateInvoiceForCustomer, currentBusiness }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstandingPayments: 0,
    monthlyIncome: 0,
    activeClients: 0,
    revenueChange: 0,
    outstandingChange: 0
  });

  useEffect(() => {
    // Load saved customers
    const savedCustomers = localStorage.getItem('customers');
    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    }
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
  }, [savedInvoices]);

  const calculateStats = (invoiceList) => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    let totalRevenue = 0;
    let outstandingPayments = 0;
    let monthlyIncome = 0;
    const clientSet = new Set();

    invoiceList.forEach(invoice => {
      const amount = calculateInvoiceTotal(invoice);
      
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
  };

  const calculateInvoiceTotal = (invoice) => {
    const subtotal = (invoice.items || []).reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxAmount = (subtotal * (invoice.tax || 0)) / 100;
    const discountAmount = (subtotal * (invoice.discount || 0)) / 100;
    return subtotal + taxAmount - discountAmount;
  };

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
    
    // Save to localStorage
    localStorage.setItem('savedInvoices', JSON.stringify(updatedInvoices));
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
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Invoice Dashboard
          </h1>
          <p className="text-gray-400 mt-2">Manage your invoices and track payments</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <DollarSign size={24} className="text-green-400" />
              </div>
              <span className={`text-sm flex items-center gap-1 ${stats.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.revenueChange >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(stats.revenueChange)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</h3>
            <p className="text-gray-400 text-sm mt-1">Total Revenue</p>
          </div>

          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Clock size={24} className="text-yellow-400" />
              </div>
              <span className={`text-sm flex items-center gap-1 ${stats.outstandingChange <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.outstandingChange >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(stats.outstandingChange)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold">${stats.outstandingPayments.toFixed(2)}</h3>
            <p className="text-gray-400 text-sm mt-1">Outstanding</p>
          </div>

          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <TrendingUp size={24} className="text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">
                <Calendar size={16} className="inline" />
              </span>
            </div>
            <h3 className="text-2xl font-bold">${stats.monthlyIncome.toFixed(2)}</h3>
            <p className="text-gray-400 text-sm mt-1">This Month</p>
          </div>

          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Users size={24} className="text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Active</span>
            </div>
            <h3 className="text-2xl font-bold">{stats.activeClients}</h3>
            <p className="text-gray-400 text-sm mt-1">Clients</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'overview' 
                ? 'text-purple-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText size={18} />
              Overview
            </span>
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'payments' 
                ? 'text-purple-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <CreditCard size={18} />
              Payment History
            </span>
            {activeTab === 'payments' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('purchase-orders')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'purchase-orders' 
                ? 'text-purple-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Package size={18} />
              Purchase Orders
            </span>
            {activeTab === 'purchase-orders' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-6 text-purple-300">Quick Actions</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => onNavigate('create')}
                  className="w-full p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200 flex items-center gap-3 text-left"
                >
                  <Plus size={20} className="text-purple-400" />
                  <div>
                    <p className="font-medium">Create Invoice</p>
                    <p className="text-xs text-gray-400">Start a new invoice</p>
                  </div>
                </button>

                {/* Manage Customers Button */}
                <button
                  onClick={() => onNavigate('customers')}
                  className="w-full p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200 flex items-center gap-3 text-left"
                >
                  <UserPlus size={20} className="text-blue-400" />
                  <div>
                    <p className="font-medium">Manage Customers</p>
                    <p className="text-xs text-gray-400">View and manage customers</p>
                  </div>
                </button>

                {/* Customer Selection Dropdown */}
                <div className="pt-3 border-t border-gray-700">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Quick Invoice for:
                  </label>
                  <div className="relative">
                    <button
                      className="w-full px-4 py-3 bg-gray-700 rounded-lg text-left hover:bg-gray-600 transition-colors flex justify-between items-center"
                      onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    >
                      <span className="text-gray-300">
                        {selectedCustomer ? selectedCustomer.name : 'Select a customer'}
                      </span>
                      <ChevronDown size={20} className="text-gray-400" />
                    </button>
                    
                    {showCustomerDropdown && (
                      <div className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg shadow-xl z-10 max-h-64 overflow-auto border border-gray-700">
                        <button
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center gap-2 border-b border-gray-700"
                          onClick={() => {
                            setShowCustomerDropdown(false);
                            onNavigate('customers');
                          }}
                        >
                          <Plus size={18} className="text-blue-400" />
                          <span className="font-medium text-blue-400">Add New Customer</span>
                        </button>
                        {customers.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500">
                            No customers yet. Click above to add one.
                          </div>
                        ) : (
                          customers.map(customer => (
                            <button
                              key={customer.id}
                              className="w-full px-4 py-3 text-left hover:bg-gray-700 border-b border-gray-700"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowCustomerDropdown(false);
                                if (onCreateInvoiceForCustomer) {
                                  onCreateInvoiceForCustomer(customer);
                                }
                              }}
                            >
                              <div className="font-medium text-gray-200">{customer.name}</div>
                              {customer.company && (
                                <div className="text-sm text-gray-400">{customer.company}</div>
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
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-3">Status Overview</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Draft</span>
                    <span className="px-2 py-1 bg-gray-600 rounded-lg text-xs">{getInvoicesByStatus('draft').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Sent</span>
                    <span className="px-2 py-1 bg-blue-600 rounded-lg text-xs">{getInvoicesByStatus('sent').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Viewed</span>
                    <span className="px-2 py-1 bg-yellow-600 rounded-lg text-xs">{getInvoicesByStatus('viewed').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Paid</span>
                    <span className="px-2 py-1 bg-green-600 rounded-lg text-xs">{getInvoicesByStatus('paid').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overdue</span>
                    <span className="px-2 py-1 bg-red-600 rounded-lg text-xs">{getInvoicesByStatus('overdue').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Pipeline */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-purple-300">Invoice Pipeline</h2>
                
                {/* Search and Filter */}
                <div className="flex gap-3">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                    />
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Pipeline Columns */}
              <div className="grid grid-cols-4 gap-4">
                {['draft', 'sent', 'viewed', 'paid'].map(status => (
                  <div key={status} className="bg-gray-700/50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium capitalize">{status}</h3>
                      <span className={`px-2 py-1 ${getStatusColor(status)} rounded-lg text-xs`}>
                        {getInvoicesByStatus(status).length}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {getInvoicesByStatus(status).slice(0, 3).map(invoice => (
                        <div
                          key={invoice.id}
                          className={`p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors cursor-pointer ${
                            isOverdue(invoice) ? 'border border-red-500/50' : ''
                          }`}
                          onClick={() => {
                            onEditInvoice(invoice);
                            onNavigate('create');
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-medium text-purple-400">
                              #{invoice.invoice?.number}
                            </span>
                            {isOverdue(invoice) && (
                              <AlertCircle size={14} className="text-red-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-300 truncate">
                            {invoice.client?.name || 'No client'}
                          </p>
                          <p className="text-sm font-semibold mt-1">
                            ${calculateInvoiceTotal(invoice).toFixed(2)}
                          </p>
                        </div>
                      ))}
                      
                      {getInvoicesByStatus(status).length > 3 && (
                        <button className="text-xs text-gray-400 hover:text-gray-300">
                          +{getInvoicesByStatus(status).length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Invoices List */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {filteredInvoices.slice(0, 5).map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${getStatusColor(invoice.status)} rounded-lg`}>
                          {getStatusIcon(invoice.status)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Invoice #{invoice.invoice?.number}
                          </p>
                          <p className="text-xs text-gray-400">
                            {invoice.client?.name || 'No client'} • ${calculateInvoiceTotal(invoice).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <select
                          value={invoice.status}
                          onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 bg-gray-600 border border-gray-500 rounded-lg text-xs focus:outline-none"
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
                          className="p-1 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
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