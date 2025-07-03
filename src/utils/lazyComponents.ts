import { lazy } from 'react';

// Lazy load heavy components to improve initial load time
export const LazyDashboard = lazy(() => import('../components/Dashboard'));

// Standard versions
export const LazyPOSSystem = lazy(() => import('../components/pos/POSSystem'));
export const LazyInventoryManagement = lazy(() => import('../components/inventory/InventoryManagement'));
export const LazyPurchaseManagement = lazy(() => import('../components/purchases/PurchaseManagement'));
export const LazyAccountingManagement = lazy(() => import('../components/accounting/AccountingManagement'));
export const LazyReportsDashboard = lazy(() => import('../components/reports/ReportsDashboard'));

// Enhanced versions
export const LazyEnhancedPOSSystem = lazy(() => import('../components/pos/EnhancedPOSSystem'));
export const LazyEnhancedInventoryManagement = lazy(() => import('../components/inventory/EnhancedInventoryManagement'));
export const LazyEnhancedPurchaseManagement = lazy(() => import('../components/purchases/EnhancedPurchaseManagement'));
export const LazyEnhancedAccountingManagement = lazy(() => import('../components/accounting/EnhancedAccountingManagement'));
export const LazyEnhancedReportsDashboard = lazy(() => import('../components/reports/EnhancedReportsDashboard'));

// Other components
export const LazyExpenseTracking = lazy(() => import('../components/expenses/ExpenseTracking'));
export const LazyPayrollManagement = lazy(() => import('../components/payroll/PayrollManagement'));
export const LazyBIRForms = lazy(() => import('../components/bir/BIRForms'));
export const LazyBranchManagement = lazy(() => import('../components/branches/BranchManagement'));
export const LazySettingsPage = lazy(() => import('../components/settings/SettingsPage'));

// Customer management
export const LazyCustomerManagement = lazy(() => 
  import('../components/customers/CustomerManagement')
);

// Manager operations
export const LazyManagerOperations = lazy(() => 
  import('../components/manager/ManagerOperations')
);

// Cashier POS
export const LazyCashierPOS = lazy(() => 
  import('../components/pos/CashierPOS')
);

// Marketing and Loyalty
export const LazyMarketingCampaigns = lazy(() => 
  import('../components/marketing/MarketingCampaigns')
);

export const LazyLoyaltyPrograms = lazy(() => 
  import('../components/loyalty/LoyaltyPrograms')
);

// Payment Integrations
export const LazyGCashIntegration = lazy(() => 
  import('../components/payments/GCashIntegration')
);

export const LazyPayMayaIntegration = lazy(() => 
  import('../components/payments/PayMayaIntegration')
);

// Cloud Backup
export const LazyCloudBackup = lazy(() => 
  import('../components/backup/CloudBackup')
);

// Electronic Receipts
export const LazyElectronicReceipts = lazy(() => 
  import('../components/receipts/ElectronicReceipts')
);