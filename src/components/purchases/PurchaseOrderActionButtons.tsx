import React, { useState } from 'react';
import { 
  Edit, 
  Check, 
  Package, 
  X, 
  Eye, 
  History, 
  AlertTriangle,
  Lock,
  ArrowRight
} from 'lucide-react';
import StatusTransitionDialog from './StatusTransitionDialog';
import { EnhancedPurchaseOrderStatus } from '../../types/business';
import { PurchaseOrderStateMachine, TransitionContext } from '../../services/purchaseOrderStateMachine';
import { PurchaseOrder } from '../../types/business';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { UserRole } from '../../types/auth';
import { 
  getUserPurchaseOrderActions,
  canPerformPurchaseOrderAction
} from '../../api/purchaseOrderPermissionAPI';
import { 
  getPurchaseOrderPermissionDeniedMessage 
} from '../../utils/purchaseOrderPermissions';

interface PurchaseOrderActionButtonsProps {
  purchaseOrder: PurchaseOrder;
  onEdit?: (po: PurchaseOrder) => void;
  onApprove?: (po: PurchaseOrder) => void;
  onReceive?: (po: PurchaseOrder) => void;
  onCancel?: (po: PurchaseOrder) => void;
  onViewHistory?: (po: PurchaseOrder) => void;
  showLabels?: boolean;
  variant?: 'default' | 'compact' | 'dropdown';
}

