import React, { useState, useEffect } from 'react';
import ProductForm from './ProductForm';
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  TrendingUp,
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Eye,
  Edit,
  ShoppingCart,
  History,

  Building2
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { Product, InventoryLocation, StockTransfer, LocationStockSummary } from '../../types/business';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StockMovementLedger } from '../../types/business';

interface EnhancedInventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  expiringSoonItems: number;
  outOfStockItems: number;
  topSellingProducts: Product[];
  slowMovingProducts: Product[];
  stockTurnoverRate: number;
  reorderValue: number;
}

interface StockAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiring' | 'expired';
  productId: string;
  productName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

const EnhancedInventoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'locations' | 'transfers' | 'batches' | 'movements' | 'alerts'>('dashboard');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'expiring'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stats, setStats] = useState<EnhancedInventoryStats | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [ledgerFilters, setLedgerFilters] = useState<{ startDate?: string; endDate?: string; type?: string; userId?: string }>({});
  const [stockMovements, setStockMovements] = useState<StockMovementLedger[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  
  // Multi-location state
  const [locations, setLocations] = useState<InventoryLocation[]>([
    { id: 'main', name: 'Main Warehouse', address: '123 Main St, Manila', isActive: true, createdAt: new Date() },
    { id: 'store1', name: 'Store 1 - Makati', address: '456 Ayala Ave, Makati', isActive: true, createdAt: new Date() },
    { id: 'store2', name: 'Store 2 - BGC', address: '789 BGC Blvd, Taguig', isActive: true, createdAt: new Date() },
    { id: 'warehouse2', name: 'Secondary Warehouse', address: '321 Industrial Ave, Quezon City', isActive: true, createdAt: new Date() }
  ]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pendingTransfers, setPendingTransfers] = useState<StockTransfer[]>([]);
  const [locationStockSummary, setLocationStockSummary] = useState<LocationStockSummary[]>([]);

  const { 
    products, 
    categories, 
    fetchProducts,
    fetchCategories,
    updateStock
  } = useBusinessStore();
  
  const { addToast } = useToastStore();

  // Load products and categories on component mount - force refresh to ensure data consistency
  useEffect(() => {
    const loadData = async () => {
      try {
        // Always fetch fresh data to ensure consistency between different ports/instances
        const port = window.location.port;
        console.log(`🔄 [INVENTORY] (Port ${port}): Component mounted, current products in store:`, products.length);
        console.log(`🔍 [INVENTORY] Sample product before fetch:`, products[0] ? {
          name: products[0].name,
          category: products[0].category,
          source: 'store-before-fetch'
        } : 'None');
        
        if (fetchProducts) {
          console.log(`🔄 [INVENTORY] Calling fetchProducts()...`);
          await fetchProducts();
          console.log(`✅ [INVENTORY] fetchProducts() completed`);
          
          // Check products in store after fetchProducts
          setTimeout(() => {
            const currentProducts = products;
            console.log(`🔍 [INVENTORY] Products in component after fetch:`, currentProducts.length);
            console.log(`🔍 [INVENTORY] Sample product after fetch:`, currentProducts[0] ? {
              name: currentProducts[0].name,
              category: currentProducts[0].category,
              categoryId: currentProducts[0].categoryId,
              stock: currentProducts[0].stock
            } : 'None');
          }, 50);
        }
        
        if (fetchCategories) {
          await fetchCategories();
          console.log(`✅ [INVENTORY] Categories loaded - ${categories.length} categories`);
        }
      } catch (error) {
        const port = window.location.port;
        console.error(`❌ [INVENTORY] Failed to load data:`, error);
        addToast({ 
          type: 'error', 
          title: 'Data Loading Error', 
          message: 'Failed to load inventory data. Please refresh the page.' 
        });
      }
    };
    
    // Load data immediately, regardless of cache status to ensure consistency
    loadData();
  }, [fetchProducts, fetchCategories, addToast]); // Remove products.length and categories.length from deps

  // Calculate enhanced inventory statistics
  useEffect(() => {
    const calculateStats = () => {
      const activeProducts = products.filter(p => p.isActive);
      const totalProducts = activeProducts.length;
      const totalValue = activeProducts.reduce((sum, p) => sum + (p.stock * p.cost), 0);
      const lowStockItems = activeProducts.filter(p => p.stock <= p.minStock && p.stock > 0).length;
      const outOfStockItems = activeProducts.filter(p => p.stock === 0).length;
      
      // Calculate expiring items (items expiring within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringSoonItems = activeProducts.filter(p => 
        p.expiryDate && new Date(p.expiryDate) <= thirtyDaysFromNow
      ).length;

      // Get top selling and slow moving products (mock data for now)
      const topSellingProducts = activeProducts
        .sort((a, b) => (b.soldQuantity || 0) - (a.soldQuantity || 0))
        .slice(0, 5);
      
      const slowMovingProducts = activeProducts
        .filter(p => (p.soldQuantity || 0) < 5 && p.stock > 0)
        .slice(0, 5);

      const stockTurnoverRate = 4.2; // Mock calculation
      const reorderValue = activeProducts
        .filter(p => p.stock <= p.minStock)
        .reduce((sum, p) => sum + (p.reorderQuantity || 0) * p.cost, 0);

      setStats({
        totalProducts,
        totalValue,
        lowStockItems,
        expiringSoonItems,
        outOfStockItems,
        topSellingProducts,
        slowMovingProducts,
        stockTurnoverRate,
        reorderValue
      });
    };

    calculateStats();
  }, [products]);

  // Generate stock alerts
  useEffect(() => {
    const generateAlerts = () => {
      const alerts: StockAlert[] = [];
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      products.forEach(product => {
        if (!product.isActive) return;

        // Out of stock alert
        if (product.stock === 0) {
          alerts.push({
            id: `out-${product.id}`,
            type: 'out_of_stock',
            productId: product.id,
            productName: product.name,
            message: 'Product is out of stock',
            severity: 'critical',
            createdAt: now
          });
        }
        // Low stock alert
        else if (product.stock <= product.minStock) {
          alerts.push({
            id: `low-${product.id}`,
            type: 'low_stock',
            productId: product.id,
            productName: product.name,
            message: `Stock is low (${product.stock} remaining, minimum: ${product.minStock})`,
            severity: 'high',
            createdAt: now
          });
        }

        // Expiry alerts
        if (product.expiryDate) {
          const expiryDate = new Date(product.expiryDate);
          if (expiryDate <= now) {
            alerts.push({
              id: `expired-${product.id}`,
              type: 'expired',
              productId: product.id,
              productName: product.name,
              message: 'Product has expired',
              severity: 'critical',
              createdAt: now
            });
          } else if (expiryDate <= thirtyDaysFromNow) {
            alerts.push({
              id: `expiring-${product.id}`,
              type: 'expiring',
              productId: product.id,
              productName: product.name,
              message: `Product expires on ${formatDate(expiryDate)}`,
              severity: 'medium',
              createdAt: now
            });
          }
        }
      });

      setStockAlerts(alerts);
    };

    generateAlerts();
  }, [products]);

  // Fetch stock movements when selectedProduct or filters change
  useEffect(() => {
    if (!selectedProduct || activeTab !== 'movements') return;
    setLoadingLedger(true);
    setLedgerError(null);
    setTimeout(() => {
      setStockMovements([]);
      setLoadingLedger(false);
    }, 500);
  }, [selectedProduct, ledgerFilters, activeTab]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.includes(searchTerm));
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    let matchesStockFilter = true;
    switch (stockFilter) {
      case 'low':
        matchesStockFilter = product.stock <= product.minStock && product.stock > 0;
        break;
      case 'out':
        matchesStockFilter = product.stock === 0;
        break;
      case 'expiring':
        if (product.expiryDate) {
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          matchesStockFilter = new Date(product.expiryDate) <= thirtyDaysFromNow;
        } else {
          matchesStockFilter = false;
        }
        break;
    }
    
    return matchesSearch && matchesCategory && matchesStockFilter && product.isActive;
  });



  const getStockStatusColor = (product: Product) => {
    if (product.stock === 0) return 'text-red-600 bg-red-50';
    if (product.stock <= product.minStock) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockStatusText = (product: Product) => {
    if (product.stock === 0) return 'Out of Stock';
    if (product.stock <= product.minStock) return 'Low Stock';
    return 'In Stock';
  };

  const getSeverityColor = (severity: StockAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6 dark:bg-dark-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Enhanced Inventory Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Advanced inventory control with smart analytics and alerts</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              try {
                addToast({ title: 'Refreshing', message: 'Reloading inventory data...', type: 'info', duration: 2000 });
                await Promise.all([
                  fetchProducts?.(),
                  fetchCategories?.()
                ]);
                addToast({ title: 'Success', message: 'Inventory data refreshed successfully', type: 'success', duration: 3000 });
              } catch (error) {
                console.error('Failed to refresh data:', error);
                addToast({ title: 'Error', message: 'Failed to refresh data', type: 'error', duration: 5000 });
              }
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            title="Force refresh data from database"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
          <button
            onClick={() => addToast({ title: 'Coming Soon', message: 'Batch management coming soon', type: 'info', duration: 3000 })}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Package className="h-4 w-4 mr-2" />
            New Batch
          </button>
          <button
            onClick={() => setShowProductForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalProducts}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Active inventory items</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inventory Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Total stock value</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stock Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.lowStockItems + stats.outOfStockItems}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Items need attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Turnover Rate</p>
                <p className="text-2xl font-bold text-purple-600">{stats.stockTurnoverRate}x</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Annual turnover</p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button className="flex items-center px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export Inventory
            </button>
            <button className="flex items-center px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <Upload className="h-4 w-4 mr-2" />
              Import Stock Levels
            </button>
            <button className="flex items-center px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <BarChart3 className="h-4 w-4 mr-2" />
              Stock Analysis
            </button>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Last updated: {formatDate(new Date(), 'time')}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="border-b border-gray-200 dark:border-dark-700">
          <nav className="flex overflow-x-auto px-4 sm:px-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3, shortLabel: 'Dashboard' },
              { id: 'products', label: 'Products', icon: Package, shortLabel: 'Products' },
              { id: 'batches', label: 'Batches', icon: Archive, shortLabel: 'Batches' },
              { id: 'movements', label: 'Stock Movements', icon: History, shortLabel: 'Movements' },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle, shortLabel: 'Alerts', badge: stockAlerts.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 sm:py-4 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-1 sm:ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 sm:p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Stock Status Overview</h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <span className="text-red-700 dark:text-red-300 font-medium text-sm sm:text-base">Out of Stock</span>
                      <span className="text-red-900 dark:text-red-100 font-bold text-sm sm:text-base">{stats.outOfStockItems}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <span className="text-yellow-700 dark:text-yellow-300 font-medium text-sm sm:text-base">Low Stock</span>
                      <span className="text-yellow-900 dark:text-yellow-100 font-bold text-sm sm:text-base">{stats.lowStockItems}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <span className="text-orange-700 dark:text-orange-300 font-medium text-sm sm:text-base">Expiring Soon</span>
                      <span className="text-orange-900 dark:text-orange-100 font-bold text-sm sm:text-base">{stats.expiringSoonItems}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Top Selling Products</h3>
                  <div className="space-y-2">
                    {stats.topSellingProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div className="flex items-center min-w-0 flex-1">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mr-2 sm:mr-3 flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">{product.name}</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm ml-2">{product.soldQuantity || 0} sold</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Alerts */}
              {stockAlerts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Alerts</h3>
                  <div className="space-y-2">
                    {stockAlerts.slice(0, 5).map(alert => (
                      <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{alert.productName}</p>
                            <p className="text-sm">{alert.message}</p>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(alert.createdAt, 'time')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2 sm:gap-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="all">All Categories</option>
                    {[...new Set(products.map(p => p.category))].filter(Boolean).map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as any)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="all">All Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                    <option value="expiring">Expiring</option>
                  </select>
                </div>
              </div>

              {/* Products Table - Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-dark-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Product</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">SKU</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Stock</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Value</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => {
                      const category = categories.find(c => c.name === product.category);
                      return (
                        <tr key={product.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                              {product.barcode && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">Barcode: {product.barcode}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{product.sku}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{category?.name || 'Uncategorized'}</td>
                          <td className="py-3 px-4">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{product.stock}</span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">/ {product.minStock} min</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(product)}`}>
                              {getStockStatusText(product)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">
                            {formatCurrency(product.stock * product.cost)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setSelectedProduct(product)}
                                className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProduct(product.id);
                                  setShowProductForm(true);
                                }}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                                title="Edit Product"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => addToast({ title: 'Coming Soon', message: 'Stock movement tracking coming soon', type: 'info', duration: 3000 })}
                                className="p-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                                title="Adjust Stock"
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Products Cards - Mobile */}
              <div className="lg:hidden space-y-3">
                {filteredProducts.map(product => {
                  const category = categories.find(c => c.name === product.category);
                  return (
                    <div key={product.id} className="bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2">{product.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SKU: {product.sku}</p>
                          {product.barcode && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Barcode: {product.barcode}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(product)}`}>
                          {getStockStatusText(product)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Category:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{category?.name || 'Uncategorized'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Stock:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{product.stock} / {product.minStock} min</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Value:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(product.stock * product.cost)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-2 border-t border-gray-200 dark:border-dark-600">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(product.id);
                            setShowProductForm(true);
                          }}
                          className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-dark-600 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-500 transition-colors"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => addToast({ title: 'Coming Soon', message: 'Stock movement tracking coming soon', type: 'info', duration: 3000 })}
                          className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Stock
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Inventory Alerts</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">{stockAlerts.length} total alerts</span>
              </div>
              
              {stockAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">All Clear!</h3>
                  <p className="text-gray-500 dark:text-gray-400">No inventory alerts at this time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stockAlerts.map(alert => (
                    <div key={alert.id} className={`p-3 sm:p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0">
                            <div className="flex items-center">
                              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                              <h4 className="font-medium text-sm sm:text-base truncate">{alert.productName}</h4>
                            </div>
                            <span className="ml-0 sm:ml-2 px-2 py-1 text-xs font-medium rounded-full bg-white dark:bg-dark-800 self-start">
                              {alert.type.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                            {formatDate(alert.createdAt)}
                          </p>
                        </div>
                        <button className="self-start sm:ml-4 text-xs sm:text-sm px-3 py-1.5 sm:py-1 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors whitespace-nowrap">
                          View Product
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stock Movements Tab */}
          {activeTab === 'movements' && (
            <div>
              {selectedProduct ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Stock Movements for {selectedProduct.name}</h3>
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <input
                      type="date"
                      value={ledgerFilters.startDate || ''}
                      onChange={e => setLedgerFilters(f => ({ ...f, startDate: e.target.value }))}
                      className="border rounded px-2 py-1 text-sm"
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      value={ledgerFilters.endDate || ''}
                      onChange={e => setLedgerFilters(f => ({ ...f, endDate: e.target.value }))}
                      className="border rounded px-2 py-1 text-sm"
                      placeholder="End date"
                    />
                    <select
                      value={ledgerFilters.type || ''}
                      onChange={e => setLedgerFilters(f => ({ ...f, type: e.target.value || undefined }))}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="">All Types</option>
                      <option value="in">Stock In</option>
                      <option value="out">Stock Out</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                    <input
                      type="text"
                      value={ledgerFilters.userId || ''}
                      onChange={e => setLedgerFilters(f => ({ ...f, userId: e.target.value || undefined }))}
                      className="border rounded px-2 py-1 text-sm"
                      placeholder="User ID"
                    />
                  </div>
                  {/* Table */}
                  {loadingLedger ? (
                    <div className="text-center py-8 text-gray-500">Loading stock movements...</div>
                  ) : ledgerError ? (
                    <div className="text-center py-8 text-red-500">{ledgerError}</div>
                  ) : stockMovements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No stock movements found for this product.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-dark-800">
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-right">Change</th>
                            <th className="px-3 py-2 text-right">Resulting Stock</th>
                            <th className="px-3 py-2 text-left">User</th>
                            <th className="px-3 py-2 text-left">Reference</th>
                            <th className="px-3 py-2 text-left">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockMovements.map(movement => (
                            <tr key={movement.id} className="border-b">
                              <td className="px-3 py-2">{movement.created_at.toLocaleString()}</td>
                              <td className="px-3 py-2 capitalize">{movement.type}</td>
                              <td className="px-3 py-2 text-right">{movement.change > 0 ? '+' : ''}{movement.change}</td>
                              <td className="px-3 py-2 text-right">{movement.resulting_stock}</td>
                              <td className="px-3 py-2">{movement.user_id || '-'}</td>
                              <td className="px-3 py-2">{movement.reference_id || '-'}</td>
                              <td className="px-3 py-2">{movement.reason || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Select a product to view its stock movement ledger.</div>
              )}
            </div>
          )}

          {/* Other tabs (batches, movements) would be implemented similarly */}
          {activeTab === 'batches' && (
            <div className="text-center py-8 sm:py-12">
              <Archive className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Batch Management</h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 px-4">Track inventory batches, expiry dates, and lot numbers.</p>
            </div>
          )}

          {activeTab === 'movements' && (
            <div className="text-center py-8 sm:py-12">
              <History className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Stock Movements</h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 px-4">View all stock adjustments, receipts, and transfers.</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          productId={editingProduct}
          onClose={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedInventoryManagement;
