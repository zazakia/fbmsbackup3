import React, { useState } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  Download,
  Upload,
  Settings,
  Users,
  Clock,
  FileText,
  DollarSign
} from 'lucide-react';
import { PurchaseOrder } from '../../types/business';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { UserRole } from '../../types/auth';
import { formatCurrency } from '../../utils/formatters';
import { approvalWorkflowService, BulkApprovalResult } from '../../services/approvalWorkflowService';
import ApprovalActionDialog from './ApprovalActionDialog';

interface BulkApprovalActionsProps {
  selectedPurchaseOrders: PurchaseOrder[];
  onApprovalComplete: (result: BulkApprovalResult) => void;
  onSelectionClear: () => void;
}

export const BulkApprovalActions: React.FC<BulkApprovalActionsProps> = ({
  selectedPurchaseOrders,
  onApprovalComplete,
  onSelectionClear
}) => {
  const { user, userRole } = useSupabaseAuthStore();
  const [showApprovalDialog, setShowApprovalDialog] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Calculate summary statistics
  const summary = React.useMemo(() => {
    const totalAmount = selectedPurchaseOrders.reduce((sum, po) => sum + po.total, 0);
    const totalItems = selectedPurchaseOrders.reduce((sum, po) => sum + po.items.length, 0);
    const uniqueSuppliers = new Set(selectedPurchaseOrders.map(po => po.supplierName)).size;
    const avgAmount = selectedPurchaseOrders.length > 0 ? totalAmount / selectedPurchaseOrders.length : 0;
    
    // Risk assessment
    const highValueCount = selectedPurchaseOrders.filter(po => po.total > 50000).length;
    const overdueCount = selectedPurchaseOrders.filter(po => {
      const daysDiff = Math.floor((Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 3;
    }).length;
    
    const riskLevel = highValueCount > 0 || overdueCount > 0 ? 'high' : 
                     totalAmount > 100000 || selectedPurchaseOrders.length > 10 ? 'medium' : 'low';

    return {
      count: selectedPurchaseOrders.length,
      totalAmount,
      avgAmount,
      totalItems,
      uniqueSuppliers,
      highValueCount,
      overdueCount,
      riskLevel
    };
  }, [selectedPurchaseOrders]);

  // Validate bulk approval permissions
  const validationResult = React.useMemo(() => {
    return approvalWorkflowService.validateApprovalThresholds(
      selectedPurchaseOrders,
      userRole as UserRole
    );
  }, [selectedPurchaseOrders, userRole]);

  // Handle bulk approval
  const handleBulkApproval = async (reason?: string, additionalData?: any) => {
    if (!user) return;
    
    setIsProcessing(true);
    
    try {
      const request = {
        purchaseOrderIds: selectedPurchaseOrders.map(po => po.id),
        reason: reason || 'Bulk approval',
        comments: additionalData?.comments,
        userId: user.id,
        userEmail: user.email || '',
        timestamp: new Date().toISOString(),
        reasonId: additionalData?.reasonId,
        customReason: additionalData?.customReason
      };

      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        selectedPurchaseOrders,
        request,
        userRole as UserRole
      );

      onApprovalComplete(result);
    } catch (error) {
      console.error('Error processing bulk approval:', error);
    } finally {
      setIsProcessing(false);
      setShowApprovalDialog(null);
    }
  };

  // Handle bulk rejection
  const handleBulkRejection = async (reason: string, additionalData?: any) => {
    if (!user) return;
    
    setIsProcessing(true);
    
    try {
      // Process rejections individually since they require specific reasons
      const results = [];
      
      for (const po of selectedPurchaseOrders) {
        const request = {
          purchaseOrderId: po.id,
          reason: reason,
          comments: additionalData?.comments || '',
          userId: user.id,
          userEmail: user.email || '',
          timestamp: new Date().toISOString(),
          reasonId: additionalData?.reasonId,
          customReason: additionalData?.customReason
        };

        const result = await approvalWorkflowService.rejectPurchaseOrder(
          po,
          request,
          userRole as UserRole
        );
        
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');

      const bulkResult = {
        results,
        successCount,
        failureCount,
        errors
      };

      onApprovalComplete(bulkResult);
    } catch (error) {
      console.error('Error processing bulk rejection:', error);
    } finally {
      setIsProcessing(false);
      setShowApprovalDialog(null);
    }
  };

  // Export selected orders for offline review
  const handleExportForReview = () => {
    const data = selectedPurchaseOrders.map(po => ({
      poNumber: po.poNumber,
      supplier: po.supplierName,
      amount: po.total,
      items: po.items.length,
      status: po.status,
      createdAt: po.createdAt,
      expectedDate: po.expectedDate
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-orders-review-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      default: return <Check className="h-4 w-4" />;
    }
  };

  if (selectedPurchaseOrders.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg">
      <div className="px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Bulk Actions ({summary.count} selected)
              </h3>
            </div>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(summary.riskLevel)}`}>
              {getRiskIcon(summary.riskLevel)}
              <span className="ml-1 capitalize">{summary.riskLevel} Risk</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={onSelectionClear}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{summary.count}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(summary.totalAmount)}</p>
              <p className="text-xs text-gray-500">Total Value</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{summary.highValueCount}</p>
              <p className="text-xs text-gray-500">High Value</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{summary.overdueCount}</p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {!validationResult.isValid && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">Cannot Process Bulk Action</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationResult.violations.map((violation, index) => (
                    <li key={index}>• {violation}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Options */}
        {showAdvancedOptions && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Advanced Options</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportForReview}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                <Download className="h-3 w-3" />
                Export for Review
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">
                <Upload className="h-3 w-3" />
                Import Decisions
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">
                <Users className="h-3 w-3" />
                Delegate to Manager
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Selected: {summary.count} orders</span>
            <span>•</span>
            <span>Value: {formatCurrency(summary.totalAmount)}</span>
            <span>•</span>
            <span>Avg: {formatCurrency(summary.avgAmount)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowApprovalDialog('reject')}
              disabled={!validationResult.isValid || isProcessing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              Reject All
            </button>

            <button
              onClick={() => setShowApprovalDialog('approve')}
              disabled={!validationResult.isValid || isProcessing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isProcessing ? 'Processing...' : 'Approve All'}
            </button>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-800">
                Processing {summary.count} purchase orders...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <ApprovalActionDialog
          isOpen={true}
          purchaseOrders={selectedPurchaseOrders}
          action={showApprovalDialog}
          onConfirm={showApprovalDialog === 'approve' ? handleBulkApproval : handleBulkRejection}
          onCancel={() => setShowApprovalDialog(null)}
        />
      )}
    </div>
  );
};

export default BulkApprovalActions;