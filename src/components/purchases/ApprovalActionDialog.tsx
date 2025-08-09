import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  FileText,
  DollarSign,
  Building,
  Calendar,
  Package,
  MessageSquare,
  Users,
  Clock
} from 'lucide-react';
import { PurchaseOrder } from '../../types/business';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { UserRole } from '../../types/auth';
import { validatePurchaseOrderApproval } from '../../utils/purchaseOrderPermissions';
import { formatCurrency } from '../../utils/formatters';

interface ApprovalActionDialogProps {
  isOpen: boolean;
  purchaseOrders: PurchaseOrder[];
  action: 'approve' | 'reject';
  onConfirm: (reason?: string, additionalData?: any) => void;
  onCancel: () => void;
}

interface ApprovalReason {
  id: string;
  label: string;
  requiresComment: boolean;
  category: 'approval' | 'rejection';
}

const APPROVAL_REASONS: ApprovalReason[] = [
  // Approval reasons
  { id: 'standard_approval', label: 'Standard approval - all requirements met', requiresComment: false, category: 'approval' },
  { id: 'conditional_approval', label: 'Conditional approval - see comments', requiresComment: true, category: 'approval' },
  { id: 'urgent_approval', label: 'Urgent business need', requiresComment: true, category: 'approval' },
  { id: 'budget_approved', label: 'Budget allocation confirmed', requiresComment: false, category: 'approval' },
  { id: 'management_override', label: 'Management override approval', requiresComment: true, category: 'approval' },

  // Rejection reasons
  { id: 'insufficient_budget', label: 'Insufficient budget allocation', requiresComment: true, category: 'rejection' },
  { id: 'incomplete_information', label: 'Incomplete or missing information', requiresComment: true, category: 'rejection' },
  { id: 'supplier_issues', label: 'Supplier concerns or restrictions', requiresComment: true, category: 'rejection' },
  { id: 'pricing_concerns', label: 'Pricing requires negotiation', requiresComment: true, category: 'rejection' },
  { id: 'policy_violation', label: 'Violates company procurement policy', requiresComment: true, category: 'rejection' },
  { id: 'duplicate_order', label: 'Duplicate or redundant order', requiresComment: false, category: 'rejection' },
  { id: 'timing_issues', label: 'Timing or delivery concerns', requiresComment: true, category: 'rejection' },
  { id: 'alternative_required', label: 'Alternative solution required', requiresComment: true, category: 'rejection' }
];

