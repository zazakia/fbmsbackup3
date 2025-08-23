import React, { useState, memo } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { BIRPDFGenerator, BIRFormData } from '../../utils/pdfGenerator';
import { formatCurrency } from '../../utils/formatters';
import { useSecurity } from '../../hooks/useSecurity';
import { FileDown, Loader2 } from 'lucide-react';

interface LocalBIRFormData {
  formType: string;
  period: string;
  businessName: string;
  tin: string;
  address: string;
  contactNumber: string;
  email: string;
  data: any[];
}

const BIRForms: React.FC = () => {
  const { sales, journalEntries, products, customers } = useBusinessStore();
  const { rateLimits } = useSecurity();
  const [selectedForm, setSelectedForm] = useState<string>('vat');
  const [formPeriod, setFormPeriod] = useState<string>('monthly');
  const [reportingPeriod, setReportingPeriod] = useState<string>('current');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // Business information (should come from settings/store)
  const businessInfo = {
    name: 'Sample Business Enterprise',
    tin: '123-456-789-000',
    address: '123 Business Street, Makati City, Metro Manila',
    contactNumber: '+63 912 345 6789',
    email: 'business@sample.com',
    businessType: 'Sole Proprietorship',
    registrationDate: '2024-01-01'
  };

  // Generate VAT data (BIR Form 2550M/Q)
  const generateVATData = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter sales for current period
    const periodSales = (sales || []).filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && 
             saleDate.getFullYear() === currentYear;
    });

    const totalSales = periodSales.reduce((sum, sale) => sum + sale.total, 0);
    const vatOutput = totalSales * 0.12; // 12% VAT
    
    // Calculate VAT input from purchases (simplified)
    const vatInput = totalSales * 0.08; // Estimated VAT input
    
    return {
      grossSales: totalSales || 0,
      vatOutput: vatOutput || 0,
      vatInput: vatInput || 0,
      vatPayable: (vatOutput || 0) - (vatInput || 0),
      zeroRatedSales: 0,
      exemptSales: 0,
      totalSales: totalSales || 0
    };
  };

  // Generate Withholding Tax data (BIR Form 2307)
  const generateWithholdingTaxData = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter journal entries for withholding tax
    const periodEntries = (journalEntries || []).filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === currentMonth && 
             entryDate.getFullYear() === currentYear &&
             entry.account.includes('Withholding');
    });

    const totalPayments = periodEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    return {
      totalPayments: totalPayments || 0,
      withholdingTax: (totalPayments || 0) * 0.02, // 2% rate
      entries: periodEntries
    };
  };

  // Generate Income Tax data (BIR Form 1701Q)
  const generateIncomeTaxData = () => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();
    
    // Calculate quarterly income
    const quarterStartMonth = (currentQuarter - 1) * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    
    const quarterEntries = (journalEntries || []).filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() >= quarterStartMonth &&
             entryDate.getMonth() <= quarterEndMonth &&
             entryDate.getFullYear() === currentYear;
    });

    const revenue = quarterEntries
      .filter(entry => entry.account.includes('Revenue'))
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    const expenses = quarterEntries
      .filter(entry => entry.account.includes('Expense'))
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);

    const netIncome = (revenue || 0) - (expenses || 0);
    const estimatedTax = Math.max(0, netIncome * 0.25); // 25% corporate tax rate

    return {
      quarter: currentQuarter,
      grossIncome: revenue || 0,
      deductions: expenses || 0,
      netIncome: netIncome || 0,
      estimatedTax: estimatedTax || 0,
      previousQuarterTax: 0,
      taxDue: estimatedTax || 0
    };
  };

  // Generate Alphalist data (BIR Form 1604CF)
  const generateAlphalistData = () => {
    // This would typically come from payroll data
    return [
      {
        tin: '123-456-789-001',
        lastName: 'Santos',
        firstName: 'Juan',
        middleName: 'Dela Cruz',
        grossCompensation: 25000 || 0,
        nonTaxableCompensation: 0,
        taxableCompensation: 25000 || 0,
        withholdingTax: 2500 || 0
      },
      {
        tin: '123-456-789-002',
        lastName: 'Garcia',
        firstName: 'Maria',
        middleName: 'Santos',
        grossCompensation: 30000 || 0,
        nonTaxableCompensation: 0,
        taxableCompensation: 30000 || 0,
        withholdingTax: 3000 || 0
      }
    ];
  };

  const vatData = generateVATData();
  const withholdingTaxData = generateWithholdingTaxData();
  const incomeTaxData = generateIncomeTaxData();
  const alphalistData = generateAlphalistData();

  const exportToPDF = async (formType: string, data: any) => {
    setIsGeneratingPDF(true);
    try {
      // Check PDF generation rate limit
      rateLimits.pdf.enforceLimit();
      const currentDate = new Date();
      const formData: BIRFormData = {
        businessName: businessInfo.name,
        businessAddress: businessInfo.address,
        tin: businessInfo.tin,
        rdoCode: '001', // Should come from business settings
        taxPeriod: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      };

      let pdfBlob: Blob;
      let filename: string;

      switch (formType.toLowerCase()) {
        case 'vat':
          formData.grossSales = data.grossSales;
          formData.exemptSales = data.exemptSales;
          formData.zeroRatedSales = data.zeroRatedSales;
          formData.taxableSales = data.totalSales;
          formData.outputTax = data.vatOutput;
          formData.inputTax = data.vatInput;
          formData.netVAT = data.vatPayable;
          
          pdfBlob = await BIRPDFGenerator.generateForm2550M(formData);
          filename = `BIR-2550M-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}.pdf`;
          break;

        case 'withholding tax':
          formData.payeeName = 'Sample Payee'; // Should come from actual data
          formData.payeeAddress = 'Sample Address';
          formData.payeeTIN = '123-456-789-001';
          formData.incomePayment = data.totalPayments;
          formData.taxWithheld = data.withholdingTax;
          
          pdfBlob = await BIRPDFGenerator.generateForm2307(formData);
          filename = `BIR-2307-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}.pdf`;
          break;

        case 'income tax':
          formData.grossIncome = data.grossIncome;
          formData.deductions = data.deductions;
          formData.netIncome = data.netIncome;
          formData.incomeTax = data.estimatedTax;
          formData.creditsPayments = data.previousQuarterTax;
          formData.taxDue = data.taxDue;
          
          pdfBlob = await BIRPDFGenerator.generateForm1701Q(formData);
          filename = `BIR-1701Q-${currentDate.getFullYear()}-Q${Math.floor(currentDate.getMonth() / 3) + 1}.pdf`;
          break;

        default:
          throw new Error('Unsupported form type');
      }

      BIRPDFGenerator.downloadPDF(pdfBlob, filename);
      
      // Show success message
      alert(`${formType} form exported successfully!`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderVATForm = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">BIR Form 2550M - Monthly VAT Declaration</h3>
          <button
            onClick={() => exportToPDF('VAT', vatData)}
            disabled={isGeneratingPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold mb-2">Business Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Business Name:</span> {businessInfo.name}</p>
              <p><span className="font-medium">TIN:</span> {businessInfo.tin}</p>
              <p><span className="font-medium">Address:</span> {businessInfo.address}</p>
              <p><span className="font-medium">Contact:</span> {businessInfo.contactNumber}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Reporting Period</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Period:</span> {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              <p><span className="font-medium">Due Date:</span> 20th of following month</p>
              <p><span className="font-medium">Form Type:</span> Monthly VAT Declaration</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Amount (₱)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Gross Sales/Receipts</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(vatData.grossSales)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Zero-Rated Sales</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(vatData.zeroRatedSales)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Exempt Sales</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(vatData.exemptSales)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-semibold">Total Sales</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-semibold">{formatCurrency(vatData.totalSales)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Output VAT (12%)</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(vatData.vatOutput)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Input VAT</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(vatData.vatInput)}</td>
              </tr>
              <tr className="bg-red-50">
                <td className="border border-gray-300 px-4 py-2 font-semibold text-red-700">VAT Payable</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-semibold text-red-700">{formatCurrency(vatData.vatPayable)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWithholdingTaxForm = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">BIR Form 2307 - Certificate of Creditable Tax</h3>
          <button
            onClick={() => exportToPDF('Withholding Tax', withholdingTaxData)}
            disabled={isGeneratingPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold mb-2">Withholding Agent Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {businessInfo.name}</p>
              <p><span className="font-medium">TIN:</span> {businessInfo.tin}</p>
              <p><span className="font-medium">Address:</span> {businessInfo.address}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Certificate Details</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Certificate No:</span> 2307-{Date.now()}</p>
              <p><span className="font-medium">Date:</span> {new Date().toLocaleDateString()}</p>
              <p><span className="font-medium">Period:</span> {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Amount (₱)</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Rate (%)</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Tax Withheld (₱)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Professional Services</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(withholdingTaxData.totalPayments)}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">2%</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(withholdingTaxData.withholdingTax)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-semibold">Total</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-semibold">{formatCurrency(withholdingTaxData.totalPayments)}</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-semibold">-</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-semibold">{formatCurrency(withholdingTaxData.withholdingTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderIncomeTaxForm = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">BIR Form 1701Q - Quarterly Income Tax Return</h3>
          <button
            onClick={() => exportToPDF('Income Tax', incomeTaxData)}
            disabled={isGeneratingPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold mb-2">Taxpayer Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {businessInfo.name}</p>
              <p><span className="font-medium">TIN:</span> {businessInfo.tin}</p>
              <p><span className="font-medium">Business Type:</span> {businessInfo.businessType}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Return Period</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Quarter:</span> {incomeTaxData.quarter}</p>
              <p><span className="font-medium">Year:</span> {new Date().getFullYear()}</p>
              <p><span className="font-medium">Due Date:</span> 15th of following month</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Amount (₱)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Gross Income</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(incomeTaxData.grossIncome)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Less: Deductions</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(incomeTaxData.deductions)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-semibold">Net Income</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-semibold">{formatCurrency(incomeTaxData.netIncome)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Estimated Tax (25%)</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(incomeTaxData.estimatedTax)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Less: Previous Quarter Tax</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(incomeTaxData.previousQuarterTax)}</td>
              </tr>
              <tr className="bg-red-50">
                <td className="border border-gray-300 px-4 py-2 font-semibold text-red-700">Tax Due</td>
                <td className="border border-gray-300 px-4 py-2 text-right font-semibold text-red-700">{formatCurrency(incomeTaxData.taxDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAlphalistForm = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">BIR Form 1604CF - Alphalist of Employees</h3>
          <button
            onClick={() => exportToPDF('Alphalist', alphalistData)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Export PDF
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold mb-2">Employer Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Employer Name:</span> {businessInfo.name}</p>
              <p><span className="font-medium">TIN:</span> {businessInfo.tin}</p>
              <p><span className="font-medium">Address:</span> {businessInfo.address}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Report Details</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Year:</span> {new Date().getFullYear()}</p>
              <p><span className="font-medium">Total Employees:</span> {alphalistData.length}</p>
              <p><span className="font-medium">Due Date:</span> January 31st</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">TIN</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Last Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left">First Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Middle Name</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Gross Compensation</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Non-Taxable</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Taxable Compensation</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Tax Withheld</th>
              </tr>
            </thead>
            <tbody>
              {(alphalistData || []).map((employee, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{employee.tin}</td>
                  <td className="border border-gray-300 px-4 py-2">{employee.lastName}</td>
                  <td className="border border-gray-300 px-4 py-2">{employee.firstName}</td>
                  <td className="border border-gray-300 px-4 py-2">{employee.middleName}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(employee.grossCompensation)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(employee.nonTaxableCompensation)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(employee.taxableCompensation)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(employee.withholdingTax)}</td>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">BIR Forms & Tax Compliance</h1>
        <p className="text-gray-600">Philippine tax forms and compliance reporting</p>
      </div>

      {/* Form Type Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedForm('vat')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedForm === 'vat'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            VAT Return (2550M)
          </button>
          <button
            onClick={() => setSelectedForm('withholding')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedForm === 'withholding'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Withholding Tax (2307)
          </button>
          <button
            onClick={() => setSelectedForm('income')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedForm === 'income'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Income Tax (1701Q)
          </button>
          <button
            onClick={() => setSelectedForm('alphalist')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedForm === 'alphalist'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Alphalist (1604CF)
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-gray-50 rounded-lg p-6">
        {selectedForm === 'vat' && renderVATForm()}
        {selectedForm === 'withholding' && renderWithholdingTaxForm()}
        {selectedForm === 'income' && renderIncomeTaxForm()}
        {selectedForm === 'alphalist' && renderAlphalistForm()}
      </div>
    </div>
  );
};

export default memo(BIRForms);