import React, { useState } from 'react';
import { useBusinessStore } from '../../store/businessStore';

interface FinancialStatement {
  type: 'pl' | 'balance' | 'cashflow';
  period: string;
  data: any;
}

const FinancialStatements: React.FC = () => {
  const { journalEntries, accounts } = useBusinessStore();
  const [selectedStatement, setSelectedStatement] = useState<string>('pl');
  const [period, setPeriod] = useState<string>('current');

  // Calculate Profit & Loss Statement
  const generateProfitLoss = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Filter entries for current year
    const yearEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === currentYear;
    });

    // Calculate revenue
    const revenue = yearEntries.reduce((total, entry) => {
      return total + entry.lines.reduce((sum, line) => {
        const account = accounts.find(acc => acc.id === line.accountId);
        if (account && account.name.includes('Revenue')) {
          return sum + (line.credit || 0);
        }
        return sum;
      }, 0);
    }, 0);

    // Calculate expenses by category
    const expenses = yearEntries.reduce((total, entry) => {
      return total + entry.lines.reduce((sum, line) => {
        const account = accounts.find(acc => acc.id === line.accountId);
        if (account && account.name.includes('Expense')) {
          return sum + (line.debit || 0);
        }
        return sum;
      }, 0);
    }, 0);

    const grossProfit = revenue;
    const netIncome = grossProfit - expenses;

    return {
      revenue,
      expenses,
      grossProfit,
      netIncome,
      period: `${currentYear}`
    };
  };

  // Calculate Balance Sheet
  const generateBalanceSheet = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Filter entries for current year
    const yearEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === currentYear;
    });

    // Calculate assets
    const assets = yearEntries.reduce((total, entry) => {
      return total + entry.lines.reduce((sum, line) => {
        const account = accounts.find(acc => acc.id === line.accountId);
        if (account && account.type === 'Asset') {
          return sum + (line.debit || 0) - (line.credit || 0);
        }
        return sum;
      }, 0);
    }, 0);

    // Calculate liabilities
    const liabilities = yearEntries.reduce((total, entry) => {
      return total + entry.lines.reduce((sum, line) => {
        const account = accounts.find(acc => acc.id === line.accountId);
        if (account && account.type === 'Liability') {
          return sum + (line.credit || 0) - (line.debit || 0);
        }
        return sum;
      }, 0);
    }, 0);

    // Calculate equity
    const equity = yearEntries.reduce((total, entry) => {
      return total + entry.lines.reduce((sum, line) => {
        const account = accounts.find(acc => acc.id === line.accountId);
        if (account && account.type === 'Equity') {
          return sum + (line.credit || 0) - (line.debit || 0);
        }
        return sum;
      }, 0);
    }, 0);

    return {
      assets,
      liabilities,
      equity,
      totalLiabilitiesAndEquity: liabilities + equity,
      period: `${currentYear}`
    };
  };

  // Calculate Cash Flow Statement
  const generateCashFlow = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Filter entries for current year
    const yearEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === currentYear;
    });

    // Operating activities
    const operatingCash = yearEntries.reduce((total, entry) => {
      return total + entry.lines.reduce((sum, line) => {
        const account = accounts.find(acc => acc.id === line.accountId);
        if (account && (account.name.includes('Cash') || account.name.includes('Bank'))) {
          return sum + (line.debit || 0) - (line.credit || 0);
        }
        return sum;
      }, 0);
    }, 0);

    // Investing activities (simplified)
    const investingCash = 0; // Would need more detailed tracking

    // Financing activities (simplified)
    const financingCash = 0; // Would need more detailed tracking

    const netCashFlow = operatingCash + investingCash + financingCash;

    return {
      operatingCash,
      investingCash,
      financingCash,
      netCashFlow,
      period: `${currentYear}`
    };
  };

  const plData = generateProfitLoss();
  const balanceData = generateBalanceSheet();
  const cashFlowData = generateCashFlow();

  const exportToCSV = (data: any, filename: string) => {
    const csvContent = Object.entries(data)
      .map(([key, value]) => `${key},${value}`)
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderProfitLoss = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Profit & Loss Statement</h3>
          <button
            onClick={() => exportToCSV(plData, 'profit-loss-statement')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-4">Income</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Revenue</span>
                <span className="font-medium">₱{plData.revenue.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Gross Profit</span>
                  <span>₱{plData.grossProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Expenses</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Expenses</span>
                <span className="font-medium">₱{plData.expenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t mt-6 pt-6">
          <div className="flex justify-between text-lg font-bold">
            <span>Net Income</span>
            <span className={plData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
              ₱{plData.netIncome.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Balance Sheet</h3>
          <button
            onClick={() => exportToCSV(balanceData, 'balance-sheet')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-4">Assets</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Assets</span>
                <span className="font-medium">₱{balanceData.assets.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Liabilities & Equity</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Liabilities</span>
                <span className="font-medium">₱{balanceData.liabilities.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Equity</span>
                <span className="font-medium">₱{balanceData.equity.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Liabilities & Equity</span>
                  <span>₱{balanceData.totalLiabilitiesAndEquity.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCashFlow = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Cash Flow Statement</h3>
          <button
            onClick={() => exportToCSV(cashFlowData, 'cash-flow-statement')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Operating Activities</h4>
            <div className="flex justify-between">
              <span>Net Cash from Operations</span>
              <span className="font-medium">₱{cashFlowData.operatingCash.toLocaleString()}</span>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Investing Activities</h4>
            <div className="flex justify-between">
              <span>Net Cash from Investing</span>
              <span className="font-medium">₱{cashFlowData.investingCash.toLocaleString()}</span>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Financing Activities</h4>
            <div className="flex justify-between">
              <span>Net Cash from Financing</span>
              <span className="font-medium">₱{cashFlowData.financingCash.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Net Cash Flow</span>
              <span className={cashFlowData.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                ₱{cashFlowData.netCashFlow.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Statements</h1>
        <p className="text-gray-600">Comprehensive financial reporting and analysis</p>
      </div>

      {/* Statement Type Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatement('pl')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedStatement === 'pl'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setSelectedStatement('balance')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedStatement === 'balance'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setSelectedStatement('cashflow')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedStatement === 'cashflow'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cash Flow
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4">
          <label className="font-medium text-gray-700">Period:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="current">Current Year</option>
            <option value="previous">Previous Year</option>
            <option value="quarterly">Quarterly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Statement Content */}
      <div className="bg-gray-50 rounded-lg p-6">
        {selectedStatement === 'pl' && renderProfitLoss()}
        {selectedStatement === 'balance' && renderBalanceSheet()}
        {selectedStatement === 'cashflow' && renderCashFlow()}
      </div>
    </div>
  );
};

export default FinancialStatements; 