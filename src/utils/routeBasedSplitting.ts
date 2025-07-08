import { lazy, ComponentType } from 'react';

/**
 * Enhanced lazy loading with preloading capabilities
 */
export interface LazyLoadedComponent<T = Record<string, unknown>> {
  component: React.LazyExoticComponent<ComponentType<T>>;
  preload: () => Promise<{ default: ComponentType<T> }>;
}

/**
 * Creates a lazy component with preloading capability
 */
function createLazyComponent<T = Record<string, unknown>>(
  importFunction: () => Promise<{ default: ComponentType<T> }>
): LazyLoadedComponent<T> {
  const component = lazy(importFunction);
  
  return {
    component,
    preload: importFunction
  };
}

// Core business components (high priority)
export const CoreComponents = {
  Dashboard: createLazyComponent(() => import('../components/Dashboard')),
  POSSystem: createLazyComponent(() => import('../components/pos/POSSystem')),
  InventoryManagement: createLazyComponent(() => import('../components/inventory/InventoryManagement')),
  CustomerManagement: createLazyComponent(() => import('../components/customers/CustomerManagement')),
} as const;

// Enhanced components (medium priority)
export const EnhancedComponents = {
  EnhancedPOSSystem: createLazyComponent(() => import('../components/pos/EnhancedPOSSystem')),
  EnhancedInventoryManagement: createLazyComponent(() => import('../components/inventory/EnhancedInventoryManagement')),
  EnhancedPurchaseManagement: createLazyComponent(() => import('../components/purchases/EnhancedPurchaseManagement')),
  EnhancedAccountingManagement: createLazyComponent(() => import('../components/accounting/EnhancedAccountingManagement')),
  EnhancedReportsDashboard: createLazyComponent(() => import('../components/reports/EnhancedReportsDashboard')),
} as const;

// Standard components (medium priority)
export const StandardComponents = {
  PurchaseManagement: createLazyComponent(() => import('../components/purchases/PurchaseManagement')),
  AccountingManagement: createLazyComponent(() => import('../components/accounting/AccountingManagement')),
  ReportsDashboard: createLazyComponent(() => import('../components/reports/ReportsDashboard')),
  ExpenseTracking: createLazyComponent(() => import('../components/expenses/ExpenseTracking')),
  PayrollManagement: createLazyComponent(() => import('../components/payroll/PayrollManagement')),
} as const;

// Compliance components (low priority)
export const ComplianceComponents = {
  BIRForms: createLazyComponent(() => import('../components/bir/BIRForms')),
} as const;

// Management components (low priority)
export const ManagementComponents = {
  BranchManagement: createLazyComponent(() => import('../components/branches/BranchManagement')),
  ManagerOperations: createLazyComponent(() => import('../components/manager/ManagerOperations')),
  SettingsPage: createLazyComponent(() => import('../components/settings/SettingsPage')),
} as const;

// Specialized components (lowest priority)
export const SpecializedComponents = {
  CashierPOS: createLazyComponent(() => import('../components/pos/CashierPOS')),
  MarketingCampaigns: createLazyComponent(() => import('../components/marketing/MarketingCampaigns')),
  LoyaltyPrograms: createLazyComponent(() => import('../components/loyalty/LoyaltyPrograms')),
  CloudBackup: createLazyComponent(() => import('../components/backup/CloudBackup')),
} as const;

// Admin components (restricted access)
export const AdminComponents = {
  UserRoleManagement: createLazyComponent(() => import('../components/admin/LazyAdminComponents').then(m => ({ default: m.LazyUserRoleManagement }))),
  SupplierManagement: createLazyComponent(() => import('../components/admin/LazyAdminComponents').then(m => ({ default: m.LazySupplierManagement }))),
  DataHistoryTracking: createLazyComponent(() => import('../components/admin/LazyAdminComponents').then(m => ({ default: m.LazyDataHistoryTracking }))),
  CustomerTransactionInterface: createLazyComponent(() => import('../components/admin/LazyAdminComponents').then(m => ({ default: m.LazyCustomerTransactionInterface }))),
} as const;

/**
 * Preload strategy based on user role and usage patterns
 */
export class ComponentPreloader {
  private preloadedComponents = new Set<string>();
  
  /**
   * Preload core components immediately after app load
   */
  async preloadCoreComponents(): Promise<void> {
    const corePromises = Object.entries(CoreComponents).map(async ([name, { preload }]) => {
      if (!this.preloadedComponents.has(name)) {
        try {
          await preload();
          this.preloadedComponents.add(name);
        } catch (error) {
          console.warn(`Failed to preload core component ${name}:`, error);
        }
      }
    });
    
    await Promise.allSettled(corePromises);
  }
  
  /**
   * Preload components based on user role
   */
  async preloadByUserRole(role: string): Promise<void> {
    let componentsToPreload: Record<string, LazyLoadedComponent> = {};
    
    switch (role) {
      case 'admin':
        componentsToPreload = { 
          ...StandardComponents, 
          ...ManagementComponents, 
          ...AdminComponents 
        };
        break;
      case 'manager':
        componentsToPreload = { 
          ...StandardComponents, 
          ...ManagementComponents 
        };
        break;
      case 'cashier':
        componentsToPreload = { 
          ...SpecializedComponents 
        };
        break;
      case 'employee':
        componentsToPreload = { 
          ...StandardComponents 
        };
        break;
      default:
        componentsToPreload = StandardComponents;
    }
    
    const preloadPromises = Object.entries(componentsToPreload).map(async ([name, { preload }]) => {
      if (!this.preloadedComponents.has(name)) {
        try {
          await preload();
          this.preloadedComponents.add(name);
        } catch (error) {
          console.warn(`Failed to preload component ${name} for role ${role}:`, error);
        }
      }
    });
    
    await Promise.allSettled(preloadPromises);
  }
  
  /**
   * Preload enhanced versions when user enables them
   */
  async preloadEnhancedComponents(): Promise<void> {
    const enhancedPromises = Object.entries(EnhancedComponents).map(async ([name, { preload }]) => {
      if (!this.preloadedComponents.has(name)) {
        try {
          await preload();
          this.preloadedComponents.add(name);
        } catch (error) {
          console.warn(`Failed to preload enhanced component ${name}:`, error);
        }
      }
    });
    
    await Promise.allSettled(enhancedPromises);
  }
  
  /**
   * Preload component on hover (for navigation items)
   */
  async preloadOnHover(componentGroup: keyof typeof AllComponents, componentName: string): Promise<void> {
    const component = AllComponents[componentGroup]?.[componentName];
    if (component && !this.preloadedComponents.has(componentName)) {
      try {
        await component.preload();
        this.preloadedComponents.add(componentName);
      } catch (error) {
        console.warn(`Failed to preload component ${componentName} on hover:`, error);
      }
    }
  }
  
  /**
   * Get preload status
   */
  isPreloaded(componentName: string): boolean {
    return this.preloadedComponents.has(componentName);
  }
  
  /**
   * Clear preload cache
   */
  clearCache(): void {
    this.preloadedComponents.clear();
  }
}

// Combined components object for easy access
export const AllComponents = {
  Core: CoreComponents,
  Enhanced: EnhancedComponents,
  Standard: StandardComponents,
  Compliance: ComplianceComponents,
  Management: ManagementComponents,
  Specialized: SpecializedComponents,
  Admin: AdminComponents,
} as const;

// Global preloader instance
export const componentPreloader = new ComponentPreloader();

/**
 * Hook for component preloading
 */
export function useComponentPreloader() {
  return {
    preloadCoreComponents: () => componentPreloader.preloadCoreComponents(),
    preloadByUserRole: (role: string) => componentPreloader.preloadByUserRole(role),
    preloadEnhancedComponents: () => componentPreloader.preloadEnhancedComponents(),
    preloadOnHover: (group: keyof typeof AllComponents, name: string) => 
      componentPreloader.preloadOnHover(group, name),
    isPreloaded: (name: string) => componentPreloader.isPreloaded(name),
    clearCache: () => componentPreloader.clearCache(),
  };
}