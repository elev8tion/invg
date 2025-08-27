import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Edit3, Trash2, Save, X, 
  Mail, Phone, MapPin, Building, ArrowLeft, 
  Calendar, DollarSign, FileText, TrendingUp,
  User, MoreVertical, Check
} from 'lucide-react';

const CustomerPage = ({ onNavigate, onCreateInvoiceForCustomer }) => {
  const [customers, setCustomers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    phone: '',
    notes: ''
  });

  // Stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalRevenue: 0,
    averageInvoiceValue: 0
  });

  // Load customers from localStorage on mount
  useEffect(() => {
    const savedCustomers = localStorage.getItem('customers');
    if (savedCustomers) {
      const customersData = JSON.parse(savedCustomers);
      setCustomers(customersData);
      calculateStats(customersData);
    }
  }, []);

  // Save customers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
    calculateStats(customers);
  }, [customers]);

  const calculateStats = (customerList) => {
    // Get saved invoices to calculate revenue per customer
    const savedInvoices = localStorage.getItem('savedInvoices');
    const invoices = savedInvoices ? JSON.parse(savedInvoices) : [];
    
    let activeCount = 0;
    let totalRev = 0;
    
    customerList.forEach(customer => {
      const customerInvoices = invoices.filter(inv => 
        inv.client?.name === customer.name
      );
      
      if (customerInvoices.length > 0) {
        activeCount++;
        customerInvoices.forEach(invoice => {
          if (invoice.status === 'paid') {
            const subtotal = (invoice.items || []).reduce((sum, item) => 
              sum + (item.quantity * item.rate), 0
            );
            const taxAmount = (subtotal * (invoice.tax || 0)) / 100;
            const discountAmount = (subtotal * (invoice.discount || 0)) / 100;
            totalRev += subtotal + taxAmount - discountAmount;
          }
        });
      }
    });

    setStats({
      totalCustomers: customerList.length,
      activeCustomers: activeCount,
      totalRevenue: totalRev,
      averageInvoiceValue: activeCount > 0 ? totalRev / activeCount : 0
    });
  };

  const handleAddCustomer = () => {
    if (!newCustomer.name.trim()) {
      alert('Please enter a customer name');
      return;
    }

    const customer = {
      ...newCustomer,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };

    setCustomers([...customers, customer]);
    setNewCustomer({
      name: '',
      company: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      email: '',
      phone: '',
      notes: ''
    });
    setShowAddForm(false);
    setSelectedCustomer(customer);
  };

  const handleUpdateCustomer = () => {
    setCustomers(customers.map(c => 
      c.id === editingCustomer.id ? editingCustomer : c
    ));
    setEditingCustomer(null);
    setSelectedCustomer(editingCustomer);
  };

  const handleDeleteCustomer = (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setCustomers(customers.filter(c => c.id !== id));
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerInvoices = (customer) => {
    const savedInvoices = localStorage.getItem('savedInvoices');
    const invoices = savedInvoices ? JSON.parse(savedInvoices) : [];
    return invoices.filter(inv => inv.client?.name === customer.name);
  };

  const getCustomerRevenue = (customer) => {
    const invoices = getCustomerInvoices(customer);
    let total = 0;
    
    invoices.forEach(invoice => {
      if (invoice.status === 'paid') {
        const subtotal = (invoice.items || []).reduce((sum, item) => 
          sum + (item.quantity * item.rate), 0
        );
        const taxAmount = (subtotal * (invoice.tax || 0)) / 100;
        const discountAmount = (subtotal * (invoice.discount || 0)) / 100;
        total += subtotal + taxAmount - discountAmount;
      }
    });
    
    return total;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Customer Management
              </h1>
              <p className="text-gray-400 mt-2">Manage your customers and view their history</p>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Users size={24} className="text-purple-400" />
              <span className="text-sm text-gray-400">Total</span>
            </div>
            <h3 className="text-2xl font-bold">{stats.totalCustomers}</h3>
            <p className="text-gray-400 text-sm mt-1">Customers</p>
          </div>

          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp size={24} className="text-green-400" />
              <span className="text-sm text-gray-400">Active</span>
            </div>
            <h3 className="text-2xl font-bold">{stats.activeCustomers}</h3>
            <p className="text-gray-400 text-sm mt-1">With Invoices</p>
          </div>

          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <DollarSign size={24} className="text-yellow-400" />
              <span className="text-sm text-gray-400">Revenue</span>
            </div>
            <h3 className="text-2xl font-bold">
              ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-gray-400 text-sm mt-1">Total Paid</p>
          </div>

          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <FileText size={24} className="text-blue-400" />
              <span className="text-sm text-gray-400">Average</span>
            </div>
            <h3 className="text-2xl font-bold">
              ${stats.averageInvoiceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-gray-400 text-sm mt-1">Per Customer</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
              {/* Search and Add */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Customer
                </button>
              </div>

              {/* Customer Grid */}
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No customers found</p>
                  <p className="text-sm">
                    {searchTerm ? 'Try a different search' : 'Click "Add Customer" to get started'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredCustomers.map(customer => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    const revenue = getCustomerRevenue(customer);
                    const invoiceCount = getCustomerInvoices(customer).length;
                    
                    return (
                      <div
                        key={customer.id}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-purple-900/20 border-purple-500' 
                            : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                        }`}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{customer.name}</h3>
                              {isSelected && (
                                <Check size={18} className="text-purple-400" />
                              )}
                            </div>
                            {customer.company && (
                              <p className="text-gray-400 text-sm mb-2">{customer.company}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                              {customer.email && (
                                <span className="flex items-center gap-1">
                                  <Mail size={14} /> {customer.email}
                                </span>
                              )}
                              {customer.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={14} /> {customer.phone}
                                </span>
                              )}
                              {customer.city && customer.state && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={14} /> {customer.city}, {customer.state}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 mt-3 text-sm">
                              <span className="text-green-400">
                                ${revenue.toFixed(2)} revenue
                              </span>
                              <span className="text-blue-400">
                                {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCustomer(customer);
                              }}
                              className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomer(customer.id);
                              }}
                              className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Customer Details / Forms */}
          <div className="lg:col-span-1">
            {showAddForm || editingCustomer ? (
              <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
                <h2 className="text-xl font-semibold mb-6 text-purple-300">
                  {showAddForm ? 'Add New Customer' : 'Edit Customer'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={showAddForm ? newCustomer.name : editingCustomer.name}
                      onChange={(e) => showAddForm 
                        ? setNewCustomer({...newCustomer, name: e.target.value})
                        : setEditingCustomer({...editingCustomer, name: e.target.value})
                      }
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      value={showAddForm ? newCustomer.company : editingCustomer.company}
                      onChange={(e) => showAddForm
                        ? setNewCustomer({...newCustomer, company: e.target.value})
                        : setEditingCustomer({...editingCustomer, company: e.target.value})
                      }
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={showAddForm ? newCustomer.email : editingCustomer.email}
                      onChange={(e) => showAddForm
                        ? setNewCustomer({...newCustomer, email: e.target.value})
                        : setEditingCustomer({...editingCustomer, email: e.target.value})
                      }
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={showAddForm ? newCustomer.phone : editingCustomer.phone}
                      onChange={(e) => showAddForm
                        ? setNewCustomer({...newCustomer, phone: e.target.value})
                        : setEditingCustomer({...editingCustomer, phone: e.target.value})
                      }
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={showAddForm ? newCustomer.address : editingCustomer.address}
                      onChange={(e) => showAddForm
                        ? setNewCustomer({...newCustomer, address: e.target.value})
                        : setEditingCustomer({...editingCustomer, address: e.target.value})
                      }
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={showAddForm ? newCustomer.city : editingCustomer.city}
                        onChange={(e) => showAddForm
                          ? setNewCustomer({...newCustomer, city: e.target.value})
                          : setEditingCustomer({...editingCustomer, city: e.target.value})
                        }
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={showAddForm ? newCustomer.state : editingCustomer.state}
                        onChange={(e) => showAddForm
                          ? setNewCustomer({...newCustomer, state: e.target.value})
                          : setEditingCustomer({...editingCustomer, state: e.target.value})
                        }
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={showAddForm ? newCustomer.zip : editingCustomer.zip}
                      onChange={(e) => showAddForm
                        ? setNewCustomer({...newCustomer, zip: e.target.value})
                        : setEditingCustomer({...editingCustomer, zip: e.target.value})
                      }
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={showAddForm ? newCustomer.notes : editingCustomer.notes}
                      onChange={(e) => showAddForm
                        ? setNewCustomer({...newCustomer, notes: e.target.value})
                        : setEditingCustomer({...editingCustomer, notes: e.target.value})
                      }
                      rows={3}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={showAddForm ? handleAddCustomer : handleUpdateCustomer}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      {showAddForm ? 'Add Customer' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingCustomer(null);
                      }}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedCustomer ? (
              <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
                <h2 className="text-xl font-semibold mb-6 text-purple-300">
                  Customer Details
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
                      {selectedCustomer.company && (
                        <p className="text-gray-400 text-sm">{selectedCustomer.company}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-3">
                        <Mail size={18} className="text-gray-400" />
                        <span>{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-3">
                        <Phone size={18} className="text-gray-400" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                    {(selectedCustomer.address || selectedCustomer.city) && (
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-gray-400 mt-1" />
                        <div>
                          {selectedCustomer.address && <p>{selectedCustomer.address}</p>}
                          {(selectedCustomer.city || selectedCustomer.state || selectedCustomer.zip) && (
                            <p>
                              {selectedCustomer.city}{selectedCustomer.city && selectedCustomer.state && ', '}
                              {selectedCustomer.state} {selectedCustomer.zip}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedCustomer.createdAt && (
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-gray-400" />
                        <span>Customer since {new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {selectedCustomer.notes && (
                    <div className="pt-4 border-t border-gray-700">
                      <p className="text-sm text-gray-400 mb-2">Notes</p>
                      <p className="text-gray-300">{selectedCustomer.notes}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-700/50 p-3 rounded-xl">
                        <p className="text-gray-400 mb-1">Total Revenue</p>
                        <p className="text-xl font-bold text-green-400">
                          ${getCustomerRevenue(selectedCustomer).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gray-700/50 p-3 rounded-xl">
                        <p className="text-gray-400 mb-1">Invoices</p>
                        <p className="text-xl font-bold text-blue-400">
                          {getCustomerInvoices(selectedCustomer).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setEditingCustomer(selectedCustomer)}
                      className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit3 size={18} />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (onCreateInvoiceForCustomer) {
                          onCreateInvoiceForCustomer(selectedCustomer);
                        }
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <FileText size={18} />
                      Create Invoice
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
                <div className="text-center py-12 text-gray-500">
                  <User size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Select a customer</p>
                  <p className="text-sm">Click on a customer to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPage;