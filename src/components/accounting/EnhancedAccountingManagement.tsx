import React, { useState, useEffect, memo } from 'react';
import {
  Plus,
  Search,
  Calculator,
  TrendingUp,
  BarChart3,
  FileText,
  CheckCircle,
  AlertTriangle,
  Edit,
  Download
} from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { Account, JournalEntry, AccountType } from '../../types/business';
import { formatCurrency } from '../../utils/formatters';

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  currentAssets: number;
  currentLiabilities: number;
  workingCapital: number;
  currentRatio: number;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  debtToEquityRatio: number;
  returnOnAssets: number;
  returnOnEquity: number;
}

interface AccountBalance {
  account: Account;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
}

interface TrialBalance {
  accounts: AccountBalance[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

interface CashFlowStatement {
  operatingActivities: {
    netIncome: number;
    depreciation: number;
    accountsReceivableChange: number;
    accountsPayableChange: number;
    inventoryChange: number;
    netCashFromOperating: number;
  };
  investingActivities: {
    equipmentPurchases: number;
    equipmentSales: number;
    netCashFromInvesting: number;
  };
  financingActivities: {
    loanProceeds: number;
    loanPayments: number;
    ownerInvestments: number;
    ownerWithdrawals: number;
    netCashFromFinancing: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

interface BudgetItem {
  id: string;
  accountId: string;
  accountName: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
}

interface Budget {
  id: string;
  name: string;
  period: 'monthly' | 'quarterly' | 'annual';
  startDate: Date;
  endDate: Date;
  items: BudgetItem[];
  status: 'draft' | 'active' | 'closed';
  createdAt: Date;
}

const EnhancedAccountingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'journal' | 'reports' | 'budgets' | 'analysis'>('dashboard');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowStatement | null>(null);

  const { addToast } = useToastStore();

  // Initialize mock data
  useEffect(() => {
    initializeMockData();
  }, []);

  const initializeMockData = () => {
    // Standard Chart of Accounts
    const mockAccounts: Account[] = [
      // Assets (1000-1999)
      { id: 'acc-1001', code: '1001', name: 'Cash', type: 'Asset', description: 'Cash on hand and in bank', isActive: true, createdAt: new Date() },
      { id: 'acc-1002', code: '1002', name: 'Accounts Receivable', type: 'Asset', description: 'Money owed by customers', isActive: true, createdAt: new Date() },
      { id: 'acc-1003', code: '1003', name: 'Inventory', type: 'Asset', description: 'Products for sale', isActive: true, createdAt: new Date() },
      { id: 'acc-1004', code: '1004', name: 'Equipment', type: 'Asset', description: 'Office and business equipment', isActive: true, createdAt: new Date() },
      { id: 'acc-1005', code: '1005', name: 'Accumulated Depreciation', type: 'Asset', description: 'Accumulated depreciation on equipment', isActive: true, createdAt: new Date() },
      
      // Liabilities (2000-2999)
      { id: 'acc-2001', code: '2001', name: 'Accounts Payable', type: 'Liability', description: 'Money owed to suppliers', isActive: true, createdAt: new Date() },
      { id: 'acc-2002', code: '2002', name: 'Loans Payable', type: 'Liability', description: 'Bank loans and other debt', isActive: true, createdAt: new Date() },
      { id: 'acc-2003', code: '2003', name: 'Accrued Expenses', type: 'Liability', description: 'Expenses incurred but not yet paid', isActive: true, createdAt: new Date() },
      
      // Equity (3000-3999)
      { id: 'acc-3001', code: '3001', name: 'Owner Equity', type: 'Equity', description: 'Owner investment in business', isActive: true, createdAt: new Date() },
      { id: 'acc-3002', code: '3002', name: 'Retained Earnings', type: 'Equity', description: 'Accumulated profits', isActive: true, createdAt: new Date() },
      
      // Income (4000-4999)
      { id: 'acc-4001', code: '4001', name: 'Sales Revenue', type: 'Income', description: 'Revenue from product sales', isActive: true, createdAt: new Date() },
      { id: 'acc-4002', code: '4002', name: 'Service Revenue', type: 'Income', description: 'Revenue from services', isActive: true, createdAt: new Date() },
      { id: 'acc-4003', code: '4003', name: 'Interest Income', type: 'Income', description: 'Interest earned on investments', isActive: true, createdAt: new Date() },
      
      // Expenses (5000-5999)
      { id: 'acc-5001', code: '5001', name: 'Cost of Goods Sold', type: 'Expense', description: 'Direct costs of products sold', isActive: true, createdAt: new Date() },
      { id: 'acc-5002', code: '5002', name: 'Rent Expense', type: 'Expense', description: 'Office and store rent', isActive: true, createdAt: new Date() },
      { id: 'acc-5003', code: '5003', name: 'Utilities Expense', type: 'Expense', description: 'Electricity, water, internet', isActive: true, createdAt: new Date() },
      { id: 'acc-5004', code: '5004', name: 'Salaries Expense', type: 'Expense', description: 'Employee salaries and wages', isActive: true, createdAt: new Date() },
      { id: 'acc-5005', code: '5005', name: 'Marketing Expense', type: 'Expense', description: 'Advertising and promotion costs', isActive: true, createdAt: new Date() },
      { id: 'acc-5006', code: '5006', name: 'Office Supplies', type: 'Expense', description: 'Office supplies and materials', isActive: true, createdAt: new Date() },
      { id: 'acc-5007', code: '5007', name: 'Depreciation Expense', type: 'Expense', description: 'Equipment depreciation', isActive: true, createdAt: new Date() },
    ];

    // Mock journal entries
    const mockEntries: JournalEntry[] = [
      {
        id: 'je-1',
        date: new Date('2024-06-01'),
        reference: 'SALE-001',
        description: 'Sale to customer ABC Corp',
        lines: [
          { id: 'jel-1', accountId: 'acc-1002', accountName: 'Accounts Receivable', debit: 50000, credit: 0, description: 'Sale on credit' },
          { id: 'jel-2', accountId: 'acc-4001', accountName: 'Sales Revenue', debit: 0, credit: 50000, description: 'Revenue recognition' }
        ],
        createdBy: 'admin',
        createdAt: new Date('2024-06-01')
      },
      {
        id: 'je-2',
        date: new Date('2024-06-05'),
        reference: 'CASH-001',
        description: 'Cash collection from ABC Corp',
        lines: [
          { id: 'jel-3', accountId: 'acc-1001', accountName: 'Cash', debit: 50000, credit: 0, description: 'Cash received' },
          { id: 'jel-4', accountId: 'acc-1002', accountName: 'Accounts Receivable', debit: 0, credit: 50000, description: 'Collection of receivable' }
        ],
        createdBy: 'admin',
        createdAt: new Date('2024-06-05')
      },
      {
        id: 'je-3',
        date: new Date('2024-06-10'),
        reference: 'EXP-001',
        description: 'Monthly rent payment',
        lines: [
          { id: 'jel-5', accountId: 'acc-5002', accountName: 'Rent Expense', debit: 15000, credit: 0, description: 'Office rent for June' },
          { id: 'jel-6', accountId: 'acc-1001', accountName: 'Cash', debit: 0, credit: 15000, description: 'Cash payment' }
        ],
        createdBy: 'admin',
        createdAt: new Date('2024-06-10')
      }
    ];

    setAccounts(mockAccounts);
    setJournalEntries(mockEntries);

    // Calculate financial metrics
    calculateFinancialMetrics(mockAccounts, mockEntries);
    generateTrialBalance(mockAccounts, mockEntries);
    generateCashFlowStatement();

    // Mock budgets
    const mockBudgets: Budget[] = [
      {
        id: 'budget-1',
        name: '2024 Annual Budget',
        period: 'annual',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'active',
        items: [
          { id: 'bi-1', accountId: 'acc-4001', accountName: 'Sales Revenue', budgetedAmount: 1200000, actualAmount: 850000, variance: -350000, variancePercent: -29.17 },
          { id: 'bi-2', accountId: 'acc-5001', accountName: 'Cost of Goods Sold', budgetedAmount: 720000, actualAmount: 510000, variance: -210000, variancePercent: -29.17 },
          { id: 'bi-3', accountId: 'acc-5002', accountName: 'Rent Expense', budgetedAmount: 180000, actualAmount: 90000, variance: -90000, variancePercent: -50.00 },
          { id: 'bi-4', accountId: 'acc-5004', accountName: 'Salaries Expense', budgetedAmount: 240000, actualAmount: 120000, variance: -120000, variancePercent: -50.00 }
        ],
        createdAt: new Date('2024-01-01')
      }
    ];

    setBudgets(mockBudgets);
  };

  const calculateFinancialMetrics = (accounts: Account[], entries: JournalEntry[]) => {
    // This would normally calculate actual balances from journal entries
    // For demonstration, using mock values
    const mockMetrics: FinancialMetrics = {
      totalRevenue: 850000,
      totalExpenses: 630000,
      netIncome: 220000,
      grossProfit: 340000,
      grossMargin: 40.0,
      operatingExpenses: 210000,
      operatingIncome: 130000,
      operatingMargin: 15.3,
      currentAssets: 450000,
      currentLiabilities: 125000,
      workingCapital: 325000,
      currentRatio: 3.6,
      totalAssets: 780000,
      totalLiabilities: 225000,
      equity: 555000,
      debtToEquityRatio: 0.41,
      returnOnAssets: 28.2,
      returnOnEquity: 39.6
    };

    setMetrics(mockMetrics);
  };

  const generateTrialBalance = (accounts: Account[], entries: JournalEntry[]) => {
    // Calculate account balances from journal entries
    const balances: { [accountId: string]: { debit: number; credit: number } } = {};

    // Initialize balances
    accounts.forEach(account => {
      balances[account.id] = { debit: 0, credit: 0 };
    });

    // Sum up journal entry lines
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (balances[line.accountId]) {
          balances[line.accountId].debit += line.debit;
          balances[line.accountId].credit += line.credit;
        }
      });
    });

    // Create trial balance
    const accountBalances: AccountBalance[] = accounts.map(account => {
      const balance = balances[account.id] || { debit: 0, credit: 0 };
      return {
        account,
        debitBalance: balance.debit,
        creditBalance: balance.credit,
        netBalance: balance.debit - balance.credit
      };
    });

    const totalDebits = accountBalances.reduce((sum, ab) => sum + ab.debitBalance, 0);
    const totalCredits = accountBalances.reduce((sum, ab) => sum + ab.creditBalance, 0);

    setTrialBalance({
      accounts: accountBalances,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
    });
  };

  const generateCashFlowStatement = () => {
    // Mock cash flow statement
    const mockCashFlow: CashFlowStatement = {
      operatingActivities: {
        netIncome: 220000,
        depreciation: 15000,
        accountsReceivableChange: -25000,
        accountsPayableChange: 12000,
        inventoryChange: -18000,
        netCashFromOperating: 204000
      },
      investingActivities: {
        equipmentPurchases: -45000,
        equipmentSales: 0,
        netCashFromInvesting: -45000
      },
      financingActivities: {
        loanProceeds: 50000,
        loanPayments: -15000,
        ownerInvestments: 100000,
        ownerWithdrawals: -25000,
        netCashFromFinancing: 110000
      },
      netCashFlow: 269000,
      beginningCash: 125000,
      endingCash: 394000
    };

    setCashFlow(mockCashFlow);
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.code.includes(searchTerm);
    const matchesType = accountTypeFilter === 'all' || account.type === accountTypeFilter;
    return matchesSearch && matchesType && account.isActive;
  });

  const filteredEntries = journalEntries.filter(entry => {
    const matchesSearch = entry.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDateRange = true;
    if (dateRange.start && dateRange.end) {
      const entryDate = entry.date;
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      matchesDateRange = entryDate >= startDate && entryDate <= endDate;
    }
    
    return matchesSearch && matchesDateRange;
  });

  const getAccountTypeColor = (type: AccountType) => {
    switch (type) {
      case 'Asset': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Liability': return 'text-red-600 bg-red-50 border-red-200';
      case 'Equity': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Income': return 'text-green-600 bg-green-50 border-green-200';
      case 'Expense': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatRatio = (value: number, isPercentage: boolean = false) => {
    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  return (
    <div className="p-6 space-y-6 dark:bg-dark-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Enhanced Accounting & Financial Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive financial reporting and analysis</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBudgetForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Target className="h-4 w-4 mr-2" />
            Create Budget
          </button>
          <button
            onClick={() => setShowJournalForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Journal Entry
          </button>
          <button
            onClick={() => setShowAccountForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.netIncome)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Profit margin: {formatRatio(metrics.operatingMargin, true)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.totalRevenue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Gross margin: {formatRatio(metrics.grossMargin, true)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Working Capital</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.workingCapital)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Current ratio: {formatRatio(metrics.currentRatio)}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">ROE</p>
                <p className="text-2xl font-bold text-orange-600">{formatRatio(metrics.returnOnEquity, true)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">ROA: {formatRatio(metrics.returnOnAssets, true)}</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Financial Overview */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button className="flex items-center px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Financial Statements
            </button>
            <button className="flex items-center px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <FileText className="h-4 w-4 mr-2" />
              Trial Balance
            </button>
            <button className="flex items-center px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <Calculator className="h-4 w-4 mr-2" />
              Budget vs Actual
            </button>
          </div>
          
          {trialBalance && (
            <div className="flex items-center space-x-2 text-sm">
              {trialBalance.isBalanced ? (
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>Trial Balance: Balanced</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  <span>Trial Balance: Out of Balance</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="border-b border-gray-200 dark:border-dark-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'accounts', label: 'Chart of Accounts', icon: BookOpen },
              { id: 'journal', label: 'Journal Entries', icon: FileText },
              { id: 'reports', label: 'Financial Reports', icon: Receipt },
              { id: 'budgets', label: 'Budgets', icon: Target },
              { id: 'analysis', label: 'Financial Analysis', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && metrics && (
            <div className="space-y-6">
              {/* Income Statement Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-dark-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Income Statement (YTD)</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Revenue</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(metrics.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Cost of Goods Sold</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(metrics.totalRevenue - metrics.grossProfit)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600 dark:text-gray-400">Gross Profit</span>
                      <span className="font-medium text-green-600">{formatCurrency(metrics.grossProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Operating Expenses</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(metrics.operatingExpenses)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600 dark:text-gray-400">Operating Income</span>
                      <span className="font-medium text-blue-600">{formatCurrency(metrics.operatingIncome)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span className="text-gray-900 dark:text-gray-100">Net Income</span>
                      <span className="text-green-600">{formatCurrency(metrics.netIncome)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-dark-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Balance Sheet Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Current Assets</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(metrics.currentAssets)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Assets</span>
                      <span className="font-medium text-blue-600">{formatCurrency(metrics.totalAssets)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600 dark:text-gray-400">Current Liabilities</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(metrics.currentLiabilities)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Liabilities</span>
                      <span className="font-medium text-red-600">{formatCurrency(metrics.totalLiabilities)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span className="text-gray-900 dark:text-gray-100">Total Equity</span>
                      <span className="text-purple-600">{formatCurrency(metrics.equity)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Flow Summary */}
              {cashFlow && (
                <div className="bg-gray-50 dark:bg-dark-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cash Flow Statement (YTD)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Operating Activities</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Net Income</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(cashFlow.operatingActivities.netIncome)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Depreciation</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(cashFlow.operatingActivities.depreciation)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-medium">
                          <span className="text-gray-900 dark:text-gray-100">Net Cash from Operating</span>
                          <span className="text-green-600">{formatCurrency(cashFlow.operatingActivities.netCashFromOperating)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Investing Activities</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Equipment Purchases</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(cashFlow.investingActivities.equipmentPurchases)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-medium">
                          <span className="text-gray-900 dark:text-gray-100">Net Cash from Investing</span>
                          <span className="text-red-600">{formatCurrency(cashFlow.investingActivities.netCashFromInvesting)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Financing Activities</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Loan Proceeds</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(cashFlow.financingActivities.loanProceeds)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Owner Investments</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatCurrency(cashFlow.financingActivities.ownerInvestments)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-medium">
                          <span className="text-gray-900 dark:text-gray-100">Net Cash from Financing</span>
                          <span className="text-blue-600">{formatCurrency(cashFlow.financingActivities.netCashFromFinancing)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between font-bold text-lg">
                      <span className="text-gray-900 dark:text-gray-100">Net Cash Flow</span>
                      <span className="text-green-600">{formatCurrency(cashFlow.netCashFlow)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search accounts by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Account Types</option>
                  <option value="Asset">Assets</option>
                  <option value="Liability">Liabilities</option>
                  <option value="Equity">Equity</option>
                  <option value="Income">Income</option>
                  <option value="Expense">Expenses</option>
                </select>
              </div>

              {/* Accounts Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-dark-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Code</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Account Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Description</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Balance</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map(account => {
                      const balance = trialBalance?.accounts.find(ab => ab.account.id === account.id);
                      return (
                        <tr key={account.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50">
                          <td className="py-3 px-4 font-mono text-gray-900 dark:text-gray-100">{account.code}</td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{account.name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAccountTypeColor(account.type)}`}>
                              {account.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{account.description}</td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                            {balance ? formatCurrency(Math.abs(balance.netBalance)) : formatCurrency(0)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingAccount(account.id);
                                  setShowAccountForm(true);
                                }}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                                title="Edit Account"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other tabs implementation would continue here... */}
          {activeTab === 'journal' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Journal Entries</h3>
                <p className="text-gray-500 dark:text-gray-400">Record and manage all accounting transactions.</p>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Financial Reports</h3>
                <p className="text-gray-500 dark:text-gray-400">Generate comprehensive financial statements and reports.</p>
              </div>
            </div>
          )}

          {activeTab === 'budgets' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Budget Management</h3>
                <p className="text-gray-500 dark:text-gray-400">Create and monitor budgets with variance analysis.</p>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Financial Analysis</h3>
                <p className="text-gray-500 dark:text-gray-400">Advanced financial ratios and performance metrics.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(EnhancedAccountingManagement);