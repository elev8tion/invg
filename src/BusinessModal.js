import React, { useState, useEffect } from 'react';
import { X, Save, Building } from 'lucide-react';
import { businessService } from './lib/db';
import PaymentTermsField, { isCustomValue, validateTerms } from './components/PaymentTermsField';

const BusinessModal = ({ business, currentUserId, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    email: '',
    phone: '',
    website: '',
    tax_number: '',
    invoice_prefix: 'INV',
    next_invoice_number: 1,
    po_prefix: 'PO',
    next_po_number: 1,
    default_payment_terms: 'Net 30',
    default_tax_rate: 0,
    currency: 'USD'
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});


  useEffect(() => {
    if (business) {
      setFormData({
        ...formData,
        ...business
      });
    }
  }, [business]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTermsChange = (terms) => {
    setFormData((prev) => ({ ...prev, default_payment_terms: terms }));
    if (errors.default_payment_terms) {
      setErrors((prev) => ({ ...prev, default_payment_terms: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Business name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.invoice_prefix.trim()) {
      newErrors.invoice_prefix = 'Invoice prefix is required';
    }
    const termsError = validateTerms(
      formData.default_payment_terms,
      isCustomValue(formData.default_payment_terms)
    );
    if (termsError) {
      newErrors.default_payment_terms = termsError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Save to the database
      if (business?.id) {
        // Update existing business
        const updated = await businessService.updateBusiness(business.id, formData);
        onSave(updated);
      } else {
        // Create new business
        // Ensure all required fields are included
        const businessData = {
          ...formData,
          is_active: true,
          next_invoice_number: formData.next_invoice_number || 1,
          created_at: new Date().toISOString()
        };
        const created = await businessService.createBusiness(businessData);
        if (currentUserId) {
          await businessService.linkUser(created.id, currentUserId, 'owner');
        }
        onSave(created);
      }
    } catch (error) {
      console.error('Error saving business:', error);
      alert('Failed to save business. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">
              {business ? 'Edit Business' : 'Create New Business'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-purple-300 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Business Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full p-3 bg-gray-800 border ${errors.name ? 'border-red-500' : 'border-gray-700'} rounded-xl focus:border-purple-500 focus:outline-none text-white`}
                  placeholder="Your Business Name"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full p-3 bg-gray-800 border ${errors.email ? 'border-red-500' : 'border-gray-700'} rounded-xl focus:border-purple-500 focus:outline-none text-white`}
                  placeholder="business@example.com"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Website</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  placeholder="www.yourbusiness.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-purple-300 mb-4">Address</h3>
            <div className="space-y-4">
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                placeholder="Street Address"
              />
              
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  placeholder="City"
                />
                
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  placeholder="State"
                />
                
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  placeholder="ZIP Code"
                />
              </div>
            </div>
          </div>

          {/* Invoice Settings */}
          <div>
            <h3 className="text-lg font-semibold text-purple-300 mb-4">Invoice Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Invoice Prefix *</label>
                <input
                  type="text"
                  name="invoice_prefix"
                  value={formData.invoice_prefix}
                  onChange={handleChange}
                  className={`w-full p-3 bg-gray-800 border ${errors.invoice_prefix ? 'border-red-500' : 'border-gray-700'} rounded-xl focus:border-purple-500 focus:outline-none text-white`}
                  placeholder="INV"
                />
                {errors.invoice_prefix && <p className="text-red-400 text-xs mt-1">{errors.invoice_prefix}</p>}
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Next Invoice Number</label>
                <input
                  type="number"
                  name="next_invoice_number"
                  value={formData.next_invoice_number}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">PO Prefix</label>
                <input
                  type="text"
                  name="po_prefix"
                  value={formData.po_prefix}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  placeholder="PO"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Next PO Number</label>
                <input
                  type="number"
                  name="next_po_number"
                  value={formData.next_po_number}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Financial Settings */}
          <div>
            <h3 className="text-lg font-semibold text-purple-300 mb-4">Financial Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <PaymentTermsField
                  label="Default Payment Terms"
                  value={formData.default_payment_terms}
                  onChange={handleTermsChange}
                  error={errors.default_payment_terms}
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Default Tax Rate (%)</label>
                <input
                  type="number"
                  name="default_tax_rate"
                  value={formData.default_tax_rate}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-2">Tax Number</label>
              <input
                type="text"
                name="tax_number"
                value={formData.tax_number}
                onChange={handleChange}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                placeholder="EIN or Tax ID"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Saving...' : (business ? 'Update Business' : 'Create Business')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessModal;