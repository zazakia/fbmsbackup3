import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Category, Customer, Sale, CartItem, Supplier, PurchaseOrder, Expense, ExpenseCategory, Account, JournalEntry, Employee, PayrollPeriod, PayrollEntry, LeaveRecord, TimeRecord, PayrollSettings } from '../types/business';
import { getCustomers as supaGetCustomers, createCustomer as supaCreateCustomer, updateCustomer as supaUpdateCustomer, deleteCustomer as supaDeleteCustomer } from '../api/customers';

interface BusinessState {
  // Products
  products: Product[];
  categories: Category[];
  
  // Customers
  customers: Customer[];
  
  // Sales
  sales: Sale[];
  cart: CartItem[];
  
  // Suppliers & Purchases
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  
  // Expenses
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  
  // Accounts
  accounts: Account[];
  journalEntries: JournalEntry[];
  
  // Payroll
  employees: Employee[];
  payrollPeriods: PayrollPeriod[];
  payrollEntries: PayrollEntry[];
  leaveRecords: LeaveRecord[];
  timeRecords: TimeRecord[];
  payrollSettings: PayrollSettings;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

interface BusinessActions {
  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  getProductsByCategoryId: (categoryId: string) => Product[];
  updateStock: (productId: string, quantity: number) => void;
  
  // Category actions
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  getCategory: (id: string) => Category | undefined;
  
  // Customer actions
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;
  
  // Cart actions
  addToCart: (product: Product, quantity: number) => void;
  updateCartItem: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartSubtotal: () => number;
  getCartTax: () => number;
  
  // Sale actions
  createSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  updateSale: (id: string, updates: Partial<Sale>) => void;
  getSale: (id: string) => Sale | undefined;
  getSalesByCustomer: (customerId: string) => Sale[];
  
  // Supplier actions
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  getSupplier: (id: string) => Supplier | undefined;
  
  // Purchase Order actions
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt'>) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  getPurchaseOrder: (id: string) => PurchaseOrder | undefined;
  
  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getExpense: (id: string) => Expense | undefined;
  
  // Expense Category actions
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'createdAt'>) => void;
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => void;
  getExpenseCategory: (id: string) => ExpenseCategory | undefined;
  
  // Account actions
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  getAccount: (id: string) => Account | undefined;
  
  // Journal Entry actions
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  getJournalEntry: (id: string) => JournalEntry | undefined;
  
  // Employee actions
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  getEmployee: (id: string) => Employee | undefined;
  
  // Payroll Period actions
  addPayrollPeriod: (period: Omit<PayrollPeriod, 'id' | 'createdAt'>) => void;
  updatePayrollPeriod: (id: string, updates: Partial<PayrollPeriod>) => void;
  deletePayrollPeriod: (id: string) => void;
  getPayrollPeriod: (id: string) => PayrollPeriod | undefined;
  
  // Payroll Entry actions
  addPayrollEntry: (entry: Omit<PayrollEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePayrollEntry: (id: string, updates: Partial<PayrollEntry>) => void;
  deletePayrollEntry: (id: string) => void;
  getPayrollEntry: (id: string) => PayrollEntry | undefined;
  
  // Leave Record actions
  addLeaveRecord: (leave: Omit<LeaveRecord, 'id' | 'createdAt'>) => void;
  updateLeaveRecord: (id: string, updates: Partial<LeaveRecord>) => void;
  deleteLeaveRecord: (id: string) => void;
  getLeaveRecord: (id: string) => LeaveRecord | undefined;
  
  // Time Record actions
  addTimeRecord: (time: Omit<TimeRecord, 'id' | 'createdAt'>) => void;
  updateTimeRecord: (id: string, updates: Partial<TimeRecord>) => void;
  deleteTimeRecord: (id: string) => void;
  getTimeRecord: (id: string) => TimeRecord | undefined;
  
  // Payroll Settings actions
  updatePayrollSettings: (updates: Partial<PayrollSettings>) => void;
  getPayrollSettings: () => PayrollSettings;
  
  // Utility actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type BusinessStore = BusinessState & BusinessActions;

// Generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Generate invoice number
const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV${year}${month}${day}${random}`;
};

// Generate PO number
const generatePONumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PO${year}${month}${day}${random}`;
};

// Mock initial data
const initialCategories: Category[] = [
  { id: '1', name: 'Beverages', description: 'Drinks and beverages', isActive: true, createdAt: new Date() },
  { id: '2', name: 'Snacks', description: 'Snacks and chips', isActive: true, createdAt: new Date() },
  { id: '3', name: 'Personal Care', description: 'Personal hygiene products', isActive: true, createdAt: new Date() },
  { id: '4', name: 'Household', description: 'Household items', isActive: true, createdAt: new Date() },
];

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'San Miguel Beer 330ml',
    description: 'San Miguel Pale Pilsen 330ml bottle',
    sku: 'SMB-330',
    barcode: '4800016644443',
    category: '1',
    price: 45,
    cost: 38,
    stock: 120,
    minStock: 20,
    unit: 'bottle',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Lucky Me Instant Noodles',
    description: 'Lucky Me Chicken Flavor 55g',
    sku: 'LM-CHK-55',
    barcode: '4800016001234',
    category: '2',
    price: 12,
    cost: 9,
    stock: 200,
    minStock: 50,
    unit: 'pack',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Coca-Cola 355ml',
    description: 'Coca-Cola Regular 355ml can',
    sku: 'CC-355',
    barcode: '4902430123456',
    category: '1',
    price: 25,
    cost: 20,
    stock: 150,
    minStock: 30,
    unit: 'can',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    name: 'Pantene Shampoo 170ml',
    description: 'Pantene Pro-V Classic Clean 170ml',
    sku: 'PAN-170',
    barcode: '8001090123456',
    category: '3',
    price: 89,
    cost: 72,
    stock: 45,
    minStock: 10,
    unit: 'bottle',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const initialCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@email.com',
    phone: '+639171234567',
    address: '123 Rizal Street',
    city: 'Quezon City',
    province: 'Metro Manila',
    zipCode: '1100',
    creditLimit: 5000,
    currentBalance: 0,
    isActive: true,
    createdAt: new Date(),
    lastPurchase: new Date()
  },
  {
    id: '2',
    firstName: 'Jose',
    lastName: 'Cruz',
    email: 'jose.cruz@email.com',
    phone: '+639181234567',
    address: '456 Bonifacio Avenue',
    city: 'Manila',
    province: 'Metro Manila',
    zipCode: '1000',
    creditLimit: 3000,
    currentBalance: 0,
    isActive: true,
    createdAt: new Date(),
    lastPurchase: new Date()
  }
];

const initialSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'San Miguel Corporation',
    contactPerson: 'Juan Dela Cruz',
    email: 'purchasing@sanmiguel.com.ph',
    phone: '+63281234567',
    address: '40 San Miguel Avenue',
    city: 'Mandaluyong City',
    province: 'Metro Manila',
    zipCode: '1550',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '2',
    name: 'Universal Robina Corporation',
    contactPerson: 'Maria Garcia',
    email: 'orders@urc.com.ph',
    phone: '+63287654321',
    address: 'E. Rodriguez Jr. Avenue',
    city: 'Quezon City',
    province: 'Metro Manila',
    zipCode: '1110',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '3',
    name: 'Nestle Philippines',
    contactPerson: 'Pedro Santos',
    email: 'supply@nestle.com.ph',
    phone: '+63278901234',
    address: 'Rockwell Business Center',
    city: 'Makati City',
    province: 'Metro Manila',
    zipCode: '1200',
    isActive: true,
    createdAt: new Date()
  }
];

const initialExpenseCategories: ExpenseCategory[] = [
  {
    id: '1',
    name: 'Utilities',
    description: 'Electricity, water, internet, phone bills',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '2',
    name: 'Rent',
    description: 'Office and store rental expenses',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '3',
    name: 'Supplies',
    description: 'Office supplies and materials',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '4',
    name: 'Transportation',
    description: 'Fuel, maintenance, and travel expenses',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '5',
    name: 'Marketing',
    description: 'Advertising and promotional expenses',
    birClassification: 'Selling Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '6',
    name: 'Salaries',
    description: 'Employee salaries and wages',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  }
];

const initialAccounts: Account[] = [
  // Assets (1000-1999)
  {
    id: '1',
    code: '1000',
    name: 'Cash on Hand',
    type: 'Asset',
    description: 'Cash available in the business premises',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '2',
    code: '1100',
    name: 'Cash in Bank - BDO',
    type: 'Asset',
    description: 'Checking account with BDO',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '3',
    code: '1101',
    name: 'Cash in Bank - BPI',
    type: 'Asset',
    description: 'Savings account with BPI',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '4',
    code: '1200',
    name: 'Accounts Receivable',
    type: 'Asset',
    description: 'Amounts owed by customers',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '5',
    code: '1300',
    name: 'Inventory',
    type: 'Asset',
    description: 'Merchandise for sale',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '6',
    code: '1400',
    name: 'Prepaid Expenses',
    type: 'Asset',
    description: 'Expenses paid in advance',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '7',
    code: '1500',
    name: 'Equipment',
    type: 'Asset',
    description: 'Office and business equipment',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '8',
    code: '1600',
    name: 'Furniture and Fixtures',
    type: 'Asset',
    description: 'Office furniture and store fixtures',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '9',
    code: '1700',
    name: 'Accumulated Depreciation',
    type: 'Asset',
    description: 'Accumulated depreciation on fixed assets',
    isActive: true,
    createdAt: new Date()
  },

  // Liabilities (2000-2999)
  {
    id: '10',
    code: '2000',
    name: 'Accounts Payable',
    type: 'Liability',
    description: 'Amounts owed to suppliers',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '11',
    code: '2100',
    name: 'Notes Payable',
    type: 'Liability',
    description: 'Short-term loans and notes',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '12',
    code: '2200',
    name: 'Accrued Expenses',
    type: 'Liability',
    description: 'Expenses incurred but not yet paid',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '13',
    code: '2300',
    name: 'VAT Payable',
    type: 'Liability',
    description: 'Value Added Tax collected',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '14',
    code: '2400',
    name: 'Withholding Tax Payable',
    type: 'Liability',
    description: 'Taxes withheld from payments',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '15',
    code: '2500',
    name: 'SSS Payable',
    type: 'Liability',
    description: 'SSS contributions payable',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '16',
    code: '2600',
    name: 'PhilHealth Payable',
    type: 'Liability',
    description: 'PhilHealth contributions payable',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '17',
    code: '2700',
    name: 'Pag-IBIG Payable',
    type: 'Liability',
    description: 'Pag-IBIG contributions payable',
    isActive: true,
    createdAt: new Date()
  },

  // Equity (3000-3999)
  {
    id: '18',
    code: '3000',
    name: 'Owner\'s Capital',
    type: 'Equity',
    description: 'Owner\'s investment in the business',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '19',
    code: '3100',
    name: 'Owner\'s Drawing',
    type: 'Equity',
    description: 'Owner\'s withdrawals from the business',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '20',
    code: '3200',
    name: 'Retained Earnings',
    type: 'Equity',
    description: 'Accumulated profits not distributed',
    isActive: true,
    createdAt: new Date()
  },

  // Income (4000-4999)
  {
    id: '21',
    code: '4000',
    name: 'Sales Revenue',
    type: 'Income',
    description: 'Revenue from sales of goods',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '22',
    code: '4100',
    name: 'Service Revenue',
    type: 'Income',
    description: 'Revenue from services rendered',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '23',
    code: '4200',
    name: 'Interest Income',
    type: 'Income',
    description: 'Interest earned on bank deposits',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '24',
    code: '4300',
    name: 'Other Income',
    type: 'Income',
    description: 'Miscellaneous income',
    isActive: true,
    createdAt: new Date()
  },

  // Expenses (5000-5999)
  {
    id: '25',
    code: '5000',
    name: 'Cost of Goods Sold',
    type: 'Expense',
    description: 'Cost of merchandise sold',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '26',
    code: '5100',
    name: 'Salaries and Wages',
    type: 'Expense',
    description: 'Employee compensation',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '27',
    code: '5200',
    name: 'Rent Expense',
    type: 'Expense',
    description: 'Rental payments for premises',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '28',
    code: '5300',
    name: 'Utilities Expense',
    type: 'Expense',
    description: 'Electricity, water, internet, phone',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '29',
    code: '5400',
    name: 'Office Supplies',
    type: 'Expense',
    description: 'Office supplies and materials',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '30',
    code: '5500',
    name: 'Transportation Expense',
    type: 'Expense',
    description: 'Fuel, maintenance, travel',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '31',
    code: '5600',
    name: 'Advertising Expense',
    type: 'Expense',
    description: 'Marketing and promotional costs',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '32',
    code: '5700',
    name: 'Depreciation Expense',
    type: 'Expense',
    description: 'Depreciation on fixed assets',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '33',
    code: '5800',
    name: 'Insurance Expense',
    type: 'Expense',
    description: 'Business insurance premiums',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '34',
    code: '5900',
    name: 'Miscellaneous Expense',
    type: 'Expense',
    description: 'Other operating expenses',
    isActive: true,
    createdAt: new Date()
  }
];

const initialJournalEntries: JournalEntry[] = [
  {
    id: '1',
    date: new Date('2024-12-01'),
    reference: 'JE20241201001',
    description: 'Initial business investment',
    memo: 'Owner investment to start the business',
    lines: [
      { accountId: '2', debit: 100000, credit: 0, description: 'Initial cash deposit' },
      { accountId: '18', debit: 0, credit: 100000, description: 'Owner capital contribution' }
    ],
    createdAt: new Date('2024-12-01')
  },
  {
    id: '2',
    date: new Date('2024-12-02'),
    reference: 'JE20241202001',
    description: 'Purchase of office equipment',
    memo: 'Bought computer and printer for office use',
    lines: [
      { accountId: '7', debit: 25000, credit: 0, description: 'Computer and printer' },
      { accountId: '2', debit: 0, credit: 25000, description: 'Payment for equipment' }
    ],
    createdAt: new Date('2024-12-02')
  },
  {
    id: '3',
    date: new Date('2024-12-03'),
    reference: 'JE20241203001',
    description: 'Purchase of initial inventory',
    memo: 'First batch of products for resale',
    lines: [
      { accountId: '5', debit: 50000, credit: 0, description: 'Initial inventory purchase' },
      { accountId: '2', debit: 0, credit: 50000, description: 'Payment for inventory' }
    ],
    createdAt: new Date('2024-12-03')
  },
  {
    id: '4',
    date: new Date('2024-12-05'),
    reference: 'JE20241205001',
    description: 'Sales transaction',
    memo: 'First sale of the day',
    lines: [
      { accountId: '2', debit: 1200, credit: 0, description: 'Cash received from sale' },
      { accountId: '21', debit: 0, credit: 1000, description: 'Sales revenue' },
      { accountId: '13', debit: 0, credit: 120, description: 'VAT collected' },
      { accountId: '5', debit: 0, credit: 600, description: 'Cost of goods sold' },
      { accountId: '25', debit: 600, credit: 0, description: 'COGS expense' }
    ],
    createdAt: new Date('2024-12-05')
  },
  {
    id: '5',
    date: new Date('2024-12-06'),
    reference: 'JE20241206001',
    description: 'Payment of utilities',
    memo: 'Electricity and water bills',
    lines: [
      { accountId: '28', debit: 2500, credit: 0, description: 'Utilities expense' },
      { accountId: '2', debit: 0, credit: 2500, description: 'Payment for utilities' }
    ],
    createdAt: new Date('2024-12-06')
  }
];

const initialEmployees: Employee[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    firstName: 'Maria',
    lastName: 'Santos',
    middleName: 'Garcia',
    email: 'maria.santos@company.com',
    phone: '+639171234567',
    address: '123 Rizal Street',
    city: 'Manila',
    province: 'Metro Manila',
    zipCode: '1000',
    birthDate: new Date('1990-05-15'),
    hireDate: new Date('2023-01-15'),
    position: 'Sales Manager',
    department: 'Sales',
    employmentType: 'Regular',
    status: 'Active',
    basicSalary: 25000,
    allowances: [
      {
        id: '1',
        name: 'Transportation Allowance',
        amount: 2000,
        type: 'Fixed',
        isTaxable: false,
        description: 'Monthly transportation allowance'
      },
      {
        id: '2',
        name: 'Meal Allowance',
        amount: 1500,
        type: 'Fixed',
        isTaxable: false,
        description: 'Daily meal allowance'
      }
    ],
    sssNumber: '34-5678901-2',
    philhealthNumber: '1234-5678-9012',
    pagibigNumber: '1234-5678-9012',
    tinNumber: '123-456-789-000',
    bankName: 'BDO',
    bankAccountNumber: '1234567890',
    emergencyContact: {
      name: 'Juan Santos',
      relationship: 'Spouse',
      phone: '+639171234568'
    },
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-01-15')
  },
  {
    id: '2',
    employeeId: 'EMP002',
    firstName: 'Pedro',
    lastName: 'Cruz',
    middleName: 'Martinez',
    email: 'pedro.cruz@company.com',
    phone: '+639171234569',
    address: '456 Bonifacio Avenue',
    city: 'Quezon City',
    province: 'Metro Manila',
    zipCode: '1100',
    birthDate: new Date('1988-08-22'),
    hireDate: new Date('2023-03-01'),
    position: 'Cashier',
    department: 'Operations',
    employmentType: 'Regular',
    status: 'Active',
    basicSalary: 18000,
    allowances: [
      {
        id: '3',
        name: 'Transportation Allowance',
        amount: 1500,
        type: 'Fixed',
        isTaxable: false,
        description: 'Monthly transportation allowance'
      }
    ],
    sssNumber: '34-5678902-3',
    philhealthNumber: '1234-5678-9013',
    pagibigNumber: '1234-5678-9013',
    tinNumber: '123-456-789-001',
    bankName: 'BPI',
    bankAccountNumber: '0987654321',
    emergencyContact: {
      name: 'Ana Cruz',
      relationship: 'Sister',
      phone: '+639171234570'
    },
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-01')
  },
  {
    id: '3',
    employeeId: 'EMP003',
    firstName: 'Ana',
    lastName: 'Reyes',
    middleName: 'Lopez',
    email: 'ana.reyes@company.com',
    phone: '+639171234571',
    address: '789 Mabini Street',
    city: 'Makati',
    province: 'Metro Manila',
    zipCode: '1200',
    birthDate: new Date('1992-12-10'),
    hireDate: new Date('2023-06-01'),
    position: 'Inventory Clerk',
    department: 'Operations',
    employmentType: 'Regular',
    status: 'Active',
    basicSalary: 16000,
    allowances: [
      {
        id: '4',
        name: 'Transportation Allowance',
        amount: 1200,
        type: 'Fixed',
        isTaxable: false,
        description: 'Monthly transportation allowance'
      }
    ],
    sssNumber: '34-5678903-4',
    philhealthNumber: '1234-5678-9014',
    pagibigNumber: '1234-5678-9014',
    tinNumber: '123-456-789-002',
    bankName: 'UnionBank',
    bankAccountNumber: '1122334455',
    emergencyContact: {
      name: 'Carlos Reyes',
      relationship: 'Father',
      phone: '+639171234572'
    },
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01')
  }
];

const initialPayrollSettings: PayrollSettings = {
  id: '1',
  
  // SSS Rates (2024)
  sssEmployeeRate: 0.045, // 4.5%
  sssEmployerRate: 0.095, // 9.5%
  sssMaxContribution: 1800,
  
  // PhilHealth Rates (2024)
  philhealthEmployeeRate: 0.02, // 2%
  philhealthEmployerRate: 0.02, // 2%
  philhealthMinContribution: 400,
  philhealthMaxContribution: 1600,
  
  // Pag-IBIG Rates (2024)
  pagibigEmployeeRate: 0.02, // 2%
  pagibigEmployerRate: 0.02, // 2%
  pagibigMaxContribution: 100,
  
  // Overtime Rates
  regularOvertimeRate: 1.25,
  holidayOvertimeRate: 2.0,
  nightDifferentialRate: 1.1,
  
  // Leave Benefits
  vacationLeaveDays: 15,
  sickLeaveDays: 15,
  maternityLeaveDays: 105,
  paternityLeaveDays: 7,
  
  // 13th Month Pay
  thirteenthMonthPayMonth: 12,
  
  // Tax Settings (2024 Philippine Withholding Tax Table)
  withholdingTaxTable: [
    {
      id: '1',
      minAmount: 0,
      maxAmount: 250000,
      baseTax: 0,
      rate: 0,
      description: '0% - ₱0 to ₱250,000'
    },
    {
      id: '2',
      minAmount: 250000,
      maxAmount: 400000,
      baseTax: 0,
      rate: 0.20,
      description: '20% - ₱250,000 to ₱400,000'
    },
    {
      id: '3',
      minAmount: 400000,
      maxAmount: 800000,
      baseTax: 30000,
      rate: 0.25,
      description: '25% - ₱400,000 to ₱800,000'
    },
    {
      id: '4',
      minAmount: 800000,
      maxAmount: 2000000,
      baseTax: 130000,
      rate: 0.30,
      description: '30% - ₱800,000 to ₱2,000,000'
    },
    {
      id: '5',
      minAmount: 2000000,
      maxAmount: 8000000,
      baseTax: 490000,
      rate: 0.32,
      description: '32% - ₱2,000,000 to ₱8,000,000'
    },
    {
      id: '6',
      minAmount: 8000000,
      baseTax: 2410000,
      rate: 0.35,
      description: '35% - Above ₱8,000,000'
    }
  ],
  
  updatedAt: new Date()
};

export const useBusinessStore = create<BusinessStore>()(
  persist(
    (set, get) => ({
      // Initial state
      products: initialProducts,
      categories: initialCategories,
      customers: [],
      sales: [],
      cart: [],
      suppliers: initialSuppliers,
      purchaseOrders: [],
      expenses: [],
      expenseCategories: initialExpenseCategories,
      accounts: initialAccounts,
      journalEntries: initialJournalEntries,
      employees: initialEmployees,
      payrollPeriods: [],
      payrollEntries: [],
      leaveRecords: [],
      timeRecords: [],
      payrollSettings: initialPayrollSettings,
      isLoading: false,
      error: null,

      // Product actions
      addProduct: (productData) => {
        const product: Product = {
          ...productData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        set((state) => ({
          products: [...state.products, product]
        }));
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map(product =>
            product.id === id
              ? { ...product, ...updates, updatedAt: new Date() }
              : product
          )
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter(product => product.id !== id)
        }));
      },

      getProduct: (id) => {
        return get().products.find(product => product.id === id);
      },

      getProductsByCategoryId: (categoryId) => {
        return get().products.filter(product => product.category === categoryId && product.isActive);
      },

      updateStock: (productId, quantity) => {
        set((state) => ({
          products: state.products.map(product =>
            product.id === productId
              ? { ...product, stock: product.stock + quantity, updatedAt: new Date() }
              : product
          )
        }));
      },

      // Category actions
      addCategory: (categoryData) => {
        const category: Category = {
          ...categoryData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          categories: [...state.categories, category]
        }));
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map(category =>
            category.id === id ? { ...category, ...updates } : category
          )
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter(category => category.id !== id)
        }));
      },

      getCategory: (id) => {
        return get().categories.find(category => category.id === id);
      },

      // Customer actions
      fetchCustomers: async () => {
        set({ isLoading: true, error: null });
        const { data, error } = await supaGetCustomers();
        if (!error) set({ customers: data || [], isLoading: false });
        else set({ error: error.message, isLoading: false });
      },

      addCustomer: async (customerData) => {
        set({ isLoading: true, error: null });
        const { data, error } = await supaCreateCustomer(customerData);
        if (!error && data) set((state) => ({ customers: [...state.customers, data], isLoading: false }));
        else set({ error: error?.message, isLoading: false });
      },

      updateCustomer: async (id, updates) => {
        set({ isLoading: true, error: null });
        const { data, error } = await supaUpdateCustomer(id, updates);
        if (!error && data) set((state) => ({
          customers: state.customers.map(c => c.id === id ? data : c),
          isLoading: false
        }));
        else set({ error: error?.message, isLoading: false });
      },

      deleteCustomer: async (id) => {
        set({ isLoading: true, error: null });
        const { error } = await supaDeleteCustomer(id);
        if (!error) set((state) => ({
          customers: state.customers.filter(c => c.id !== id),
          isLoading: false
        }));
        else set({ error: error?.message, isLoading: false });
      },

      getCustomer: (id) => {
        return get().customers.find(customer => customer.id === id);
      },

      // Cart actions
      addToCart: (product, quantity) => {
        set((state) => {
          const existingItem = state.cart.find(item => item.product.id === product.id);
          
          if (existingItem) {
            return {
              cart: state.cart.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * product.price }
                  : item
              )
            };
          } else {
            return {
              cart: [...state.cart, {
                product,
                quantity,
                total: quantity * product.price
              }]
            };
          }
        });
      },

      updateCartItem: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        
        set((state) => ({
          cart: state.cart.map(item =>
            item.product.id === productId
              ? { ...item, quantity, total: quantity * item.product.price }
              : item
          )
        }));
      },

      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter(item => item.product.id !== productId)
        }));
      },

      clearCart: () => {
        set({ cart: [] });
      },

      getCartSubtotal: () => {
        return get().cart.reduce((total, item) => total + item.total, 0);
      },

      getCartTax: () => {
        const subtotal = get().getCartSubtotal();
        return subtotal * 0.12; // 12% VAT
      },

      getCartTotal: () => {
        return get().getCartSubtotal() + get().getCartTax();
      },

      // Sale actions
      createSale: (saleData) => {
        const sale: Sale = {
          ...saleData,
          id: generateId(),
          invoiceNumber: generateInvoiceNumber(),
          createdAt: new Date()
        };
        
        set((state) => ({
          sales: [...state.sales, sale]
        }));

        // Update product stock
        sale.items.forEach(item => {
          get().updateStock(item.productId, -item.quantity);
        });

        // Clear cart after sale
        get().clearCart();
      },

      updateSale: (id, updates) => {
        set((state) => ({
          sales: state.sales.map(sale =>
            sale.id === id ? { ...sale, ...updates } : sale
          )
        }));
      },

      getSale: (id) => {
        return get().sales.find(sale => sale.id === id);
      },

      getSalesByCustomer: (customerId) => {
        return get().sales.filter(sale => sale.customerId === customerId);
      },

      // Supplier actions
      addSupplier: (supplierData) => {
        const supplier: Supplier = {
          ...supplierData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          suppliers: [...state.suppliers, supplier]
        }));
      },

      updateSupplier: (id, updates) => {
        set((state) => ({
          suppliers: state.suppliers.map(supplier =>
            supplier.id === id ? { ...supplier, ...updates } : supplier
          )
        }));
      },

      deleteSupplier: (id) => {
        set((state) => ({
          suppliers: state.suppliers.filter(supplier => supplier.id !== id)
        }));
      },

      getSupplier: (id) => {
        return get().suppliers.find(supplier => supplier.id === id);
      },

      // Purchase Order actions
      addPurchaseOrder: (poData) => {
        const purchaseOrder: PurchaseOrder = {
          ...poData,
          id: generateId(),
          poNumber: generatePONumber(),
          createdAt: new Date()
        };
        set((state) => ({
          purchaseOrders: [...state.purchaseOrders, purchaseOrder]
        }));
      },

      updatePurchaseOrder: (id, updates) => {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map(po =>
            po.id === id ? { ...po, ...updates } : po
          )
        }));
      },

      getPurchaseOrder: (id) => {
        return get().purchaseOrders.find(po => po.id === id);
      },

      deletePurchaseOrder: (id) => {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter(po => po.id !== id)
        }));
      },

      // Expense actions
      addExpense: (expenseData) => {
        const expense: Expense = {
          ...expenseData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          expenses: [...state.expenses, expense]
        }));
      },

      updateExpense: (id, updates) => {
        set((state) => ({
          expenses: state.expenses.map(expense =>
            expense.id === id ? { ...expense, ...updates } : expense
          )
        }));
      },

      deleteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter(expense => expense.id !== id)
        }));
      },

      getExpense: (id) => {
        return get().expenses.find(expense => expense.id === id);
      },

      // Expense Category actions
      addExpenseCategory: (categoryData) => {
        const category: ExpenseCategory = {
          ...categoryData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          expenseCategories: [...state.expenseCategories, category]
        }));
      },

      updateExpenseCategory: (id, updates) => {
        set((state) => ({
          expenseCategories: state.expenseCategories.map(category =>
            category.id === id ? { ...category, ...updates } : category
          )
        }));
      },

      deleteExpenseCategory: (id) => {
        set((state) => ({
          expenseCategories: state.expenseCategories.filter(category => category.id !== id)
        }));
      },

      getExpenseCategory: (id) => {
        return get().expenseCategories.find(category => category.id === id);
      },

      // Account actions
      addAccount: (accountData) => {
        const account: Account = {
          ...accountData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          accounts: [...state.accounts, account]
        }));
      },

      updateAccount: (id, updates) => {
        set((state) => ({
          accounts: state.accounts.map(account =>
            account.id === id ? { ...account, ...updates } : account
          )
        }));
      },

      deleteAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter(account => account.id !== id)
        }));
      },

      getAccount: (id) => {
        return get().accounts.find(account => account.id === id);
      },

      // Journal Entry actions
      addJournalEntry: (entryData) => {
        const entry: JournalEntry = {
          ...entryData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          journalEntries: [...state.journalEntries, entry]
        }));
      },

      updateJournalEntry: (id, updates) => {
        set((state) => ({
          journalEntries: state.journalEntries.map(entry =>
            entry.id === id ? { ...entry, ...updates } : entry
          )
        }));
      },

      deleteJournalEntry: (id) => {
        set((state) => ({
          journalEntries: state.journalEntries.filter(entry => entry.id !== id)
        }));
      },

      getJournalEntry: (id) => {
        return get().journalEntries.find(entry => entry.id === id);
      },

      // Employee actions
      addEmployee: (employeeData) => {
        const employee: Employee = {
          ...employeeData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        set((state) => ({
          employees: [...state.employees, employee]
        }));
      },

      updateEmployee: (id, updates) => {
        set((state) => ({
          employees: state.employees.map(employee =>
            employee.id === id ? { ...employee, ...updates, updatedAt: new Date() } : employee
          )
        }));
      },

      deleteEmployee: (id) => {
        set((state) => ({
          employees: state.employees.filter(employee => employee.id !== id)
        }));
      },

      getEmployee: (id) => {
        return get().employees.find(employee => employee.id === id);
      },

      // Payroll Period actions
      addPayrollPeriod: (periodData) => {
        const period: PayrollPeriod = {
          ...periodData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          payrollPeriods: [...state.payrollPeriods, period]
        }));
      },

      updatePayrollPeriod: (id, updates) => {
        set((state) => ({
          payrollPeriods: state.payrollPeriods.map(period =>
            period.id === id ? { ...period, ...updates } : period
          )
        }));
      },

      deletePayrollPeriod: (id) => {
        set((state) => ({
          payrollPeriods: state.payrollPeriods.filter(period => period.id !== id)
        }));
      },

      getPayrollPeriod: (id) => {
        return get().payrollPeriods.find(period => period.id === id);
      },

      // Payroll Entry actions
      addPayrollEntry: (entryData) => {
        const entry: PayrollEntry = {
          ...entryData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        set((state) => ({
          payrollEntries: [...state.payrollEntries, entry]
        }));
      },

      updatePayrollEntry: (id, updates) => {
        set((state) => ({
          payrollEntries: state.payrollEntries.map(entry =>
            entry.id === id ? { ...entry, ...updates, updatedAt: new Date() } : entry
          )
        }));
      },

      deletePayrollEntry: (id) => {
        set((state) => ({
          payrollEntries: state.payrollEntries.filter(entry => entry.id !== id)
        }));
      },

      getPayrollEntry: (id) => {
        return get().payrollEntries.find(entry => entry.id === id);
      },

      // Leave Record actions
      addLeaveRecord: (leaveData) => {
        const leave: LeaveRecord = {
          ...leaveData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          leaveRecords: [...state.leaveRecords, leave]
        }));
      },

      updateLeaveRecord: (id, updates) => {
        set((state) => ({
          leaveRecords: state.leaveRecords.map(leave =>
            leave.id === id ? { ...leave, ...updates } : leave
          )
        }));
      },

      deleteLeaveRecord: (id) => {
        set((state) => ({
          leaveRecords: state.leaveRecords.filter(leave => leave.id !== id)
        }));
      },

      getLeaveRecord: (id) => {
        return get().leaveRecords.find(leave => leave.id === id);
      },

      // Time Record actions
      addTimeRecord: (timeData) => {
        const time: TimeRecord = {
          ...timeData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          timeRecords: [...state.timeRecords, time]
        }));
      },

      updateTimeRecord: (id, updates) => {
        set((state) => ({
          timeRecords: state.timeRecords.map(time =>
            time.id === id ? { ...time, ...updates } : time
          )
        }));
      },

      deleteTimeRecord: (id) => {
        set((state) => ({
          timeRecords: state.timeRecords.filter(time => time.id !== id)
        }));
      },

      getTimeRecord: (id) => {
        return get().timeRecords.find(time => time.id === id);
      },

      // Payroll Settings actions
      updatePayrollSettings: (updates) => {
        set((state) => ({
          payrollSettings: { ...state.payrollSettings, ...updates }
        }));
      },

      getPayrollSettings: () => {
        return get().payrollSettings;
      },

      // Utility actions
      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'fbms-business',
      partialize: (state) => ({
        products: state.products,
        categories: state.categories,
        customers: state.customers,
        sales: state.sales,
        suppliers: state.suppliers,
        purchaseOrders: state.purchaseOrders,
        expenses: state.expenses,
        expenseCategories: state.expenseCategories,
        accounts: state.accounts,
        journalEntries: state.journalEntries,
        employees: state.employees,
        payrollPeriods: state.payrollPeriods,
        payrollEntries: state.payrollEntries,
        leaveRecords: state.leaveRecords,
        timeRecords: state.timeRecords,
        payrollSettings: state.payrollSettings
      })
    }
  )
);