import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, Save, X, Plus, Minus, Calendar, User, FileText, Scale } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem, PartialReceiptItem, ReceivingRecord } from '../../types/business';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { ReceivingService } from '../../services/receivingService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ValidatedUserSelector } from '../common/ValidatedUserSelector';
import { 
  getCurrentValidatedUser, 
  validateUserId,
  handleForeignKeyError,
  UserValidationResult 
} from '../../utils/userValidation';

interface ReceivingInterfaceProps {
  purchaseOrder: PurchaseOrder;
  onReceiptComplete: (receivingRecord: ReceivingRecord) => void;
  onClose: () => void;
  existingReceipts?: ReceivingRecord[];
}

interface ReceiptItemEntry extends PartialReceiptItem {
  hasError?: boolean;
  errorMessage?: string;
  isModified?: boolean;
}

export const ReceivingInterface: React.FC<ReceivingInterfaceProps> = ({
  purchaseOrder,
  onReceiptComplete,
  onClose,
  existingReceipts
}) => {
  const { user } = useSupabaseAuthStore();
  const [receivingService] = useState(() => new ReceivingService());
  
  // State for receipt items
  const [receiptItems, setReceiptItems] = useState<ReceiptItemEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Enhanced user validation state
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [receivedByName, setReceivedByName] = useState<string>('');
  const [userValidationResult, setUserValidationResult] = useState<UserValidationResult | null>(null);
  const [autoRetryOnError, setAutoRetryOnError] = useState(true);
  
  // Calculate previously received quantities
  const calculatePreviouslyReceived = (productId: string): number => {
    const receipts = existingReceipts ?? [];
    return receipts.reduce((total, receipt) => {
      const item = receipt.items.find(item => item.productId === productId);
      return total + (item?.receivedQuantity || 0);
    }, 0);
  };

  // Initialize receipt items from purchase order
  useEffect(() => {
    const initialItems: ReceiptItemEntry[] = purchaseOrder.items.map(item => {
      const previouslyReceived = calculatePreviouslyReceived(item.productId);
      const remainingQuantity = item.quantity - previouslyReceived;
      
      return {
        productId: item.productId,
        orderedQuantity: item.quantity,
        receivedQuantity: 0,
        previouslyReceived,
        totalReceived: previouslyReceived,
        condition: 'good' as const,
        isModified: false
      };
    });
    setReceiptItems(initialItems);
  }, [purchaseOrder, existingReceipts]);

  const handleReceiptChange = (productId: string, field: keyof PartialReceiptItem, value: any) => {
    setReceiptItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const updatedItem = { ...item, [field]: value, isModified: true };
        
        // Update total received
        if (field === 'receivedQuantity') {
          updatedItem.totalReceived = updatedItem.previouslyReceived + value;
        }
        
        // Validate quantity
        const poItem = purchaseOrder.items.find(po => po.productId === productId);
        if (poItem && updatedItem.totalReceived > poItem.quantity) {
          updatedItem.hasError = true;
          updatedItem.errorMessage = `Cannot receive more than ordered quantity (${poItem.quantity})`;
        } else if (value < 0) {
          updatedItem.hasError = true;
          updatedItem.errorMessage = 'Received quantity cannot be negative';
        } else {
          updatedItem.hasError = false;
          updatedItem.errorMessage = undefined;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleReceiveAll = () => {
    setReceiptItems(prev => prev.map(item => {
      const poItem = purchaseOrder.items.find(po => po.productId === item.productId);
      if (poItem) {
        const remainingQuantity = poItem.quantity - item.previouslyReceived;
        return {
          ...item,
          receivedQuantity: Math.max(0, remainingQuantity),
          totalReceived: poItem.quantity,
          isModified: true,
          hasError: false,
          errorMessage: undefined
        };
      }
      return item;
    }));
  };

  const handleReceiveNone = () => {
    setReceiptItems(prev => prev.map(item => ({
      ...item,
      receivedQuantity: 0,
      totalReceived: item.previouslyReceived,
      isModified: true,
      hasError: false,
      errorMessage: undefined
    })));
  };

  const validateReceipt = (): boolean => {
    const errors: string[] = [];
    
    // Check if any items are being received
    const hasItemsToReceive = receiptItems.some(item => item.receivedQuantity > 0);
    if (!hasItemsToReceive) {
      errors.push('At least one item must have a received quantity greater than 0');
    }
    
    // Check for item-level errors
    const itemErrors = receiptItems.filter(item => item.hasError);
    if (itemErrors.length > 0) {
      errors.push(`${itemErrors.length} items have validation errors`);
    }
    
    // Check if user is provided (required for audit trail)
    if (!receivedBy && !user?.id) {
      errors.push('Please select who is receiving the items');
    }
    
    // Warn if user validation failed but allow system fallback
    if (receivedBy && userValidationResult && !userValidationResult.isValid && !autoRetryOnError) {
      errors.push(`Selected user is invalid: ${userValidationResult.error}`);
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmitReceipt = async () => {
    if (!validateReceipt()) {
      return;
    }
    
    setIsProcessing(true);
    try {
      const receiptData = receiptItems
        .filter(item => item.receivedQuantity > 0)
        .map(item => ({
          productId: item.productId,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          previouslyReceived: item.previouslyReceived,
          totalReceived: item.totalReceived,
          condition: item.condition
        }));

      // Use validated user or fallback to current user
      const effectiveUserId = receivedBy || user?.id;
      const effectiveUserName = receivedByName || user?.email || 'Unknown User';

      const result = await receivingService.processReceipt(
        purchaseOrder.id,
        receiptData,
        effectiveUserId!,
        notes
      );

      if (result.success) {
        onReceiptComplete(result.receivingRecord!);
      } else {
        setValidationErrors(result.errors?.map(e => e.message) || ['Unknown error occurred']);
      }
    } catch (error: any) {
      console.error('Error processing receipt:', error);
      
      // Handle foreign key constraint violations with auto-retry
      const errorHandler = await handleForeignKeyError(error, 'processing receipt');
      
      if (errorHandler.shouldRetry && autoRetryOnError) {
        try {
          console.log('Retrying with system user fallback...');
          
          // Retry with system user
          const result = await receivingService.processReceipt(
            purchaseOrder.id,
            receiptData,
            errorHandler.fallbackUserId!,
            notes + (notes ? '\n\n' : '') + '[SYSTEM NOTE: Auto-recovery used due to user validation error]'
          );
          
          if (result.success) {
            console.warn('Receipt processed with system user fallback');
            onReceiptComplete(result.receivingRecord!);
            return; // Success with retry
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
      
      setValidationErrors([
        errorHandler.errorMessage || 'Failed to process receipt. Please try again.'
      ]);
    } finally {
      setIsProcessing(false);
      setShowConfirmation(false);
    }
  };

  // Calculate totals
  const totalItemsToReceive = receiptItems.filter(item => item.receivedQuantity > 0).length;
  const totalQuantityToReceive = receiptItems.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const hasModifications = receiptItems.some(item => item.isModified && item.receivedQuantity > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Receive Purchase Order Items
                </h2>
                <p className="text-sm text-gray-500">
                  PO #{purchaseOrder.poNumber} - {purchaseOrder.supplierName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReceiveAll}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Receive All Remaining
              </button>
              <button
                onClick={handleReceiveNone}
                className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {totalItemsToReceive} items • {totalQuantityToReceive} units to receive
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ordered
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Previously Received
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Receive Now
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Condition
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total After Receipt
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {receiptItems.map((item) => {
                const poItem = purchaseOrder.items.find(po => po.productId === item.productId);
                if (!poItem) return null;
                
                const remainingQty = poItem.quantity - item.previouslyReceived;
                const isFullyReceived = item.totalReceived >= poItem.quantity;
                
                return (
                  <tr 
                    key={item.productId}
                    className={`${item.hasError ? 'bg-red-50 dark:bg-red-900/20' : ''} ${
                      item.receivedQuantity > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {poItem.productName}
                          </div>
                          <div className="text-sm text-gray-500">SKU: {poItem.sku}</div>
                          <div className="text-xs text-gray-500">
                            Unit Cost: {formatCurrency(poItem.cost)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {poItem.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {item.previouslyReceived}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleReceiptChange(item.productId, 'receivedQuantity', Math.max(0, item.receivedQuantity - 1))}
                          disabled={item.receivedQuantity <= 0}
                          className="p-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={remainingQty}
                          value={item.receivedQuantity}
                          onChange={(e) => handleReceiptChange(item.productId, 'receivedQuantity', parseInt(e.target.value) || 0)}
                          className={`w-20 px-2 py-1 text-center border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            item.hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                        <button
                          onClick={() => handleReceiptChange(item.productId, 'receivedQuantity', Math.min(remainingQty, item.receivedQuantity + 1))}
                          disabled={item.receivedQuantity >= remainingQty}
                          className="p-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      {item.hasError && (
                        <p className="text-xs text-red-600 mt-1">{item.errorMessage}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Max: {remainingQty} remaining
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select
                        value={item.condition}
                        onChange={(e) => handleReceiptChange(item.productId, 'condition', e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="expired">Expired</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <span className={`text-sm font-medium ${
                          isFullyReceived ? 'text-green-600' : 'text-gray-900 dark:text-white'
                        }`}>
                          {item.totalReceived} / {poItem.quantity}
                        </span>
                        {isFullyReceived && (
                          <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* User Selection and Notes Section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 space-y-4">
          {/* User Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Received By <span className="text-red-500">*</span>
            </label>
            <ValidatedUserSelector
              selectedUserId={receivedBy}
              selectedUserName={receivedByName}
              onUserSelect={(userId, userName) => {
                setReceivedBy(userId);
                setReceivedByName(userName);
              }}
              onValidationResult={setUserValidationResult}
              placeholder="Select who is receiving the items..."
              required
              allowSystemFallback
              showValidationStatus
              className="max-w-md"
            />
            {userValidationResult && !userValidationResult.isValid && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>User Validation Warning:</strong> {userValidationResult.error}
                    {autoRetryOnError && (
                      <span className="block mt-1">
                        System will automatically use a valid fallback user to prevent errors.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Receiving Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              placeholder="Add any notes about the received items, damages, or special conditions..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center space-x-4">
                <span>Receiving as: {receivedByName || user?.email || 'Unknown User'}</span>
                <span>Date: {formatDate(new Date())}</span>
                {userValidationResult && !userValidationResult.isValid && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    ⚠ Using system fallback
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={!hasModifications || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Process Receipt'}
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Confirm Receipt Processing
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                You are about to process the receipt of {totalItemsToReceive} items ({totalQuantityToReceive} units total).
                This action cannot be undone. Are you sure you want to continue?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReceipt}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceivingInterface;