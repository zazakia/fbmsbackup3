import { lazy } from 'react';

// Lazy load heavy components to improve initial load time
export const LazyDashboard = lazy(() => import('../components/Dashboard'));
export const LazyPOSSystem = lazy(() => import('../components/pos/POSSystem'));
export const LazyInventoryManagement = lazy(() => import('../components/inventory/InventoryManagement'));
export const LazyPurchaseManagement = lazy(() => import('../components/purchases/PurchaseManagement'));
export const LazyExpenseTracking = lazy(() => import('../components/expenses/ExpenseTracking'));
export const LazyAccountingManagement = lazy(() => import('../components/accounting/AccountingManagement'));
export const LazyPayrollManagement = lazy(() => import('../components/payroll/PayrollManagement'));
export const LazyReportsDashboard = lazy(() => import('../components/reports/ReportsDashboard'));
export const LazyBIRForms = lazy(() => import('../components/bir/BIRForms'));
export const LazyBranchManagement = lazy(() => import('../components/branches/BranchManagement'));
export const LazySettingsPage = lazy(() => import('../components/settings/SettingsPage'));

// Customer management
export const LazyCustomerManagement = lazy(() => 
  import('../components/customers/CustomerManagement')
);