import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ArrowRight, 
  Clock, 
  User, 
  FileText, 
  ShieldCheck,
  Lock
} from 'lucide-react';
import { 
  PurchaseOrder, 
  EnhancedPurchaseOrderStatus 
} from '../../types/business';
import { PurchaseOrderStateMachine, TransitionContext } from '../../services/purchaseOrderStateMachine';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { 
  hasPurchaseOrderPermission,
  getPurchaseOrderPermissions,
  validatePurchaseOrderApproval,
  validatePurchaseOrderReceiving,
  validatePurchaseOrderCancellation
} from '../../utils/purchaseOrderPermissions';
import { UserRole } from '../../types/auth';

interface StatusTransitionDialogProps {
  purchaseOrder: PurchaseOrder;
  targetStatus: EnhancedPurchaseOrderStatus;
  isOpen: boolean;
  onConfirm: (context: TransitionContext) => Promise<void>;
  onCancel: () => void;
}

interface TransitionValidation {
  canTransition: boolean;
  reasons: string[];
  warnings: string[];
  requirements: string[];
}

export const StatusTransitionDialog: React.FC<StatusTransitionDialogProps> = ({
  purchaseOrder,
  targetStatus,
  isOpen,
  onConfirm,
  onCancel
}) => {
  const { user, userRole } = useSupabaseAuthStore();
  const [stateMachine] = useState(() => new PurchaseOrderStateMachine());
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validation, setValidation] = useState<TransitionValidation>({
    canTransition: false,
    reasons: [],
    warnings: [],
    requirements: []
  });

  // Map enhanced status to legacy for validation
  const mapEnhancedToLegacy = (enhancedStatus: EnhancedPurchaseOrderStatus): string => {
    const statusMap: Record<EnhancedPurchaseOrderStatus, string> = {
      'draft': 'draft',
      'pending_approval': 'draft',
      'approved': 'sent',
      'sent_to_supplier': 'sent',
      'partially_received': 'partial',
      'fully_received': 'received',
      'cancelled': 'cancelled',
      'closed': 'received'
    };
    return statusMap[enhancedStatus] || 'draft';
  };

  const mapLegacyToEnhanced = (legacyStatus: string): EnhancedPurchaseOrderStatus => {
    const statusMap: Record<string, EnhancedPurchaseOrderStatus> = {
      'draft': 'draft',
      'sent': 'sent_to_supplier',
      'received': 'fully_received',
      'partial': 'partially_received',
      'cancelled': 'cancelled'
    };
    return statusMap[legacyStatus] as EnhancedPurchaseOrderStatus || 'draft';
  };

  useEffect(() => {
    if (isOpen) {
      validateTransition();
    }
  }, [isOpen, purchaseOrder, targetStatus]);

  const validateTransition = () => {
    const currentEnhanced = mapLegacyToEnhanced(purchaseOrder.status);
    const reasons: string[] = [];
    const warnings: string[] = [];
    const requirements: string[] = [];

    // Check if transition is valid in state machine
    const isValidTransition = stateMachine.canTransition(currentEnhanced, targetStatus);
    if (!isValidTransition) {
      reasons.push(`Cannot transition from ${currentEnhanced} to ${targetStatus}`);
    }

    // Check user permissions based on target status
    if (targetStatus === 'approved') {
      const validation = validatePurchaseOrderApproval(userRole as UserRole, purchaseOrder.total, purchaseOrder);
      if (!validation.isValid && validation.reason) {
        reasons.push(validation.reason);
      }
    } else if (['sent_to_supplier', 'partially_received', 'fully_received'].includes(targetStatus)) {
      const validation = validatePurchaseOrderReceiving(userRole as UserRole, purchaseOrder);
      if (!validation.isValid && validation.reason) {
        reasons.push(validation.reason);
      }
    } else if (targetStatus === 'cancelled') {
      const validation = validatePurchaseOrderCancellation(userRole as UserRole, purchaseOrder);
      if (!validation.isValid && validation.reason) {
        reasons.push(validation.reason);
      }
    }

    // Add specific validations based on target status
    switch (targetStatus) {
      case 'approved':
        if (purchaseOrder.items.length === 0) {
          reasons.push('Cannot approve purchase order without items');
        }
        if (purchaseOrder.total <= 0) {
          reasons.push('Cannot approve purchase order with zero total');
        }
        if (!purchaseOrder.supplierId) {
          reasons.push('Cannot approve purchase order without supplier');
        }
        requirements.push('Purchase order will be marked as approved and ready for sending to supplier');
        break;

      case 'sent_to_supplier':
        requirements.push('Purchase order will be sent to supplier and cannot be easily modified');
        break;

      case 'partially_received':
      case 'fully_received':
        warnings.push('This action will trigger inventory updates');
        requirements.push('Ensure all received items have been physically verified');
        break;

      case 'cancelled':
        warnings.push('Cancelled purchase orders cannot be restored');
        requirements.push('Provide a reason for cancellation in the notes below');
        break;

      case 'closed':
        warnings.push('Closed purchase orders are finalized and cannot be modified');
        requirements.push('Ensure all receiving and accounting processes are complete');
        break;
    }

    // Check for mandatory reason
    const requiresReason = ['cancelled', 'closed'].includes(targetStatus);
    if (requiresReason && !reason.trim()) {
      reasons.push('Reason is required for this status change');
    }

    setValidation({
      canTransition: reasons.length === 0,
      reasons,
      warnings,
      requirements
    });
  };

  const getActionFromStatus = (status: EnhancedPurchaseOrderStatus): 'edit' | 'approve' | 'receive' | 'cancel' | 'view_history' => {
    switch (status) {
      case 'approved':
        return 'approve';
      case 'partially_received':
      case 'fully_received':
        return 'receive';
      case 'cancelled':
        return 'cancel';
      default:
        return 'edit';
    }
  };

  const getStatusDisplayName = (status: EnhancedPurchaseOrderStatus): string => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getStatusIcon = (status: EnhancedPurchaseOrderStatus) => {
    switch (status) {
      case 'approved':
        return CheckCircle;
      case 'cancelled':
        return X;
      case 'partially_received':
      case 'fully_received':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: EnhancedPurchaseOrderStatus): string => {
    const colorMap: Record<EnhancedPurchaseOrderStatus, string> = {
      'draft': 'text-gray-600',
      'pending_approval': 'text-yellow-600',
      'approved': 'text-blue-600',
      'sent_to_supplier': 'text-purple-600',
      'partially_received': 'text-orange-600',
      'fully_received': 'text-green-600',
      'cancelled': 'text-red-600',
      'closed': 'text-gray-800'
    };
    return colorMap[status] || 'text-gray-600';
  };

  const handleConfirm = async () => {
    if (!validation.canTransition) return;

    setIsProcessing(true);
    try {
      const context: TransitionContext = {
        performedBy: user?.id || '',
        reason: reason.trim() || undefined,
        timestamp: new Date(),
        metadata: {
          userRole: userRole,
          fromStatus: mapLegacyToEnhanced(purchaseOrder.status),
          toStatus: targetStatus
        }
      };

      await onConfirm(context);
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-validate when reason changes
  useEffect(() => {
    if (isOpen) {
      validateTransition();
    }
  }, [reason]);

  if (!isOpen) return null;

  const StatusIcon = getStatusIcon(targetStatus);
  const currentEnhanced = mapLegacyToEnhanced(purchaseOrder.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Confirm Status Change
            </h3>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Transition Visual */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-center">
              <div className={`text-sm font-medium ${getStatusColor(currentEnhanced)}`}>
                {getStatusDisplayName(currentEnhanced)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Current</div>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-400" />
            <div className="text-center">
              <div className={`text-sm font-medium ${getStatusColor(targetStatus)}`}>
                <StatusIcon className="h-4 w-4 inline mr-1" />
                {getStatusDisplayName(targetStatus)}
              </div>
              <div className="text-xs text-gray-500 mt-1">New Status</div>
            </div>
          </div>

          {/* Purchase Order Info */}
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span>PO Number:</span>
              <span className="font-medium">{purchaseOrder.poNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Supplier:</span>
              <span className="font-medium">{purchaseOrder.supplierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-medium">₱{purchaseOrder.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Validation Errors */}
          {validation.reasons.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <Lock className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-1">Cannot Proceed</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validation.reasons.map((reason, index) => (
                      <li key={index}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">Important Notice</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Requirements */}
          {validation.requirements.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <ShieldCheck className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Requirements</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {validation.requirements.map((requirement, index) => (
                      <li key={index}>• {requirement}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Reason for Status Change
              {['cancelled', 'closed'].includes(targetStatus) && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder={`Explain why you are changing the status to ${getStatusDisplayName(targetStatus).toLowerCase()}...`}
            />
          </div>

          {/* User Info */}
          <div className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-600">
            <User className="h-3 w-3 mr-1" />
            <span>Performing as: {user?.email || 'Unknown User'}</span>
            <span className="mx-2">•</span>
            <Clock className="h-3 w-3 mr-1" />
            <span>{new Date().toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!validation.canTransition || isProcessing}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${
              validation.canTransition
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <StatusIcon className="h-4 w-4 mr-2" />
                Confirm Change
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusTransitionDialog;