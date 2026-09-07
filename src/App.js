import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Save, Edit3, Plus, Trash2, Eye, LayoutDashboard, ChevronDown, Users, Send, CheckCircle, User, X } from 'lucide-react';
import CustomerManagement from './CustomerManagement';
import './App.css';
import './styles/responsive.css'; // Import responsive design system
import './styles/mobile-override.css'; // Import mobile-specific overrides
import './styles/invoice-mobile-fix.css'; // Import invoice mobile fixes
import './styles/global-responsive-fix.css'; // Import global responsive fixes for ALL components
import EmailModal from './components/EmailModal';
import InvoicePreview from './components/InvoicePreview';
import Dashboard from './Dashboard';
import FeedbackCommandCenter from './FeedbackCommandCenter';
import CustomerPage from './CustomerPage';
import BusinessSwitcher from './BusinessSwitcher';
import BusinessModal from './BusinessModal';
import PinLock from './PinLock';
import ChangePin from './ChangePin';
import PeopleAdmin from './PeopleAdmin';
import PaymentTermsField from './components/PaymentTermsField';
import { businessService, invoiceService, paymentService, userService } from './lib/db';
import { clearSession, loadInvoices, publicUser, readSession, saveInvoices } from './lib/session';
import useCustomers from './hooks/useCustomers';
import { downloadInvoicePdf } from './lib/invoicePdf';
import { money } from './lib/format';
import { invoiceTotal, invoiceTotals } from './lib/invoiceTotals';
import DevTools from './components/DevTools';
import './utils/cacheBuster'; // Import for side effects (keyboard shortcuts)

/** @deprecated Kept as the public name other modules already import. */
export const getInvoiceTotal = invoiceTotal;

const todayISO = () => new Date().toISOString().split('T')[0];
const plusDaysISO = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

function companyFromBusiness(business) {
  if (!business) {
    return {
      name: 'Your Company Name',
      address: '123 Business Street',
      city: 'City',
      state: 'State',
      zip: '12345',
      email: 'contact@company.com',
      phone: '(555) 123-4567',
    };
  }
  return {
    name: business.name || '',
    address: business.address || '',
    city: business.city || '',
    state: business.state || '',
    zip: business.zip || '',
    email: business.email || '',
    phone: business.phone || '',
  };
}

function blankInvoiceData(business) {
  const prefix = business?.invoice_prefix || 'INV';
  const next = Number(business?.next_invoice_number) || 1;
  return {
    company: companyFromBusiness(business),
    client: { name: '', address: '', email: '' },
    invoice: {
      number: business
        ? `${prefix}-${String(next).padStart(6, '0')}`
        : `INV-${Date.now().toString().slice(-6)}`,
      date: todayISO(),
      dueDate: plusDaysISO(30),
      terms: business?.default_payment_terms || 'Net 30',
    },
    items: [{ description: '', date: todayISO(), quantity: 0, rate: 0, amount: 0 }],
    notes: '',
    tax: Number(business?.default_tax_rate) || 0,
    discount: 0,
    logo: '',
  };
}

const InvoiceGenerator = ({ currentView, setCurrentView, savedInvoices, setSavedInvoices, editingInvoice, setEditingInvoice, customers, currentBusiness, onCustomersChanged, userId }) => {
  const [mobileTab, setMobileTab] = useState('form'); // 'form' | 'preview' on mobile
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCustomerManagement, setShowCustomerManagement] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTargetInvoice, setEmailTargetInvoice] = useState(null);
  // Customers come from the database via App's useCustomers hook. Previously
  // this kept its own localStorage copy that never re-synced with the prop.
  const localCustomers = customers || [];
  const [invoiceData, setInvoiceData] = useState(() => blankInvoiceData(currentBusiness));
  
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // True once the user picks terms by hand, so the business default stops
  // overwriting their choice.
  const [termsTouched, setTermsTouched] = useState(false);

  useEffect(() => {
    if (editingInvoice) {
      setInvoiceData(editingInvoice);
      setTermsTouched(true);
      setEditingInvoice(null);
    }
  }, [editingInvoice, setEditingInvoice]);

  // A fresh invoice follows the business. The business usually loads after
  // this component mounts, so seed company / number / terms once it arrives
  // -- unless the user is already editing a saved invoice or typed a client.
  useEffect(() => {
    if (!currentBusiness) return;
    setInvoiceData((prev) => {
      if (prev.id || prev.dbId || prev.client?.name) return prev;
      const next = blankInvoiceData(currentBusiness);
      return {
        ...next,
        invoice: {
          ...next.invoice,
          terms: termsTouched ? prev.invoice.terms : next.invoice.terms,
          date: prev.invoice.date || next.invoice.date,
          dueDate: prev.invoice.dueDate || next.invoice.dueDate,
        },
        items: prev.items,
        notes: prev.notes,
        discount: prev.discount,
        logo: prev.logo,
      };
    });
  }, [currentBusiness, termsTouched]);

  // Every amount on this screen -- and in the PDF and the email -- comes from
  // this one breakdown, so they cannot disagree.
  const totals = invoiceTotals(invoiceData);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // For now, just show a message that the image was uploaded
    alert(`Image "${file.name}" uploaded successfully! Manual entry is recommended for now.`);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setInvoiceData(prev => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', date: new Date().toISOString().split('T')[0], quantity: 0, rate: 0, amount: 0 }]
    }));
  };

  const removeItem = (index) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setInvoiceData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        const qty = newItems[index].quantity || 0;
        const rate = newItems[index].rate || 0;
        newItems[index].amount = qty * rate;
      }
      return { ...prev, items: newItems };
    });
  };

  const clearInvoice = () => {
    setTermsTouched(false);
    setInvoiceData(blankInvoiceData(currentBusiness));
  };

  const saveInvoice = async () => {
    const isExisting = invoiceData.id && savedInvoices.some(inv => inv.id === invoiceData.id);
    const invoiceId = isExisting ? invoiceData.id : Date.now();
    let dbId = invoiceData.dbId || null;

    if (currentBusiness?.id) {
      try {
        const { subtotal, taxAmount, discountAmount, total } = totals;
        const matchedCustomer = localCustomers.find(c => 
          (c.name && invoiceData.client?.name && c.name.toLowerCase() === invoiceData.client.name.toLowerCase()) ||
          (c.email && invoiceData.client?.email && c.email.toLowerCase() === invoiceData.client.email.toLowerCase())
        );

        const dbInvoicePayload = {
          business_id: currentBusiness.id,
          customer_id: matchedCustomer?.id || null,
          invoice_number: invoiceData.invoice.number,
          invoice_date: invoiceData.invoice.date || todayISO(),
          due_date: invoiceData.invoice.dueDate || null,
          payment_terms: invoiceData.invoice.terms || null,
          status: invoiceData.status || 'draft',
          subtotal: Number(subtotal.toFixed(2)),
          tax_rate: Number(invoiceData.tax) || 0,
          tax_amount: Number(taxAmount.toFixed(2)),
          discount_rate: Number(invoiceData.discount) || 0,
          discount_amount: Number(discountAmount.toFixed(2)),
          total_amount: Number(total.toFixed(2)),
          balance_due: Number(total.toFixed(2)),
          notes: invoiceData.notes || '',
        };

        const dbItemsPayload = (invoiceData.items || []).map((item, index) => ({
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount: Number((item.amount || (Number(item.quantity) * Number(item.rate))).toFixed(2)),
          sort_order: index,
        }));

        if (dbId) {
          await invoiceService.updateInvoice(dbId, dbInvoicePayload, dbItemsPayload);
        } else {
          const created = await invoiceService.createInvoice(dbInvoicePayload, dbItemsPayload);
          if (created?.id) {
            dbId = created.id;
            try {
              await businessService.getNextInvoiceNumber(currentBusiness.id);
            } catch (bumpErr) {
              console.warn('Could not bump invoice number:', bumpErr);
            }
          }
        }
      } catch (err) {
        console.error('Could not sync invoice to database:', err);
        alert(`Could not save invoice to the database: ${err.message || 'Please try again.'}`);
        return;
      }
    }

    const savedRecord = {
      ...invoiceData,
      id: invoiceId,
      dbId: dbId,
      savedAt: isExisting ? (invoiceData.savedAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updated;
    if (isExisting) {
      updated = savedInvoices.map(inv => inv.id === invoiceId ? savedRecord : inv);
    } else {
      updated = [...savedInvoices, savedRecord];
    }
    setSavedInvoices(updated);
    saveInvoices(userId, updated);
    alert(isExisting ? 'Invoice updated successfully!' : 'Invoice saved successfully!');
    clearInvoice();
  };

  // Rendered straight from state by src/lib/invoicePdf.js -- no DOM capture, so
  // the layout is identical regardless of window size and the text stays real.
  const generatePDF = (invoice = invoiceData) => {
    try {
      downloadInvoicePdf(invoice);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const markInvoiceAsPaid = async (invoiceId) => {
    try {
      const invoice = savedInvoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;
      
      // Create a payment record in the database for the full invoice amount
      const amountDue = invoice.invoice?.total || getInvoiceTotal(invoice);
      const payment = {
        invoice_id: invoice.dbId || invoiceId,
        amount: amountDue,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Manual',
        reference_number: `MANUAL-${Date.now()}`,
        notes: 'Manually marked as paid'
      };
      
      // If we have a valid database invoice ID, record the payment there
      if (invoice.dbId) {
        await paymentService.recordPayment({
          ...payment,
          invoice_id: invoice.dbId
        });
      }
      
      // Update local state
      const updatedInvoices = savedInvoices.map(inv => {
        if (inv.id === invoiceId) {
          return { 
            ...inv, 
            status: 'paid',
            paidDate: new Date().toISOString()
          };
        }
        return inv;
      });
      setSavedInvoices(updatedInvoices);
      saveInvoices(userId, updatedInvoices);
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      
      // Still update local state even if the database write fails
      const updatedInvoices = savedInvoices.map(inv => {
        if (inv.id === invoiceId) {
          return { 
            ...inv, 
            status: 'paid',
            paidDate: new Date().toISOString()
          };
        }
        return inv;
      });
      setSavedInvoices(updatedInvoices);
      saveInvoices(userId, updatedInvoices);
    }
  };

  if (currentView === 'saved') {
    return (
      <div className="min-h-screen bg-gray-900 text-white px-4 py-6 sm:px-6 sm:py-8">
        <div className="max-w-6xl mx-auto pb-16 sm:pb-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent tracking-tight">
                Saved Invoices
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Manage and track your saved invoices</p>
            </div>
            <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('create')}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 text-white shadow-sm"
              >
                <Plus size={18} />
                New Invoice
              </button>
            </div>
          </div>
          
          <div className="grid gap-3 sm:gap-4">
            {savedInvoices.map((invoice) => (
              <div key={invoice.id} className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700/80 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="text-base sm:text-lg font-semibold text-purple-400 font-mono">Invoice #{invoice.invoice?.number}</h3>
                      {invoice.status === 'paid' ? (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex items-center gap-1 font-mono">
                          <CheckCircle size={12} />
                          PAID
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium font-mono">
                          PENDING
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm truncate font-medium">Client: {invoice.client?.name || 'Unnamed Client'}</p>
                    <p className="text-gray-400 text-sm mt-0.5 font-mono tabular-nums">Amount: <span className="text-white font-bold">{money(getInvoiceTotal(invoice))}</span></p>
                    <p className="text-gray-500 text-xs mt-1">Saved: {new Date(invoice.savedAt).toLocaleDateString()}</p>
                    {invoice.paidDate && (
                      <p className="text-green-400 text-xs mt-0.5">Paid: {new Date(invoice.paidDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-700/60">
                    {invoice.status !== 'paid' && (
                      <button
                        onClick={() => markInvoiceAsPaid(invoice.id)}
                        className="min-h-[40px] px-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                        title="Mark as Paid"
                      >
                        <CheckCircle size={15} />
                        <span>Paid</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setInvoiceData(invoice);
                        setCurrentView('create');
                      }}
                      className="min-h-[40px] px-3 bg-gray-700 hover:bg-gray-650 text-gray-200 border border-gray-600 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                      title="Edit Invoice"
                    >
                      <Edit3 size={15} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setEmailTargetInvoice(invoice);
                        setShowEmailModal(true);
                      }}
                      className="min-h-[40px] px-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                      title="Send Email"
                    >
                      <Send size={15} />
                      <span>Email</span>
                    </button>
                    <button
                      onClick={() => generatePDF(invoice)}
                      className="min-h-[40px] px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                      title="Download Invoice"
                    >
                      <Download size={15} />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete Invoice #${invoice.invoice?.number}?`)) {
                          const updatedInvoices = savedInvoices.filter(inv => inv.id !== invoice.id);
                          setSavedInvoices(updatedInvoices);
                          saveInvoices(userId, updatedInvoices);
                        }
                      }}
                      className="min-h-[40px] p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-medium transition-colors flex items-center justify-center"
                      title="Delete Invoice"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {savedInvoices.length === 0 && (
              <div className="text-center py-12 bg-gray-800/40 rounded-2xl border border-gray-800 text-gray-400 text-sm">
                <p>No saved invoices yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-6 sm:px-6 sm:py-8">
      <div className="max-w-6xl mx-auto pb-16 sm:pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent tracking-tight">
              Professional Invoice Generator
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Create, preview, and send custom invoices</p>
          </div>
          <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('saved')}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
            >
              <Eye size={18} />
              Saved ({savedInvoices.length})
            </button>
          </div>
        </div>

        {/* Input Methods */}
        <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-700/80 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-purple-300">Quick Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2.5 bg-gray-700/80 hover:bg-gray-700 border border-gray-600 rounded-xl transition-all duration-200 flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-200 hover:text-white"
            >
              <Upload size={18} className="text-indigo-400" />
              Upload Reference Image
            </button>
            
            <button
              onClick={() => logoInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2.5 bg-gray-700/80 hover:bg-gray-700 border border-gray-600 rounded-xl transition-all duration-200 flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-200 hover:text-white"
            >
              <Upload size={18} className="text-purple-400" />
              Upload Logo
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Mobile View Switcher: Form vs Preview */}
        <div className="lg:hidden flex bg-gray-800 p-1 rounded-xl mb-6 border border-gray-700/80">
          <button
            type="button"
            onClick={() => setMobileTab('form')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[40px] flex items-center justify-center gap-1.5 ${
              mobileTab === 'form' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Edit3 size={15} />
            Invoice Form
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[40px] flex items-center justify-center gap-1.5 ${
              mobileTab === 'preview' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye size={15} />
            Document Preview
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Invoice Form */}
          <div className={`${mobileTab === 'form' ? 'block' : 'hidden'} lg:block bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-700/80 shadow-sm`}>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-purple-300">Invoice Details</h2>
            
            {/* Company Info */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4 text-pink-300">Your Company</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Company Name"
                  value={invoiceData.company.name}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    company: { ...prev.company, name: e.target.value }
                  }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={invoiceData.company.address}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    company: { ...prev.company, address: e.target.value }
                  }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={invoiceData.company.city}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      company: { ...prev.company, city: e.target.value }
                    }))}
                    className="p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={invoiceData.company.state}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      company: { ...prev.company, state: e.target.value }
                    }))}
                    className="p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Zip Code"
                    value={invoiceData.company.zip}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      company: { ...prev.company, zip: e.target.value }
                    }))}
                    className="p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="Email"
                    value={invoiceData.company.email}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      company: { ...prev.company, email: e.target.value }
                    }))}
                    className="p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={invoiceData.company.phone}
                    onChange={(e) => setInvoiceData(prev => ({
                      ...prev,
                      company: { ...prev.company, phone: e.target.value }
                    }))}
                    className="p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-pink-300">Bill To</h3>
                <div className="relative">
                  <button
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Users size={16} />
                    Select Customer
                    <ChevronDown size={16} />
                  </button>
                  
                  {showCustomerDropdown && (
                    <div className="absolute top-full mt-2 right-0 w-64 bg-gray-800 rounded-lg shadow-xl z-10 max-h-64 overflow-auto border border-gray-700">
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center gap-2 border-b border-gray-700"
                        onClick={() => {
                          setShowCustomerDropdown(false);
                          setShowCustomerManagement(true);
                        }}
                      >
                        <Plus size={16} className="text-blue-400" />
                        <span className="font-medium text-blue-400">Add New Customer</span>
                      </button>
                      {localCustomers.length === 0 ? (
                        <div className="px-4 py-6 text-center text-gray-500 text-sm">
                          No customers yet
                        </div>
                      ) : (
                        localCustomers.map(customer => (
                          <button
                            key={customer.id}
                            className="w-full px-4 py-3 text-left hover:bg-gray-700 text-sm"
                            onClick={() => {
                              setInvoiceData(prev => ({
                                ...prev,
                                client: {
                                  name: customer.name,
                                  address: `${customer.address || ''}${customer.city ? `, ${customer.city}` : ''}${customer.state ? `, ${customer.state}` : ''} ${customer.zip || ''}`.trim(),
                                  email: customer.email || ''
                                }
                              }));
                              setShowCustomerDropdown(false);
                            }}
                          >
                            <div className="font-medium">{customer.name}</div>
                            {customer.company && (
                              <div className="text-xs text-gray-400">{customer.company}</div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Client Name"
                  value={invoiceData.client.name}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    client: { ...prev.client, name: e.target.value }
                  }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Client Address"
                  value={invoiceData.client.address}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    client: { ...prev.client, address: e.target.value }
                  }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Client Email"
                  value={invoiceData.client.email}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    client: { ...prev.client, email: e.target.value }
                  }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4 text-pink-300">Invoice Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Invoice Number"
                  value={invoiceData.invoice.number}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    invoice: { ...prev.invoice, number: e.target.value }
                  }))}
                  className="p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="date"
                  value={invoiceData.invoice.date}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    invoice: { ...prev.invoice, date: e.target.value }
                  }))}
                  className="p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="date"
                  value={invoiceData.invoice.dueDate}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    invoice: { ...prev.invoice, dueDate: e.target.value }
                  }))}
                  className="p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
                <PaymentTermsField
                  label=""
                  value={invoiceData.invoice.terms}
                  defaultTerms={currentBusiness?.default_payment_terms || ''}
                  onChange={(terms) => {
                    setTermsTouched(true);
                    setInvoiceData(prev => ({
                      ...prev,
                      invoice: { ...prev.invoice, terms }
                    }));
                  }}
                  selectClassName="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  compact
                />
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-pink-300">Line Items</h3>
                <button
                  onClick={addItem}
                  className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              <div className="space-y-3">
                {invoiceData.items.map((item, index) => (
                  <div key={index} className="invoice-item-mobile bg-gray-700 rounded-2xl p-4">
                    {/* Mobile Layout - Stacks on small screens */}
                    <div className="block md:hidden">
                      {/* Description - Full width on mobile */}
                      <div className="description-field mb-3">
                        <label className="input-label">Description</label>
                        <input
                          type="text"
                          placeholder="Enter item description"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full p-3 bg-gray-600 border border-gray-500 rounded-xl focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      
                      {/* Date, Qty, Rate in a row */}
                      <div className="input-row">
                        <div className="input-group">
                          <label className="input-label">Date</label>
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => updateItem(index, 'date', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div className="input-group">
                          <label className="input-label">Quantity</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="input-field"
                          />
                        </div>
                        <div className="input-group">
                          <label className="input-label">Rate ($)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={item.rate || ''}
                            onChange={(e) => updateItem(index, 'rate', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="input-field"
                          />
                        </div>
                      </div>
                      
                      {/* Amount display */}
                      <div className="amount-display">
                        <div className="amount-label">Total Amount</div>
                        <div className="amount-value">{money(item.amount)}</div>
                      </div>
                      
                      {/* Remove button */}
                      <div className="actions-row">
                        <button
                          onClick={() => removeItem(index)}
                          className="remove-button"
                        >
                          <Trash2 size={16} />
                          Remove Item
                        </button>
                      </div>
                    </div>
                    
                    {/* Desktop Layout - Original grid layout */}
                    <div className="hidden md:block space-y-3">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="col-span-7 p-3 bg-gray-600 border border-gray-500 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="col-span-2 p-3 bg-gray-600 border border-gray-500 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Rate"
                          value={item.rate || ''}
                          onChange={(e) => updateItem(index, 'rate', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="col-span-2 p-3 bg-gray-600 border border-gray-500 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                        />
                        <button
                          onClick={() => removeItem(index)}
                          className="col-span-1 p-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-4">
                          <label className="block text-xs text-gray-400 mb-1">Service Date</label>
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => updateItem(index, 'date', e.target.value)}
                            className="w-full p-3 bg-gray-600 border border-gray-500 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                          />
                        </div>
                        <div className="col-span-5"></div>
                        <div className="col-span-3 text-right">
                          <label className="block text-xs text-gray-400 mb-1">Amount</label>
                          <div className="text-lg font-semibold text-green-400 bg-gray-600 rounded-xl p-3 amount-field">
                            {money(item.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax & Discount */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tax (%)</label>
                <input
                  type="number"
                  value={invoiceData.tax || ''}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, tax: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Discount (%)</label>
                <input
                  type="number"
                  value={invoiceData.discount || ''}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, discount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                  onFocus={(e) => e.target.select()}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Notes</label>
              <textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
                placeholder="Additional notes..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={saveInvoice}
                className="flex-1 min-h-[44px] py-2.5 px-4 bg-purple-600 hover:bg-purple-500 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium text-white shadow-sm"
              >
                <Save size={18} />
                Save Invoice
              </button>
              <button
                onClick={() => {
                  setEmailTargetInvoice(invoiceData);
                  setShowEmailModal(true);
                }}
                className="flex-1 min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium text-white shadow-sm"
              >
                <Send size={18} />
                Send Email
              </button>
              <button
                onClick={() => generatePDF()}
                className="flex-1 min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium text-white shadow-sm"
              >
                <Download size={18} />
                Download PDF
              </button>
            </div>
          </div>

          <div className={`${mobileTab === 'preview' ? 'block' : 'hidden'} lg:block`}>
            <InvoicePreview invoice={invoiceData} />
          </div>
        </div>
      </div>

      {/* Customer Management Modal */}
      {showCustomerManagement && (
        <CustomerManagement
          businessId={currentBusiness?.id}
          onCustomerSelect={(customer) => {
            setInvoiceData(prev => ({
              ...prev,
              client: {
                name: customer.name,
                address: `${customer.address || ''}${customer.city ? `, ${customer.city}` : ''}${customer.state ? `, ${customer.state}` : ''} ${customer.zip || ''}`.trim(),
                email: customer.email || ''
              }
            }));
            setShowCustomerManagement(false);
          }}
          onClose={() => {
            setShowCustomerManagement(false);
            onCustomersChanged?.();
          }}
        />
      )}
      
      {/* Email Modal */}
      {(() => {
        const emailInvoice = emailTargetInvoice || invoiceData;
        return (
          <EmailModal
            isOpen={showEmailModal}
            onClose={() => {
              setShowEmailModal(false);
              setEmailTargetInvoice(null);
            }}
            invoice={emailInvoice}
            customer={emailInvoice?.client}
            business={currentBusiness || {
              name: emailInvoice?.company?.name || 'Your Company Name',
              email: emailInvoice?.company?.email || '',
              phone: emailInvoice?.company?.phone || '',
              address: emailInvoice?.company?.address || '',
              city: emailInvoice?.company?.city || '',
              state: emailInvoice?.company?.state || '',
              zip: emailInvoice?.company?.zip || ''
            }}
          />
        );
      })()}
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [currentBusinessId, setCurrentBusinessId] = useState(null);
  const { customers, reload: reloadCustomers } = useCustomers(currentBusinessId);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = readSession();
      if (session?.userId) {
        try {
          const user = await userService.getUser(session.userId);
          if (!cancelled && user && Number(user.is_active) === 1) {
            setCurrentUser(publicUser(user));
            setSavedInvoices(loadInvoices(user.id));
          } else if (!cancelled) {
            clearSession();
          }
        } catch (err) {
          console.error('Session restore failed:', err);
          clearSession();
        }
      }
      if (!cancelled) setSessionReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (currentUser?.id) saveInvoices(currentUser.id, savedInvoices);
  }, [currentUser?.id, savedInvoices]);

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
  };

  const handleDeleteInvoice = (invoiceId) => {
    const updated = savedInvoices.filter(inv => inv.id !== invoiceId);
    setSavedInvoices(updated);
    saveInvoices(currentUser?.id, updated);
  };

  const handleUpdateInvoice = (invoiceId, updates) => {
    setSavedInvoices((prev) => {
      const next = prev.map((inv) => (inv.id === invoiceId ? { ...inv, ...updates } : inv));
      if (currentUser?.id) saveInvoices(currentUser.id, next);
      return next;
    });
  };

  const handleUnlock = (user) => {
    setCurrentUser(user);
    setCurrentBusiness(null);
    setCurrentBusinessId(null);
    setCurrentView('dashboard');
    setSavedInvoices(loadInvoices(user.id));
    setShowChangePin(false);
    setShowPeople(false);
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setCurrentBusiness(null);
    setCurrentBusinessId(null);
    setSavedInvoices([]);
    setCurrentView('dashboard');
    setShowChangePin(false);
    setShowPeople(false);
  };

  const handleCreateInvoiceForCustomer = (customer) => {
    const newInvoice = {
      ...blankInvoiceData(currentBusiness),
      client: {
        name: customer.name,
        address: `${customer.address || ''}${customer.address && (customer.city || customer.state || customer.zip) ? ', ' : ''}${customer.city || ''}${customer.city && customer.state ? ', ' : ''}${customer.state || ''} ${customer.zip || ''}`.trim(),
        email: customer.email || ''
      },
    };
    
    setEditingInvoice(newInvoice);
    setCurrentView('create');
  };

  const handleBusinessChange = useCallback((business) => {
    setCurrentBusiness(business);
    setCurrentBusinessId(business?.id ?? null);
  }, []);

  const handleCreateBusiness = () => {
    setEditingBusiness(null);
    setShowBusinessModal(true);
  };

  const handleEditBusiness = () => {
    setEditingBusiness(currentBusiness);
    setShowBusinessModal(true);
  };

  const handleSaveBusiness = (business) => {
    setShowBusinessModal(false);
    const businessWithDefaults = {
      ...business,
      invoice_prefix: business.invoice_prefix || 'INV',
      next_invoice_number: Number(business.next_invoice_number) || 1,
      default_payment_terms: business.default_payment_terms || 'Net 30',
      default_tax_rate: Number(business.default_tax_rate) || 0,
      is_active: business.is_active !== undefined ? Number(business.is_active) : 1,
    };
    setCurrentBusiness(businessWithDefaults);
    setCurrentBusinessId(businessWithDefaults.id ?? null);
  };

  const accountOverlays = currentUser && (
    <>
      {showChangePin && (
        <ChangePin userId={currentUser.id} onClose={() => setShowChangePin(false)} />
      )}
      {showPeople && currentUser.role === 'admin' && (
        <PeopleAdmin currentUserId={currentUser.id} onClose={() => setShowPeople(false)} />
      )}
    </>
  );

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <PinLock onUnlock={handleUnlock} />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Unified Top Navigation Header */}
        <header className="sticky top-0 z-30 bg-gray-900/90 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <BusinessSwitcher 
                userId={currentUser.id}
                currentBusiness={currentBusiness}
                onBusinessChange={handleBusinessChange}
                onCreateBusiness={handleCreateBusiness}
                onEditBusiness={handleEditBusiness}
              />
              {currentBusiness && (
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Active: {currentBusiness.name}
                </span>
              )}
            </div>

            {/* Desktop Navigation & Actions */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1 bg-gray-800/80 p-1 rounded-xl border border-gray-700/60">
                <button
                  type="button"
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currentView === 'dashboard' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('create')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currentView === 'create' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  New Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('saved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currentView === 'saved' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Saved Invoices
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('customers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currentView === 'customers' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Customers
                </button>
              </div>

              <div className="h-4 w-px bg-gray-700 mx-1" />

              <span className="text-xs sm:text-sm text-gray-300 font-medium">{currentUser.full_name || 'Account'}</span>
              <button
                type="button"
                onClick={() => setShowChangePin(true)}
                className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-xs text-gray-200 transition-colors"
              >
                PIN
              </button>
              {currentUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowPeople(true)}
                  className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-xs text-gray-200 transition-colors"
                >
                  People
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-xs text-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Toggle Button */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="User Menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <User size={18} />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-800 bg-gray-900 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <div>
                  <p className="text-sm font-semibold text-white">{currentUser.full_name || 'Account'}</p>
                  {currentBusiness && (
                    <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                      {currentBusiness.name}
                    </p>
                  )}
                </div>
                <span className="text-xs uppercase tracking-wider px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md font-mono">
                  {currentUser.role}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePin(true);
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 px-3 bg-gray-800 border border-gray-700 rounded-xl text-xs font-medium text-gray-200 text-center"
                >
                  Change PIN
                </button>
                {currentUser.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPeople(true);
                      setMobileMenuOpen(false);
                    }}
                    className="py-2.5 px-3 bg-gray-800 border border-gray-700 rounded-xl text-xs font-medium text-gray-200 text-center"
                  >
                    People Admin
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="col-span-2 py-2.5 px-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-medium text-red-400 text-center"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="flex-1 pb-16 sm:pb-0">
          {currentView === 'dashboard' && (
            <Dashboard 
              customers={customers}
              onNavigate={handleNavigate}
              savedInvoices={savedInvoices}
              onEditInvoice={handleEditInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onCreateInvoiceForCustomer={handleCreateInvoiceForCustomer}
              currentBusiness={currentBusiness}
              userId={currentUser.id}
            />
          )}

          {currentView === 'customers' && (
            <CustomerPage
              businessId={currentBusiness?.id}
              userId={currentUser.id}
              onNavigate={handleNavigate}
              onCreateInvoiceForCustomer={handleCreateInvoiceForCustomer}
            />
          )}

          {(currentView === 'create' || currentView === 'saved') && (
            <InvoiceGenerator 
              currentView={currentView}
              setCurrentView={setCurrentView}
              savedInvoices={savedInvoices}
              setSavedInvoices={setSavedInvoices}
              editingInvoice={editingInvoice}
              onCustomersChanged={reloadCustomers}
              setEditingInvoice={setEditingInvoice}
              customers={customers}
              currentBusiness={currentBusiness}
              userId={currentUser.id}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-4 h-14">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex flex-col items-center justify-center text-xs font-medium ${
                currentView === 'dashboard' ? 'text-purple-400 font-semibold' : 'text-gray-400'
              }`}
            >
              <LayoutDashboard size={18} />
              <span className="mt-0.5 text-[10px]">Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentView('create')}
              className={`flex flex-col items-center justify-center text-xs font-medium ${
                currentView === 'create' ? 'text-purple-400 font-semibold' : 'text-gray-400'
              }`}
            >
              <Plus size={18} />
              <span className="mt-0.5 text-[10px]">New</span>
            </button>
            <button
              onClick={() => setCurrentView('saved')}
              className={`flex flex-col items-center justify-center text-xs font-medium ${
                currentView === 'saved' ? 'text-purple-400 font-semibold' : 'text-gray-400'
              }`}
            >
              <Eye size={18} />
              <span className="mt-0.5 text-[10px]">Saved</span>
            </button>
            <button
              onClick={() => setCurrentView('customers')}
              className={`flex flex-col items-center justify-center text-xs font-medium ${
                currentView === 'customers' ? 'text-purple-400 font-semibold' : 'text-gray-400'
              }`}
            >
              <Users size={18} />
              <span className="mt-0.5 text-[10px]">Customers</span>
            </button>
          </div>
        </nav>
      </div>

      {showBusinessModal && (
        <BusinessModal 
          business={editingBusiness}
          currentUserId={currentUser.id}
          onSave={handleSaveBusiness}
          onClose={() => setShowBusinessModal(false)}
        />
      )}
      {accountOverlays}
      <FeedbackCommandCenter />
      <DevTools />
    </>
  );
}

export default App;
