import React from 'react';
import { Package, TrendingUp } from 'lucide-react';

const TopProducts: React.FC = () => {
  const products = [
    { name: 'San Miguel Beer 330ml', sales: 156, revenue: 18720, trend: '+12%' },
    { name: 'Lucky Me Instant Noodles', sales: 89, revenue: 4450, trend: '+8%' },
    { name: 'Coca-Cola 355ml', sales: 134, revenue: 6700, trend: '+15%' },
    { name: 'Pantene Shampoo 170ml', sales: 45, revenue: 6750, trend: '+5%' },
    { name: 'Bear Brand Milk 300ml', sales: 67, revenue: 2010, trend: '-2%' }
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Package className="h-5 w-5 mr-2 text-gray-400" />
          Top Products
        </h2>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {products.map((product, index) => (
          <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  #{index + 1}
                </div>
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-medium text-gray-900 truncate">{product.name}</p>
                <p className="text-sm text-gray-500">{product.sales} units sold</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                ₱{product.revenue.toLocaleString()}
              </p>
              <div className="flex items-center mt-1">
                <TrendingUp className={`h-3 w-3 mr-1 ${
                  product.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'
                }`} />
                <span className={`text-xs font-medium ${
                  product.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {product.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Total Products Sold</span>
          <span className="font-semibold text-gray-900">491 units</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-500">Total Revenue</span>
          <span className="font-semibold text-green-600">₱38,630</span>
        </div>
      </div>
    </div>
  );
};

export default TopProducts;