export const ApprovalActionDialog: React.FC<ApprovalActionDialogProps> = ({
  isOpen,
  purchaseOrders,
  action,
  onConfirm,
  onCancel
}) => {
  const { user, userRole } = useSupabaseAuthStore();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [showValidationErrors, setShowValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('');
      setCustomReason('');
      setComments('');
      setShowValidationErrors([]);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Filter reasons based on action
  const availableReasons = APPROVAL_REASONS.filter(reason => reason.category === action);

  // Calculate totals and validation
  const totals = React.useMemo(() => {
    const totalAmount = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
    const totalItems = purchaseOrders.reduce((sum, po) => sum + po.items.length, 0);
    const uniqueSuppliers = new Set(purchaseOrders.map(po => po.supplierName)).size;
    
    return {
      count: purchaseOrders.length,
      amount: totalAmount,
      items: totalItems,
      suppliers: uniqueSuppliers
    };
  }, [purchaseOrders]);

  // Validate approval permissions
  const validationErrors = React.useMemo(() => {
    const errors: string[] = [];

    purchaseOrders.forEach(po => {
      const validation = validatePurchaseOrderApproval(
        userRole as UserRole,
        po.total,
        po
      );
      
      if (!validation.isValid) {
        errors.push(`${po.poNumber}: ${validation.reason}`);
      }
    });

    return errors;
  }, [purchaseOrders, userRole]);

  // Handle form submission
  const handleSubmit = async () => {
    setIsProcessing(true);
    
    try {
      // Validate form
      const errors: string[] = [];
      
      if (!selectedReason && !customReason.trim()) {
        errors.push('Please select or enter a reason');
      }
      
      const reason = selectedReason ? 
        availableReasons.find(r => r.id === selectedReason) : 
        null;
        
      if (reason?.requiresComment && !comments.trim()) {
        errors.push('Comments are required for this reason');
      }
      
      if (customReason.trim() && !comments.trim()) {
        errors.push('Please provide comments for your custom reason');
      }

      if (errors.length > 0) {
        setShowValidationErrors(errors);
        return;
      }

      // Prepare submission data
      const finalReason = customReason.trim() || reason?.label || '';
      const additionalData = {
        reasonId: selectedReason,
        customReason: customReason.trim(),
        comments: comments.trim(),
        userId: user?.id,
        userEmail: user?.email,
        timestamp: new Date().toISOString(),
        totals
      };

      await onConfirm(finalReason, additionalData);
    } catch (error) {
      console.error('Error processing approval action:', error);
      setShowValidationErrors(['An error occurred while processing your request']);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const isApproval = action === 'approve';
  const title = isApproval ? 'Approve Purchase Orders' : 'Reject Purchase Orders';
  const buttonText = isApproval ? 'Approve' : 'Reject';
  const buttonColor = isApproval 
    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isApproval ? (
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="p-2 bg-red-100 rounded-lg">
                  <X className="h-6 w-6 text-red-600" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {purchaseOrders.length === 1 
                    ? `Processing 1 purchase order`
                    : `Processing ${purchaseOrders.length} purchase orders`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Summary Section */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{totals.count}</p>
                  <p className="text-xs text-gray-500">Purchase Orders</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(totals.amount)}</p>
                  <p className="text-xs text-gray-500">Total Value</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{totals.items}</p>
                  <p className="text-xs text-gray-500">Total Items</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{totals.suppliers}</p>
                  <p className="text-xs text-gray-500">Suppliers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-2">Permission Issues</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Form Validation Errors */}
          {showValidationErrors.length > 0 && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {showValidationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Purchase Orders List */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Purchase Orders</h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{po.poNumber}</p>
                      <p className="text-xs text-gray-500">{po.supplierName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(po.total)}</p>
                    <p className="text-xs text-gray-500">{po.items.length} items</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reason Selection */}
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Reason for {action}</h3>
            
            {/* Predefined Reasons */}
            <div className="space-y-2 mb-4">
              {availableReasons.map((reason) => (
                <label key={reason.id} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => {
                      setSelectedReason(e.target.value);
                      setCustomReason(''); // Clear custom reason when selecting predefined
                      setShowValidationErrors([]);
                    }}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-gray-900">{reason.label}</span>
                    {reason.requiresComment && (
                      <span className="text-xs text-orange-600 block">Comments required</span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Custom Reason */}
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value="custom"
                  checked={!!customReason.trim()}
                  onChange={() => {
                    setSelectedReason('');
                    setShowValidationErrors([]);
                  }}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">Other reason (please specify)</span>
              </label>
              
              <textarea
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  if (e.target.value.trim()) {
                    setSelectedReason(''); // Clear predefined selection
                  }
                  setShowValidationErrors([]);
                }}
                placeholder="Enter your custom reason..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>
          </div>

          {/* Additional Comments */}
          <div className="px-6 py-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <MessageSquare className="h-4 w-4 inline mr-2" />
              Additional Comments
              {((selectedReason && availableReasons.find(r => r.id === selectedReason)?.requiresComment) || customReason.trim()) && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <textarea
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                setShowValidationErrors([]);
              }}
              placeholder="Add any additional comments or instructions..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              These comments will be visible to the purchase order creator and in the audit trail.
            </p>
          </div>

          {/* Approval Authority */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Approving as: {userRole}</p>
                <p className="text-xs text-gray-500">
                  {user?.email} • {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
            {validationErrors.length > 0 && (
              <p className="text-sm text-red-600">Cannot proceed due to permission issues</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={isProcessing || validationErrors.length > 0}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonColor}`}
            >
              {isProcessing ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {isApproval ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {buttonText} {purchaseOrders.length > 1 ? `${purchaseOrders.length} Orders` : 'Order'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalActionDialog;