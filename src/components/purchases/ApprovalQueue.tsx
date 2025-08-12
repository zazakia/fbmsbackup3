import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Filter,
  Search,
  DollarSign,
  Calendar,
  Building,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Users,
  FileText
} from 'lucide-react';
import { PurchaseOrder, EnhancedPurchaseOrderStatus } from '../../types/business';
import { usePurchaseOrderStore } from '../../store/purchaseOrderStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { UserRole } from '../../types/auth';
import { hasPurchaseOrderPermission } from '../../utils/purchaseOrderPermissions';
import { formatCurrency } from '../../utils/formatters';
import PurchaseOrderActionButtons from './PurchaseOrderActionButtons';

interface ApprovalQueueProps {
  onApprove?: (po: PurchaseOrder, reason?: string) => void;
  onReject?: (po: PurchaseOrder, reason: string) => void;
  onViewDetails?: (po: PurchaseOrder) => void;
  onBulkApproval?: (pos: PurchaseOrder[], reason?: string) => void;
}

interface FilterOptions {
  searchTerm: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
  amountRange: 'all' | 'low' | 'medium' | 'high';
  supplier: string;
  sortBy: 'date' | 'amount' | 'supplier' | 'items';
  sortOrder: 'asc' | 'desc';
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  onApprove,
  onReject,
  onViewDetails,
  onBulkApproval
}) => {
  const { userRole } = useSupabaseAuthStore();
  const {
    purchaseOrders,
    loading,
    error,
    loadPurchaseOrdersForApproval
  } = usePurchaseOrderStore();

  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    dateRange: 'all',
    amountRange: 'all',
    supplier: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load pending purchase orders on mount
  useEffect(() => {
    const loadPendingOrders = async () => {
      console.log('🔍 ApprovalQueue: Loading purchase orders for approval...');
      await loadPurchaseOrdersForApproval();
    };

    if (userRole && hasPurchaseOrderPermission(userRole as UserRole, 'approve')) {
      loadPendingOrders();
    }
  }, [userRole, loadPurchaseOrdersForApproval]);

  // Filter and sort purchase orders
  const filteredPOs = useMemo(() => {
    if (!userRole) return [];
    console.log('🔍 ApprovalQueue: Filtering purchase orders...', purchaseOrders.length, 'total orders');
    
    // Since we're loading orders specifically for approval, we primarily need to filter by permissions
    let filtered = purchaseOrders.filter(po => {
      // Enhanced status check - these should be orders with enhanced_status 'draft' or 'pending_approval'
      const isApprovable = ['draft', 'pending_approval'].includes(po.status) || 
                          ['draft', 'pending', 'pending_approval'].includes(po.status);
      const hasPermission = hasPurchaseOrderPermission(userRole as UserRole, 'approve', po, po.total);
      
      console.log('🔍 ApprovalQueue: Order filter check:', {
        poNumber: po.poNumber,
        status: po.status,
        isApprovable,
        hasPermission,
        included: isApprovable && hasPermission
      });
      
      return isApprovable && hasPermission;
    });
    
    console.log('🔍 ApprovalQueue: Filtered to', filtered.length, 'approvable orders');

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(po =>
        po.poNumber.toLowerCase().includes(searchLower) ||
        po.supplierName.toLowerCase().includes(searchLower) ||
        po.items.some(item => 
          item.productName.toLowerCase().includes(searchLower) ||
          item.sku.toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply date filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let filterDate: Date;

      switch (filters.dateRange) {
        case 'today':
          filterDate = startOfDay;
          break;
        case 'week':
          filterDate = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          filterDate = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          filterDate = new Date(0);
      }

      filtered = filtered.filter(po => new Date(po.createdAt) >= filterDate);
    }

    // Apply amount filter
    if (filters.amountRange !== 'all') {
      switch (filters.amountRange) {
        case 'low':
          filtered = filtered.filter(po => po.total <= 10000);
          break;
        case 'medium':
          filtered = filtered.filter(po => po.total > 10000 && po.total <= 50000);
          break;
        case 'high':
          filtered = filtered.filter(po => po.total > 50000);
          break;
      }
    }

    // Apply supplier filter
    if (filters.supplier) {
      filtered = filtered.filter(po => 
        po.supplierName.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'amount':
          comparison = a.total - b.total;
          break;
        case 'supplier':
          comparison = a.supplierName.localeCompare(b.supplierName);
          break;
        case 'items':
          comparison = a.items.length - b.items.length;
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [purchaseOrders, filters, userRole]);

  // Get approval statistics
  const stats = useMemo(() => {
    const total = filteredPOs.length;
    const totalValue = filteredPOs.reduce((sum, po) => sum + po.total, 0);
    const overdue = filteredPOs.filter(po => {
      const daysDiff = Math.floor((Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 3; // Consider overdue after 3 days
    }).length;
    const highValue = filteredPOs.filter(po => po.total > 50000).length;

    return { total, totalValue, overdue, highValue };
  }, [filteredPOs]);

  // Handle individual selection
  const togglePOSelection = (poId: string) => {
    setSelectedPOs(prev =>
      prev.includes(poId)
        ? prev.filter(id => id !== poId)
        : [...prev, poId]
    );
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPOs(filteredPOs.map(po => po.id));
    } else {
      setSelectedPOs([]);
    }
  };

  // Handle bulk approval
  const handleBulkApproval = () => {
    if (selectedPOs.length === 0) return;
    
    const selectedOrders = filteredPOs.filter(po => selectedPOs.includes(po.id));
    if (onBulkApproval) {
      onBulkApproval(selectedOrders);
    }
    setSelectedPOs([]);
  };

  // Get unique suppliers for filter dropdown
  const uniqueSuppliers = useMemo(() => {
    const suppliers = filteredPOs.map(po => po.supplierName);
    return Array.from(new Set(suppliers)).sort();
  }, [filteredPOs]);

  // Get priority level for purchase order
  const getPriority = (po: PurchaseOrder): 'low' | 'medium' | 'high' | 'urgent' => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const amount = po.total;

    if (daysSinceCreated > 7 || amount > 100000) return 'urgent';
    if (daysSinceCreated > 3 || amount > 50000) return 'high';
    if (amount > 10000) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4" />;
      case 'high': return <Clock className="h-4 w-4" />;
      case 'medium': return <Eye className="h-4 w-4" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  if (!userRole) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-600">Please log in to access the approval queue.</p>
      </div>
    );
  }

  if (!hasPurchaseOrderPermission(userRole as UserRole, 'approve')) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">
          You don't have permission to access the approval queue.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Approval Queue</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Purchase Order Approval Queue</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and approve pending purchase orders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                showFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            {selectedPOs.length > 0 && (
              <button
                onClick={handleBulkApproval}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve Selected ({selectedPOs.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Pending Approval</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(stats.totalValue)}</p>
              <p className="text-xs text-gray-500">Total Value</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{stats.overdue}</p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{stats.highValue}</p>
              <p className="text-xs text-gray-500">High Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  placeholder="Search PO, supplier..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount Range</label>
              <select
                value={filters.amountRange}
                onChange={(e) => setFilters(prev => ({ ...prev, amountRange: e.target.value as any }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Amounts</option>
                <option value="low">≤ ₱10,000</option>
                <option value="medium">₱10,001 - ₱50,000</option>
                <option value="high">&gt; ₱50,000</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={filters.supplier}
                onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Suppliers</option>
                {uniqueSuppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date Created</option>
                <option value="amount">Amount</option>
                <option value="supplier">Supplier</option>
                <option value="items">Item Count</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Orders List */}
      <div className="overflow-x-auto">
        {filteredPOs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders Found</h3>
            <p className="text-gray-600">
              {purchaseOrders.length === 0
                ? 'There are no purchase orders pending approval.'
                : 'No purchase orders match your current filter criteria.'}
            </p>
          </div>
        ) : (
          <>
            {/* Bulk Actions Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedPOs.length === filteredPOs.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {selectedPOs.length > 0 
                  ? `${selectedPOs.length} of ${filteredPOs.length} selected`
                  : `${filteredPOs.length} purchase orders`
                }
              </span>
            </div>

            {/* Purchase Orders */}
            <div className="divide-y divide-gray-200">
              {filteredPOs.map((po) => {
                const priority = getPriority(po);
                const daysSinceCreated = Math.floor(
                  (Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div
                    key={po.id}
                    className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                      selectedPOs.includes(po.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedPOs.includes(po.id)}
                        onChange={() => togglePOSelection(po.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                      />

                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                        {/* PO Number and Priority */}
                        <div className="lg:col-span-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{po.poNumber}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)}`}>
                              {getPriorityIcon(priority)}
                              <span className="ml-1 capitalize">{priority}</span>
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {daysSinceCreated === 0 ? 'Today' : `${daysSinceCreated} days ago`}
                          </p>
                        </div>

                        {/* Supplier */}
                        <div className="lg:col-span-1">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{po.supplierName}</span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="lg:col-span-1">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(po.total)}
                            </span>
                          </div>
                        </div>

                        {/* Items Count */}
                        <div className="lg:col-span-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {po.items.length} item{po.items.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Expected Date */}
                        <div className="lg:col-span-1">
                          {po.expectedDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {new Date(po.expectedDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="lg:col-span-1 flex justify-end">
                          <PurchaseOrderActionButtons
                            purchaseOrder={po}
                            onApprove={onApprove}
                            onViewHistory={onViewDetails}
                            showLabels={false}
                            variant="compact"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Item Preview */}
                    <div className="mt-3 ml-8">
                      <div className="text-xs text-gray-500">
                        Items: {po.items.slice(0, 3).map(item => item.productName).join(', ')}
                        {po.items.length > 3 && ` +${po.items.length - 3} more`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;