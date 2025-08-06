import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Plus, 
  Truck, 
  Package, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Calendar,
  MapPin,
  User,
  FileText,
  ArrowUpDown,
  MoreHorizontal
} from 'lucide-react';
import { 
  ProductMovementHistory, 
  ProductHistoryFilter, 
  ProductMovementType,
  MovementStatus,
  InventoryLocation
} from '../../types/business';
import { getProductMovements, getInventoryLocations } from '../../api/productHistory';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import MovementDetails from './MovementDetails';
import TransferSlip from './TransferSlip';
import ProductMovementForm from './ProductMovementForm';

interface ProductHistoryProps {
  selectedProductId?: string;
}

const ProductHistory: React.FC<ProductHistoryProps> = ({ selectedProductId }) => {
  const [movements, setMovements] = useState<ProductMovementHistory[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<ProductMovementHistory[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<ProductMovementHistory | null>(null);
  const [showMovementDetails, setShowMovementDetails] = useState(false);
  const [showTransferSlip, setShowTransferSlip] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ProductHistoryFilter>({
    productId: selectedProductId
  });
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const { products } = useBusinessStore();
  const { addToast } = useToastStore();
  const { user } = useSupabaseAuthStore();

  // Movement type configurations
  const movementTypeConfig = {
    stock_in: { label: 'Stock In', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    stock_out: { label: 'Stock Out', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    sale: { label: 'Sale', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    purchase: { label: 'Purchase', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    adjustment_in: { label: 'Adjustment +', icon: Plus, color: 'text-blue-600', bg: 'bg-blue-50' },
    adjustment_out: { label: 'Adjustment -', icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50' },
    transfer_out: { label: 'Transfer Out', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
    transfer_in: { label: 'Transfer In', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    return_in: { label: 'Return In', icon: RefreshCw, color: 'text-green-600', bg: 'bg-green-50' },
    return_out: { label: 'Return Out', icon: RefreshCw, color: 'text-red-600', bg: 'bg-red-50' },
    damage_out: { label: 'Damaged', icon: TrendingDown, color: 'text-red-700', bg: 'bg-red-100' },
    expired_out: { label: 'Expired', icon: TrendingDown, color: 'text-gray-600', bg: 'bg-gray-50' },
    shrinkage: { label: 'Shrinkage', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
    recount: { label: 'Recount', icon: ArrowUpDown, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    initial_stock: { label: 'Initial Stock', icon: Package, color: 'text-gray-600', bg: 'bg-gray-50' }
  };

  // Load data
  const loadMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentFilter = {
        ...filter,
        fromDate: dateRange.from ? new Date(dateRange.from) : undefined,
        toDate: dateRange.to ? new Date(dateRange.to) : undefined
      };

      const { data, error } = await getProductMovements(currentFilter, 500); // Load more for filtering
      
      if (error) {
        addToast({
          type: 'error',
          title: 'Error Loading Movements',
          message: 'Failed to load product movement history.'
        });
        return;
      }

      setMovements(data || []);
    } catch (error) {
      console.error('Error loading movements:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred while loading movements.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [filter, dateRange, addToast]);

  const loadLocations = useCallback(async () => {
    try {
      const { data, error } = await getInventoryLocations();
      if (data && !error) {
        setLocations(data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }, []);

  useEffect(() => {
    loadMovements();
    loadLocations();
  }, [loadMovements, loadLocations]);

  // Filter movements based on search term
  useEffect(() => {
    let filtered = movements;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = movements.filter(movement => 
        movement.productName.toLowerCase().includes(term) ||
        movement.productSku.toLowerCase().includes(term) ||
        movement.reason.toLowerCase().includes(term) ||
        (movement.referenceNumber && movement.referenceNumber.toLowerCase().includes(term)) ||
        (movement.batchNumber && movement.batchNumber.toLowerCase().includes(term)) ||
        (movement.performedByName && movement.performedByName.toLowerCase().includes(term))
      );
    }

    setFilteredMovements(filtered);
    setCurrentPage(1);
  }, [movements, searchTerm]);

  // Pagination
  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMovements.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMovements, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);

  // Event handlers
  const handleFilterChange = (key: keyof ProductHistoryFilter, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const handleDateRangeChange = (key: 'from' | 'to', value: string) => {
    setDateRange(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilter({ productId: selectedProductId });
    setDateRange({ from: '', to: '' });
    setSearchTerm('');
  };

  const handleViewDetails = (movement: ProductMovementHistory) => {
    setSelectedMovement(movement);
    setShowMovementDetails(true);
  };

  const getMovementTypeDisplay = (type: ProductMovementType) => {
    const config = movementTypeConfig[type];
    if (!config) return { label: type, icon: Package, color: 'text-gray-600', bg: 'bg-gray-50' };
    return config;
  };

  const formatQuantity = (type: ProductMovementType, quantity: number) => {
    // Stock decreasing operations (outbound)
    const STOCK_OUT_TYPES = [
      'sale',               // Sales transactions
      'stock_out',          // General stock out
      'adjustment_out',     // Negative adjustments
      'transfer_out',       // Transfers to other locations
      'return_out',         // Returns to suppliers
      'damage_out',         // Damaged goods
      'expired_out',        // Expired products
      'shrinkage'           // Inventory shrinkage
    ];
    
    const isNegative = STOCK_OUT_TYPES.includes(type);
    return isNegative ? `-${quantity}` : `+${quantity}`;
  };

  const exportToCSV = () => {
    const csvData = filteredMovements.map(movement => ({
      'Date': movement.createdAt.toLocaleDateString(),
      'Product Name': movement.productName,
      'SKU': movement.productSku,
      'Movement Type': getMovementTypeDisplay(movement.type).label,
      'Quantity': formatQuantity(movement.type, movement.quantity),
      'Previous Stock': movement.previousStock,
      'New Stock': movement.newStock,
      'Reason': movement.reason,
      'Reference': movement.referenceNumber || '',
      'Location': movement.locationName || '',
      'Performed By': movement.performedByName || movement.performedBy,
      'Status': movement.status
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-movements-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Export Successful',
      message: 'Product movements exported to CSV successfully.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Product Movement History</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track all product movements, transfers, and adjustments
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTransferSlip(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Truck className="h-4 w-4 mr-2" />
            New Transfer
          </button>
          <button
            onClick={() => setShowMovementForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Movement
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, reference, or batch number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Filter Toggle and Export */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredMovements.length === 0}
              className="flex items-center px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={loadMovements}
              disabled={isLoading}
              className="flex items-center px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Product Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Product
                </label>
                <select
                  value={filter.productId || ''}
                  onChange={(e) => handleFilterChange('productId', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Products</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Movement Type
                </label>
                <select
                  value={filter.movementType || ''}
                  onChange={(e) => handleFilterChange('movementType', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Types</option>
                  {Object.entries(movementTypeConfig).map(([type, config]) => (
                    <option key={type} value={type}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <select
                  value={filter.locationId || ''}
                  onChange={(e) => handleFilterChange('locationId', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Locations</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filter.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value as MovementStatus || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => handleDateRangeChange('from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => handleDateRangeChange('to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>
          Showing {paginatedMovements.length} of {filteredMovements.length} movements
          {searchTerm && ` for "${searchTerm}"`}
        </div>
        <div>
          Page {currentPage} of {totalPages}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading movements...</p>
          </div>
        ) : paginatedMovements.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No movements found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || Object.keys(filter).some(key => filter[key as keyof ProductHistoryFilter])
                ? 'Try adjusting your search or filters.'
                : 'No product movements have been recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Movement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                {paginatedMovements.map((movement) => {
                  const typeConfig = getMovementTypeDisplay(movement.type);
                  const Icon = typeConfig.icon;
                  
                  return (
                    <tr key={movement.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {movement.createdAt.toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {movement.createdAt.toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {movement.productName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {movement.productSku}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {typeConfig.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          ['stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out'].includes(movement.type)
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {formatQuantity(movement.type, movement.quantity)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {movement.previousStock} → {movement.newStock}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {movement.locationName || movement.fromLocationName || movement.toLocationName || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {movement.referenceNumber || '-'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {movement.referenceType || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          movement.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : movement.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : movement.status === 'approved'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {movement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(movement)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            {totalPages > 5 && (
              <>
                <span className="px-2 text-gray-500">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Movement Details Modal */}
      {showMovementDetails && selectedMovement && (
        <MovementDetails
          movement={selectedMovement}
          onClose={() => {
            setShowMovementDetails(false);
            setSelectedMovement(null);
          }}
          showActions={selectedMovement.status === 'pending'}
        />
      )}

      {/* Transfer Slip Modal */}
      {showTransferSlip && (
        <TransferSlip
          onClose={() => setShowTransferSlip(false)}
          onSave={() => {
            setShowTransferSlip(false);
            loadMovements(); // Reload movements after creating transfer
          }}
          mode="create"
        />
      )}

      {/* Movement Form Modal */}
      {showMovementForm && (
        <ProductMovementForm
          onClose={() => setShowMovementForm(false)}
          onSave={() => {
            setShowMovementForm(false);
            loadMovements(); // Reload movements after creating movement
          }}
        />
      )}
    </div>
  );
};

export default ProductHistory;