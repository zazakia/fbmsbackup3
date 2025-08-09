import React, { useEffect } from 'react';
import { Edit, Trash2, FileText, Building, Calendar, DollarSign } from 'lucide-react';
import { usePurchaseOrderStore } from '../../store/purchaseOrderStore';
import { PurchaseOrderStatus } from '../../types/business';
import { formatCurrency } from '../../utils/formatters';

interface PurchaseOrderListProps {
  supplierId?: string;
  status?: PurchaseOrderStatus;
  onEdit?: (poId: string) => void;
}

export const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({
  supplierId,
  status,
  onEdit
}) => {
  const {
    purchaseOrders,
    loading,
    error,
    page,
    limit,
    loadPurchaseOrders,
    loadPurchaseOrdersBySupplier,
    loadPurchaseOrdersByStatus,
    setPage,
    selectPO,
    deletePO
  } = usePurchaseOrderStore();

  // Load purchase orders based on filters
  useEffect(() => {
    if (supplierId) {
      loadPurchaseOrdersBySupplier(supplierId);
    } else if (status) {
      loadPurchaseOrdersByStatus(status);
    } else {
      loadPurchaseOrders(page, limit);
    }
  }, [supplierId, status, page, limit]);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle row click
  const handleRowClick = (po: any) => {
    selectPO(po);
  };

  // Handle delete
  const handleDelete = async (poId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      await deletePO(poId);
    }
  };

  // Handle edit
  const handleEdit = (poId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (onEdit) {
      onEdit(poId);
    }
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: PurchaseOrderStatus }> = ({ status }) => {
    const getStatusColor = (status: PurchaseOrderStatus) => {
      switch (status) {
        case 'draft':
          return 'bg-gray-200 text-gray-800';
        case 'pending':
          return 'bg-yellow-200 text-yellow-800';
        case 'partial':
          return 'bg-blue-200 text-blue-800';
        case 'received':
          return 'bg-green-200 text-green-800';
        case 'cancelled':
          return 'bg-red-200 text-red-800';
        default:
          return 'bg-gray-200 text-gray-800';
      }
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => loadPurchaseOrders(page, limit)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (purchaseOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No purchase orders found</h3>
        <p className="text-gray-500">Create your first purchase order to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PO Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {purchaseOrders.map((po) => (
              <tr
                key={po.id}
                onClick={() => handleRowClick(po)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {po.poNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        Created by: {po.createdBy}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Building className="h-4 w-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">
                      {po.supplierName}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">
                      {po.createdAt.toLocaleDateString('en-PH')}
                    </div>
                  </div>
                  {po.expectedDate && (
                    <div className="text-xs text-gray-500">
                      Expected: {po.expectedDate.toLocaleDateString('en-PH')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {po.items.length} items
                  </div>
                  <div className="text-sm text-gray-500">
                    {po.items.reduce((sum, item) => sum + item.quantity, 0)} total qty
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(po.total)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Tax: {formatCurrency(po.tax)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={po.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleEdit(po.id, e)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(po.id, e)}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={purchaseOrders.length < limit}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(page * limit, ((page - 1) * limit) + purchaseOrders.length)}
              </span>{' '}
              results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={purchaseOrders.length < limit}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};