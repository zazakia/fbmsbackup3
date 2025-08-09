import React, { useState, useEffect } from 'react';
import { 
  History, 
  Clock, 
  User, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Calendar,
  FileText,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { 
  PurchaseOrder, 
  StatusTransition, 
  ReceivingRecord, 
  PartialReceiptItem,
  PurchaseOrderAuditLog 
} from '../../types/business';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { 
  getPurchaseOrderStatusTransitions,
  getPurchaseOrderReceivingHistory,
  getPurchaseOrderAuditTrail
} from '../../api/purchaseOrderAuditAPI';

interface PurchaseOrderHistoryProps {
  purchaseOrder: PurchaseOrder;
  onClose?: () => void;
  compact?: boolean;
}

interface HistoryEvent {
  id: string;
  type: 'status_transition' | 'receiving' | 'audit';
  timestamp: Date;
  title: string;
  description: string;
  performedBy: string;
  performedByName?: string;
  metadata?: any;
  icon: React.ComponentType<any>;
  color: string;
}

export const PurchaseOrderHistory: React.FC<PurchaseOrderHistoryProps> = ({
  purchaseOrder,
  onClose,
  compact = false
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'status' | 'receiving' | 'audit'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    loadHistoryData();
  }, [purchaseOrder.id]);

  const loadHistoryData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [
        statusTransitions,
        receivingHistory,
        auditTrail
      ] = await Promise.all([
        getPurchaseOrderStatusTransitions(purchaseOrder.id),
        getPurchaseOrderReceivingHistory(purchaseOrder.id),
        getPurchaseOrderAuditTrail(purchaseOrder.id)
      ]);

      const allEvents: HistoryEvent[] = [];

      // Add status transitions
      if (statusTransitions.data) {
        statusTransitions.data.forEach(transition => {
          allEvents.push({
            id: `status_${transition.id}`,
            type: 'status_transition',
            timestamp: new Date(transition.timestamp),
            title: `Status changed to ${transition.toStatus.replace('_', ' ').toUpperCase()}`,
            description: transition.reason || 'No reason provided',
            performedBy: transition.performedBy,
            performedByName: transition.performedByName,
            metadata: { fromStatus: transition.fromStatus, toStatus: transition.toStatus },
            icon: TrendingUp,
            color: getStatusColor(transition.toStatus)
          });
        });
      }

      // Add receiving records
      if (receivingHistory.data) {
        receivingHistory.data.forEach(record => {
          const totalReceived = record.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
          allEvents.push({
            id: `receiving_${record.id}`,
            type: 'receiving',
            timestamp: new Date(record.receivedDate),
            title: `Received ${record.items.length} item types (${totalReceived} units)`,
            description: record.notes || 'No notes provided',
            performedBy: record.receivedBy,
            performedByName: record.receivedByName,
            metadata: record,
            icon: Package,
            color: 'text-green-600'
          });
        });
      }

      // Add audit trail events
      if (auditTrail.data) {
        auditTrail.data.forEach(log => {
          if (log.action !== 'status_changed' && log.action !== 'received') { // Avoid duplicates
            allEvents.push({
              id: `audit_${log.id}`,
              type: 'audit',
              timestamp: new Date(log.timestamp),
              title: getAuditActionTitle(log.action),
              description: getAuditActionDescription(log),
              performedBy: log.performedBy,
              performedByName: log.performedByName,
              metadata: { oldValues: log.oldValues, newValues: log.newValues },
              icon: FileText,
              color: 'text-blue-600'
            });
          }
        });
      }

      // Sort events by timestamp
      allEvents.sort((a, b) => 
        sortOrder === 'newest' 
          ? b.timestamp.getTime() - a.timestamp.getTime()
          : a.timestamp.getTime() - b.timestamp.getTime()
      );

      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading history data:', err);
      setError('Failed to load purchase order history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
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

  const getAuditActionTitle = (action: string): string => {
    const titleMap: Record<string, string> = {
      'created': 'Purchase Order Created',
      'updated': 'Purchase Order Updated',
      'items_modified': 'Items Modified',
      'supplier_changed': 'Supplier Changed',
      'dates_updated': 'Dates Updated'
    };
    return titleMap[action] || `Action: ${action}`;
  };

  const getAuditActionDescription = (log: PurchaseOrderAuditLog): string => {
    if (log.reason) return log.reason;
    
    const changes: string[] = [];
    if (log.oldValues && log.newValues) {
      Object.keys(log.newValues).forEach(key => {
        const oldValue = log.oldValues?.[key];
        const newValue = log.newValues?.[key];
        if (oldValue !== newValue) {
          changes.push(`${key}: ${oldValue} → ${newValue}`);
        }
      });
    }
    
    return changes.length > 0 ? changes.join(', ') : 'No details available';
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  const EventIcon: React.FC<{ event: HistoryEvent }> = ({ event }) => {
    const IconComponent = event.icon;
    return (
      <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${event.color}`}>
        <IconComponent className="h-5 w-5" />
      </div>
    );
  };

  const EventDetails: React.FC<{ event: HistoryEvent }> = ({ event }) => {
    if (!expandedEvents.has(event.id)) return null;

    return (
      <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        {event.type === 'receiving' && event.metadata && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Received Items:</h4>
            <div className="space-y-2">
              {event.metadata.items.map((item: PartialReceiptItem, index: number) => {
                const poItem = purchaseOrder.items.find(po => po.productId === item.productId);
                return (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {poItem?.productName || 'Unknown Product'}
                    </span>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600 dark:text-gray-400">
                        Qty: {item.receivedQuantity}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.condition === 'good' ? 'bg-green-100 text-green-800' :
                        item.condition === 'damaged' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.condition}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {event.metadata.attachments && event.metadata.attachments.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments:</h5>
                <div className="flex space-x-2">
                  {event.metadata.attachments.map((attachment: string, index: number) => (
                    <button
                      key={index}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {attachment}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {event.type === 'status_transition' && event.metadata && (
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Transition: </span>
            <span className={getStatusColor(event.metadata.fromStatus)}>
              {event.metadata.fromStatus.replace('_', ' ').toUpperCase()}
            </span>
            <span className="mx-2">→</span>
            <span className={getStatusColor(event.metadata.toStatus)}>
              {event.metadata.toStatus.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}
        
        {event.type === 'audit' && event.metadata && (
          <div className="text-sm space-y-2">
            {event.metadata.oldValues && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Previous values:</span>
                <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 bg-gray-100 dark:bg-gray-600 p-2 rounded">
                  {JSON.stringify(event.metadata.oldValues, null, 2)}
                </pre>
              </div>
            )}
            {event.metadata.newValues && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">New values:</span>
                <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 bg-gray-100 dark:bg-gray-600 p-2 rounded">
                  {JSON.stringify(event.metadata.newValues, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
        <div className="p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center">
            <History className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="space-y-3">
              {filteredEvents.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-start space-x-3">
                  <EventIcon event={event} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.title}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 space-x-2">
                      <span>{formatDate(event.timestamp)}</span>
                      <span>•</span>
                      <span>{event.performedByName || event.performedBy}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
      <div className="p-6 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <History className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Purchase Order History
              </h2>
              <p className="text-sm text-gray-500">
                Complete timeline for PO #{purchaseOrder.poNumber}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <History className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Events</option>
                <option value="status">Status Changes</option>
                <option value="receiving">Receiving Records</option>
                <option value="audit">Audit Trail</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Sort:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
          <button
            onClick={loadHistoryData}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading history...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
            <span className="text-red-600">{error}</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="h-8 w-8 text-gray-400 mr-3" />
            <span className="text-gray-500">No history events found</span>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredEvents.map((event, index) => (
              <div key={event.id} className="relative">
                {/* Timeline Line */}
                {index < filteredEvents.length - 1 && (
                  <div className="absolute left-5 top-10 w-0.5 h-6 bg-gray-200 dark:bg-gray-600" />
                )}
                
                <div className="flex items-start space-x-4">
                  <EventIcon event={event} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {event.title}
                          </h3>
                          <button
                            onClick={() => toggleEventExpansion(event.id)}
                            className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            {expandedEvents.has(event.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {event.description}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-2 space-x-4">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(event.timestamp)}
                          </div>
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {event.performedByName || event.performedBy}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            event.type === 'status_transition' ? 'bg-blue-100 text-blue-800' :
                            event.type === 'receiving' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <EventDetails event={event} />
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

export default PurchaseOrderHistory;