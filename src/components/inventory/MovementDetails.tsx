import React from 'react';
import { 
  X, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Truck, 
  RefreshCw, 
  ArrowUpDown,
  Calendar,
  MapPin,
  User,
  FileText,
  Hash,
  DollarSign,
  Tag,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { ProductMovementHistory, ProductMovementType } from '../../types/business';

interface MovementDetailsProps {
  movement: ProductMovementHistory;
  onClose: () => void;
  onApprove?: (movementId: string) => void;
  onReject?: (movementId: string) => void;
  showActions?: boolean;
}

const MovementDetails: React.FC<MovementDetailsProps> = ({ 
  movement, 
  onClose, 
  onApprove, 
  onReject, 
  showActions = false 
}) => {
  // Movement type configurations
  const movementTypeConfig = {
    stock_in: { label: 'Stock In', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', description: 'Items added to inventory' },
    stock_out: { label: 'Stock Out', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', description: 'Items removed from inventory' },
    sale: { label: 'Sale', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', description: 'Sales transaction' },
    purchase: { label: 'Purchase', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', description: 'Purchase order received' },
    adjustment_in: { label: 'Adjustment +', icon: Plus, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Positive stock adjustment' },
    adjustment_out: { label: 'Adjustment -', icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50', description: 'Negative stock adjustment' },
    transfer_out: { label: 'Transfer Out', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50', description: 'Transfer to another location' },
    transfer_in: { label: 'Transfer In', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50', description: 'Received from another location' },
    return_in: { label: 'Return In', icon: RefreshCw, color: 'text-green-600', bg: 'bg-green-50', description: 'Customer or supplier return' },
    return_out: { label: 'Return Out', icon: RefreshCw, color: 'text-red-600', bg: 'bg-red-50', description: 'Return to supplier' },
    damage_out: { label: 'Damaged', icon: TrendingDown, color: 'text-red-700', bg: 'bg-red-100', description: 'Damaged goods removal' },
    expired_out: { label: 'Expired', icon: TrendingDown, color: 'text-gray-600', bg: 'bg-gray-50', description: 'Expired goods removal' },
    shrinkage: { label: 'Shrinkage', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', description: 'Inventory shrinkage' },
    recount: { label: 'Recount', icon: ArrowUpDown, color: 'text-yellow-600', bg: 'bg-yellow-50', description: 'Physical count adjustment' },
    initial_stock: { label: 'Initial Stock', icon: Package, color: 'text-gray-600', bg: 'bg-gray-50', description: 'Initial inventory setup' }
  };

  const getMovementTypeDisplay = (type: ProductMovementType) => {
    const config = movementTypeConfig[type];
    if (!config) return { label: type, icon: Package, color: 'text-gray-600', bg: 'bg-gray-50', description: 'Unknown movement type' };
    return config;
  };

  const formatQuantity = (type: ProductMovementType, quantity: number) => {
    // Stock decreasing operations (outbound)
    const STOCK_OUT_TYPES = [
      'sale',               // Sales transactions
      'stock_out',          // General stock out
      'adjustment_out',     // Negative adjustments
      'transfer_out',       // Transfers to other locations
      'return_out',         // Returns to suppliers
      'damage_out',         // Damaged goods
      'expired_out',        // Expired products
      'shrinkage'           // Inventory shrinkage
    ];
    
    const isNegative = STOCK_OUT_TYPES.includes(type);
    return isNegative ? `-${quantity}` : `+${quantity}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const typeConfig = getMovementTypeDisplay(movement.type);
  const Icon = typeConfig.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
                <Icon className={`h-5 w-5 ${typeConfig.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Movement Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {typeConfig.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Basic Information
                </h3>
                <div className="space-y-3">
                  {/* Movement Type */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Movement Type:</span>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {typeConfig.label}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(movement.status)}`}>
                      {getStatusIcon(movement.status)}
                      <span className="ml-1 capitalize">{movement.status}</span>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Date & Time:</span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {movement.createdAt.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {movement.createdAt.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Performed By */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Performed By:</span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {movement.performedByName || movement.performedBy}
                      </div>
                      {movement.performedByName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {movement.performedBy}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approved By */}
                  {movement.approvedBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Approved By:</span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {movement.approvedByName || movement.approvedBy}
                        </div>
                        {movement.approvedByName && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {movement.approvedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Product Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Product Name:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {movement.productName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">SKU:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {movement.productSku}
                    </span>
                  </div>
                  {movement.batchNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Batch Number:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {movement.batchNumber}
                      </span>
                    </div>
                  )}
                  {movement.expiryDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Expiry Date:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {movement.expiryDate.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quantity and Financial Information */}
            <div className="space-y-6">
              {/* Quantity Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Quantity Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Quantity Change:</span>
                    <span className={`text-sm font-bold ${
                      ['stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out'].includes(movement.type)
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {formatQuantity(movement.type, movement.quantity)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Previous Stock:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {movement.previousStock}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">New Stock:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {movement.newStock}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              {(movement.unitCost || movement.totalValue) && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Financial Information
                  </h3>
                  <div className="space-y-3">
                    {movement.unitCost && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Unit Cost:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          ₱{movement.unitCost.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {movement.totalValue && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Value:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          ₱{movement.totalValue.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Location Information
                </h3>
                <div className="space-y-3">
                  {movement.locationName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Location:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {movement.locationName}
                      </span>
                    </div>
                  )}
                  {movement.fromLocationName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">From Location:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {movement.fromLocationName}
                      </span>
                    </div>
                  )}
                  {movement.toLocationName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">To Location:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {movement.toLocationName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reference Information */}
          {(movement.referenceNumber || movement.referenceType || movement.referenceId) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Reference Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {movement.referenceNumber && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 block">Reference Number:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {movement.referenceNumber}
                    </span>
                  </div>
                )}
                {movement.referenceType && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 block">Reference Type:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {movement.referenceType}
                    </span>
                  </div>
                )}
                {movement.referenceId && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 block">Reference ID:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {movement.referenceId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reason and Notes */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Additional Information
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Reason:</span>
                <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-dark-700 p-3 rounded-lg">
                  {movement.reason}
                </p>
              </div>
              {movement.notes && (
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Notes:</span>
                  <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-dark-700 p-3 rounded-lg">
                    {movement.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {movement.attachments && movement.attachments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Attachments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {movement.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
                  >
                    <FileText className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {attachment}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && movement.status === 'pending' && (onApprove || onReject) && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
            <div className="flex justify-end space-x-3">
              {onReject && (
                <button
                  onClick={() => onReject(movement.id)}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
              )}
              {onApprove && (
                <button
                  onClick={() => onApprove(movement.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovementDetails;