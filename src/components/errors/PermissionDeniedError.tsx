import React, { useState } from 'react';
import {
  Shield,
  ArrowLeft,
  Mail,
  Phone,
  Send,
  ExternalLink,
  Info,
  Users,
  Key
} from 'lucide-react';
import {
  ModuleId,
  ModuleLoadingError
} from '../../types/moduleLoading';
import { UserRole } from '../../types/auth';
import { permissionErrorHandler } from '../../services/PermissionErrorHandler';

interface PermissionDeniedErrorProps {
  error: ModuleLoadingError;
  userRole: UserRole;
  onDashboardNavigate?: () => void;
  onFallbackNavigate?: (moduleId: ModuleId) => void;
  onRequestAccess?: (requestData: any) => void;
  showRequestAccess?: boolean;
  showRoleInfo?: boolean;
}

/**
 * PermissionDeniedError Component
 * 
 * Specialized error UI for permission-related failures.
 * Features:
 * - Role-specific error messages with clear requirements
 * - Request access functionality with multiple contact methods
 * - Role requirement display and explanation
 * - Alternative module suggestions within user permissions
 * - Admin contact integration for access requests
 */
const PermissionDeniedError: React.FC<PermissionDeniedErrorProps> = ({
  error,
  userRole,
  onDashboardNavigate,
  onFallbackNavigate,
  onRequestAccess,
  showRequestAccess = true,
  showRoleInfo = true
}) => {
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const moduleDisplayName = getModuleDisplayName(error.moduleId);
  const currentRoleDisplay = getRoleDisplayName(userRole);
  const requiredRoles = error.context?.availableRoles || [];
  const adminContact = error.context?.adminContact;

  const handleRequestAccess = async () => {
    if (!onRequestAccess) return;

    setIsSubmittingRequest(true);
    try {
      const { requestData, contactMethods } = permissionErrorHandler.createAccessRequest(
        error.moduleId,
        userRole,
        requestReason
      );
      await onRequestAccess({ requestData, contactMethods, reason: requestReason });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleContactAdmin = (method: 'email' | 'phone') => {
    if (!adminContact) return;

    const { requestData } = permissionErrorHandler.createAccessRequest(
      error.moduleId,
      userRole,
      requestReason
    );

    if (method === 'email') {
      const subject = `Access Request: ${moduleDisplayName}`;
      const body = generateEmailBody(requestData);
      window.open(`mailto:${adminContact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } else if (method === 'phone') {
      window.open(`tel:${adminContact.phone}`);
    }
  };

  const generateEmailBody = (requestData: any): string => {
    return `Hello ${adminContact?.name || 'Administrator'},

I am requesting access to the ${moduleDisplayName} module.

Current Details:
- User Role: ${currentRoleDisplay}
- Module Requested: ${moduleDisplayName}
- Required Roles: ${requiredRoles.map(role => getRoleDisplayName(role)).join(' or ')}

Business Justification:
${requestReason || `I need access to ${moduleDisplayName} to perform my job duties effectively.`}

Please let me know if you need any additional information to process this request.

Thank you,
[Your Name]

---
This request was generated on ${new Date().toLocaleString()}
Error ID: ${error.timestamp.getTime().toString(36)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* Permission Denied Header */}
        <div className="text-center mb-6">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
            {moduleDisplayName}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
            {error.message}
          </p>
        </div>

        {/* Role Information */}
        {showRoleInfo && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
            <div className="flex items-start">
              <Users className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                  Role Requirements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-red-700 dark:text-red-300 mb-1">
                      <span className="font-medium">Your Current Role:</span>
                    </p>
                    <div className="flex items-center bg-red-100 dark:bg-red-900/40 rounded px-2 py-1">
                      <Key className="h-3 w-3 text-red-600 mr-1" />
                      <span className="text-red-800 dark:text-red-200 font-medium">
                        {currentRoleDisplay}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-red-700 dark:text-red-300 mb-1">
                      <span className="font-medium">Required Roles:</span>
                    </p>
                    <div className="space-y-1">
                      {requiredRoles.length > 0 ? requiredRoles.map((role) => (
                        <div key={role} className="flex items-center bg-green-100 dark:bg-green-900/40 rounded px-2 py-1">
                          <Key className="h-3 w-3 text-green-600 mr-1" />
                          <span className="text-green-800 dark:text-green-200 font-medium text-xs">
                            {getRoleDisplayName(role)}
                          </span>
                        </div>
                      )) : (
                        <span className="text-red-600 dark:text-red-400 text-xs">
                          Administrator access required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {error.context?.reason && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      <Info className="h-3 w-3 inline mr-1" />
                      <span className="font-medium">Reason:</span> {error.context.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Request Access Section */}
        {showRequestAccess && adminContact && (
          <div className="mb-6">
            {!showAccessRequest ? (
              <div className="text-center">
                <button
                  onClick={() => setShowAccessRequest(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 mx-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Request Access</span>
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Contact your administrator to request access to this module
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
                  Request Access to {moduleDisplayName}
                </h3>
                
                {/* Reason Input */}
                <div className="mb-4">
                  <label htmlFor="request-reason" className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                    Business Justification (Optional)
                  </label>
                  <textarea
                    id="request-reason"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder={`Please explain why you need access to ${moduleDisplayName}...`}
                    rows={3}
                    className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  />
                </div>

                {/* Contact Methods */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => handleContactAdmin('email')}
                    className="flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Admin</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  
                  {adminContact.phone && (
                    <button
                      onClick={() => handleContactAdmin('phone')}
                      className="flex items-center justify-center space-x-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      <Phone className="h-4 w-4" />
                      <span>Call Admin</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Internal Request Button */}
                {onRequestAccess && (
                  <button
                    onClick={handleRequestAccess}
                    disabled={isSubmittingRequest}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmittingRequest ? 'Submitting Request...' : 'Submit Internal Request'}</span>
                  </button>
                )}

                {/* Admin Contact Info */}
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-medium">Administrator:</span> {adminContact.name}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Email: {adminContact.email}
                  </p>
                  {adminContact.phone && (
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Phone: {adminContact.phone}
                    </p>
                  )}
                </div>

                {/* Cancel Button */}
                <button
                  onClick={() => setShowAccessRequest(false)}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  Cancel Request
                </button>
              </div>
            )}
          </div>
        )}

        {/* Alternative Modules */}
        {error.fallbackSuggestions && error.fallbackSuggestions.length > 0 && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-3">
              Modules you can access:
            </h3>
            <div className="grid gap-2">
              {error.fallbackSuggestions.slice(0, 3).map((moduleId) => (
                <button
                  key={moduleId}
                  onClick={() => onFallbackNavigate?.(moduleId)}
                  className="text-left px-3 py-2 bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60 rounded-lg transition-colors border border-green-200 dark:border-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      {getModuleDisplayName(moduleId)}
                    </span>
                    <ExternalLink className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="space-y-3">
          <button
            onClick={onDashboardNavigate}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>

        {/* Error ID for Reference */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Reference ID: {error.timestamp.getTime().toString(36)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getModuleDisplayName(moduleId: ModuleId): string {
  const displayNames: Record<ModuleId, string> = {
    dashboard: 'Dashboard',
    pos: 'Point of Sale',
    inventory: 'Inventory Management',
    accounting: 'Accounting',
    expenses: 'Expense Tracking',
    purchases: 'Purchase Management',
    payroll: 'Payroll Management',
    'bir-forms': 'BIR Forms',
    sales: 'Sales History',
    customers: 'Customer Management',
    'manager-operations': 'Manager Operations',
    marketing: 'Marketing Campaigns',
    loyalty: 'Loyalty Programs',
    gcash: 'GCash Integration',
    paymaya: 'PayMaya Integration',
    'cloud-backup': 'Cloud Backup',
    'electronic-receipts': 'Electronic Receipts',
    'product-history': 'Product History',
    branches: 'Branch Management',
    settings: 'Settings',
    help: 'Help & Support',
    reports: 'Reports & Analytics'
  };

  return displayNames[moduleId] || moduleId;
}

function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    cashier: 'Cashier',
    accountant: 'Accountant',
    employee: 'Employee'
  };

  return roleNames[role] || role;
}

export default PermissionDeniedError;