import React, { useState } from 'react';
import { CheckSquare, XSquare, Box, DollarSign, Calendar, Building, Package, RefreshCw, Clock, FileText } from 'lucide-react';
import { usePurchaseOrderStore } from '../../store/purchaseOrderStore';
import { PurchaseOrder, PurchaseOrderItem } from '../../types/business';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ComprehensiveAuditTrail } from '../audit/ComprehensiveAuditTrail';
import { PurchaseOrderAuditHistory } from '../audit/PurchaseOrderAuditHistory';
import { ReceivingWorkflowAudit } from '../audit/ReceivingWorkflowAudit';

interface PurchaseOrderDetailsProps {
  onClose?: () => void;
  onEdit?: (poId: string) => void;
}

export const PurchaseOrderDetails: React.FC<PurchaseOrderDetailsProps> = ({
  onClose,
  onEdit
}) => {
  const { selectedPO, receivePO, error } = usePurchaseOrderStore();
  const [receivedItems, setReceivedItems] = useState<{[key: string]: number}>({});
  const [isReceiving, setIsReceiving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'audit' | 'receiving'>('details');

  if (!selectedPO) {
    return null;
  }

  const handleReceiveChange = (itemId: string, quantity: number) => {
    setReceivedItems(prev => ({
      ...prev,
      [itemId]: Math.max(0, Math.min(quantity, selectedPO.items.find(i => i.id === itemId)?.quantity || 0))
    }));
  };

  const handleReceivePO = async () => {
    setIsReceiving(true);
    try {
      const itemsToReceive = selectedPO.items
        .filter(item => receivedItems[item.id] > 0)
        .map(item => ({
          ...item,
          quantity: receivedItems[item.id]
        }));

      await receivePO(selectedPO.id, itemsToReceive);
      setReceivedItems({});
      onClose?.();
    } finally {
      setIsReceiving(false);
    }
  };

  const handleReceiveAll = () => {
    const allItems = selectedPO.items.reduce((acc, item) => ({
      ...acc,
      [item.id]: item.quantity - (item.receivedQty || 0)
    }), {});
    setReceivedItems(allItems);
  };

  const totalReceived = selectedPO.items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
  const totalQuantity = selectedPO.items.reduce((sum, item) => sum + item.quantity, 0);
  const isFullyReceived = totalReceived === totalQuantity;
  const canReceive = Object.values(receivedItems).some(qty => qty > 0);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchase Order Details</h2>
          <p className="text-sm text-gray-500">PO Number: {selectedPO.poNumber}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <XSquare className="h-6 w-6" />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-6 border-b border-gray-200">
        <nav className="flex space-x-6">
          {[
            { key: 'details', label: 'Details', icon: Package },
            { key: 'audit', label: 'Audit Trail', icon: Clock },
            { key: 'receiving', label: 'Receiving History', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <>
            {/* Basic info */}
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center mb-2">
            <Building className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Supplier</span>
          </div>
          <p className="text-sm text-gray-900">{selectedPO.supplierName}</p>
        </div>
        <div>
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Dates</span>
          </div>
          <p className="text-sm text-gray-900">Created: {formatDate(selectedPO.createdAt)}</p>
          {selectedPO.expectedDate && (
            <p className="text-sm text-gray-600">Expected: {formatDate(selectedPO.expectedDate)}</p>
          )}
          {selectedPO.receivedDate && (
            <p className="text-sm text-gray-600">Received: {formatDate(selectedPO.receivedDate)}</p>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="px-6 py-4">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Items</h3>
          {!isFullyReceived && (
            <button
              onClick={handleReceiveAll}
              className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Receive All Remaining
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ordered
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Received
                </th>
                {!isFullyReceived && (
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receive Now
                  </th>
                )}
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {selectedPO.items.map((item) => {
                const receivedQty = item.receivedQty || 0;
                const remainingQty = item.quantity - receivedQty;
                return (
                  <tr key={item.id}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.productName}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {item.productSku}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm ${receivedQty === item.quantity ? 'text-green-600' : 'text-gray-900'}`}>
                        {receivedQty}
                      </span>
                    </td>
                    {!isFullyReceived && (
                      <td className="px-3 py-4 whitespace-nowrap text-right">
                        <input
                          type="number"
                          min="0"
                          max={remainingQty}
                          value={receivedItems[item.id] || 0}
                          onChange={(e) => handleReceiveChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-20 text-right border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th
                  colSpan={isFullyReceived ? 5 : 6}
                  className="px-3 py-4 text-right text-sm font-medium text-gray-900"
                >
                  Subtotal: {formatCurrency(selectedPO.subtotal)}
                </th>
              </tr>
              <tr>
                <th
                  colSpan={isFullyReceived ? 5 : 6}
                  className="px-3 py-4 text-right text-sm font-medium text-gray-900"
                >
                  Tax: {formatCurrency(selectedPO.tax)}
                </th>
              </tr>
              <tr>
                <th
                  colSpan={isFullyReceived ? 5 : 6}
                  className="px-3 py-4 text-right text-sm font-medium text-gray-900"
                >
                  Total: {formatCurrency(selectedPO.total)}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
          </>
        )}

        {activeTab === 'audit' && (
          <div className="p-6">
            <ComprehensiveAuditTrail 
              purchaseOrderId={selectedPO.id}
              purchaseOrder={selectedPO}
            />
          </div>
        )}

        {activeTab === 'receiving' && (
          <div className="p-6">
            <ReceivingWorkflowAudit 
              purchaseOrderId={selectedPO.id}
              purchaseOrder={selectedPO}
            />
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 bg-gray-50 flex justify-between">
        <div className="flex items-center text-sm text-gray-700">
          <Box className="h-4 w-4 mr-1" />
          Total Items: {selectedPO.items.length} ({totalReceived} of {totalQuantity} units received)
        </div>
        <div className="flex space-x-3">
          {onEdit && (
            <button
              onClick={() => onEdit(selectedPO.id)}
              className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 border border-blue-300"
            >
              Edit
            </button>
          )}
          {!isFullyReceived && (
            <button
              onClick={handleReceivePO}
              disabled={!canReceive || isReceiving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReceiving ? 'Receiving...' : 'Receive Selected'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};