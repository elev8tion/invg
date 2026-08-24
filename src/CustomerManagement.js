import React, { useState } from 'react';
import { 
  Users, Plus, Search, Edit3, Trash2, Save, X, 
  Mail, Phone, MapPin, Building, ChevronDown, Check
} from 'lucide-react';
import useCustomers from './hooks/useCustomers';

const CustomerManagement = ({ onCustomerSelect, onClose, businessId }) => {
  const { customers, loading, error, addCustomer, updateCustomer, deleteCustomer } =
    useCustomers(businessId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('Please enter a customer name');
      return;
    }
    if (!businessId) {
      alert('Select a business before adding customers');
      return;
    }

    try {
      await addCustomer(newCustomer);
    } catch (err) {
      console.error('Failed to add customer:', err);
      alert('Could not save the customer. Please try again.');
      return;
    }

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
  };

  const handleUpdateCustomer = async () => {
    try {
      await updateCustomer(editingCustomer.id, editingCustomer);
    } catch (err) {
      console.error('Failed to update customer:', err);
      alert('Could not update the customer. Please try again.');
      return;
    }
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await deleteCustomer(id);
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert('Could not delete the customer. Please try again.');
    }
  };

  const handleSelectCustomer = (customer) => {
    if (onCustomerSelect) {
      onCustomerSelect(customer);
    }
    if (onClose) {
      onClose();
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1f2937',
        borderRadius: '24px',
        border: '1px solid #374151',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #374151',
          background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
          color: 'white'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              Customer Management
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '5px'
              }}
            >
              <X size={24} />
            </button>
          </div>
          <p style={{ margin: 0, opacity: 0.9 }}>
            {customers.length} customers saved
          </p>
        </div>

        {/* Search and Add Button */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #374151',
          background: '#111827',
          display: 'flex',
          gap: '10px'
        }}>
          <div style={{
            flex: 1,
            position: 'relative'
          }}>
            <Search size={20} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 40px',
                border: '1px solid #4b5563',
                borderRadius: '12px',
                fontSize: '16px',
                background: '#374151',
                color: 'white'
              }}
            />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600'
            }}
          >
            <Plus size={20} />
            Add Customer
          </button>
        </div>

        {/* Customer List or Form */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          background: '#111827'
        }}>
          {showAddForm ? (
            <div style={{
              background: '#1f2937',
              border: '1px solid #374151',
              padding: '20px',
              borderRadius: '16px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#f3f4f6' }}>Add New Customer</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Company
                  </label>
                  <input
                    type="text"
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: '10px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={newCustomer.state}
                      onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                      ZIP
                    </label>
                    <input
                      type="text"
                      value={newCustomer.zip}
                      onChange={(e) => setNewCustomer({...newCustomer, zip: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Notes
                  </label>
                  <textarea
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
              <div style={{
                marginTop: '20px',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#374151',
                    color: '#d1d5db',
                    border: '1px solid #4b5563',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomer}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={16} />
                  Save Customer
                </button>
              </div>
            </div>
          ) : editingCustomer ? (
            <div style={{
              background: '#1f2937',
              border: '1px solid #374151',
              padding: '20px',
              borderRadius: '16px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#f3f4f6' }}>Edit Customer</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Company
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.company}
                    onChange={(e) => setEditingCustomer({...editingCustomer, company: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#9ca3af' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #4b5563',
                      borderRadius: '12px',
                      background: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
              </div>
              <div style={{
                marginTop: '20px',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setEditingCustomer(null)}
                  style={{
                    padding: '8px 16px',
                    background: '#374151',
                    color: '#d1d5db',
                    border: '1px solid #4b5563',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCustomer}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={16} />
                  Update Customer
                </button>
              </div>
            </div>
          ) : (
            <div>
              {filteredCustomers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#9ca3af'
                }}>
                  <Users size={48} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <p style={{ fontSize: '18px', marginBottom: '5px' }}>
                    {loading ? 'Loading customers...' : error ? 'Could not load customers' : 'No customers found'}
                  </p>
                  <p style={{ fontSize: '14px' }}>
                    {loading
                      ? 'Fetching from the database.'
                      : error
                      ? 'Check the connection and try again.'
                      : searchTerm
                      ? 'Try a different search term'
                      : 'Click "Add Customer" to get started'}
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gap: '10px'
                }}>
                  {filteredCustomers.map(customer => (
                    <div
                      key={customer.id}
                      style={{
                        border: '1px solid #374151',
                        borderRadius: '16px',
                        padding: '15px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#1f2937',
                        transition: 'box-shadow 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(168, 85, 247, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#f3f4f6' }}>
                          {customer.name}
                          {customer.company && (
                            <span style={{ 
                              marginLeft: '10px', 
                              fontSize: '14px', 
                              color: '#9ca3af',
                              fontWeight: 'normal' 
                            }}>
                              ({customer.company})
                            </span>
                          )}
                        </h4>
                        <div style={{
                          display: 'flex',
                          gap: '20px',
                          fontSize: '14px',
                          color: '#9ca3af'
                        }}>
                          {customer.email && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Mail size={14} /> {customer.email}
                            </span>
                          )}
                          {customer.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Phone size={14} /> {customer.phone}
                            </span>
                          )}
                          {customer.city && customer.state && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <MapPin size={14} /> {customer.city}, {customer.state}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '5px'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCustomer(customer);
                          }}
                          style={{
                            padding: '8px',
                            background: '#374151',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            color: '#9ca3af'
                          }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomer(customer.id);
                          }}
                          style={{
                            padding: '8px',
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            color: '#ef4444'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;