import React from 'react';
import { Edit, Trash2, FileText, Building, Calendar, DollarSign } from 'lucide-react';
import { PurchaseOrder } from '../../types/business';
import { useBusinessStore } from '../../store/businessStore';

interface PurchaseOrderListProps {
  purchaseOrders: PurchaseOrder[];
  onEdit: (poId: string) => void;
}

const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({ purchaseOrders, onEdit }) => {
  const { deletePurchaseOrder } = useBusinessStore();

  const handleDelete = (poId: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      deletePurchaseOrder(poId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'sent':
        return 'Sent';
      case 'received':
        return 'Received';
      case 'partial':
        return 'Partial';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

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
            <tr key={po.id} className="hover:bg-gray-50">
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
                    {new Date(po.createdAt).toLocaleDateString('en-PH')}
                  </div>
                </div>
                {po.expectedDate && (
                  <div className="text-xs text-gray-500">
                    Expected: {new Date(po.expectedDate).toLocaleDateString('en-PH')}
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
                    ₱{po.total.toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Tax: ₱{po.tax.toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                  {getStatusLabel(po.status)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEdit(po.id)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(po.id)}
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
  );
};

export default PurchaseOrderList;  