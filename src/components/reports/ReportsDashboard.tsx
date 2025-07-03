import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useBusinessStore } from '../../store/businessStore';
import FinancialStatements from './FinancialStatements';
import SalesReports from './SalesReports';
import TaxReports from './TaxReports';
import CustomReportBuilder from './CustomReportBuilder';

interface ReportData {
  salesData: any[];
  inventoryData: any[];
  financialData: any[];
  taxData: any[];
  topProducts: any[];
  customerData: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportsDashboard: React.FC = () => {
  const { sales, products, customers, journalEntries, accounts } = useBusinessStore();
  const [selectedReport, setSelectedReport] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<string>('month');

  // Generate sales data for charts
  const generateSalesData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Calculate sales for this month
      const monthSales = sales.filter(sale => {
        if (!sale.date) return false;
        const saleDate = new Date(sale.date);
        return saleDate.getMonth() === date.getMonth() && 
               saleDate.getFullYear() === date.getFullYear();
      });
      
      const totalSales = monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const totalItems = monthSales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
      
      data.push({
        month: monthName,
        sales: totalSales,
        items: totalItems,
        transactions: monthSales.length
      });
    }
    
    return data;
  };

  // Generate inventory data
  const generateInventoryData = () => {
    return products.map(product => ({
      name: product.name || 'Unknown Product',
      stock: product.stock || 0,
      value: (product.stock || 0) * (product.price || 0),
      category: product.category || 'Uncategorized'
    }));
  };

  // Generate financial data
  const generateFinancialData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Calculate journal entries for this month
      const monthEntries = journalEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === date.getMonth() && 
               entryDate.getFullYear() === date.getFullYear();
      });
      
      // Calculate revenue and expenses from journal entry lines
      let revenue = 0;
      let expenses = 0;
      
      monthEntries.forEach(entry => {
        entry.lines.forEach(line => {
          // Find the account by ID to get the account name
          const account = accounts.find(acc => acc.id === line.accountId);
          if (account) {
            if (account.name.includes('Revenue')) {
              revenue += line.credit || 0;
            }
            if (account.name.includes('Expense')) {
              expenses += line.debit || 0;
            }
          }
        });
      });
      
      data.push({
        month: monthName,
        revenue,
        expenses,
        profit: revenue - expenses
      });
    }
    
    return data;
  };

  // Generate top products data
  const generateTopProducts = () => {
    const productSales = new Map<string, number>();
    
    sales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (item && item.name) {
            const current = productSales.get(item.name) || 0;
            productSales.set(item.name, current + (item.quantity || 0));
          }
        });
      }
    });
    
    return Array.from(productSales.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  // Generate customer data
  const generateCustomerData = () => {
    const customerSales = new Map<string, number>();
    
    sales.forEach(sale => {
      if (sale.customerName && sale.total) {
        const current = customerSales.get(sale.customerName) || 0;
        customerSales.set(sale.customerName, current + sale.total);
      }
    });
    
    return Array.from(customerSales.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const salesData = generateSalesData();
  const inventoryData = generateInventoryData();
  const financialData = generateFinancialData();
  const topProducts = generateTopProducts();
  const customerData = generateCustomerData();

  // Add error handling for empty data
  if (!sales.length && !products.length && !journalEntries.length) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Start by adding sales, products, and journal entries to generate reports.</p>
        </div>
      </div>
    );
  }

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderSalesReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Monthly Sales Trend</h3>
          <div className="mobile-chart-container h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Sales vs Transactions</h3>
          <div className="mobile-chart-container h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" />
                <Bar dataKey="transactions" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Products</h3>
          <PieChart width={300} height={200}>
            <Pie
              data={topProducts}
              cx={150}
              cy={100}
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="quantity"
            >
              {topProducts.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Sales Summary</h3>
          <button
            onClick={() => exportToCSV(salesData, 'sales-report')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-right">Sales (₱)</th>
                <th className="px-4 py-2 text-right">Items Sold</th>
                <th className="px-4 py-2 text-right">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-2">{row.month}</td>
                  <td className="px-4 py-2 text-right">₱{row.sales.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.items}</td>
                  <td className="px-4 py-2 text-right">{row.transactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInventoryReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Stock Levels</h3>
          <BarChart width={400} height={300} data={inventoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="stock" fill="#8884d8" />
          </BarChart>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Inventory Value</h3>
          <BarChart width={400} height={300} data={inventoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#82ca9d" />
          </BarChart>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Inventory Summary</h3>
          <button
            onClick={() => exportToCSV(inventoryData, 'inventory-report')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Stock</th>
                <th className="px-4 py-2 text-right">Value (₱)</th>
              </tr>
            </thead>
            <tbody>
              {inventoryData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2">{row.category}</td>
                  <td className="px-4 py-2 text-right">{row.stock}</td>
                  <td className="px-4 py-2 text-right">₱{row.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderFinancialReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Revenue vs Expenses</h3>
          <BarChart width={400} height={300} data={financialData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#82ca9d" />
            <Bar dataKey="expenses" fill="#ff8042" />
          </BarChart>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Profit Trend</h3>
          <LineChart width={400} height={300} data={financialData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="profit" stroke="#8884d8" />
          </LineChart>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Financial Summary</h3>
          <button
            onClick={() => exportToCSV(financialData, 'financial-report')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-right">Revenue (₱)</th>
                <th className="px-4 py-2 text-right">Expenses (₱)</th>
                <th className="px-4 py-2 text-right">Profit (₱)</th>
              </tr>
            </thead>
            <tbody>
              {financialData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-2">{row.month}</td>
                  <td className="px-4 py-2 text-right">₱{row.revenue.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">₱{row.expenses.toLocaleString()}</td>
                  <td className={`px-4 py-2 text-right ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₱{row.profit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCustomerReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Customers</h3>
          <BarChart width={400} height={300} data={customerData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#8884d8" />
          </BarChart>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Customer Distribution</h3>
          <PieChart width={400} height={300}>
            <Pie
              data={customerData}
              cx={200}
              cy={150}
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="total"
            >
              {customerData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Customer Summary</h3>
          <button
            onClick={() => exportToCSV(customerData, 'customer-report')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-right">Total Purchases (₱)</th>
              </tr>
            </thead>
            <tbody>
              {customerData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2 text-right">₱{row.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedReport('overview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedReport === 'overview'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedReport('financial')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedReport === 'financial'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Financial Statements
          </button>
          <button
            onClick={() => setSelectedReport('sales')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedReport === 'sales'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sales Reports
          </button>
          <button
            onClick={() => setSelectedReport('tax')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedReport === 'tax'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tax Reports
          </button>
          <button
            onClick={() => setSelectedReport('custom')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedReport === 'custom'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom Reports
          </button>
        </div>
      </div>



      {/* Date Range Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4">
          <label className="font-medium text-gray-700">Date Range:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-gray-50 rounded-lg p-6">
        {selectedReport === 'overview' && (
          <div className="space-y-6">
            {renderSalesReport()}
            {renderInventoryReport()}
            {renderFinancialReport()}
            {renderCustomerReport()}
          </div>
        )}
        {selectedReport === 'financial' && <FinancialStatements />}
        {selectedReport === 'sales' && <SalesReports />}
        {selectedReport === 'tax' && <TaxReports />}
        {selectedReport === 'custom' && <CustomReportBuilder />}
      </div>
    </div>
  );
};

export default ReportsDashboard; 