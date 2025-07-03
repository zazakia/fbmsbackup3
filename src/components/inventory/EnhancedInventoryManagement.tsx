import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Calendar,
  Scan,
  FileBarChart,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  History
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { Product, StockMovement, InventoryBatch } from '../../types/business';
import { formatCurrency, formatDate } from '../../utils/formatters';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'batches' | 'movements' | 'alerts'>('dashboard');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'expiring'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showStockMovement, setShowStockMovement] = useState(false);
  const [stats, setStats] = useState<EnhancedInventoryStats | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatch[]>([]);

  const { 
    products, 
    categories, 
    updateStock,
    deleteProduct,
    getProductSalesData,
    createStockMovement,
    getStockMovements
  } = useBusinessStore();
  
  const { addToast } = useToastStore();

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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.includes(searchTerm));
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    
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

  const handleStockAdjustment = (productId: string, adjustment: number, reason: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newStock = Math.max(0, product.stock + adjustment);
    updateStock(productId, newStock);

    // Create stock movement record
    createStockMovement({
      id: `movement-${Date.now()}`,
      productId,
      type: adjustment > 0 ? 'stock_in' : 'stock_out',
      quantity: Math.abs(adjustment),
      reason,
      performedBy: 'admin', // Replace with actual user
      createdAt: new Date(),
      batchNumber: undefined,
      cost: product.cost,
      notes: `Stock ${adjustment > 0 ? 'increase' : 'decrease'}: ${reason}`
    });

    addToast({
      type: 'success',
      title: 'Stock Updated',
      message: `${product.name} stock adjusted by ${adjustment}`
    });
  };

  const handleBulkStockUpdate = (csvData: string) => {
    // Parse CSV and update stock levels
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    let updated = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 2) {
        const sku = values[0].trim();
        const newStock = parseInt(values[1].trim());
        
        const product = products.find(p => p.sku === sku);
        if (product && !isNaN(newStock)) {
          updateStock(product.id, newStock);
          updated++;
        }
      }
    }

    addToast({
      type: 'success',
      title: 'Bulk Update Complete',
      message: `Updated stock levels for ${updated} products`
    });
  };

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
            onClick={() => setShowBatchForm(true)}
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
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'batches', label: 'Batches', icon: Archive },
              { id: 'movements', label: 'Stock Movements', icon: History },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: stockAlerts.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stock Status Overview</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <span className="text-red-700 dark:text-red-300 font-medium">Out of Stock</span>
                      <span className="text-red-900 dark:text-red-100 font-bold">{stats.outOfStockItems}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <span className="text-yellow-700 dark:text-yellow-300 font-medium">Low Stock</span>
                      <span className="text-yellow-900 dark:text-yellow-100 font-bold">{stats.lowStockItems}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <span className="text-orange-700 dark:text-orange-300 font-medium">Expiring Soon</span>
                      <span className="text-orange-900 dark:text-orange-100 font-bold">{stats.expiringSoonItems}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Selling Products</h3>
                  <div className="space-y-2">
                    {stats.topSellingProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div className="flex items-center">
                          <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{product.name}</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">{product.soldQuantity || 0} sold</span>
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
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name, SKU, or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                  <option value="expiring">Expiring Soon</option>
                </select>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto">
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
                      const category = categories.find(c => c.id === product.categoryId);
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
                                onClick={() => setShowStockMovement(true)}
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
                    <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            <h4 className="font-medium">{alert.productName}</h4>
                            <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-white dark:bg-dark-800">
                              {alert.type.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {formatDate(alert.createdAt)}
                          </p>
                        </div>
                        <button className="ml-4 text-sm px-3 py-1 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                          View Product
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Other tabs (batches, movements) would be implemented similarly */}
          {activeTab === 'batches' && (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Batch Management</h3>
              <p className="text-gray-500 dark:text-gray-400">Track inventory batches, expiry dates, and lot numbers.</p>
            </div>
          )}

          {activeTab === 'movements' && (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Stock Movements</h3>
              <p className="text-gray-500 dark:text-gray-400">View all stock adjustments, receipts, and transfers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedInventoryManagement;