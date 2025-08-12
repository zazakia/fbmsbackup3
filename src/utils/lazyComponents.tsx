import React, { lazy, ComponentType } from 'react';
import { ModuleLoadingManager } from '../services/ModuleLoadingManager';
import type { ModuleConfig } from '../types/moduleLoading';

// Enhanced module loading with integrated error handling and performance monitoring
const moduleLoadingManager = new ModuleLoadingManager();

/**
 * Enhanced lazy loading function with integrated module loading management
 */
function createEnhancedLazyComponent<T extends ComponentType<any>>(
  moduleConfig: ModuleConfig,
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      // Use direct import for now to avoid React.lazy format issues
      return await importFn();
    } catch (error) {
      console.error(`Failed to load module ${moduleConfig.id}:`, error);
      // Return a fallback error component
      return {
        default: (() => {
          return function ModuleLoadError() {
            return (
              <div className="p-4 text-center">
                <h3 className="text-lg font-semibold text-red-600">Module Load Error</h3>
                <p className="text-gray-600">Failed to load {moduleConfig.name}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Reload Page
                </button>
              </div>
            );
          };
        })() as T
      };
    }
  });
}

// Module configurations for enhanced loading
const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    component: 'Dashboard',
    path: '/dashboard',
    requiredPermissions: ['dashboard'],
    requiredRole: 'employee',
    timeout: 3000,
    retryable: true,
    priority: 'high',
    estimatedSize: 120000 // 120KB
  },
  
  pos: {
    id: 'pos',
    name: 'Enhanced POS System',
    component: 'EnhancedPOSSystem',
    path: '/pos',
    requiredPermissions: ['pos'],
    requiredRole: 'employee',
    timeout: 4000,
    retryable: true,
    priority: 'high',
    estimatedSize: 250000 // 250KB
  },
  
  inventory: {
    id: 'inventory',
    name: 'Enhanced Inventory Management',
    component: 'EnhancedInventoryManagement',
    path: '/inventory',
    requiredPermissions: ['inventory'],
    requiredRole: 'employee',
    timeout: 4000,
    retryable: true,
    priority: 'high',
    estimatedSize: 300000 // 300KB
  },
  productCategories: {
    id: 'product-categories',
    name: 'Product Categories',
    component: 'CategoryManager',
    path: '/product-categories',
    requiredPermissions: ['inventory'],
    requiredRole: 'employee',
    timeout: 3000,
    retryable: true,
    priority: 'medium',
    estimatedSize: 120000
  },
  
  purchases: {
    id: 'purchases',
    name: 'Enhanced Purchase Management',
    component: 'EnhancedPurchaseManagement',
    path: '/purchases',
    requiredPermissions: ['purchases'],
    requiredRole: 'employee',
    timeout: 5000,
    retryable: true,
    priority: 'high',
    estimatedSize: 400000 // 400KB
  },
  
  accounting: {
    id: 'accounting',
    name: 'Enhanced Accounting Management',
    component: 'EnhancedAccountingManagement',
    path: '/accounting',
    requiredPermissions: ['accounting'],
    requiredRole: 'accountant',
    timeout: 5000,
    retryable: true,
    priority: 'high',
    estimatedSize: 350000 // 350KB
  },
  
  reports: {
    id: 'reports',
    name: 'Enhanced Reports Dashboard',
    component: 'EnhancedReportsDashboard',
    path: '/reports',
    requiredPermissions: ['reports'],
    requiredRole: 'employee',
    timeout: 6000,
    retryable: true,
    priority: 'medium',
    estimatedSize: 280000 // 280KB
  },
  
  expenses: {
    id: 'expenses',
    name: 'Expense Tracking',
    component: 'ExpenseTracking',
    path: '/expenses',
    requiredPermissions: ['expenses'],
    requiredRole: 'employee',
    timeout: 3000,
    retryable: true,
    priority: 'high',
    estimatedSize: 180000 // 180KB
  },
  
  payroll: {
    id: 'payroll',
    name: 'Payroll Management',
    component: 'PayrollManagement',
    path: '/payroll',
    requiredPermissions: ['payroll'],
    requiredRole: 'manager',
    timeout: 4000,
    retryable: true,
    priority: 'medium',
    estimatedSize: 220000 // 220KB
  },
  
  birForms: {
    id: 'bir-forms',
    name: 'BIR Forms',
    component: 'BIRForms',
    path: '/bir-forms',
    requiredPermissions: ['accounting'],
    requiredRole: 'accountant',
    timeout: 5000,
    retryable: true,
    priority: 'medium',
    estimatedSize: 320000 // 320KB
  },
  
  operations: {
    id: 'operations',
    name: 'Manager Operations',
    component: 'ManagerOperations',
    path: '/operations',
    requiredPermissions: ['operations'],
    requiredRole: 'manager',
    timeout: 4000,
    retryable: true,
    priority: 'medium',
    estimatedSize: 200000 // 200KB
  },
  
  cloudBackup: {
    id: 'cloud-backup',
    name: 'Cloud Backup',
    component: 'CloudBackup',
    path: '/backup',
    requiredPermissions: ['backup'],
    requiredRole: 'admin',
    timeout: 5000,
    retryable: true,
    priority: 'low',
    estimatedSize: 150000 // 150KB
  }
};

// Enhanced lazy components with integrated loading management
export const LazyDashboard = createEnhancedLazyComponent(
  MODULE_CONFIGS.dashboard,
  () => import('../components/Dashboard')
);

// Enhanced versions with integrated error handling
export const LazyEnhancedPOSSystem = createEnhancedLazyComponent(
  MODULE_CONFIGS.pos,
  () => import('../components/pos/EnhancedPOSSystem')
);

export const LazyEnhancedInventoryManagement = createEnhancedLazyComponent(
  MODULE_CONFIGS.inventory,
  () => import('../components/inventory/EnhancedInventoryManagement')
);

// Product Categories
export const LazyProductCategories = createEnhancedLazyComponent(
  MODULE_CONFIGS.productCategories,
  () => import('../components/inventory/CategoryManager')
);

export const LazyEnhancedPurchaseManagement = createEnhancedLazyComponent(
  MODULE_CONFIGS.purchases,
  () => import('../components/purchases/EnhancedPurchaseManagement')
);

export const LazyEnhancedAccountingManagement = createEnhancedLazyComponent(
  MODULE_CONFIGS.accounting,
  () => import('../components/accounting/EnhancedAccountingManagement')
);

export const LazyEnhancedReportsDashboard = createEnhancedLazyComponent(
  MODULE_CONFIGS.reports,
  () => import('../components/reports/EnhancedReportsDashboard')
);

// Critical business modules with enhanced loading
export const LazyExpenseTracking = createEnhancedLazyComponent(
  MODULE_CONFIGS.expenses,
  () => import('../components/expenses/ExpenseTracking')
);

export const LazyPayrollManagement = createEnhancedLazyComponent(
  MODULE_CONFIGS.payroll,
  () => import('../components/payroll/PayrollManagement')
);

export const LazyBIRForms = createEnhancedLazyComponent(
  MODULE_CONFIGS.birForms,
  () => import('../components/bir/BIRForms')
);

export const LazyManagerOperations = createEnhancedLazyComponent(
  MODULE_CONFIGS.operations,
  () => import('../components/manager/ManagerOperations')
);

export const LazyCloudBackup = createEnhancedLazyComponent(
  MODULE_CONFIGS.cloudBackup,
  () => import('../components/backup/CloudBackup')
);

export const LazyReceivingModule = createEnhancedLazyComponent(
  MODULE_CONFIGS.receiving,
  () => import('../modules/receiving/ReceivingModule')
);

// Standard lazy components (maintaining backward compatibility)
export const LazyBranchManagement = lazy(() => import('../components/branches/BranchManagement'));
export const LazySettingsPage = lazy(() => import('../components/settings/SettingsPage'));
export const LazySalesHistory = lazy(() => import('../components/sales/SalesHistory'));

// Customer management
export const LazyCustomerManagement = lazy(() => 
  import('../components/customers/CustomerManagement')
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

// Electronic Receipts
export const LazyElectronicReceipts = lazy(() => 
  import('../components/receipts/ElectronicReceipts')
);

// Product History
export const LazyProductHistory = lazy(() => 
  import('../components/inventory/ProductHistory')
);

// Help Module
export const LazyHelpModule = lazy(() => 
  import('../components/help/HelpModule')
);

/**
 * Get module configuration by ID
 */
export function getModuleConfig(moduleId: string): ModuleConfig | undefined {
  return MODULE_CONFIGS[moduleId];
}

/**
 * Get all available module configurations
 */
export function getAllModuleConfigs(): ModuleConfig[] {
  return Object.values(MODULE_CONFIGS);
}

/**
 * Preload critical modules for specific user role
 */
export async function preloadCriticalModules(userRole: string): Promise<void> {
  const criticalModules = getAllModuleConfigs()
    .filter(config => config.priority === 'high')
    .filter(config => moduleLoadingManager.hasAccess(config, userRole));

  await moduleLoadingManager.preloadModules(criticalModules);
}

/**
 * Get module loading statistics
 */
export function getModuleLoadingStats(): {
  totalModules: number;
  loadedModules: number;
  cachedModules: number;
  failedModules: number;
} {
  return moduleLoadingManager.getGlobalStats();
}