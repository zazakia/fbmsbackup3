import React, { useState } from 'react';
import { Plus, Search, Filter, Package, Truck, FileText, AlertTriangle } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import SupplierList from './SupplierList';
import PurchaseOrderList from './PurchaseOrderList';
import SupplierForm from './SupplierForm';
import PurchaseOrderForm from './PurchaseOrderForm';

const PurchaseManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchase-orders'>('suppliers');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPOForm, setShowPOForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
  const [editingPO, setEditingPO] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { suppliers, purchaseOrders } = useBusinessStore();

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && supplier.isActive;
  });

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         po.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingPOs = purchaseOrders.filter(po => po.status === 'sent').length;
  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
  const activeSuppliers = suppliers.filter(s => s.isActive).length;

  const handleEditSupplier = (supplierId: string) => {
    setEditingSupplier(supplierId);
    setShowSupplierForm(true);
  };

  const handleEditPO = (poId: string) => {
    setEditingPO(poId);
    setShowPOForm(true);
  };

  const handleCloseSupplierForm = () => {
    setShowSupplierForm(false);
    setEditingSupplier(null);
  };

  const handleClosePOForm = () => {
    setShowPOForm(false);
    setEditingPO(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Management</h1>
          <p className="text-gray-600 mt-1">Manage suppliers, purchase orders, and goods received</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSupplierForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </button>
          <button
            onClick={() => setShowPOForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create PO
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{activeSuppliers}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending POs</p>
              <p className="text-2xl font-bold text-orange-600">{pendingPOs}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total PO Value</p>
              <p className="text-2xl font-bold text-green-600">₱{totalPOValue.toLocaleString()}</p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-purple-600">{purchaseOrders.filter(po => {
                const thisMonth = new Date().getMonth();
                const poMonth = new Date(po.createdAt).getMonth();
                return thisMonth === poMonth;
              }).length}</p>
            </div>
            <Truck className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'suppliers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Suppliers
            </button>
            <button
              onClick={() => setActiveTab('purchase-orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'purchase-orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Purchase Orders
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'suppliers' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search suppliers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Supplier List */}
              <SupplierList 
                suppliers={filteredSuppliers} 
                onEdit={handleEditSupplier}
              />
            </div>
          )}

          {activeTab === 'purchase-orders' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search purchase orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="received">Received</option>
                  <option value="partial">Partial</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Purchase Order List */}
              <PurchaseOrderList 
                purchaseOrders={filteredPOs} 
                onEdit={handleEditPO}
              />
            </div>
          )}
        </div>
      </div>

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <SupplierForm
          supplierId={editingSupplier}
          onClose={handleCloseSupplierForm}
        />
      )}

      {/* Purchase Order Form Modal */}
      {showPOForm && (
        <PurchaseOrderForm
          poId={editingPO}
          onClose={handleClosePOForm}
        />
      )}
    </div>
  );
};

export default PurchaseManagement; 