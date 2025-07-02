import React from 'react';
import { BarChart3 } from 'lucide-react';

const SalesChart: React.FC = () => {
  // Mock data for the chart
  const data = [
    { day: 'Mon', sales: 1200 },
    { day: 'Tue', sales: 1900 },
    { day: 'Wed', sales: 800 },
    { day: 'Thu', sales: 1600 },
    { day: 'Fri', sales: 2200 },
    { day: 'Sat', sales: 2800 },
    { day: 'Sun', sales: 1400 }
  ];

  const maxSales = Math.max(...data.map(d => d.sales));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Weekly Sales</h2>
          <p className="text-sm text-gray-500">Sales performance for this week</p>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-gray-400" />
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
            <option>This Week</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="flex items-end justify-between h-48 mb-4">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1 mx-1">
            <div 
              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md relative group cursor-pointer hover:from-blue-600 hover:to-blue-500 transition-colors"
              style={{ height: `${(item.sales / maxSales) * 100}%` }}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                ₱{item.sales.toLocaleString()}
              </div>
            </div>
            <span className="text-sm text-gray-600 mt-2">{item.day}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">₱12,900</p>
          <p className="text-sm text-gray-500">Total Sales</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">+18.2%</p>
          <p className="text-sm text-gray-500">vs Last Week</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">₱1,843</p>
          <p className="text-sm text-gray-500">Daily Average</p>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;