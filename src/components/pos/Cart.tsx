import React from 'react';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';

const Cart: React.FC = () => {
  const { cart, updateCartItem, removeFromCart } = useBusinessStore();

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <ShoppingCart className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Cart is empty</p>
        <p className="text-sm text-center">Add products from the catalog to start a sale</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {cart.map((item) => (
        <div key={item.product.id} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm leading-tight">
                {item.product.name}
              </h4>
              <p className="text-xs text-gray-500">
                ₱{item.product.price.toFixed(2)} × {item.quantity}
              </p>
            </div>
            <button
              onClick={() => removeFromCart(item.product.id)}
              className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => updateCartItem(item.product.id, item.quantity - 1)}
                className="p-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-sm font-medium">
                {item.quantity}
              </span>
              <button
                onClick={() => updateCartItem(item.product.id, item.quantity + 1)}
                disabled={item.quantity >= item.product.stock}
                className="p-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <span className="font-bold text-blue-600">
              ₱{item.total.toFixed(2)}
            </span>
          </div>

          {item.quantity >= item.product.stock && (
            <p className="text-xs text-red-600 mt-1">
              Maximum stock reached ({item.product.stock} available)
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default Cart;