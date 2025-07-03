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
    <div className="bg-white dark:bg-dark-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-dark-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Sales</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sales performance for this week</p>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-gray-400" />
          <select className="text-sm border border-gray-300 dark:border-dark-600 rounded-lg px-3 py-1 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100">
            <option>This Week</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      {/* Mobile-Responsive Bar Chart */}
      <div className="mobile-chart-container">
        <div className="flex items-end justify-between h-32 sm:h-48 mb-4 min-w-full">
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1 mx-0.5 sm:mx-1">
              <div 
                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500 rounded-t-md relative group cursor-pointer hover:from-blue-600 hover:to-blue-500 dark:hover:from-blue-700 dark:hover:to-blue-600 transition-colors"
                style={{ height: `${(item.sales / maxSales) * 100}%` }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-700 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  ₱{item.sales.toLocaleString()}
                </div>
              </div>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">{item.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile-Responsive Summary */}
      <div className="mobile-stats-grid pt-4 border-t border-gray-200 dark:border-dark-700">
        <div className="text-center">
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">₱12,900</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
        </div>
        <div className="text-center">
          <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">+18.2%</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">vs Last Week</p>
        </div>
        <div className="text-center sm:col-span-2 sm:col-start-1 sm:col-end-3">
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">₱1,843</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Daily Average</p>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;