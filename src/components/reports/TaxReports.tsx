import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { useBusinessStore } from '../../store/businessStore';

const TaxReports: React.FC = () => {
  const { sales, journalEntries, accounts } = useBusinessStore();
  const [reportType, setReportType] = useState<string>('vat');
  const [period, setPeriod] = useState<string>('current');

  // Calculate VAT Report
  const generateVATReport = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Filter sales for current month
    const monthSales = sales.filter(sale => {
      if (!sale.date) return false;
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && 
             saleDate.getFullYear() === currentYear;
    });

    // Calculate VAT Output (12% of sales)
    const totalSales = monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const vatOutput = totalSales * 0.12;
    
    // Calculate VAT Input from purchases (simplified)
    const vatInput = 0; // Would need purchase data
    
    const vatPayable = vatOutput - vatInput;

    return {
      totalSales,
      vatOutput,
      vatInput,
      vatPayable,
      period: `${currentMonth + 1}/${currentYear}`
    };
  };

  // Calculate Withholding Tax Report
  const generateWithholdingTaxReport = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Filter journal entries for current month
    const monthEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === currentMonth && 
             entryDate.getFullYear() === currentYear;
    });

    // Calculate withholding tax (simplified)
    const totalExpenses = monthEntries.reduce((total, entry) => {
      return total + entry.lines.reduce((sum, line) => {
        const account = accounts.find(acc => acc.id === line.accountId);
        if (account && account.name.includes('Expense')) {
          return sum + (line.debit || 0);
        }
        return sum;
      }, 0);
    }, 0);

    // Assume 2% withholding tax on expenses
    const withholdingTax = totalExpenses * 0.02;

    return {
      totalExpenses,
      withholdingTax,
      period: `${currentMonth + 1}/${currentYear}`
    };
  };

  // Generate monthly VAT data for charts
  const generateMonthlyVATData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthSales = sales.filter(sale => {
        if (!sale.date) return false;
        const saleDate = new Date(sale.date);
        return saleDate.getMonth() === date.getMonth() && 
               saleDate.getFullYear() === date.getFullYear();
      });
      
      const totalSales = monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const vatOutput = totalSales * 0.12;
      
      data.push({
        month: monthName,
        sales: totalSales,
        vatOutput: vatOutput,
        vatInput: 0, // Simplified
        vatPayable: vatOutput
      });
    }
    
    return data;
  };

  // Generate BIR Form 2550M data
  const generateBIR2550MData = () => {
    const vatData = generateVATReport();
    
    return {
      // Part I - Summary of Sales
      totalSales: vatData.totalSales,
      zeroRatedSales: 0,
      exemptSales: 0,
      totalTaxableSales: vatData.totalSales,
      
      // Part II - Summary of Purchases
      totalPurchases: 0,
      zeroRatedPurchases: 0,
      exemptPurchases: 0,
      totalTaxablePurchases: 0,
      
      // Part III - Computation of VAT
      vatOutput: vatData.vatOutput,
      vatInput: vatData.vatInput,
      vatPayable: vatData.vatPayable,
      
      // Part IV - Schedule of Sales
      scheduleOfSales: sales.slice(0, 10).map(sale => ({
        date: sale.date,
        invoiceNumber: sale.id,
        customerName: sale.customerName || 'Walk-in Customer',
        amount: sale.total,
        vat: sale.total * 0.12
      }))
    };
  };

  // Generate BIR Form 2307 data
  const generateBIR2307Data = () => {
    const whtData = generateWithholdingTaxReport();
    
    return {
      // Part I - Payee Information
      payeeName: 'Your Business Name',
      payeeTin: '123-456-789-000',
      payeeAddress: 'Business Address',
      
      // Part II - Payer Information
      payerName: 'Various Suppliers',
      payerTin: '000-000-000-000',
      payerAddress: 'Various Addresses',
      
      // Part III - Certificate Details
      certificateNumber: 'CERT-2024-001',
      dateIssued: new Date().toISOString().split('T')[0],
      periodCovered: whtData.period,
      
      // Part IV - Income Payment
      totalIncomePayment: whtData.totalExpenses,
      withholdingTaxRate: '2%',
      withholdingTaxAmount: whtData.withholdingTax
    };
  };

  const vatData = generateVATReport();
  const whtData = generateWithholdingTaxReport();
  const monthlyVATData = generateMonthlyVATData();
  const bir2550MData = generateBIR2550MData();
  const bir2307Data = generateBIR2307Data();

  const exportToCSV = (data: any, filename: string) => {
    const csvContent = Object.entries(data)
      .filter(([key, value]) => typeof value !== 'object')
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

  const renderVATReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">VAT Report (BIR Form 2550M)</h3>
          <button
            onClick={() => exportToCSV(vatData, 'vat-report')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-4">Sales Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Sales</span>
                <span className="font-medium">₱{vatData.totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT Output (12%)</span>
                <span className="font-medium">₱{vatData.vatOutput.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">VAT Computation</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>VAT Input</span>
                <span className="font-medium">₱{vatData.vatInput.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>VAT Payable</span>
                  <span className={vatData.vatPayable >= 0 ? 'text-red-600' : 'text-green-600'}>
                    ₱{vatData.vatPayable.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* VAT Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Monthly VAT Trend</h3>
        <LineChart width={800} height={300} data={monthlyVATData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="vatOutput" stroke="#8884d8" name="VAT Output" />
          <Line type="monotone" dataKey="vatPayable" stroke="#82ca9d" name="VAT Payable" />
        </LineChart>
      </div>
    </div>
  );

  const renderWithholdingTaxReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Withholding Tax Report (BIR Form 2307)</h3>
          <button
            onClick={() => exportToCSV(whtData, 'withholding-tax-report')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-4">Expense Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Expenses</span>
                <span className="font-medium">₱{whtData.totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Withholding Tax</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Tax Rate</span>
                <span className="font-medium">2%</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Withholding Tax Amount</span>
                  <span className="text-red-600">₱{whtData.withholdingTax.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBIRForms = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-6">BIR Form Templates</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">BIR Form 2550M - Monthly VAT Declaration</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Taxable Sales:</span>
                <span>₱{bir2550MData.totalTaxableSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT Output:</span>
                <span>₱{bir2550MData.vatOutput.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT Input:</span>
                <span>₱{bir2550MData.vatInput.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>VAT Payable:</span>
                <span>₱{bir2550MData.vatPayable.toLocaleString()}</span>
              </div>
            </div>
            <button className="mt-3 w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Generate Form 2550M
            </button>
          </div>
          
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">BIR Form 2307 - Certificate of Creditable Tax</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Income Payment:</span>
                <span>₱{bir2307Data.totalIncomePayment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Withholding Tax Rate:</span>
                <span>{bir2307Data.withholdingTaxRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Withholding Tax Amount:</span>
                <span>₱{bir2307Data.withholdingTaxAmount.toLocaleString()}</span>
              </div>
            </div>
            <button className="mt-3 w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Generate Form 2307
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tax Reports</h1>
        <p className="text-gray-600">BIR-compliant tax reporting and compliance</p>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setReportType('vat')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'vat'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            VAT Report
          </button>
          <button
            onClick={() => setReportType('wht')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'wht'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Withholding Tax
          </button>
          <button
            onClick={() => setReportType('bir')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'bir'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            BIR Forms
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
            <option value="current">Current Month</option>
            <option value="previous">Previous Month</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-gray-50 rounded-lg p-6">
        {reportType === 'vat' && renderVATReport()}
        {reportType === 'wht' && renderWithholdingTaxReport()}
        {reportType === 'bir' && renderBIRForms()}
      </div>
    </div>
  );
};

export default TaxReports; 