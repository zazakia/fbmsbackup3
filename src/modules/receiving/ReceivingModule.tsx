import React, { useState } from 'react';
import { useReceivingStore } from '../../store/receivingStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { Product } from '../../types/business';

export const ReceivingModule: React.FC = () => {
  const { loading, error, products, receiveStock, searchProducts } = useReceivingStore();
  const { user } = useSupabaseAuthStore();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length > 2) {
      await searchProducts(e.target.value);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) {
      console.error('User not authenticated or product not selected');
      return;
    }
    await receiveStock(selectedProduct.id, quantity, user.id);
    setSelectedProduct(null);
    setQuantity(0);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Receiving</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Search Product
          </label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={handleSearch}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {products.length > 0 && searchQuery && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1">
              {products.map((product) => (
                <li
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                  {product.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedProduct && (
          <div>
            <h2 className="text-lg font-bold">{selectedProduct.name}</h2>
            <p>Current Stock: {selectedProduct.stock}</p>
          </div>
        )}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantity
          </label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={!selectedProduct}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !selectedProduct}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Receiving...' : 'Receive Items'}
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </form>
    </div>
  );
};
