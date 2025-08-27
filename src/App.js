import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Save, Edit3, Plus, Trash2, Eye, LayoutDashboard, ChevronDown, Users, Send, CheckCircle } from 'lucide-react';
import CustomerManagement from './CustomerManagement';
import './App.css';
import './styles/responsive.css'; // Import responsive design system
import './styles/mobile-override.css'; // Import mobile-specific overrides
import './styles/invoice-mobile-fix.css'; // Import invoice mobile fixes
import './styles/global-responsive-fix.css'; // Import global responsive fixes for ALL components
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import EmailModal from './components/EmailModal';
import Dashboard from './Dashboard';
import FeedbackCommandCenter from './FeedbackCommandCenter';
import CustomerPage from './CustomerPage';
import BusinessSwitcher from './BusinessSwitcher';
import BusinessModal from './BusinessModal';
import { customerService, paymentService } from './lib/supabase';
import DevTools from './components/DevTools';
import './utils/cacheBuster'; // Import for side effects (keyboard shortcuts)

const InvoiceGenerator = ({ currentView, setCurrentView, savedInvoices, setSavedInvoices, editingInvoice, setEditingInvoice, customers, currentBusiness }) => {
  const [isListening, setIsListening] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCustomerManagement, setShowCustomerManagement] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [localCustomers, setLocalCustomers] = useState(customers || []);
  const [invoiceData, setInvoiceData] = useState({
    company: {
      name: 'Your Company Name',
      address: '123 Business Street',
      city: 'City',
      state: 'State',
      zip: '12345',
      email: 'contact@company.com',
      phone: '(555) 123-4567'
    },
    client: {
      name: '',
      address: '',
      email: ''
    },
    invoice: {
      number: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms: 'Net 30'
    },
    items: [
      { description: '', date: new Date().toISOString().split('T')[0], quantity: 0, rate: 0, amount: 0 }
    ],
    notes: '',
    tax: 0,
    discount: 0,
    logo: ''
  });
  
  const [pendingDownload, setPendingDownload] = useState(false);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (editingInvoice) {
      setInvoiceData(editingInvoice);
      setEditingInvoice(null);
    }
  }, [editingInvoice, setEditingInvoice]);

  useEffect(() => {
    // Load customers
    const savedCustomers = localStorage.getItem('customers');
    if (savedCustomers) {
      setLocalCustomers(JSON.parse(savedCustomers));
    }
  }, [showCustomerManagement]);

  useEffect(() => {
    if (pendingDownload && currentView === 'create') {
      setPendingDownload(false);
      setTimeout(() => generatePDF(), 200);
    }
  }, [pendingDownload, currentView]);

  const calculateSubtotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = (subtotal * invoiceData.tax) / 100;
    const discountAmount = (subtotal * invoiceData.discount) / 100;
    return subtotal + taxAmount - discountAmount;
  };

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
    setInvoiceData({
      company: {
        name: 'Your Company Name',
        address: '123 Business Street',
        city: 'City',
        state: 'State',
        zip: '12345',
        email: 'contact@company.com',
        phone: '(555) 123-4567'
      },
      client: {
        name: '',
        address: '',
        email: ''
      },
      invoice: {
        number: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        terms: 'Net 30'
      },
      items: [
        { description: '', date: new Date().toISOString().split('T')[0], quantity: 0, rate: 0, amount: 0 }
      ],
      notes: '',
      tax: 0,
      discount: 0,
      logo: ''
    });
  };

  const saveInvoice = () => {
    const newInvoice = {
      ...invoiceData,
      id: Date.now(),
      savedAt: new Date().toISOString()
    };
    
    const updated = [...savedInvoices, newInvoice];
    setSavedInvoices(updated);
    localStorage.setItem('savedInvoices', JSON.stringify(updated));
    alert('Invoice saved successfully!');
    clearInvoice();
  };

  const generatePDF = () => {
    const input = document.getElementById('invoice-preview');
    
    // Configure html2canvas for better quality
    html2canvas(input, {
      scale: 3, // Even higher resolution for better quality
      useCORS: true,
      logging: false,
      letterRendering: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Create PDF in portrait A4
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // A4 dimensions in mm
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate the aspect ratio of the canvas
      const canvasAspectRatio = canvas.height / canvas.width;
      
      // Set image width to fill the page width (with small margins)
      const margin = 10; // 10mm margins on each side
      const imgWidth = pageWidth - (2 * margin);
      const imgHeight = imgWidth * canvasAspectRatio;
      
      // Calculate how many pages we need
      const totalPages = Math.ceil(imgHeight / (pageHeight - (2 * margin)));
      
      if (totalPages === 1) {
        // Single page - center vertically if needed
        const yPosition = margin;
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight, undefined, 'MEDIUM');
      } else {
        // Multi-page support
        const pageImgHeight = pageHeight - (2 * margin);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          // Calculate the source rectangle for this page
          const srcY = page * (pageImgHeight / imgHeight) * canvas.height;
          const srcHeight = (pageImgHeight / imgHeight) * canvas.height;
          
          // Create a temporary canvas for this page section
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(srcHeight, canvas.height - srcY);
          
          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, -srcY);
          
          const pageData = pageCanvas.toDataURL('image/png', 1.0);
          const currentPageHeight = Math.min(pageImgHeight, imgHeight - (page * pageImgHeight));
          
          pdf.addImage(pageData, 'PNG', margin, margin, imgWidth, currentPageHeight, undefined, 'MEDIUM');
        }
      }
      
      // Add metadata
      pdf.setProperties({
        title: `Invoice ${invoiceData.invoice.number}`,
        subject: `Invoice for ${invoiceData.client.name || 'Client'}`,
        author: invoiceData.company.name,
        keywords: 'invoice, business',
        creator: 'Professional Invoice Generator'
      });
      
      // Save the PDF
      pdf.save(`Invoice-${invoiceData.invoice.number}.pdf`);
    }).catch((error) => {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    });
  };

  const markInvoiceAsPaid = async (invoiceId) => {
    try {
      const invoice = savedInvoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;
      
      // Create a payment record in Supabase for the full invoice amount
      const payment = {
        invoice_id: invoiceId,
        amount: invoice.invoice?.total || calculateTotal(),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Manual',
        reference_number: `MANUAL-${Date.now()}`,
        notes: 'Manually marked as paid'
      };
      
      // If we have a valid Supabase invoice ID, record the payment there
      if (invoice.supabaseId) {
        await paymentService.recordPayment({
          ...payment,
          invoice_id: invoice.supabaseId
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
      localStorage.setItem('savedInvoices', JSON.stringify(updatedInvoices));
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      
      // Still update local state even if Supabase fails
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
      localStorage.setItem('savedInvoices', JSON.stringify(updatedInvoices));
    }
  };

  if (currentView === 'saved') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Saved Invoices
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-6 py-3 bg-gray-800 border border-gray-600 rounded-2xl hover:bg-gray-700 transition-all duration-200 flex items-center gap-2"
              >
                <LayoutDashboard size={20} />
                Back to Dashboard
              </button>
              <button
                onClick={() => setCurrentView('create')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium"
              >
                Create New Invoice
              </button>
            </div>
          </div>
          
          <div className="grid gap-4">
            {savedInvoices.map((invoice) => (
              <div key={invoice.id} className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-purple-400">Invoice #{invoice.invoice.number}</h3>
                      {invoice.status === 'paid' ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium flex items-center gap-1">
                          <CheckCircle size={14} />
                          PAID
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium">
                          PENDING
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400">Client: {invoice.client.name || 'Unnamed Client'}</p>
                    <p className="text-gray-400">Amount: ${calculateTotal().toFixed(2)}</p>
                    <p className="text-gray-500 text-sm">Saved: {new Date(invoice.savedAt).toLocaleDateString()}</p>
                    {invoice.paidDate && (
                      <p className="text-green-400 text-sm">Paid: {new Date(invoice.paidDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {invoice.status !== 'paid' && (
                      <button
                        onClick={() => markInvoiceAsPaid(invoice.id)}
                        className="p-2 bg-purple-500 rounded-xl hover:bg-purple-600 transition-colors"
                        title="Mark as Paid"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setInvoiceData(invoice);
                        setCurrentView('create');
                      }}
                      className="p-2 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors"
                      title="Edit Invoice"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className="p-2 bg-purple-500 rounded-xl hover:bg-purple-600 transition-colors"
                      title="Send Email"
                    >
                      <Send size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setInvoiceData(invoice);
                        setPendingDownload(true);
                        setCurrentView('create');
                      }}
                      className="p-2 bg-green-500 rounded-xl hover:bg-green-600 transition-colors"
                      title="Download Invoice"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete Invoice #${invoice.invoice.number}?`)) {
                          const updatedInvoices = savedInvoices.filter(inv => inv.id !== invoice.id);
                          setSavedInvoices(updatedInvoices);
                          localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
                        }
                      }}
                      className="p-2 bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                      title="Delete Invoice"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {savedInvoices.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>No saved invoices yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Professional Invoice Generator
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center gap-2"
            >
              <LayoutDashboard size={20} />
              Back to Dashboard
            </button>
            <button
              onClick={() => setCurrentView('saved')}
              className="px-6 py-3 bg-gray-800 border border-gray-600 rounded-2xl hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Eye size={20} />
              Saved Invoices ({savedInvoices.length})
            </button>
          </div>
        </div>

        {/* Input Methods */}
        <div className="bg-gray-800 rounded-3xl p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold mb-6 text-purple-300">Quick Actions</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center gap-3"
            >
              <Upload size={20} />
              Upload Reference Image
            </button>
            
            <button
              onClick={() => logoInputRef.current?.click()}
              className="px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center gap-3"
            >
              <Upload size={20} />
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

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Invoice Form */}
          <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6 text-purple-300">Invoice Details</h2>
            
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
                <input
                  type="text"
                  placeholder="Payment Terms"
                  value={invoiceData.invoice.terms}
                  onChange={(e) => setInvoiceData(prev => ({
                    ...prev,
                    invoice: { ...prev.invoice, terms: e.target.value }
                  }))}
                  className="p-3 bg-gray-700 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none"
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
                        <div className="amount-value">${item.amount.toFixed(2)}</div>
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
                            ${item.amount.toFixed(2)}
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
            <div className="flex gap-4">
              <button
                onClick={saveInvoice}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
              >
                <Save size={20} />
                Save Invoice
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
              >
                <Send size={20} />
                Send Email
              </button>
              <button
                onClick={generatePDF}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
              >
                <Download size={20} />
                Download PDF
              </button>
            </div>
          </div>

          {/* Preview */}
          <div id="invoice-preview" className="bg-white text-black rounded-3xl p-8 border border-gray-700 h-fit">
            <div className="flex justify-between items-start mb-8">
              <div>
                {invoiceData.logo && (
                  <img src={invoiceData.logo} alt="Logo" className="h-16 mb-2 object-contain" />
                )}
                <h1 className="text-3xl font-bold text-gray-800 mb-4">INVOICE</h1>
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-lg text-gray-800">{invoiceData.company.name}</p>
                  <p>{invoiceData.company.address}</p>
                  <p>{invoiceData.company.city}, {invoiceData.company.state} {invoiceData.company.zip}</p>
                  <p>{invoiceData.company.email}</p>
                  <p>{invoiceData.company.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-purple-600 mb-2">#{invoiceData.invoice.number}</h2>
                <div className="text-sm text-gray-600">
                  <p><span className="font-medium">Date:</span> {invoiceData.invoice.date}</p>
                  <p><span className="font-medium">Due:</span> {invoiceData.invoice.dueDate}</p>
                  <p><span className="font-medium">Terms:</span> {invoiceData.invoice.terms}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Bill To:</h3>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-800">{invoiceData.client.name || 'Client Name'}</p>
                <p>{invoiceData.client.address || 'Client Address'}</p>
                <p>{invoiceData.client.email || 'client@email.com'}</p>
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-100 grid grid-cols-12 gap-2 p-3 text-sm font-semibold text-gray-800">
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-center">Date</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              
              {invoiceData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 text-sm border-t border-gray-200">
                  <div className="col-span-4 text-gray-800">{item.description || 'Item description'}</div>
                  <div className="col-span-2 text-center text-gray-600">{new Date(item.date).toLocaleDateString()}</div>
                  <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
                  <div className="col-span-2 text-center text-gray-600">${item.rate.toFixed(2)}</div>
                  <div className="col-span-2 text-right font-medium text-gray-800">${item.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-800">${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                {invoiceData.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount ({invoiceData.discount}%):</span>
                    <span>-${(calculateSubtotal() * invoiceData.discount / 100).toFixed(2)}</span>
                  </div>
                )}
                
                {invoiceData.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({invoiceData.tax}%):</span>
                    <span className="font-medium text-gray-800">${(calculateSubtotal() * invoiceData.tax / 100).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-800">Total:</span>
                    <span className="text-purple-600">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {invoiceData.notes && (
              <div className="mt-6 pt-6 border-t border-gray-300">
                <h3 className="font-semibold text-gray-800 mb-2">Notes:</h3>
                <p className="text-sm text-gray-600">{invoiceData.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Management Modal */}
      {showCustomerManagement && (
        <CustomerManagement
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
            // Refresh customers list
            const savedCustomers = localStorage.getItem('customers');
            if (savedCustomers) {
              setLocalCustomers(JSON.parse(savedCustomers));
            }
          }}
        />
      )}
      
      {/* Email Modal */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        invoice={invoiceData}
        customer={invoiceData.client}
        business={currentBusiness || {
          name: invoiceData.company.name,
          email: invoiceData.company.email,
          phone: invoiceData.company.phone,
          address: invoiceData.company.address,
          city: invoiceData.company.city,
          state: invoiceData.company.state,
          zip: invoiceData.company.zip
        }}
      />
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);

  useEffect(() => {
    // Load saved invoices from localStorage
    const saved = localStorage.getItem('savedInvoices');
    if (saved) {
      setSavedInvoices(JSON.parse(saved));
    }
    
    // Load saved customers
    const savedCustomers = localStorage.getItem('customers');
    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    }
  }, []);

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
  };

  const handleDeleteInvoice = (invoiceId) => {
    const updated = savedInvoices.filter(inv => inv.id !== invoiceId);
    setSavedInvoices(updated);
    localStorage.setItem('savedInvoices', JSON.stringify(updated));
  };

  const handleSaveInvoice = (invoice) => {
    const updated = [...savedInvoices, invoice];
    setSavedInvoices(updated);
    localStorage.setItem('savedInvoices', JSON.stringify(updated));
  };

  const handleCreateInvoiceForCustomer = (customer) => {
    // Pre-fill invoice with customer data
    const newInvoice = {
      company: currentBusiness ? {
        name: currentBusiness.name,
        address: currentBusiness.address || '123 Business Street',
        city: currentBusiness.city || 'City',
        state: currentBusiness.state || 'State',
        zip: currentBusiness.zip || '12345',
        email: currentBusiness.email,
        phone: currentBusiness.phone || '(555) 123-4567'
      } : savedInvoices[0]?.company || {
        name: 'Your Company Name',
        address: '123 Business Street',
        city: 'City',
        state: 'State',
        zip: '12345',
        email: 'contact@company.com',
        phone: '(555) 123-4567'
      },
      client: {
        name: customer.name,
        address: `${customer.address || ''}${customer.address && (customer.city || customer.state || customer.zip) ? ', ' : ''}${customer.city || ''}${customer.city && customer.state ? ', ' : ''}${customer.state || ''} ${customer.zip || ''}`.trim(),
        email: customer.email || ''
      },
      invoice: {
        number: currentBusiness ? 
          `${currentBusiness.invoice_prefix}-${String(currentBusiness.next_invoice_number).padStart(6, '0')}` : 
          `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        terms: currentBusiness?.default_payment_terms || 'Net 30'
      },
      items: [{ description: '', date: new Date().toISOString().split('T')[0], quantity: 0, rate: 0, amount: 0 }],
      notes: '',
      tax: currentBusiness?.default_tax_rate || 0,
      discount: 0,
      logo: ''
    };
    
    setEditingInvoice(newInvoice);
    setCurrentView('create');
  };

  const handleBusinessChange = async (business) => {
    setCurrentBusiness(business);
    
    // Load customers for this business
    if (business?.id) {
      try {
        const businessCustomers = await customerService.getCustomers(business.id);
        setCustomers(businessCustomers || []);
      } catch (error) {
        console.error('Error loading customers:', error);
        setCustomers([]);
      }
    }
  };

  const handleCreateBusiness = () => {
    setEditingBusiness(null);
    setShowBusinessModal(true);
  };

  const handleSaveBusiness = (business) => {
    setShowBusinessModal(false);
    // Ensure business has all necessary fields with defaults
    const businessWithDefaults = {
      ...business,
      invoice_prefix: business.invoice_prefix || 'INV',
      next_invoice_number: business.next_invoice_number || 1,
      default_payment_terms: business.default_payment_terms || 'Net 30',
      default_tax_rate: business.default_tax_rate || 0,
      is_active: business.is_active !== undefined ? business.is_active : true
    };
    setCurrentBusiness(businessWithDefaults);
    console.log('Saved business:', businessWithDefaults);
    
    // Refresh the business list in the BusinessSwitcher
    // This will happen automatically when BusinessSwitcher re-renders
  };

  // Clean consistent background - no gradients
  const getBusinessTheme = () => {
    // Simple dark background for all businesses - clean and readable
    return 'bg-gray-900';
  };

  if (currentView === 'dashboard') {
    return (
      <>
        <div className={`min-h-screen ${getBusinessTheme()}`}>
          <div className="p-4 bg-gray-800/50 backdrop-blur border-b border-gray-700">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <BusinessSwitcher 
                currentBusiness={currentBusiness}
                onBusinessChange={handleBusinessChange}
                onCreateBusiness={handleCreateBusiness}
              />
              <div className="text-sm text-gray-400">
                {currentBusiness && (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Active: {currentBusiness.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Dashboard 
            onNavigate={handleNavigate}
            savedInvoices={savedInvoices}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onCreateInvoiceForCustomer={handleCreateInvoiceForCustomer}
            currentBusiness={currentBusiness}
          />
        </div>
        {showBusinessModal && (
          <BusinessModal 
            business={editingBusiness}
            onSave={handleSaveBusiness}
            onClose={() => setShowBusinessModal(false)}
          />
        )}
        <FeedbackCommandCenter />
        
        {/* Development Tools - Only shown in development mode */}
        <DevTools />
      </>
    );
  }

  if (currentView === 'customers') {
    return (
      <>
        <CustomerPage
          onNavigate={handleNavigate}
          onCreateInvoiceForCustomer={handleCreateInvoiceForCustomer}
        />
        <FeedbackCommandCenter />
      </>
    );
  }

  return (
    <>
      <InvoiceGenerator 
        currentView={currentView}
        setCurrentView={setCurrentView}
        savedInvoices={savedInvoices}
        setSavedInvoices={setSavedInvoices}
        editingInvoice={editingInvoice}
        setEditingInvoice={setEditingInvoice}
        customers={customers}
        currentBusiness={currentBusiness}
      />
      <FeedbackCommandCenter />
    </>
  );
}

export default App;
