/**
 * Comprehensive Audit Trail Component
 * 
 * Displays a complete audit trail for purchase order receiving workflow
 * including status changes, receiving activities, stock movements, approvals,
 * and validation errors in a unified timeline view.
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
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Truck,
  Settings,
  Filter
} from 'lucide-react';
import { 
  EnhancedPurchaseOrder,
  PurchaseOrderAuditAction
} from '../../types/business';
import { getPurchaseOrderReceivingAuditTrail } from '../../api/stockMovementAuditAPI';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface ComprehensiveAuditTrailProps {
  purchaseOrderId: string;
  purchaseOrder?: EnhancedPurchaseOrder;
  className?: string;
}

interface AuditTrailEvent {
  type: 'purchase_order_audit' | 'receiving_record' | 'stock_movement_audit' | 'approval_record' | 'validation_error';
  timestamp: Date;
  action: string;
  performedBy: string;
  performedByName: string;
  details: any;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export const ComprehensiveAuditTrail: React.FC<ComprehensiveAuditTrailProps> = ({
  purchaseOrderId,
  purchaseOrder,
  className = ''
}) => {
  const [auditTrail, setAuditTrail] = useState<{
    summary: any;
    timeline: AuditTrailEvent[];
    receivingRecords: any[];
    stockMovements: any[];
    approvalRecords: any[];
    validationErrors: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'timeline' | 'receiving' | 'stock' | 'approvals' | 'errors'>('timeline');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  useEffect(() => {
    fetchAuditTrail();
  }, [purchaseOrderId]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const result = await getPurchaseOrderReceivingAuditTrail(purchaseOrderId);
      
      if (result.success && result.data) {
        setAuditTrail(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load audit trail');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEntries(newExpanded);
  };

  const getEventIcon = (event: AuditTrailEvent) => {
    switch (event.type) {
      case 'purchase_order_audit':
        switch (event.action) {
          case 'created':
            return <FileText className="h-4 w-4 text-blue-600" />;
          case 'updated':
            return <Settings className="h-4 w-4 text-yellow-600" />;
          case 'status_changed':
            return <AlertCircle className="h-4 w-4 text-purple-600" />;
          case 'approved':
            return <CheckCircle className="h-4 w-4 text-green-600" />;
          case 'rejected':
            return <XCircle className="h-4 w-4 text-red-600" />;
          case 'received':
          case 'partially_received':
            return <Package className="h-4 w-4 text-green-600" />;
          case 'cancelled':
            return <XCircle className="h-4 w-4 text-red-600" />;
          default:
            return <Clock className="h-4 w-4 text-gray-600" />;
        }
      case 'receiving_record':
        return <Truck className="h-4 w-4 text-blue-600" />;
      case 'stock_movement_audit':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'approval_record':
        return event.action === 'approved' ? 
          <Shield className="h-4 w-4 text-green-600" /> : 
          <XCircle className="h-4 w-4 text-red-600" />;
      case 'validation_error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const formatEventDescription = (event: AuditTrailEvent) => {
    switch (event.type) {
      case 'purchase_order_audit':
        return `Purchase order ${event.action.replace(/_/g, ' ')}`;
      case 'receiving_record':
        return `Goods received - ${event.details.receiving_type} delivery`;
      case 'stock_movement_audit':
        return `Stock ${event.details.quantity_changed > 0 ? 'increased' : 'decreased'} by ${Math.abs(event.details.quantity_changed)}`;
      case 'approval_record':
        return `${event.action === 'approved' ? 'Approved' : 'Rejected'} at level ${event.details.approval_level}`;
      case 'validation_error':
        return `Validation error: ${event.details.error_type.replace(/_/g, ' ')}`;
      default:
        return event.action;
    }
  };

  const renderEventDetails = (event: AuditTrailEvent) => {
    const eventId = `${event.type}_${event.timestamp.getTime()}`;
    const isExpanded = expandedEntries.has(eventId);

    return (
      <div key={eventId} className="p-4 border-b border-gray-100">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            {getEventIcon(event)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                  {formatEventDescription(event)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {event.performedByName}
                </div>
                <span>•</span>
                <span>{formatDate(event.timestamp)}</span>
                <button
                  onClick={() => toggleExpanded(eventId)}
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                >
                  {isExpanded ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3">
                {event.type === 'receiving_record' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Receiving Number:</span>
                        <span className="ml-2">{event.details.receiving_number}</span>
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>
                        <span className="ml-2 capitalize">{event.details.receiving_type}</span>
                      </div>
                      <div>
                        <span className="font-medium">Items Received:</span>
                        <span className="ml-2">{event.details.total_items_received}</span>
                      </div>
                      <div>
                        <span className="font-medium">Total Quantity:</span>
                        <span className="ml-2">{event.details.total_quantity_received}</span>
                      </div>
                    </div>
                    
                    {event.details.quality_notes && (
                      <div className="mt-2">
                        <span className="font-medium text-sm">Quality Notes:</span>
                        <p className="text-sm text-gray-600 mt-1">{event.details.quality_notes}</p>
                      </div>
                    )}
                    
                    {event.details.damage_report && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <span className="font-medium text-sm text-red-800">Damage Report:</span>
                        <p className="text-sm text-red-700 mt-1">{event.details.damage_report}</p>
                      </div>
                    )}
                  </div>
                )}

                {event.type === 'stock_movement_audit' && (
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Product:</span>
                        <span className="ml-2">{event.details.product_name}</span>
                      </div>
                      <div>
                        <span className="font-medium">SKU:</span>
                        <span className="ml-2">{event.details.product_sku}</span>
                      </div>
                      <div>
                        <span className="font-medium">Before:</span>
                        <span className="ml-2">{event.details.quantity_before}</span>
                      </div>
                      <div>
                        <span className="font-medium">After:</span>
                        <span className="ml-2">{event.details.quantity_after}</span>
                      </div>
                      <div>
                        <span className="font-medium">Change:</span>
                        <span className={`ml-2 ${event.details.quantity_changed > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {event.details.quantity_changed > 0 ? '+' : ''}{event.details.quantity_changed}
                        </span>
                      </div>
                      {event.details.total_value && (
                        <div>
                          <span className="font-medium">Value:</span>
                          <span className="ml-2">{formatCurrency(event.details.total_value)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {event.type === 'approval_record' && (
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Approval Level:</span>
                        <span className="ml-2">{event.details.approval_level}</span>
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span>
                        <span className="ml-2">{formatCurrency(event.details.approval_amount)}</span>
                      </div>
                    </div>
                    {event.details.notes && (
                      <div>
                        <span className="font-medium">Notes:</span>
                        <p className="text-gray-600 mt-1">{event.details.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {event.type === 'validation_error' && (
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                      <div className="font-medium text-red-800">Error Details:</div>
                      <div className="text-red-700 mt-1">{event.details.error_message}</div>
                      {event.details.field_name && (
                        <div className="mt-1">
                          <span className="font-medium">Field:</span>
                          <span className="ml-2">{event.details.field_name}</span>
                        </div>
                      )}
                    </div>
                    <div className={`p-2 rounded ${event.details.resolved ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                      <span className="font-medium">Status:</span>
                      <span className={`ml-2 ${event.details.resolved ? 'text-green-700' : 'text-yellow-700'}`}>
                        {event.details.resolved ? 'Resolved' : 'Unresolved'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-4">
          <div className="bg-gray-200 h-8 rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800 text-sm">Failed to load audit trail: {error}</p>
        </div>
      </div>
    );
  }

  if (!auditTrail) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No audit trail available</p>
      </div>
    );
  }

  const filteredTimeline = auditTrail.timeline.filter(event => 
    filterSeverity === 'all' || event.severity === filterSeverity
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Comprehensive Audit Trail
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All Events</option>
                <option value="info">Info</option>
                <option value="warning">Warnings</option>
                <option value="error">Errors</option>
                <option value="success">Success</option>
              </select>
            </div>
            <button
              onClick={fetchAuditTrail}
              className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
            >
              <Eye className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-blue-600">{auditTrail.summary.totalAuditEvents}</div>
            <div className="text-gray-600">Audit Events</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-green-600">{auditTrail.summary.totalReceivingRecords}</div>
            <div className="text-gray-600">Receiving Records</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-purple-600">{auditTrail.summary.totalStockMovements}</div>
            <div className="text-gray-600">Stock Movements</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-indigo-600">{auditTrail.summary.totalApprovalEvents}</div>
            <div className="text-gray-600">Approvals</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-red-600">{auditTrail.summary.unresolvedErrors}</div>
            <div className="text-gray-600">Unresolved Errors</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 border-b border-gray-200">
        <nav className="flex space-x-4">
          {[
            { key: 'timeline', label: 'Timeline', count: filteredTimeline.length },
            { key: 'receiving', label: 'Receiving', count: auditTrail.receivingRecords.length },
            { key: 'stock', label: 'Stock Movements', count: auditTrail.stockMovements.length },
            { key: 'approvals', label: 'Approvals', count: auditTrail.approvalRecords.length },
            { key: 'errors', label: 'Validation Errors', count: auditTrail.validationErrors.unresolved.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'timeline' && (
          <div>
            {filteredTimeline.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No events match the current filter
              </div>
            ) : (
              filteredTimeline.map(event => renderEventDetails(event))
            )}
          </div>
        )}

        {activeTab === 'receiving' && (
          <div className="divide-y divide-gray-100">
            {auditTrail.receivingRecords.map((record, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{record.receiving_number}</div>
                    <div className="text-sm text-gray-600">
                      {record.total_quantity_received} units received • {formatDate(record.received_date)}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    record.inspection_status === 'passed' ? 'bg-green-100 text-green-800' :
                    record.inspection_status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {record.inspection_status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="divide-y divide-gray-100">
            {auditTrail.stockMovements.map((movement, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{movement.product_name}</div>
                    <div className="text-sm text-gray-600">
                      {movement.movement_type} • SKU: {movement.product_sku}
                    </div>
                  </div>
                  <div className={`font-medium ${
                    movement.quantity_changed > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.quantity_changed > 0 ? '+' : ''}{movement.quantity_changed}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="divide-y divide-gray-100">
            {auditTrail.approvalRecords.map((approval, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Level {approval.approval_level} Approval</div>
                    <div className="text-sm text-gray-600">
                      {approval.approved_by_name} • {formatDate(approval.approval_date || approval.rejection_date)}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    approval.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                    approval.approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {approval.approval_status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="divide-y divide-gray-100">
            {auditTrail.validationErrors.unresolved.map((error: any, index: number) => (
              <div key={index} className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-red-800">{error.error_type.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-gray-600 mt-1">{error.error_message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(error.occurred_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};