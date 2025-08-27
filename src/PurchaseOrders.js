import React, { useState, useEffect } from 'react';
import { Package, Calendar, TrendingUp, FileText, Plus, Search, Filter } from 'lucide-react';
import { purchaseOrderService, invoiceService } from './lib/supabase';

const PurchaseOrders = ({ businessId }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newPO, setNewPO] = useState({
    customer_name: '',
    project_name: '',
    amount: '',
    customer_id: null
  });

  useEffect(() => {
    if (businessId) {
      loadPurchaseOrders();
    }
  }, [businessId]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      // Get purchase orders from Supabase
      const pos = await purchaseOrderService.getPurchaseOrders(businessId);
      
      // Calculate invoiced amounts for each PO
      const posWithCalculations = await Promise.all(pos.map(async (po) => {
        // Get all invoices for this business with this PO number
        const invoices = await invoiceService.getInvoices(businessId, { po_number: po.po_number });
        const invoicedAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const remainingAmount = (po.total_amount || 0) - invoicedAmount;
        
        return {
          id: po.id,
          po_number: po.po_number,
          customer_name: po.customer?.name || po.customer?.company || 'Unknown',
          project_name: po.project_name || 'Untitled Project',
          amount: po.total_amount || 0,
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
      // Fallback to empty array
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Purchase Orders</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Plus size={18} />
            New PO
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Package size={20} />
              <span className="text-sm">Total PO Value</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${totalPOValue.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <FileText size={20} />
              <span className="text-sm">Invoiced</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${totalInvoiced.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <TrendingUp size={20} />
              <span className="text-sm">Remaining</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${totalRemaining.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search POs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredPOs.map((po) => (
            <div key={po.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-purple-400">{po.po_number}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(po.status).split(' ')[0]} bg-opacity-20 ${getStatusColor(po.status).split(' ')[1]}`}>
                      {po.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-white font-medium mb-1">{po.customer_name}</h3>
                  <p className="text-gray-400 text-sm mb-3">{po.project_name}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-500" />
                      <span className="text-gray-400">{po.created_date}</span>
                    </div>
                    <div className="text-gray-400">
                      Value: <span className="text-white font-medium">${po.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="mb-2">
                    <div className="text-xs text-gray-400 mb-1">Progress</div>
                    <div className="w-32 h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${(po.invoiced_amount / po.amount) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Remaining: </span>
                    <span className="text-white font-medium">${po.remaining_amount.toLocaleString()}</span>
                  </div>
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
                    try {
                      const poNumber = `PO-${Date.now().toString().slice(-8)}`;
                      const poData = {
                        business_id: businessId,
                        po_number: poNumber,
                        customer_id: newPO.customer_id,
                        project_name: newPO.project_name,
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