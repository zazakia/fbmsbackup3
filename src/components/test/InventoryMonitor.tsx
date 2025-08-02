import React, { useState, useEffect } from 'react';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Eye,
  DollarSign
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import type { Product } from '../../types/business';

interface StockMovement {
  productId: string;
  productName: string;
  before: number;
  after: number;
  change: number;
  timestamp: number;
  type: 'sale' | 'purchase' | 'adjustment';
}

interface InventoryMonitorProps {
  highlightChanges?: boolean;
  compact?: boolean;
}

const InventoryMonitor: React.FC<InventoryMonitorProps> = ({ 
  highlightChanges = true, 
  compact = false 
}) => {
  const { products } = useBusinessStore();
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [previousProducts, setPreviousProducts] = useState<Product[]>([]);

  // Monitor stock changes
  useEffect(() => {
    if (previousProducts.length === 0) {
      setPreviousProducts([...products]);
      return;
    }

    const movements: StockMovement[] = [];
    const timestamp = Date.now();

    products.forEach(product => {
      const prevProduct = previousProducts.find(p => p.id === product.id);
      if (prevProduct && prevProduct.stock !== product.stock) {
        const change = product.stock - prevProduct.stock;
        movements.push({
          productId: product.id,
          productName: product.name,
          before: prevProduct.stock,
          after: product.stock,
          change,
          timestamp,
          type: change > 0 ? 'purchase' : 'sale'
        });
      }
    });

    if (movements.length > 0) {
      setStockMovements(prev => [...movements, ...prev].slice(0, 20)); // Keep last 20 movements
    }

    setPreviousProducts([...products]);
  }, [products, previousProducts]);

  const getStockStatusColor = (stock: number, minStock: number) => {
    if (stock === 0) return 'text-red-600 bg-red-50 border-red-200';
    if (stock <= minStock) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getTotalInventoryValue = () => {
    return products.reduce((total, product) => total + (product.stock * (product.cost || 0)), 0);
  };

  const getLowStockCount = () => {
    return products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
  };

  const getOutOfStockCount = () => {
    return products.filter(p => p.stock === 0).length;
  };

  if (compact) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Package className="h-5 w-5 mr-2 text-blue-500" />
            Inventory Status
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {products.length} items
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              ₱{getTotalInventoryValue().toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Value</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {getLowStockCount()}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Low Stock</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {getOutOfStockCount()}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Out of Stock</p>
          </div>
        </div>

        {stockMovements.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Recent Changes
            </h4>
            <div className="space-y-2 max-h-32 overflow-auto">
              {stockMovements.slice(0, 3).map((movement, index) => (
                <div
                  key={`${movement.productId}-${movement.timestamp}`}
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    highlightChanges && index === 0 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                      : 'bg-gray-50 dark:bg-dark-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {movement.change > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-gray-900 dark:text-gray-100 truncate max-w-24">
                      {movement.productName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {movement.before}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className={movement.change > 0 ? 'text-green-600' : 'text-red-600'}>
                      {movement.after}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
      <div className="p-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Package className="h-5 w-5 mr-2 text-blue-500" />
            Inventory Monitor
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Value: <span className="font-medium text-green-600">
                ₱{getTotalInventoryValue().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Items</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {products.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Total Value</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  ₱{getTotalInventoryValue().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400">Low Stock</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                  {getLowStockCount()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">Out of Stock</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">
                  {getOutOfStockCount()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            Current Stock Levels
          </h3>
          <div className="max-h-64 overflow-auto">
            <div className="grid gap-2">
              {products.slice(0, 10).map(product => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      SKU: {product.sku} • Cost: ₱{(product.cost || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                      getStockStatusColor(product.stock, product.minStock)
                    }`}>
                      {product.stock} units
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Min: {product.minStock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stock Movements */}
        {stockMovements.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              Recent Stock Movements
            </h3>
            <div className="max-h-48 overflow-auto">
              <div className="space-y-2">
                {stockMovements.map((movement, index) => (
                  <div
                    key={`${movement.productId}-${movement.timestamp}`}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      highlightChanges && index === 0 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                        : 'bg-gray-50 dark:bg-dark-700 border-gray-200 dark:border-dark-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {movement.change > 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {movement.productName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(movement.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">
                          {movement.before}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className={movement.change > 0 ? 'text-green-600' : 'text-red-600'}>
                          {movement.after}
                        </span>
                      </div>
                      <p className={`text-sm ${movement.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.change > 0 ? '+' : ''}{movement.change}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryMonitor;