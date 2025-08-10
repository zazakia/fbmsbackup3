import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePurchaseOrderStore } from '../../store/purchaseOrderStore';
import { PurchaseOrderList } from '../../components/purchases/PurchaseOrderList';
import { PurchaseOrderDetails } from '../../components/purchases/PurchaseOrderDetails';
import DatabaseMigrationAlert from '../../components/purchases/DatabaseMigrationAlert';
import { PurchaseOrderStatus } from '../../types/business';

interface FilterState {
  supplierId: string | null;
  status: PurchaseOrderStatus | null;
}

export const PurchaseOrderModule: React.FC = () => {
  const {
    purchaseOrders,
    selectedPO,
    loading,
    error,
    page,
    limit,
    loadPurchaseOrders,
    clearError
  } = usePurchaseOrderStore();

  const [filters, setFilters] = useState<FilterState>({
    supplierId: null,
    status: null
  });
  const [showDetails, setShowDetails] = useState(false);

  // Load initial data
  useEffect(() => {
    loadPurchaseOrders(page, limit);
  }, []);

  // Handle filter changes
  const handleFilterChange = (field: keyof FilterState, value: string | PurchaseOrderStatus | null) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    loadPurchaseOrders(1, limit); // Reset to first page
  };

  // Handle edit
  const handleEdit = (poId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit PO:', poId);
  };

  // Close details modal
  const handleCloseDetails = () => {
    setShowDetails(false);
  };

  // Retry loading
  const handleRetry = () => {
    clearError();
    loadPurchaseOrders(page, limit);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Purchase Order
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {/* Filters */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex space-x-4">
            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value as PurchaseOrderStatus || null)}
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Clear filters button */}
            {(filters.supplierId || filters.status) && (
              <button
                onClick={() => {
                  setFilters({ supplierId: null, status: null });
                  loadPurchaseOrders(1, limit);
                }}
                className="self-end px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-6">
            {/* Check if this is the missing table error */}
            {(error.includes('PGRST200') || 
              error.includes('Could not find a relationship') ||
              error.includes('purchase_order_items')) && (
              <DatabaseMigrationAlert />
            )}
            
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error loading purchase orders
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleRetry}
                      className="px-3 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Purchase order list */}
        {!loading && !error && (
          <div className="p-6">
            <PurchaseOrderList
              supplierId={filters.supplierId}
              status={filters.status}
              onEdit={handleEdit}
            />
          </div>
        )}
      </div>

      {/* Details modal */}
      {selectedPO && showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <PurchaseOrderDetails
              onClose={handleCloseDetails}
              onEdit={handleEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
};