import React, { useState, useEffect, useCallback } from 'react';
import { money } from './lib/format';
import { Package, Calendar, TrendingUp, FileText, Plus, Search, FileCheck } from 'lucide-react';
import { purchaseOrderService, invoiceService, customerService, businessService } from './lib/db';

const PurchaseOrders = ({ businessId }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [convertingPoId, setConvertingPoId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newPO, setNewPO] = useState({
    customer_name: '',
    project_name: '',
    amount: '',
    customer_id: null
  });

  const loadPurchaseOrders = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [pos, custList] = await Promise.all([
        purchaseOrderService.getPurchaseOrders(businessId),
        customerService.getCustomers(businessId).catch(() => []),
      ]);
      setCustomers(custList || []);
      
      // Calculate invoiced amounts for each PO
      const posWithCalculations = await Promise.all(pos.map(async (po) => {
        // Get all invoices for this business with this PO number
        const invoices = await invoiceService.getInvoices(businessId, { po_number: po.po_number });
        const matchingInvoices = invoices.filter(inv => inv.po_number === po.po_number);
        const invoicedAmount = matchingInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
        const remainingAmount = (Number(po.total_amount) || 0) - invoicedAmount;
        
        return {
          id: po.id,
          po_number: po.po_number,
          customer_name: po.customer?.name || po.customer?.company || 'Unknown',
          project_name: po.project_name || po.notes || 'Untitled Project',
          amount: Number(po.total_amount) || 0,
          created_date: po.po_date || po.created_at?.split('T')[0],
          status: po.status || 'active',
          invoiced_amount: invoicedAmount,
          remaining_amount: remainingAmount > 0 ? remainingAmount : 0,
          customer_id: po.customer_id
        };
      }));
      
      setPurchaseOrders(posWithCalculations);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500 text-green-500';
      case 'completed':
        return 'bg-blue-500 text-blue-500';
      case 'draft':
        return 'bg-gray-500 text-gray-500';
      case 'cancelled':
        return 'bg-red-500 text-red-500';
      default:
        return 'bg-gray-500 text-gray-500';
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = 
      po.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPOValue = purchaseOrders
    .filter(po => po.status === 'active' || po.status === 'completed')
    .reduce((sum, po) => sum + po.amount, 0);

  const totalInvoiced = purchaseOrders
    .reduce((sum, po) => sum + po.invoiced_amount, 0);

  const totalRemaining = purchaseOrders
    .filter(po => po.status === 'active')
    .reduce((sum, po) => sum + po.remaining_amount, 0);

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
    <>
      <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-700/80 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Purchase Orders</h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Manage POs and convert to invoices</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors shadow-sm text-sm"
          >
            <Plus size={18} />
            New PO
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/40">
            <div className="flex items-center gap-2 text-purple-400 mb-1.5">
              <Package size={18} />
              <span className="text-xs sm:text-sm font-medium">Total PO Value</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
              {money(totalPOValue)}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/40">
            <div className="flex items-center gap-2 text-green-400 mb-1.5">
              <FileText size={18} />
              <span className="text-xs sm:text-sm font-medium">Invoiced</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
              {money(totalInvoiced)}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/40">
            <div className="flex items-center gap-2 text-yellow-400 mb-1.5">
              <TrendingUp size={18} />
              <span className="text-xs sm:text-sm font-medium">Remaining</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
              {money(totalRemaining)}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search POs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-700/70 border border-gray-600/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 text-sm min-h-[44px]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-700/70 border border-gray-600/60 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm min-h-[44px]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredPOs.map((po) => (
            <div key={po.id} className="bg-gray-700/40 border border-gray-600/40 rounded-xl p-4 hover:bg-gray-700/60 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="font-mono text-xs sm:text-sm font-semibold text-purple-400">{po.po_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusColor(po.status).split(' ')[0]} bg-opacity-20 ${getStatusColor(po.status).split(' ')[1]}`}>
                      {po.status}
                    </span>
                  </div>
                  <h3 className="text-white font-medium text-base mb-0.5 truncate">{po.customer_name}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm mb-2 truncate">{po.project_name}</p>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Calendar size={14} className="text-gray-500" />
                      <span>{po.created_date}</span>
                    </div>
                    <div className="text-gray-400">
                      Value: <span className="text-white font-mono tabular-nums font-semibold">{money(po.amount)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-600/40 flex flex-col sm:items-end">
                  <div className="mb-2 w-full sm:w-36">
                    <div className="flex justify-between sm:justify-end text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span className="sm:hidden font-mono">{Math.round((po.invoiced_amount / (po.amount || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full sm:w-36 h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (po.invoiced_amount / (po.amount || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm">
                    <span className="text-gray-400">Remaining: </span>
                    <span className="text-white font-mono tabular-nums font-semibold">{money(po.remaining_amount)}</span>
                  </div>
                  {po.status === 'active' && (
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Convert PO #${po.po_number} into a draft invoice?`)) return;
                        try {
                          setConvertingPoId(po.id);
                          await purchaseOrderService.convertToInvoice(po.id, businessId);
                          alert(`PO #${po.po_number} successfully converted to an invoice!`);
                          await loadPurchaseOrders();
                        } catch (err) {
                          console.error('Failed to convert PO:', err);
                          alert('Could not convert purchase order: ' + (err.message || 'unknown error'));
                        } finally {
                          setConvertingPoId(null);
                        }
                      }}
                      disabled={convertingPoId === po.id}
                      className="mt-3 w-full sm:w-auto min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <FileCheck size={14} />
                      {convertingPoId === po.id ? 'Converting...' : 'Convert to Invoice'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPOs.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No purchase orders found
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Create Purchase Order</h3>
            <div className="space-y-4">
              {customers.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Select Customer</label>
                  <select
                    value={newPO.customer_id || ''}
                    onChange={(e) => {
                      const selId = e.target.value ? Number(e.target.value) : null;
                      const cust = customers.find(c => c.id === selId);
                      setNewPO(prev => ({
                        ...prev,
                        customer_id: selId,
                        customer_name: cust ? cust.name : prev.customer_name
                      }));
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                  >
                    <option value="">-- Choose Existing Customer (or type below) --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <input
                type="text"
                placeholder="Customer Name"
                value={newPO.customer_name}
                onChange={(e) => setNewPO(prev => ({ ...prev, customer_name: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="Project Name"
                value={newPO.project_name}
                onChange={(e) => setNewPO(prev => ({ ...prev, project_name: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              <input
                type="number"
                placeholder="Amount"
                value={newPO.amount}
                onChange={(e) => setNewPO(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPO({ customer_name: '', project_name: '', amount: '', customer_id: null });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!newPO.customer_name.trim()) {
                      alert('Please provide a customer name');
                      return;
                    }
                    try {
                      let poNumber;
                      try {
                        poNumber = await businessService.getNextPoNumber(businessId);
                      } catch {
                        poNumber = `PO-${Date.now().toString().slice(-8)}`;
                      }

                      // Try to match customer if not explicitly chosen
                      let custId = newPO.customer_id;
                      if (!custId && customers.length > 0) {
                        const matched = customers.find(c => c.name.toLowerCase() === newPO.customer_name.trim().toLowerCase());
                        if (matched) custId = matched.id;
                      }

                      const poData = {
                        business_id: businessId,
                        po_number: poNumber,
                        customer_id: custId || null,
                        notes: newPO.project_name || '',
                        po_date: new Date().toISOString().split('T')[0],
                        total_amount: parseFloat(newPO.amount) || 0,
                        status: 'active'
                      };
                      
                      await purchaseOrderService.createPurchaseOrder(poData, []);
                      await loadPurchaseOrders();
                      setShowCreateModal(false);
                      setNewPO({ customer_name: '', project_name: '', amount: '', customer_id: null });
                    } catch (error) {
                      console.error('Error creating PO:', error);
                      alert('Failed to create purchase order');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Create PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PurchaseOrders;