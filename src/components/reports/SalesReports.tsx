import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useBusinessStore } from '../../store/businessStore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const SalesReports: React.FC = () => {
  const { sales, products, customers } = useBusinessStore();
  const [reportType, setReportType] = useState<string>('daily');
  const [dateRange, setDateRange] = useState<string>('current');

  // Generate daily sales data
  const generateDailySales = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const daySales = sales.filter(sale => {
        if (!sale.date) return false;
        const saleDate = new Date(sale.date);
        return saleDate.toDateString() === date.toDateString();
      });
      
      const totalSales = daySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const totalItems = daySales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
      const avgTicket = daySales.length > 0 ? totalSales / daySales.length : 0;
      
      data.push({
        date: dateStr,
        sales: totalSales,
        items: totalItems,
        transactions: daySales.length,
        avgTicket: avgTicket
      });
    }
    
    return data;
  };

  // Generate weekly sales data
  const generateWeeklySales = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      const weekSales = sales.filter(sale => {
        if (!sale.date) return false;
        const saleDate = new Date(sale.date);
        return saleDate >= weekStart && saleDate <= weekEnd;
      });
      
      const totalSales = weekSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const totalItems = weekSales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
      const avgTicket = weekSales.length > 0 ? totalSales / weekSales.length : 0;
      
      data.push({
        week: weekLabel,
        sales: totalSales,
        items: totalItems,
        transactions: weekSales.length,
        avgTicket: avgTicket
      });
    }
    
    return data;
  };

  // Generate monthly sales data
  const generateMonthlySales = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthSales = sales.filter(sale => {
        if (!sale.date) return false;
        const saleDate = new Date(sale.date);
        return saleDate.getMonth() === date.getMonth() && 
               saleDate.getFullYear() === date.getFullYear();
      });
      
      const totalSales = monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const totalItems = monthSales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
      const avgTicket = monthSales.length > 0 ? totalSales / monthSales.length : 0;
      
      data.push({
        month: monthName,
        sales: totalSales,
        items: totalItems,
        transactions: monthSales.length,
        avgTicket: avgTicket
      });
    }
    
    return data;
  };

  // Generate annual sales data
  const generateAnnualSales = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      
      const yearSales = sales.filter(sale => {
        if (!sale.date) return false;
        const saleDate = new Date(sale.date);
        return saleDate.getFullYear() === year;
      });
      
      const totalSales = yearSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const totalItems = yearSales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
      const avgTicket = yearSales.length > 0 ? totalSales / yearSales.length : 0;
      
      data.push({
        year: year.toString(),
        sales: totalSales,
        items: totalItems,
        transactions: yearSales.length,
        avgTicket: avgTicket
      });
    }
    
    return data;
  };

  // Generate sales by product category
  const generateSalesByCategory = () => {
    const categorySales = new Map<string, number>();
    
    sales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const product = products.find(p => p.id === item.productId);
          if (product && product.category) {
            const current = categorySales.get(product.category) || 0;
            categorySales.set(product.category, current + (item.total || 0));
          }
        });
      }
    });
    
    return Array.from(categorySales.entries())
      .map(([category, sales]) => ({ category, sales }))
      .sort((a, b) => b.sales - a.sales);
  };

  // Generate sales by payment method
  const generateSalesByPaymentMethod = () => {
    const paymentSales = new Map<string, number>();
    
    sales.forEach(sale => {
      const method = sale.paymentMethod || 'Unknown';
      const current = paymentSales.get(method) || 0;
      paymentSales.set(method, current + (sale.total || 0));
    });
    
    return Array.from(paymentSales.entries())
      .map(([method, sales]) => ({ method, sales }))
      .sort((a, b) => b.sales - a.sales);
  };

  const dailyData = generateDailySales();
  const weeklyData = generateWeeklySales();
  const monthlyData = generateMonthlySales();
  const annualData = generateAnnualSales();
  const categoryData = generateSalesByCategory();
  const paymentData = generateSalesByPaymentMethod();

  const getCurrentData = () => {
    switch (reportType) {
      case 'daily': return dailyData;
      case 'weekly': return weeklyData;
      case 'monthly': return monthlyData;
      case 'annual': return annualData;
      default: return dailyData;
    }
  };

  const getDataKey = () => {
    switch (reportType) {
      case 'daily': return 'date';
      case 'weekly': return 'week';
      case 'monthly': return 'month';
      case 'annual': return 'year';
      default: return 'date';
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }
    
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

  const currentData = getCurrentData();
  const dataKey = getDataKey();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Reports</h1>
        <p className="text-gray-600">Detailed sales analysis and performance metrics</p>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setReportType('daily')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'daily'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setReportType('weekly')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'weekly'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'monthly'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setReportType('annual')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'annual'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Annual
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Sales Trend</h3>
          <LineChart width={400} height={300} data={currentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#8884d8" />
          </LineChart>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Transactions vs Sales</h3>
          <BarChart width={400} height={300} data={currentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="sales" fill="#8884d8" />
            <Bar dataKey="transactions" fill="#82ca9d" />
          </BarChart>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Sales by Category</h3>
          <PieChart width={400} height={300}>
            <Pie
              data={categoryData}
              cx={200}
              cy={150}
              labelLine={false}
              label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="sales"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Sales by Payment Method</h3>
          <PieChart width={400} height={300}>
            <Pie
              data={paymentData}
              cx={200}
              cy={150}
              labelLine={false}
              label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="sales"
            >
              {paymentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Detailed Sales Report</h3>
          <button
            onClick={() => exportToCSV(currentData, `${reportType}-sales-report`)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">{reportType.charAt(0).toUpperCase() + reportType.slice(1)}</th>
                <th className="px-4 py-2 text-right">Sales (₱)</th>
                <th className="px-4 py-2 text-right">Items Sold</th>
                <th className="px-4 py-2 text-right">Transactions</th>
                <th className="px-4 py-2 text-right">Avg Ticket (₱)</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-2">{row[dataKey]}</td>
                  <td className="px-4 py-2 text-right">₱{row.sales.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.items}</td>
                  <td className="px-4 py-2 text-right">{row.transactions}</td>
                  <td className="px-4 py-2 text-right">₱{row.avgTicket.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesReports; 