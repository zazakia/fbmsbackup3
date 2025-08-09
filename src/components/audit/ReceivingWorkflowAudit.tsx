/**
 * Receiving Workflow Audit Component
 * 
 * Specialized component for displaying audit trail specific to purchase order
 * receiving workflow, focusing on goods receipt, quality inspection, and
 * stock movement activities.
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Calendar,
  User,
  Barcode,
  Scale,
  MapPin,
  FileText,
  Clock,
  TrendingUp
} from 'lucide-react';
import { 
  EnhancedPurchaseOrder 
} from '../../types/business';
import { getPurchaseOrderReceivingAuditTrail } from '../../api/stockMovementAuditAPI';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface ReceivingWorkflowAuditProps {
  purchaseOrderId: string;
  purchaseOrder?: EnhancedPurchaseOrder;
  className?: string;
  compact?: boolean;
}

interface ReceivingEvent {
  id: string;
  type: 'receiving' | 'quality_check' | 'stock_update' | 'discrepancy' | 'approval';
  timestamp: Date;
  performedBy: string;
  performedByName: string;
  description: string;
  status: 'completed' | 'pending' | 'failed' | 'approved' | 'rejected';
  details: any;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
}

export const ReceivingWorkflowAudit: React.FC<ReceivingWorkflowAuditProps> = ({
  purchaseOrderId,
  purchaseOrder,
  className = '',
  compact = false
}) => {
  const [receivingEvents, setReceivingEvents] = useState<ReceivingEvent[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ReceivingEvent | null>(null);

  useEffect(() => {
    fetchReceivingAudit();
  }, [purchaseOrderId]);

  const fetchReceivingAudit = async () => {
    try {
      setLoading(true);
      const result = await getPurchaseOrderReceivingAuditTrail(purchaseOrderId);
      
      if (result.success && result.data) {
        // Transform the audit trail data into receiving-specific events
        const events: ReceivingEvent[] = [];
        
        // Add receiving records
        result.data.receivingRecords.forEach((record: any) => {
          events.push({
            id: record.id,
            type: 'receiving',
            timestamp: new Date(record.received_date),
            performedBy: record.received_by,
            performedByName: record.received_by_name,
            description: `Received ${record.total_quantity_received} units (${record.receiving_type} delivery)`,
            status: record.inspection_status === 'passed' ? 'completed' : 
                   record.inspection_status === 'failed' ? 'failed' : 'pending',
            details: record,
            severity: record.damage_report ? 'warning' : 'success',
            metadata: {
              receivingNumber: record.receiving_number,
              vehicleInfo: record.vehicle_info,
              driverInfo: record.driver_info
            }
          });

          // Add quality check event if inspection data exists
          if (record.inspection_status && record.inspection_status !== 'pending') {
            events.push({
              id: `${record.id}_quality`,
              type: 'quality_check',
              timestamp: new Date(record.received_date),
              performedBy: record.received_by,
              performedByName: record.received_by_name,
              description: `Quality inspection ${record.inspection_status}`,
              status: record.inspection_status === 'passed' ? 'approved' : 'rejected',
              details: {
                inspection_status: record.inspection_status,
                quality_notes: record.quality_notes,
                damage_report: record.damage_report
              },
              severity: record.inspection_status === 'passed' ? 'success' : 'error'
            });
          }

          // Add discrepancy event if there are discrepancies
          if (record.discrepancy_notes) {
            events.push({
              id: `${record.id}_discrepancy`,
              type: 'discrepancy',
              timestamp: new Date(record.received_date),
              performedBy: record.received_by,
              performedByName: record.received_by_name,
              description: 'Discrepancy identified during receiving',
              status: 'failed',
              details: {
                discrepancy_notes: record.discrepancy_notes
              },
              severity: 'warning'
            });
          }
        });

        // Add stock movement events
        result.data.stockMovements.forEach((movement: any) => {
          events.push({
            id: movement.id,
            type: 'stock_update',
            timestamp: new Date(movement.timestamp),
            performedBy: movement.performed_by,
            performedByName: movement.performed_by_name,
            description: `Stock updated: ${movement.product_name} (${movement.quantity_changed > 0 ? '+' : ''}${movement.quantity_changed})`,
            status: 'completed',
            details: movement,
            severity: 'info'
          });
        });

        // Add approval events
        result.data.approvalRecords.forEach((approval: any) => {
          events.push({
            id: approval.id,
            type: 'approval',
            timestamp: new Date(approval.approval_date || approval.rejection_date),
            performedBy: approval.approved_by,
            performedByName: approval.approved_by_name,
            description: `Receiving ${approval.approval_status} (Level ${approval.approval_level})`,
            status: approval.approval_status,
            details: approval,
            severity: approval.approval_status === 'approved' ? 'success' : 'warning'
          });
        });

        // Sort events by timestamp (newest first)
        events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setReceivingEvents(events);
        setSummary(result.data.summary);
        setError(null);
      } else {
        setError(result.error || 'Failed to load receiving audit trail');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (event: ReceivingEvent) => {
    switch (event.type) {
      case 'receiving':
        return <Truck className="h-4 w-4 text-blue-600" />;
      case 'quality_check':
        return event.status === 'approved' ? 
          <CheckCircle className="h-4 w-4 text-green-600" /> :
          <XCircle className="h-4 w-4 text-red-600" />;
      case 'stock_update':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'discrepancy':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'approval':
        return event.status === 'approved' ?
          <CheckCircle className="h-4 w-4 text-green-600" /> :
          <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderEventDetails = (event: ReceivingEvent) => {
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        {event.type === 'receiving' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Receiving Number:</span>
                <span className="ml-2">{event.details.receiving_number}</span>
              </div>
              <div>
                <span className="font-medium">Delivery Type:</span>
                <span className="ml-2 capitalize">{event.details.receiving_type}</span>
              </div>
              <div>
                <span className="font-medium">Items:</span>
                <span className="ml-2">{event.details.total_items_received}</span>
              </div>
              <div>
                <span className="font-medium">Total Quantity:</span>
                <span className="ml-2">{event.details.total_quantity_received}</span>
              </div>
            </div>
            
            {event.metadata?.vehicleInfo && (
              <div className="flex items-center text-sm">
                <Truck className="h-4 w-4 mr-1 text-gray-400" />
                <span className="font-medium">Vehicle:</span>
                <span className="ml-2">{event.metadata.vehicleInfo}</span>
              </div>
            )}
            
            {event.metadata?.driverInfo && (
              <div className="flex items-center text-sm">
                <User className="h-4 w-4 mr-1 text-gray-400" />
                <span className="font-medium">Driver:</span>
                <span className="ml-2">{event.metadata.driverInfo}</span>
              </div>
            )}

            {event.details.supplier_delivery_note && (
              <div className="text-sm">
                <span className="font-medium">Delivery Note:</span>
                <p className="text-gray-600 mt-1">{event.details.supplier_delivery_note}</p>
              </div>
            )}
          </div>
        )}

        {event.type === 'quality_check' && (
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <span className="font-medium">Inspection Result:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(event.details.inspection_status)}`}>
                {event.details.inspection_status}
              </span>
            </div>
            
            {event.details.quality_notes && (
              <div className="text-sm">
                <span className="font-medium">Quality Notes:</span>
                <p className="text-gray-600 mt-1">{event.details.quality_notes}</p>
              </div>
            )}
            
            {event.details.damage_report && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                <span className="font-medium text-red-800">Damage Report:</span>
                <p className="text-red-700 mt-1">{event.details.damage_report}</p>
              </div>
            )}
          </div>
        )}

        {event.type === 'stock_update' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
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
                <span className={`ml-2 font-medium ${event.details.quantity_changed > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            
            {event.details.batch_number && (
              <div className="flex items-center text-sm">
                <Barcode className="h-4 w-4 mr-1 text-gray-400" />
                <span className="font-medium">Batch:</span>
                <span className="ml-2">{event.details.batch_number}</span>
              </div>
            )}
            
            {event.details.location && (
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                <span className="font-medium">Location:</span>
                <span className="ml-2">{event.details.location}</span>
              </div>
            )}
          </div>
        )}

        {event.type === 'discrepancy' && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <span className="font-medium text-yellow-800">Discrepancy Details:</span>
            <p className="text-yellow-700 mt-1">{event.details.discrepancy_notes}</p>
          </div>
        )}

        {event.type === 'approval' && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Approval Level:</span>
                <span className="ml-2">{event.details.approval_level}</span>
              </div>
              <div>
                <span className="font-medium">Role:</span>
                <span className="ml-2">{event.details.approved_by_role}</span>
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
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-3">
          {[...Array(compact ? 2 : 4)].map((_, i) => (
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
          <p className="text-red-800 text-sm">Failed to load receiving audit: {error}</p>
        </div>
      </div>
    );
  }

  if (receivingEvents.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No receiving activities recorded</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Receiving Workflow Audit
          </h3>
          <button
            onClick={fetchReceivingAudit}
            className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
          >
            <Eye className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && !compact && (
        <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">{summary.totalReceivingRecords}</div>
              <div className="text-gray-600">Receipts</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{summary.totalStockMovements}</div>
              <div className="text-gray-600">Stock Updates</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-purple-600">{summary.totalApprovalEvents}</div>
              <div className="text-gray-600">Approvals</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-yellow-600">{summary.unresolvedErrors}</div>
              <div className="text-gray-600">Issues</div>
            </div>
          </div>
        </div>
      )}

      {/* Events */}
      <div className={`divide-y divide-gray-100 ${compact ? 'max-h-64 overflow-y-auto' : 'max-h-96 overflow-y-auto'}`}>
        {receivingEvents.slice(0, compact ? 5 : undefined).map((event) => (
          <div key={event.id} className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getEventIcon(event)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {event.description}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {event.performedByName}
                    </div>
                    <span>•</span>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(event.timestamp)}
                    </div>
                  </div>
                </div>

                {selectedEvent?.id === event.id && renderEventDetails(event)}
                
                {!compact && (
                  <button
                    onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {selectedEvent?.id === event.id ? 'Hide Details' : 'Show Details'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {compact && receivingEvents.length > 5 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
          <span className="text-sm text-gray-600">
            Showing 5 of {receivingEvents.length} events
          </span>
        </div>
      )}
    </div>
  );
};