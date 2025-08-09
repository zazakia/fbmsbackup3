import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, Info, CheckCircle } from 'lucide-react';
import { PurchaseOrder } from '../../types/business';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { UserRole } from '../../types/auth';
import { 
  canPerformPurchaseOrderAction,
  getUserPurchaseOrderActions
} from '../../api/purchaseOrderPermissionAPI';
import { 
  getPurchaseOrderPermissions,
  getPurchaseOrderPermissionDeniedMessage 
} from '../../utils/purchaseOrderPermissions';

interface PurchaseOrderFormWrapperProps {
  children: React.ReactNode;
  purchaseOrder?: PurchaseOrder;
  mode: 'create' | 'edit' | 'approve' | 'receive' | 'cancel' | 'view';
  onPermissionDenied?: (reason: string) => void;
  showPermissionInfo?: boolean;
  className?: string;
}

interface PermissionInfoProps {
  userRole: UserRole;
  mode: 'create' | 'edit' | 'approve' | 'receive' | 'cancel' | 'view';
  purchaseOrder?: PurchaseOrder;
}

const PermissionInfo: React.FC<PermissionInfoProps> = ({ userRole, mode, purchaseOrder }) => {
  const permissions = getPurchaseOrderPermissions(userRole);
  
  const getPermissionStatus = () => {
    const actionMap = {
      create: 'canCreate',
      edit: 'canEdit', 
      approve: 'canApprove',
      receive: 'canReceive',
      cancel: 'canCancel',
      view: 'canView'
    };
    
    const permissionKey = actionMap[mode] as keyof typeof permissions;
    return permissions[permissionKey];
  };

  const getPermissionMessage = () => {
    switch (mode) {
      case 'create':
        return permissions.canCreate 
          ? 'You can create new purchase orders'
          : 'Your role does not allow creating purchase orders';
      case 'edit':
        return permissions.canEdit 
          ? 'You can edit purchase order details'
          : 'Your role does not allow editing purchase orders';
      case 'approve':
        if (!permissions.canApprove) {
          return 'Your role does not allow approving purchase orders';
        }
        if (permissions.maxApprovalAmount && purchaseOrder) {
          return `You can approve orders up to ${permissions.maxApprovalAmount.toLocaleString()} PHP`;
        }
        return 'You can approve purchase orders';
      case 'receive':
        return permissions.canReceive 
          ? 'You can receive items against purchase orders'
          : 'Your role does not allow receiving items';
      case 'cancel':
        return permissions.canCancel 
          ? 'You can cancel purchase orders'
          : 'Your role does not allow cancelling purchase orders';
      case 'view':
        return permissions.canView 
          ? 'You can view purchase order details'
          : 'Your role does not allow viewing purchase orders';
      default:
        return 'Permission status unknown';
    }
  };

  const hasPermission = getPermissionStatus();
  const message = getPermissionMessage();

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${
      hasPermission 
        ? 'border-green-200 bg-green-50' 
        : 'border-red-200 bg-red-50'
    }`}>
      {hasPermission ? (
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <div className={`font-medium text-sm ${
          hasPermission ? 'text-green-800' : 'text-red-800'
        }`}>
          {hasPermission ? 'Permission Granted' : 'Permission Denied'}
        </div>
        <div className={`text-sm mt-1 ${
          hasPermission ? 'text-green-700' : 'text-red-700'
        }`}>
          {message}
        </div>
        {userRole && (
          <div className="text-xs text-gray-600 mt-2">
            Current role: <span className="font-medium">{userRole}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const PermissionDeniedOverlay: React.FC<{
  reason: string;
  userRole: UserRole;
  mode: string;
}> = ({ reason, userRole, mode }) => (
  <div className="absolute inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-4">
      <div className="flex items-start gap-3">
        <Lock className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            {reason}
          </p>
          <div className="text-xs text-gray-500">
            Your role: <span className="font-medium">{userRole}</span> • 
            Action: <span className="font-medium">{mode}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const PurchaseOrderFormWrapper: React.FC<PurchaseOrderFormWrapperProps> = ({
  children,
  purchaseOrder,
  mode,
  onPermissionDenied,
  showPermissionInfo = false,
  className = ''
}) => {
  const { userRole } = useSupabaseAuthStore();
  const [permissionCheck, setPermissionCheck] = useState<{
    allowed: boolean;
    reason?: string;
  }>({ allowed: true });

  useEffect(() => {
    if (!userRole) {
      setPermissionCheck({
        allowed: false,
        reason: 'Authentication required'
      });
      return;
    }

    const check = canPerformPurchaseOrderAction(
      mode as 'create' | 'view' | 'edit' | 'approve' | 'receive' | 'cancel',
      purchaseOrder,
      mode === 'approve' ? purchaseOrder?.total : undefined
    );

    setPermissionCheck(check);

    if (!check.allowed && onPermissionDenied) {
      onPermissionDenied(check.reason || 'Permission denied');
    }
  }, [userRole, mode, purchaseOrder, onPermissionDenied]);

  // If we don't have user role, show loading or auth required
  if (!userRole) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <Info className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">
                  Authentication Required
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  Please log in to access this feature.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Permission info banner */}
      {showPermissionInfo && (
        <div className="mb-4">
          <PermissionInfo 
            userRole={userRole as UserRole}
            mode={mode}
            purchaseOrder={purchaseOrder}
          />
        </div>
      )}

      {/* Form content */}
      <div className={permissionCheck.allowed ? '' : 'opacity-30 pointer-events-none'}>
        {children}
      </div>

      {/* Permission denied overlay */}
      {!permissionCheck.allowed && (
        <PermissionDeniedOverlay
          reason={permissionCheck.reason || 'Permission denied'}
          userRole={userRole as UserRole}
          mode={mode}
        />
      )}
    </div>
  );
};

// Hook for checking purchase order permissions in components
export const usePurchaseOrderPermissions = (purchaseOrder?: PurchaseOrder) => {
  const { userRole } = useSupabaseAuthStore();
  
  const [permissions, setPermissions] = useState({
    canView: false,
    canEdit: false,
    canApprove: false,
    canReceive: false,
    canCancel: false,
    canViewHistory: false
  });

  useEffect(() => {
    if (!userRole || !purchaseOrder) {
      setPermissions({
        canView: false,
        canEdit: false,
        canApprove: false,
        canReceive: false,
        canCancel: false,
        canViewHistory: false
      });
      return;
    }

    const actions = getUserPurchaseOrderActions(purchaseOrder);
    setPermissions(actions);
  }, [userRole, purchaseOrder]);

  return permissions;
};

export default PurchaseOrderFormWrapper;