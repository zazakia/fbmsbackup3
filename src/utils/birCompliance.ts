import { Sale, JournalEntry, Employee } from '../types/business';

// BIR Receipt Interface
export interface BIRReceipt {
  orNumber: string;
  tin: string;
  businessName: string;
  businessAddress: string;
  date: Date;
  items: BIRReceiptItem[];
  vatableAmount: number;
  vatAmount: number;
  totalAmount: number;
  customerName?: string;
  customerTIN?: string;
  cashier?: string;
  paymentMethod?: string;
  exemptAmount?: number;
  zeroRatedAmount?: number;
}

export interface BIRReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// VAT Calculation Result
export interface VATCalculation {
  vatableAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatRate: number;
  exemptAmount?: number;
  zeroRatedAmount?: number;
}

// VAT Calculation Options
export interface VATOptions {
  inclusive?: boolean;
  exempt?: boolean;
  zeroRated?: boolean;
  rate?: number;
}

// Withholding Tax Result
export interface WithholdingTaxResult {
  rate: number;
  amount: number;
  netAmount: number;
  type: string;
}

// BIR Report Types
export interface BIRReport {
  reportType: string;
  period: ReportPeriod;
  totalSales: number;
  totalVAT: number;
  totalRevenue?: number;
  totalExpenses?: number;
  taxableIncome?: number;
  incomeTax?: number;
  exemptSales?: number;
  zeroRatedSales?: number;
  generatedAt: Date;
}

export interface ReportPeriod {
  month?: number;
  quarter?: number;
  year: number;
}

// BIR Receipt Validation Result
export interface BIRReceiptValidation {
  isValid: boolean;
  errors: string[];
}

// BIR Form 2550M Data
export interface BIRForm2550MData {
  businessName: string;
  businessAddress: string;
  tin: string;
  rdoCode: string;
  taxPeriod: string;
  grossSales: number;
  exemptSales: number;
  zeroRatedSales: number;
  vatableAmount: number;
  vatAmount: number;
  totalSales: number;
}

// Constants
const PHILIPPINE_VAT_RATE = 0.12;
const WITHHOLDING_TAX_RATES = {
  goods: 0.01,
  services: 0.02,
  professional: 0.10,
  compensation: 0.00 // Handled differently
};

const WITHHOLDING_TAX_THRESHOLDS = {
  goods: 1000,
  services: 1000,
  professional: 0, // No threshold
  compensation: 0
};

// Global OR number counter (in production, this should be persisted)
let orNumberCounter = 1;

/**
 * Calculate Philippine VAT (12%)
 */
export function calculateVAT(amount: number, options: VATOptions = {}): VATCalculation {
  const rate = options.rate || PHILIPPINE_VAT_RATE;
  
  if (options.exempt) {
    return {
      vatableAmount: 0,
      vatAmount: 0,
      totalAmount: amount,
      vatRate: 0,
      exemptAmount: amount
    };
  }
  
  if (options.zeroRated) {
    return {
      vatableAmount: amount,
      vatAmount: 0,
      totalAmount: amount,
      vatRate: 0,
      zeroRatedAmount: amount
    };
  }
  
  if (options.inclusive) {
    // VAT-inclusive calculation
    const vatableAmount = amount / (1 + rate);
    const vatAmount = amount - vatableAmount;
    
    return {
      vatableAmount: Math.round(vatableAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: amount,
      vatRate: rate
    };
  }
  
  // VAT-exclusive calculation
  const vatAmount = Math.round(amount * rate * 100) / 100;
  
  return {
    vatableAmount: amount,
    vatAmount,
    totalAmount: amount + vatAmount,
    vatRate: rate
  };
}

/**
 * Generate sequential OR (Official Receipt) numbers
 */
export function generateORNumber(): string {
  const orNumber = orNumberCounter.toString().padStart(10, '0');
  orNumberCounter++;
  
  // Handle rollover at maximum
  if (orNumberCounter > 9999999999) {
    orNumberCounter = 1;
  }
  
  return orNumber;
}

/**
 * Validate BIR receipt format and content
 */
export function validateBIRReceipt(receipt: BIRReceipt): BIRReceiptValidation {
  const errors: string[] = [];
  
  // Required fields validation
  if (!receipt.orNumber) {
    errors.push('OR Number is required');
  }
  
  if (!receipt.tin) {
    errors.push('TIN is required');
  } else if (!validateTIN(receipt.tin)) {
    errors.push('Invalid TIN format');
  }
  
  if (!receipt.businessName) {
    errors.push('Business name is required');
  }
  
  if (!receipt.businessAddress) {
    errors.push('Business address is required');
  }
  
  if (!receipt.date) {
    errors.push('Date is required');
  }
  
  if (!receipt.items || receipt.items.length === 0) {
    errors.push('At least one item is required');
  }
  
  // VAT calculation validation
  const calculatedVAT = calculateVAT(receipt.vatableAmount);
  const tolerance = 0.01; // 1 centavo tolerance
  
  if (Math.abs(receipt.vatAmount - calculatedVAT.vatAmount) > tolerance) {
    errors.push('VAT calculation mismatch');
  }
  
  if (Math.abs(receipt.totalAmount - calculatedVAT.totalAmount) > tolerance) {
    errors.push('Total amount calculation mismatch');
  }
  
  // Items validation
  receipt.items.forEach((item, index) => {
    if (!item.description) {
      errors.push(`Item ${index + 1}: Description is required`);
    }
    
    if (item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
    }
    
    if (item.unitPrice <= 0) {
      errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
    }
    
    const expectedAmount = Math.round(item.quantity * item.unitPrice * 100) / 100;
    if (Math.abs(item.amount - expectedAmount) > tolerance) {
      errors.push(`Item ${index + 1}: Amount calculation mismatch`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create journal entry for sales transaction
 */
export function createJournalEntry(sale: Sale): JournalEntry {
  const entries = [];
  
  // Determine cash account based on payment method
  const cashAccount = sale.paymentMethod === 'card' ? 'Card Receivables' : 'Cash';
  
  // Cash/Card Receivables (Debit)
  entries.push({
    account: cashAccount,
    debit: sale.total,
    credit: 0,
    description: `${sale.paymentMethod.toUpperCase()} received for sale ${sale.invoiceNumber}`
  });
  
  // Sales Revenue (Credit)
  entries.push({
    account: 'Sales Revenue',
    debit: 0,
    credit: sale.subtotal,
    description: `Sales revenue for invoice ${sale.invoiceNumber}`
  });
  
  // VAT Payable (Credit)
  if (sale.tax > 0) {
    entries.push({
      account: 'VAT Payable',
      debit: 0,
      credit: sale.tax,
      description: `VAT for invoice ${sale.invoiceNumber}`
    });
  }
  
  return {
    id: `journal-${Date.now()}`,
    date: sale.createdAt,
    reference: sale.invoiceNumber,
    description: `Sales transaction - ${sale.invoiceNumber}`,
    entries,
    createdBy: sale.cashierId,
    createdAt: new Date()
  };
}

/**
 * Calculate withholding tax based on transaction type
 */
export function calculateWithholdingTax(amount: number, type: string): WithholdingTaxResult {
  const rate = WITHHOLDING_TAX_RATES[type as keyof typeof WITHHOLDING_TAX_RATES] || 0;
  const threshold = WITHHOLDING_TAX_THRESHOLDS[type as keyof typeof WITHHOLDING_TAX_THRESHOLDS] || 0;
  
  let withholdingAmount = 0;
  
  if (amount >= threshold) {
    withholdingAmount = Math.round(amount * rate * 100) / 100;
  }
  
  return {
    rate,
    amount: withholdingAmount,
    netAmount: amount - withholdingAmount,
    type
  };
}

/**
 * Generate BIR reports for different periods and types
 */
export function generateBIRReport(reportType: string, data: any[], period: ReportPeriod): BIRReport {
  const report: BIRReport = {
    reportType,
    period,
    totalSales: 0,
    totalVAT: 0,
    exemptSales: 0,
    zeroRatedSales: 0,
    generatedAt: new Date()
  };
  
  if (reportType === 'VAT') {
    // Filter data by period
    const filteredData = data.filter(item => {
      const itemDate = new Date(item.date);
      if (period.month) {
        return itemDate.getMonth() + 1 === period.month && itemDate.getFullYear() === period.year;
      }
      return itemDate.getFullYear() === period.year;
    });
    
    report.totalSales = filteredData.reduce((sum, item) => sum + (item.amount || 0), 0);
    report.totalVAT = filteredData.reduce((sum, item) => sum + (item.vat || 0), 0);
  }
  
  if (reportType === 'INCOME_TAX') {
    report.totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);
    report.totalExpenses = data.reduce((sum, item) => sum + (item.expenses || 0), 0);
    report.taxableIncome = report.totalRevenue - report.totalExpenses;
    
    // Simplified income tax calculation (actual rates are more complex)
    if (report.taxableIncome <= 250000) {
      report.incomeTax = 0;
    } else if (report.taxableIncome <= 400000) {
      report.incomeTax = (report.taxableIncome - 250000) * 0.20;
    } else if (report.taxableIncome <= 800000) {
      report.incomeTax = 30000 + (report.taxableIncome - 400000) * 0.25;
    } else if (report.taxableIncome <= 2000000) {
      report.incomeTax = 130000 + (report.taxableIncome - 800000) * 0.30;
    } else {
      report.incomeTax = 490000 + (report.taxableIncome - 2000000) * 0.35;
    }
  }
  
  return report;
}

/**
 * Format currency in Philippine peso
 */
export function formatPhilippineCurrency(amount: number): string {
  const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount).replace('PHP', '₱');
}

/**
 * Validate Philippine TIN format
 */
export function validateTIN(tin: string): boolean {
  // Philippine TIN format: XXX-XXX-XXX-XXX where last XXX is branch code (000-001)
  const tinRegex = /^\d{3}-\d{3}-\d{3}-\d{3}$/;
  
  if (!tinRegex.test(tin)) {
    return false;
  }
  
  const parts = tin.split('-');
  const branchCode = parseInt(parts[3]);
  
  // Branch code should be 000-999
  return branchCode >= 0 && branchCode <= 999;
}

/**
 * Generate BIR Form 2550M data
 */
export function generateBIRForm2550M(salesData: Sale[], period: ReportPeriod): BIRForm2550MData {
  const filteredSales = salesData.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    if (period.month) {
      return saleDate.getMonth() + 1 === period.month && saleDate.getFullYear() === period.year;
    }
    return saleDate.getFullYear() === period.year;
  });
  
  const grossSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const vatableAmount = filteredSales.reduce((sum, sale) => sum + sale.subtotal, 0);
  const vatAmount = filteredSales.reduce((sum, sale) => sum + sale.tax, 0);
  
  return {
    businessName: 'Filipino Business Management System',
    businessAddress: '123 Business Street, Makati City, Metro Manila 1200',
    tin: '123-456-789-000',
    rdoCode: '043',
    taxPeriod: period.month ? `${period.month}/${period.year}` : `${period.year}`,
    grossSales,
    exemptSales: 0, // Would need to be calculated based on actual exempt transactions
    zeroRatedSales: 0, // Would need to be calculated based on actual zero-rated transactions
    vatableAmount,
    vatAmount,
    totalSales: grossSales
  };
}

/**
 * Calculate SSS contributions
 */
export function calculateSSSContribution(salary: number): { employee: number; employer: number; total: number } {
  // Simplified SSS contribution table (2024 rates)
  let monthlyContribution = 0;
  
  if (salary < 3250) monthlyContribution = 135;
  else if (salary < 3750) monthlyContribution = 157.5;
  else if (salary < 4250) monthlyContribution = 180;
  else if (salary < 4750) monthlyContribution = 202.5;
  else if (salary < 5250) monthlyContribution = 225;
  else if (salary < 5750) monthlyContribution = 247.5;
  else if (salary < 6250) monthlyContribution = 270;
  else if (salary < 6750) monthlyContribution = 292.5;
  else if (salary < 7250) monthlyContribution = 315;
  else if (salary < 7750) monthlyContribution = 337.5;
  else if (salary < 8250) monthlyContribution = 360;
  else if (salary < 8750) monthlyContribution = 382.5;
  else if (salary < 9250) monthlyContribution = 405;
  else if (salary < 9750) monthlyContribution = 427.5;
  else if (salary < 10250) monthlyContribution = 450;
  else if (salary < 10750) monthlyContribution = 472.5;
  else if (salary < 11250) monthlyContribution = 495;
  else if (salary < 11750) monthlyContribution = 517.5;
  else if (salary < 12250) monthlyContribution = 540;
  else if (salary < 12750) monthlyContribution = 562.5;
  else if (salary < 13250) monthlyContribution = 585;
  else if (salary < 13750) monthlyContribution = 607.5;
  else if (salary < 14250) monthlyContribution = 630;
  else if (salary < 14750) monthlyContribution = 652.5;
  else if (salary < 15250) monthlyContribution = 675;
  else if (salary < 15750) monthlyContribution = 697.5;
  else if (salary < 16250) monthlyContribution = 720;
  else if (salary < 16750) monthlyContribution = 742.5;
  else if (salary < 17250) monthlyContribution = 765;
  else if (salary < 17750) monthlyContribution = 787.5;
  else if (salary < 18250) monthlyContribution = 810;
  else if (salary < 18750) monthlyContribution = 832.5;
  else if (salary < 19250) monthlyContribution = 855;
  else if (salary < 19750) monthlyContribution = 877.5;
  else monthlyContribution = 900; // Maximum
  
  const employeeShare = monthlyContribution * 0.45; // 4.5%
  const employerShare = monthlyContribution * 0.95; // 9.5%
  
  return {
    employee: Math.round(employeeShare * 100) / 100,
    employer: Math.round(employerShare * 100) / 100,
    total: Math.round(monthlyContribution * 100) / 100
  };
}

/**
 * Calculate PhilHealth contributions
 */
export function calculatePhilHealthContribution(salary: number): { employee: number; employer: number; total: number } {
  const monthlyPremium = Math.min(salary * 0.05, 5000); // 5% of salary, max ₱5,000
  const employeeShare = monthlyPremium / 2;
  const employerShare = monthlyPremium / 2;
  
  return {
    employee: Math.round(employeeShare * 100) / 100,
    employer: Math.round(employerShare * 100) / 100,
    total: Math.round(monthlyPremium * 100) / 100
  };
}

/**
 * Calculate Pag-IBIG contributions
 */
export function calculatePagibigContribution(salary: number): { employee: number; employer: number; total: number } {
  let employeeRate = 0.02; // 2%
  let employerRate = 0.02; // 2%
  
  if (salary > 5000) {
    employeeRate = 0.02; // Still 2% for employee
    employerRate = 0.02; // Still 2% for employer
  }
  
  const employeeContribution = Math.min(salary * employeeRate, 200); // Max ₱200
  const employerContribution = Math.min(salary * employerRate, 200); // Max ₱200
  
  return {
    employee: Math.round(employeeContribution * 100) / 100,
    employer: Math.round(employerContribution * 100) / 100,
    total: Math.round((employeeContribution + employerContribution) * 100) / 100
  };
}

/**
 * Calculate withholding tax for employee compensation
 */
export function calculateWithholdingTaxForEmployee(grossPay: number, exemptions: number = 4): number {
  // Annual computation then divide by pay periods
  const annualGross = grossPay * 12;
  const personalExemption = 50000;
  const additionalExemption = exemptions * 25000;
  const totalExemption = personalExemption + additionalExemption;
  
  const taxableIncome = Math.max(0, annualGross - totalExemption);
  
  let annualTax = 0;
  
  if (taxableIncome <= 250000) {
    annualTax = 0;
  } else if (taxableIncome <= 400000) {
    annualTax = (taxableIncome - 250000) * 0.20;
  } else if (taxableIncome <= 800000) {
    annualTax = 30000 + (taxableIncome - 400000) * 0.25;
  } else if (taxableIncome <= 2000000) {
    annualTax = 130000 + (taxableIncome - 800000) * 0.30;
  } else if (taxableIncome <= 8000000) {
    annualTax = 490000 + (taxableIncome - 2000000) * 0.32;
  } else {
    annualTax = 2410000 + (taxableIncome - 8000000) * 0.35;
  }
  
  const monthlyTax = annualTax / 12;
  return Math.round(monthlyTax * 100) / 100;
}

/**
 * Generate Alphalist data for BIR reporting
 */
export function generateAlphalist(employees: Employee[], year: number): any[] {
  return employees.map(employee => {
    const annualSalary = employee.basicSalary * 12;
    const sssContrib = calculateSSSContribution(employee.basicSalary);
    const philhealthContrib = calculatePhilHealthContribution(employee.basicSalary);
    const pagibigContrib = calculatePagibigContribution(employee.basicSalary);
    
    const totalContributions = (sssContrib.employee + philhealthContrib.employee + pagibigContrib.employee) * 12;
    const withholdingTax = calculateWithholdingTaxForEmployee(employee.basicSalary) * 12;
    
    return {
      tin: employee.tinNumber || '',
      lastName: employee.lastName,
      firstName: employee.firstName,
      middleName: employee.middleName || '',
      grossCompensation: annualSalary,
      nonTaxableCompensation: totalContributions,
      taxableCompensation: annualSalary - totalContributions,
      withholdingTax,
      year
    };
  });
}