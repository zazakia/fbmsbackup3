import { lazy } from 'react';

// Lazy load admin and management components
export const LazyUserRoleManagement = lazy(() => import('./UserRoleManagement'));
export const LazySupplierManagement = lazy(() => import('../suppliers/SupplierManagement'));
export const LazyDataHistoryTracking = lazy(() => import('../history/DataHistoryTracking'));
export const LazyCustomerTransactionInterface = lazy(() => import('../customers/CustomerTransactionInterface'));