export const PurchaseOrderActionButtons: React.FC<PurchaseOrderActionButtonsProps> = ({
  purchaseOrder,
  onEdit,
  onApprove,
  onReceive,
  onCancel,
  onViewHistory,
  showLabels = true,
  variant = 'default'
}) => {
  const { userRole } = useSupabaseAuthStore();
  const [showPermissionTooltip, setShowPermissionTooltip] = useState<string | null>(null);
  const [statusTransitionDialog, setStatusTransitionDialog] = useState<{
    isOpen: boolean;
    targetStatus: EnhancedPurchaseOrderStatus | null;
  }>({ isOpen: false, targetStatus: null });
  const [stateMachine] = useState(() => new PurchaseOrderStateMachine());

  // Get user's permissions for this purchase order
  const actions = getUserPurchaseOrderActions(purchaseOrder);

  // Helper functions to map between legacy and enhanced statuses
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

  // Status transition handlers
  const handleStatusTransition = (targetStatus: EnhancedPurchaseOrderStatus) => {
    setStatusTransitionDialog({ isOpen: true, targetStatus });
  };

  const handleTransitionConfirm = async (context: TransitionContext) => {
    if (!statusTransitionDialog.targetStatus) return;

    const targetStatus = statusTransitionDialog.targetStatus;
    
    try {
      // Call appropriate handler based on target status
      switch (targetStatus) {
        case 'approved':
          if (onApprove) await onApprove(purchaseOrder);
          break;
        case 'partially_received':
        case 'fully_received':
          if (onReceive) await onReceive(purchaseOrder);
          break;
        case 'cancelled':
          if (onCancel) await onCancel(purchaseOrder);
          break;
        default:
          // For other status changes, you might want to add a generic handler
          console.log('Status transition:', targetStatus, context);
      }
    } finally {
      setStatusTransitionDialog({ isOpen: false, targetStatus: null });
    }
  };

  const handleTransitionCancel = () => {
    setStatusTransitionDialog({ isOpen: false, targetStatus: null });
  };

  // Get available transitions for current status
  const currentEnhanced = mapLegacyToEnhanced(purchaseOrder.status);
  const availableTransitions = stateMachine.getValidTransitions(currentEnhanced);

  // Permission-aware button component
  const PermissionAwareButton: React.FC<{
    action: 'edit' | 'approve' | 'receive' | 'cancel' | 'view_history';
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    className?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    disabled?: boolean;
  }> = ({ action, onClick, icon, label, className = '', variant = 'secondary', disabled = false }) => {
    const canPerform = canPerformPurchaseOrderAction(
      action, 
      purchaseOrder, 
      action === 'approve' ? purchaseOrder.total : undefined
    );

    const isDisabled = disabled || !canPerform.allowed;
    
    const baseClasses = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    let variantClasses = '';
    if (isDisabled) {
      variantClasses = 'bg-gray-100 text-gray-400 cursor-not-allowed';
    } else {
      switch (variant) {
        case 'primary':
          variantClasses = 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
          break;
        case 'success':
          variantClasses = 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500';
          break;
        case 'danger':
          variantClasses = 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
          break;
        default:
          variantClasses = 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500';
      }
    }

    const handleClick = () => {
      if (!isDisabled) {
        onClick();
      } else if (!canPerform.allowed && userRole) {
        // Show permission denied message
        const message = getPurchaseOrderPermissionDeniedMessage(
          userRole as UserRole,
          action,
          purchaseOrder
        );
        setShowPermissionTooltip(message);
        setTimeout(() => setShowPermissionTooltip(null), 3000);
      }
    };

    return (
      <div className="relative">
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className={`${baseClasses} ${variantClasses} ${className}`}
          title={isDisabled ? canPerform.reason : `${label} purchase order`}
        >
          {isDisabled && !canPerform.allowed ? (
            <Lock className="h-4 w-4" />
          ) : (
            icon
          )}
          {showLabels && (
            <span className="hidden sm:inline">
              {isDisabled && !canPerform.allowed ? 'Restricted' : label}
            </span>
          )}
        </button>
        
        {/* Permission tooltip */}
        {userRole && showPermissionTooltip === getPurchaseOrderPermissionDeniedMessage(userRole as UserRole, action, purchaseOrder) && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-red-600 rounded-md shadow-lg z-10 max-w-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{showPermissionTooltip}</span>
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600" />
          </div>
        )}
      </div>
    );
  };

  // Status indicator component
  const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'draft': return 'bg-gray-100 text-gray-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'approved': return 'bg-blue-100 text-blue-800';
        case 'sent': return 'bg-purple-100 text-purple-800';
        case 'partial': return 'bg-orange-100 text-orange-800';
        case 'received': return 'bg-green-100 text-green-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {actions.canEdit && onEdit && (
          <PermissionAwareButton
            action="edit"
            onClick={() => onEdit(purchaseOrder)}
            icon={<Edit className="h-4 w-4" />}
            label="Edit"
            className="p-2"
          />
        )}
        
        {actions.canApprove && onApprove && purchaseOrder.status === 'draft' && (
          <PermissionAwareButton
            action="approve"
            onClick={() => onApprove(purchaseOrder)}
            icon={<Check className="h-4 w-4" />}
            label="Approve"
            variant="success"
            className="p-2"
          />
        )}
        
        {actions.canReceive && onReceive && ['approved', 'sent', 'partial'].includes(purchaseOrder.status) && (
          <PermissionAwareButton
            action="receive"
            onClick={() => onReceive(purchaseOrder)}
            icon={<Package className="h-4 w-4" />}
            label="Receive"
            variant="primary"
            className="p-2"
          />
        )}
        
        {actions.canCancel && onCancel && !['received', 'cancelled'].includes(purchaseOrder.status) && (
          <PermissionAwareButton
            action="cancel"
            onClick={() => onCancel(purchaseOrder)}
            icon={<X className="h-4 w-4" />}
            label="Cancel"
            variant="danger"
            className="p-2"
          />
        )}
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative inline-block text-left">
        {/* Dropdown implementation would go here */}
        <div className="flex flex-col gap-1 p-2">
          {actions.canEdit && onEdit && (
            <PermissionAwareButton
              action="edit"
              onClick={() => onEdit(purchaseOrder)}
              icon={<Edit className="h-4 w-4" />}
              label="Edit Purchase Order"
              className="justify-start w-full"
            />
          )}
          
          {actions.canApprove && onApprove && ['draft', 'pending'].includes(purchaseOrder.status) && (
            <PermissionAwareButton
              action="approve"
              onClick={() => onApprove(purchaseOrder)}
              icon={<Check className="h-4 w-4" />}
              label="Approve Purchase Order"
              variant="success"
              className="justify-start w-full"
            />
          )}
          
          {actions.canReceive && onReceive && ['approved', 'sent', 'partial'].includes(purchaseOrder.status) && (
            <PermissionAwareButton
              action="receive"
              onClick={() => onReceive(purchaseOrder)}
              icon={<Package className="h-4 w-4" />}
              label="Receive Items"
              variant="primary"
              className="justify-start w-full"
            />
          )}
          
          {actions.canCancel && onCancel && !['received', 'cancelled'].includes(purchaseOrder.status) && (
            <PermissionAwareButton
              action="cancel"
              onClick={() => onCancel(purchaseOrder)}
              icon={<X className="h-4 w-4" />}
              label="Cancel Purchase Order"
              variant="danger"
              className="justify-start w-full"
            />
          )}
          
          {actions.canViewHistory && onViewHistory && (
            <PermissionAwareButton
              action="view_history"
              onClick={() => onViewHistory(purchaseOrder)}
              icon={<History className="h-4 w-4" />}
              label="View History"
              className="justify-start w-full"
            />
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex items-center gap-3">
      <StatusIndicator status={purchaseOrder.status} />
      
      <div className="flex items-center gap-2">
        {/* Always show view button */}
        <button
          onClick={() => actions.canView && console.log('View PO:', purchaseOrder.id)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          title="View purchase order details"
        >
          <Eye className="h-4 w-4" />
          {showLabels && <span className="hidden sm:inline">View</span>}
        </button>

        {actions.canEdit && onEdit && (
          <PermissionAwareButton
            action="edit"
            onClick={() => onEdit(purchaseOrder)}
            icon={<Edit className="h-4 w-4" />}
            label="Edit"
          />
        )}
        
        {/* Quick Status Transition Buttons */}
        {availableTransitions.includes('approved') && actions.canApprove && (
          <PermissionAwareButton
            action="approve"
            onClick={() => handleStatusTransition('approved')}
            icon={<Check className="h-4 w-4" />}
            label="Approve"
            variant="success"
          />
        )}
        
        {(availableTransitions.includes('partially_received') || availableTransitions.includes('fully_received') || availableTransitions.includes('sent_to_supplier')) && actions.canReceive && (
          <PermissionAwareButton
            action="receive"
            onClick={() => handleStatusTransition('partially_received')}
            icon={<Package className="h-4 w-4" />}
            label="Receive"
            variant="primary"
          />
        )}
        
        {availableTransitions.includes('cancelled') && actions.canCancel && (
          <PermissionAwareButton
            action="cancel"
            onClick={() => handleStatusTransition('cancelled')}
            icon={<X className="h-4 w-4" />}
            label="Cancel"
            variant="danger"
          />
        )}
        
        {/* Status Transitions Dropdown for additional options */}
        {availableTransitions.length > 3 && (
          <div className="relative group">
            <button className="flex items-center px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
              <ArrowRight className="h-4 w-4 mr-2" />
              {showLabels && <span className="hidden sm:inline">More Actions</span>}
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              {availableTransitions.map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusTransition(status)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                >
                  Transition to {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {actions.canViewHistory && onViewHistory && (
          <PermissionAwareButton
            action="view_history"
            onClick={() => onViewHistory(purchaseOrder)}
            icon={<History className="h-4 w-4" />}
            label="History"
          />
        )}
      </div>

      {/* Status Transition Dialog */}
      {statusTransitionDialog.isOpen && statusTransitionDialog.targetStatus && (
        <StatusTransitionDialog
          purchaseOrder={purchaseOrder}
          targetStatus={statusTransitionDialog.targetStatus}
          isOpen={statusTransitionDialog.isOpen}
          onConfirm={handleTransitionConfirm}
          onCancel={handleTransitionCancel}
        />
      )}
    </div>
  );
};

export default PurchaseOrderActionButtons;