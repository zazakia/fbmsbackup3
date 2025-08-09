import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Search,
  ExternalLink,
  User,
  DollarSign
} from 'lucide-react';
import { EnhancedPurchaseOrder } from '../../types/business';

interface ReceivingQueueProps {
  orders: EnhancedPurchaseOrder[];
  onRefresh?: () => void;
  onOrderClick?: (order: EnhancedPurchaseOrder) => void;
}

interface FilterState {
  search: string;
  priority: 'all' | 'high' | 'medium' | 'low';
  status: 'all' | 'approved' | 'sent_to_supplier' | 'partially_received';
  overdueOnly: boolean;
}

const ReceivingQueue: React.FC<ReceivingQueueProps> = ({ 
  orders, 
  onOrderClick 
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    priority: 'all',
    status: 'all',
    overdueOnly: false
  });

  // Calculate priority based on expected date and order value
  const calculatePriority = (order: EnhancedPurchaseOrder): 'high' | 'medium' | 'low' => {
    const now = new Date();
    const expectedDate = order.expectedDate || order.expectedDeliveryDate;
    const daysDiff = expectedDate ? Math.floor((expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isHighValue = order.total > 50000;
    
    if (daysDiff < 0 || (daysDiff <= 2 && isHighValue)) return 'high';
    if (daysDiff <= 5 || isHighValue) return 'medium';
    return 'low';
  };

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      // Only show orders that can be received
      const receivableStatuses = ['approved', 'sent_to_supplier', 'partially_received'];
      if (!receivableStatuses.includes(order.status)) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          order.poNumber.toLowerCase().includes(searchLower) ||
          order.supplierName.toLowerCase().includes(searchLower) ||
          order.items.some(item => 
            item.productName.toLowerCase().includes(searchLower) ||
            item.sku.toLowerCase().includes(searchLower)
          );
        if (!matchesSearch) return false;
      }

      // Priority filter
      if (filters.priority !== 'all') {
        const priority = calculatePriority(order);
        if (priority !== filters.priority) return false;
      }

      // Status filter
      if (filters.status !== 'all' && order.status !== filters.status) {
        return false;
      }

      // Overdue filter
      if (filters.overdueOnly) {
        const expectedDate = order.expectedDate || order.expectedDeliveryDate;
        if (!expectedDate || new Date(expectedDate) >= new Date()) {
          return false;
        }
      }

      return true;
    });

    // Sort by priority and expected date
    return filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = calculatePriority(a);
      const bPriority = calculatePriority(b);
      
      if (aPriority !== bPriority) {
        return priorityOrder[bPriority] - priorityOrder[aPriority];
      }
      
      // If same priority, sort by expected date
      const aDate = a.expectedDate || a.expectedDeliveryDate || new Date();
      const bDate = b.expectedDate || b.expectedDeliveryDate || new Date();
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });
  }, [orders, filters]);

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'sent_to_supplier':
        return 'bg-purple-100 text-purple-800';
      case 'partially_received':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const targetDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const formatExpectedDate = (date: Date | string | undefined) => {
    if (!date) return 'Not specified';
    
    const targetDate = new Date(date);
    const now = new Date();
    const diffInDays = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return `${Math.abs(diffInDays)} days overdue`;
    } else if (diffInDays === 0) {
      return 'Due today';
    } else if (diffInDays <= 7) {
      return `${diffInDays} days remaining`;
    } else {
      return targetDate.toLocaleDateString();
    }
  };

  const handleOrderClick = (order: EnhancedPurchaseOrder) => {
    if (onOrderClick) {
      onOrderClick(order);
    } else {
      // Default navigation to purchase order details
      window.location.href = `/purchases/orders/${order.id}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders, suppliers, products..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as 'all' | 'high' | 'medium' | 'low' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as 'all' | 'approved' | 'sent_to_supplier' | 'partially_received' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="sent_to_supplier">Sent to Supplier</option>
              <option value="partially_received">Partially Received</option>
            </select>
          </div>

          {/* Overdue Toggle */}
          <div className="flex items-center">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.overdueOnly}
                onChange={(e) => setFilters(prev => ({ ...prev, overdueOnly: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Overdue only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
        {filters.overdueOnly && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Showing overdue orders only
          </div>
        )}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders in Queue</h3>
          <p className="text-gray-500">
            {filters.search || filters.priority !== 'all' || filters.status !== 'all' || filters.overdueOnly
              ? 'No orders match your current filters'
              : 'All purchase orders have been fully received'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const priority = calculatePriority(order);
            const isOverdue = order.expectedDate && new Date(order.expectedDate) < new Date();
            
            return (
              <div
                key={order.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOrderClick(order)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {order.poNumber}
                      </h3>
                      
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)}`}>
                        {priority.toUpperCase()} PRIORITY
                      </span>
                      
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>

                      {isOverdue && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          <Clock className="h-3 w-3 mr-1" />
                          OVERDUE
                        </span>
                      )}
                    </div>

                    {/* Supplier and Value */}
                    <div className="flex items-center space-x-6 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-1" />
                        {order.supplierName}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ₱{order.total.toLocaleString()}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        Expected: {formatExpectedDate(order.expectedDate || order.expectedDeliveryDate)}
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="text-sm text-gray-500 mb-2">
                      {order.items.length} items • {order.items.reduce((sum, item) => sum + item.quantity, 0)} total units
                      {order.isPartiallyReceived && (
                        <span className="ml-2 text-orange-600">
                          • {order.totalReceived || 0} of {order.items.reduce((sum, item) => sum + item.quantity, 0)} received
                        </span>
                      )}
                    </div>

                    {/* Time Info */}
                    <div className="text-xs text-gray-400">
                      Created {formatTimeAgo(order.createdAt)}
                      {order.lastReceivedDate && (
                        <span className="ml-2">
                          • Last received {formatTimeAgo(order.lastReceivedDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order);
                      }}
                      className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReceivingQueue;