src/
├── components/                    # React components
│   ├── accounting/               # Financial accounting modules
│   │   ├── AccountingManagement.tsx    # Main accounting interface
│   │   ├── ChartOfAccounts.tsx         # Chart of accounts management
│   │   ├── JournalEntries.tsx          # Journal entries list
│   │   ├── JournalEntryForm.tsx        # Journal entry creation/editing
│   │   └── AccountForm.tsx             # Account creation/editing
│   ├── auth/                     # Authentication components
│   │   ├── __tests__/
│   │   │   └── LoginForm.test.tsx      # Login form tests
│   │   ├── AuthPage.tsx               # Authentication page wrapper
│   │   ├── LoginForm.tsx              # Login form component
│   │   └── RegisterForm.tsx           # Registration form component
│   ├── bir/                      # BIR compliance modules
│   │   └── BIRForms.tsx               # BIR forms and compliance
│   ├── branches/                 # Multi-branch management
│   │   └── BranchManagement.tsx       # Branch management interface
│   ├── expenses/                 # Expense tracking modules
│   │   ├── ExpenseCategories.tsx      # Expense category management
│   │   ├── ExpenseForm.tsx            # Expense creation/editing
│   │   ├── ExpenseList.tsx            # Expense list view
│   │   └── ExpenseTracking.tsx        # Main expense tracking interface
│   ├── inventory/                # Inventory management modules
│   │   ├── CategoryManager.tsx        # Product category management
│   │   ├── InventoryManagement.tsx    # Main inventory interface
│   │   ├── ProductForm.tsx            # Product creation/editing
│   │   └── ProductList.tsx            # Product list view
│   ├── payroll/                  # Payroll system modules
│   │   ├── EmployeeForm.tsx           # Employee creation/editing
│   │   ├── EmployeeList.tsx           # Employee list view
│   │   └── PayrollManagement.tsx      # Main payroll interface
│   ├── pos/                      # Point of Sale modules
│   │   ├── Cart.tsx                   # Shopping cart component
│   │   ├── CustomerSelector.tsx       # Customer selection
│   │   ├── PaymentModal.tsx           # Payment processing modal
│   │   ├── POSSystem.tsx              # Main POS interface
│   │   └── ProductGrid.tsx            # Product grid for POS
│   ├── purchases/                 # Purchase management modules
│   │   ├── PurchaseManagement.tsx     # Main purchase interface
│   │   ├── PurchaseOrderForm.tsx      # Purchase order creation
│   │   ├── PurchaseOrderList.tsx      # Purchase order list
│   │   ├── SupplierForm.tsx           # Supplier creation/editing
│   │   └── SupplierList.tsx           # Supplier list view
│   ├── reports/                  # Reporting & analytics
│   │   └── ReportsDashboard.tsx       # Main reports dashboard
│   ├── Dashboard.tsx             # Main dashboard component
│   ├── Header.tsx                # Application header
│   ├── ProtectedRoute.tsx        # Route protection component
│   ├── QuickActions.tsx          # Quick action buttons
│   ├── RecentTransactions.tsx    # Recent transactions widget
│   ├── SalesChart.tsx            # Sales chart component
│   ├── Sidebar.tsx               # Navigation sidebar
│   ├── StatsCard.tsx             # Statistics card component
│   └── TopProducts.tsx           # Top products widget
├── store/                        # State management (Zustand)
│   ├── __tests__/
│   │   └── authStore.test.ts          # Auth store tests
│   ├── authStore.ts              # Authentication state management
│   └── businessStore.ts          # Business data state management
├── types/                        # TypeScript type definitions
│   ├── auth.ts                   # Authentication types
│   └── business.ts               # Business entity types
├── utils/                        # Utility functions
│   ├── __tests__/
│   │   └── auth.test.ts               # Auth utility tests
│   └── auth.ts                   # Authentication utilities
├── test/                         # Test configuration
│   └── setup.ts                  # Test setup configuration
├── App.tsx                       # Main application component
├── index.css                     # Global styles
├── main.tsx                      # Application entry point
└── vite-env.d.ts                 # Vite environment types