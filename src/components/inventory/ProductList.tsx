import React, { useState } from 'react';
import { Edit, Trash2, Package, AlertTriangle, Grid, List } from 'lucide-react';
import { Product } from '../../types/business';
import { useBusinessStore } from '../../store/businessStore';

interface ProductListProps {
  products: Product[];
  onEdit: (productId: string) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, onEdit }) => {
  const { deleteProduct, getCategory } = useBusinessStore();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const handleDelete = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(productId);
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No products found</h3>
        <p className="text-gray-500 dark:text-gray-400">Add your first product to get started</p>
      </div>
    );
  }

  const renderMobileCards = () => (
    <div className="space-y-4">
      {products.map((product) => {
        const category = getCategory(product.category);
        const isLowStock = product.stock <= product.minStock;
        const stockValue = product.stock * product.cost;

        return (
          <div key={product.id} className="mobile-table-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                  <Package className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    SKU: {product.sku}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEdit(product.id)}
                  className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {product.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{product.description}</p>
            )}
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Category:</span>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {category?.name || 'Uncategorized'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Price:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">₱{product.price.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Stock:</span>
                <div className="flex items-center mt-1">
                  <span className={`font-medium ${
                    isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {product.stock} {product.unit}
                  </span>
                  {isLowStock && (
                    <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Min: {product.minStock}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Value:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">₱{stockValue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDesktopTable = () => (
    <div className="mobile-table-wrapper">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
        <thead className="bg-gray-50 dark:bg-dark-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Product
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              SKU
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Stock
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
          {products.map((product) => {
            const category = getCategory(product.category);
            const isLowStock = product.stock <= product.minStock;
            const stockValue = product.stock * product.cost;

            return (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {product.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {category?.name || 'Uncategorized'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {product.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  ₱{product.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${
                      isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {product.stock} {product.unit}
                    </span>
                    {isLowStock && (
                      <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Min: {product.minStock} {product.unit}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  ₱{stockValue.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEdit(product.id)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {/* View Toggle - Show on mobile */}
      <div className="md:hidden mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Products</h3>
        <div className="flex bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden">
        {viewMode === 'cards' ? renderMobileCards() : renderDesktopTable()}
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block">
        {renderDesktopTable()}
      </div>
    </div>
  );
};

export default ProductList;