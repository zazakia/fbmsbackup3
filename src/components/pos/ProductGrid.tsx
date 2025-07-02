import React from 'react';
import { Plus, Package } from 'lucide-react';
import { Product } from '../../types/business';
import { useBusinessStore } from '../../store/businessStore';

interface ProductGridProps {
  products: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  const { addToCart, getCategory } = useBusinessStore();

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Package className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm">Try adjusting your search or category filter</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => {
        const category = getCategory(product.category);
        const isLowStock = product.stock <= product.minStock;
        
        return (
          <div
            key={product.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => handleAddToCart(product)}
          >
            {/* Product Image Placeholder */}
            <div className="w-full h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" />
            </div>

            {/* Product Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
                  {product.name}
                </h3>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200">
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">{category?.name}</p>
                <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-600">
                    ₱{product.price.toFixed(2)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isLowStock 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {product.stock} {product.unit}
                  </span>
                </div>
              </div>

              {isLowStock && (
                <div className="text-xs text-red-600 font-medium">
                  Low Stock!
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductGrid;