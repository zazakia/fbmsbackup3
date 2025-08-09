/**
 * Purchase Order Audit History Component
 * 
 * Displays comprehensive audit trail for purchase order operations including
 * status changes, receiving activities, approvals, and user actions.
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  FileText,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  PurchaseOrderAuditLog, 
  PurchaseOrderAuditAction,
  EnhancedPurchaseOrder 
} from '../../types/business';
import { auditService } from '../../services/auditService';
import { formatDate } from '../../utils/formatters';

interface PurchaseOrderAuditHistoryProps {
  purchaseOrderId: string;
  purchaseOrder?: EnhancedPurchaseOrder;
  className?: string;
}

export const PurchaseOrderAuditHistory: React.FC<PurchaseOrderAuditHistoryProps> = ({
  purchaseOrderId,
  purchaseOrder,
  className = ''
}) => {
  const [auditLogs, setAuditLogs] = useState<PurchaseOrderAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAuditHistory();
  }, [purchaseOrderId]);

  const fetchAuditHistory = async () => {
    try {
      setLoading(true);
      const result = await auditService.getPurchaseOrderHistory(purchaseOrderId);
      
      if (result.success && result.data) {
        setAuditLogs(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load audit history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedEntries(newExpanded);
  };

  const getActionIcon = (action: PurchaseOrderAuditAction) => {
    switch (action) {
      case PurchaseOrderAuditAction.CREATED:
        return <FileText className="h-4 w-4 text-blue-600" />;
      case PurchaseOrderAuditAction.UPDATED:
        return <FileText className="h-4 w-4 text-yellow-600" />;
      case PurchaseOrderAuditAction.STATUS_CHANGED:
        return <AlertCircle className="h-4 w-4 text-purple-600" />;
      case PurchaseOrderAuditAction.APPROVED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case PurchaseOrderAuditAction.REJECTED:
        return <XCircle className="h-4 w-4 text-red-600" />;
      case PurchaseOrderAuditAction.RECEIVED:
      case PurchaseOrderAuditAction.PARTIALLY_RECEIVED:
        return <Package className="h-4 w-4 text-green-600" />;
      case PurchaseOrderAuditAction.CANCELLED:
        return <XCircle className="h-4 w-4 text-red-600" />;
      case PurchaseOrderAuditAction.DELETED:
        return <XCircle className="h-4 w-4 text-red-800" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: PurchaseOrderAuditAction) => {
    switch (action) {
      case PurchaseOrderAuditAction.CREATED:
        return 'bg-blue-50 text-blue-800';
      case PurchaseOrderAuditAction.UPDATED:
        return 'bg-yellow-50 text-yellow-800';
      case PurchaseOrderAuditAction.STATUS_CHANGED:
        return 'bg-purple-50 text-purple-800';
      case PurchaseOrderAuditAction.APPROVED:
        return 'bg-green-50 text-green-800';
      case PurchaseOrderAuditAction.REJECTED:
      case PurchaseOrderAuditAction.CANCELLED:
      case PurchaseOrderAuditAction.DELETED:
        return 'bg-red-50 text-red-800';
      case PurchaseOrderAuditAction.RECEIVED:
      case PurchaseOrderAuditAction.PARTIALLY_RECEIVED:
        return 'bg-green-50 text-green-800';
      default:
        return 'bg-gray-50 text-gray-800';
    }
  };

  const formatActionText = (log: PurchaseOrderAuditLog) => {
    const actionText = log.action.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
    
    switch (log.action) {
      case PurchaseOrderAuditAction.STATUS_CHANGED:
        return `Status changed from "${log.oldValues?.status}" to "${log.newValues?.status}"`;
      case PurchaseOrderAuditAction.RECEIVED:
        return 'Purchase order fully received';
      case PurchaseOrderAuditAction.PARTIALLY_RECEIVED:
        return 'Purchase order partially received';
      default:
        return actionText;
    }
  };

  const renderValueComparison = (oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>) => {
    if (!oldValues && !newValues) return null;

    const changes: Array<{ key: string; old: unknown; new: unknown }> = [];
    const allKeys = new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {})
    ]);

    allKeys.forEach(key => {
      const oldValue = oldValues?.[key];
      const newValue = newValues?.[key];
      if (oldValue !== newValue) {
        changes.push({ key, old: oldValue, new: newValue });
      }
    });

    if (changes.length === 0) return null;

    return (
      <div className="mt-2 text-xs space-y-1">
        {changes.map(change => (
          <div key={change.key} className="flex items-center space-x-2">
            <span className="font-medium capitalize">{change.key}:</span>
            <span className="text-red-600">
              {String(change.old || 'null')}
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-green-600">
              {String(change.new || 'null')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-16 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800 text-sm">Failed to load audit history: {error}</p>
        </div>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No audit history available</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Audit History
          <span className="ml-2 text-sm text-gray-500">
            ({auditLogs.length} {auditLogs.length === 1 ? 'event' : 'events'})
          </span>
        </h3>
      </div>

      <div className="divide-y divide-gray-200">
        {auditLogs.map((log, index) => {
          const isExpanded = expandedEntries.has(log.id);
          const hasDetails = (log.oldValues && Object.keys(log.oldValues).length > 0) ||
                           (log.newValues && Object.keys(log.newValues).length > 0) ||
                           (log.metadata && Object.keys(log.metadata).length > 0);

          return (
            <div key={log.id} className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getActionIcon(log.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {formatActionText(log)}
                      </span>
                      {log.reason && (
                        <span className="text-sm text-gray-600">
                          - {log.reason}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {log.performedByName || log.performedBy}
                      </div>
                      <span>•</span>
                      <span>{formatDate(log.timestamp)}</span>
                      {hasDetails && (
                        <button
                          onClick={() => toggleExpanded(log.id)}
                          className="ml-2 p-1 rounded hover:bg-gray-100"
                        >
                          {isExpanded ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && hasDetails && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      {renderValueComparison(log.oldValues, log.newValues)}
                      
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Metadata:</p>
                          <div className="text-xs text-gray-600 space-y-1">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <div key={key} className="flex">
                                <span className="font-medium capitalize mr-2">{key}:</span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(log.ipAddress || log.userAgent) && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-1">Technical Details:</p>
                          <div className="text-xs text-gray-500 space-y-1">
                            {log.ipAddress && (
                              <div>IP Address: {log.ipAddress}</div>
                            )}
                            {log.userAgent && (
                              <div>User Agent: {log.userAgent}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Showing {auditLogs.length} audit {auditLogs.length === 1 ? 'entry' : 'entries'}
          </span>
          <button
            onClick={fetchAuditHistory}
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <Eye className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};