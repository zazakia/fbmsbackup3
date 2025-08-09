/**
 * Enhanced Purchase Order Store with Comprehensive Audit Integration
 * 
 * This store extends the base purchase order functionality with audit trail capabilities,
 * ensuring all purchase order operations are properly logged and tracked.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  PurchaseOrder, 
  PurchaseOrderItem, 
  PurchaseOrderStatus, 
  EnhancedPurchaseOrder,
  EnhancedPurchaseOrderStatus,
  PurchaseOrderAuditLog
} from '../types/business';
import {
  createPurchaseOrderWithAudit,
  updatePurchaseOrderWithAudit,
  deletePurchaseOrderWithAudit,
  receivePurchaseOrderWithAudit,
  changePurchaseOrderStatus,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderWithAuditHistory,
  getPurchaseOrderAuditSummary
} from '../api/purchaseOrderAuditAPI';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  getPurchaseOrdersBySupplier,
  getPurchaseOrdersByStatus,
  getNextPONumber
} from '../api/purchases';
import { auditService } from '../services/auditService';
import { PerformanceService } from '../services/performanceService';
import { ErrorHandlingService } from '../services/errorHandlingService';
import { 
  purchaseOrderStateMachine, 
  ValidationResult,
  TransitionContext 
} from '../services/purchaseOrderStateMachine';

interface EnhancedPurchaseOrderState {
  purchaseOrders: PurchaseOrder[];
  selectedPO: EnhancedPurchaseOrder | null;
  selectedPOAuditHistory: PurchaseOrderAuditLog[];
  auditSummary: any | null;
  loading: boolean;
  error: string | null;
  
  // Pagination/filtering state
  page: number;
  limit: number;
  totalCount: number;
  supplierFilter: string | null;
  statusFilter: PurchaseOrderStatus | null;
  
  // Enhanced load operations with audit support
  loadPurchaseOrders: (page?: number, limit?: number) => Promise<void>;
  loadPurchaseOrderWithAudit: (id: string) => Promise<void>;
  loadPurchaseOrdersBySupplier: (supplierId: string) => Promise<void>;
  loadPurchaseOrdersByStatus: (status: PurchaseOrderStatus) => Promise<void>;
  refreshAuditHistory: (purchaseOrderId: string) => Promise<void>;
  refreshAuditSummary: (purchaseOrderId: string) => Promise<void>;
  
  // Enhanced CRUD operations with audit logging
  createPOWithAudit: (
    purchaseOrder: Omit<PurchaseOrder, 'id' | 'createdAt'>, 
    reason?: string
  ) => Promise<{ success: boolean; data?: PurchaseOrder; error?: string }>;
  
  updatePOWithAudit: (
    id: string, 
    updates: Partial<PurchaseOrder>, 
    reason?: string
  ) => Promise<{ success: boolean; data?: PurchaseOrder; error?: string }>;
  
  deletePOWithAudit: (
    id: string, 
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  
  receivePOWithAudit: (
    id: string, 
    receivedItems?: PurchaseOrderItem[], 
    receivingContext?: {
      receivedBy?: string;
      reason?: string;
      timestamp?: Date;
      notes?: string;
    }
  ) => Promise<{ success: boolean; data?: PurchaseOrder; error?: string }>;
  
  // Enhanced status management with audit
  changeStatusWithAudit: (
    id: string,
    newStatus: PurchaseOrderStatus | EnhancedPurchaseOrderStatus,
    reason?: string
  ) => Promise<{ success: boolean; data?: PurchaseOrder; error?: string }>;
  
  approvePOWithAudit: (
    id: string,
    approvalNotes?: string
  ) => Promise<{ success: boolean; data?: PurchaseOrder; error?: string }>;
  
  cancelPOWithAudit: (
    id: string,
    cancellationReason: string
  ) => Promise<{ success: boolean; data?: PurchaseOrder; error?: string }>;
  
  // State machine operations (enhanced)
  transitionStatusWithAudit: (
    id: string, 
    newStatus: EnhancedPurchaseOrderStatus, 
    context: TransitionContext & { reason?: string }
  ) => Promise<{ success: boolean; errors: string[]; auditId?: string }>;
  
  validateTransition: (
    purchaseOrder: PurchaseOrder, 
    newStatus: EnhancedPurchaseOrderStatus, 
    context: TransitionContext
  ) => ValidationResult;
  
  getValidTransitions: (currentStatus: EnhancedPurchaseOrderStatus) => EnhancedPurchaseOrderStatus[];
  getNextLogicalStatus: (purchaseOrder: PurchaseOrder, receivedQuantities?: Record<string, number>) => EnhancedPurchaseOrderStatus | null;
  
  // Audit-specific operations
  getAuditHistory: (purchaseOrderId: string) => Promise<PurchaseOrderAuditLog[]>;
  getAuditSummary: (purchaseOrderId: string) => Promise<any>;
  exportAuditReport: (purchaseOrderId: string, format?: 'json' | 'csv') => Promise<string>;
  
  // Filter/pagination actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSupplierFilter: (supplierId: string | null) => void;
  setStatusFilter: (status: PurchaseOrderStatus | null) => void;
  clearFilters: () => void;
  
  // Selection actions
  selectPO: (purchaseOrder: EnhancedPurchaseOrder | null) => void;
  
  // Utils
  getNextPONumber: () => Promise<string>;
  clearError: () => void;
  clearAuditData: () => void;
}

export const useEnhancedPurchaseOrderStore = create<EnhancedPurchaseOrderState>()(
  persist(
    (set, get) => ({
      // State
      purchaseOrders: [],
      selectedPO: null,
      selectedPOAuditHistory: [],
      auditSummary: null,
      loading: false,
      error: null,
      page: 1,
      limit: 10,
      totalCount: 0,
      supplierFilter: null,
      statusFilter: null,

      // Load purchase orders with pagination
      loadPurchaseOrders: async (page = 1, limit = 10) => {
        const startTime = Date.now();
        set({ loading: true, error: null });
        
        try {
          const offset = (page - 1) * limit;
          const { data, error } = await getPurchaseOrders(limit, offset);
          
          if (error) {
            throw error;
          }
          
          set({
            purchaseOrders: data || [],
            page,
            limit,
            loading: false
          });

          PerformanceService.recordOperationDuration('loadPurchaseOrders', Date.now() - startTime);
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'load-purchase-orders');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Load purchase order with complete audit history
      loadPurchaseOrderWithAudit: async (id: string) => {
        set({ loading: true, error: null });
        
        try {
          const { data, error } = await getPurchaseOrderWithAuditHistory(id);
          
          if (error) {
            throw error;
          }
          
          if (data) {
            set({ 
              selectedPO: data,
              selectedPOAuditHistory: data.statusHistory || []
            });
            
            // Load audit summary
            get().refreshAuditSummary(id);
          }
          
          set({ loading: false });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'load-purchase-order-audit');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Load by supplier
      loadPurchaseOrdersBySupplier: async (supplierId: string) => {
        set({ loading: true, error: null, supplierFilter: supplierId });
        
        try {
          const { data, error } = await getPurchaseOrdersBySupplier(supplierId);
          
          if (error) {
            throw error;
          }
          
          set({
            purchaseOrders: data || [],
            loading: false
          });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'load-pos-by-supplier');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Load by status
      loadPurchaseOrdersByStatus: async (status: PurchaseOrderStatus) => {
        set({ loading: true, error: null, statusFilter: status });
        
        try {
          const { data, error } = await getPurchaseOrdersByStatus(status);
          
          if (error) {
            throw error;
          }
          
          set({
            purchaseOrders: data || [],
            loading: false
          });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'load-pos-by-status');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Refresh audit history
      refreshAuditHistory: async (purchaseOrderId: string) => {
        try {
          const result = await auditService.getPurchaseOrderHistory(purchaseOrderId);
          if (result.success && result.data) {
            set({ selectedPOAuditHistory: result.data });
          }
        } catch (error) {
          console.warn('Failed to refresh audit history:', error);
        }
      },

      // Refresh audit summary
      refreshAuditSummary: async (purchaseOrderId: string) => {
        try {
          const result = await getPurchaseOrderAuditSummary(purchaseOrderId);
          if (result.success) {
            set({ auditSummary: result.data });
          }
        } catch (error) {
          console.warn('Failed to refresh audit summary:', error);
        }
      },

      // Create PO with audit
      createPOWithAudit: async (purchaseOrder, reason) => {
        set({ loading: true, error: null });
        
        try {
          const result = await createPurchaseOrderWithAudit(purchaseOrder, reason);
          
          if (result.error || !result.data) {
            return {
              success: false,
              error: result.error?.message || 'Failed to create purchase order'
            };
          }

          // Refresh the purchase orders list
          await get().loadPurchaseOrders(get().page, get().limit);
          
          set({ loading: false });
          return { success: true, data: result.data };
          
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'create-purchase-order-audit');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
          return { success: false, error: formattedError.message };
        }
      },

      // Update PO with audit
      updatePOWithAudit: async (id, updates, reason) => {
        set({ loading: true, error: null });
        
        try {
          const result = await updatePurchaseOrderWithAudit(id, updates, reason);
          
          if (result.error || !result.data) {
            return {
              success: false,
              error: result.error?.message || 'Failed to update purchase order'
            };
          }

          // Update local state if this is the selected PO
          const state = get();
          if (state.selectedPO && state.selectedPO.id === id) {
            await state.loadPurchaseOrderWithAudit(id);
          }
          
          // Refresh the purchase orders list
          await get().loadPurchaseOrders(get().page, get().limit);
          
          set({ loading: false });
          return { success: true, data: result.data };
          
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'update-purchase-order-audit');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
          return { success: false, error: formattedError.message };
        }
      },

      // Delete PO with audit
      deletePOWithAudit: async (id, reason) => {
        set({ loading: true, error: null });
        
        try {
          const result = await deletePurchaseOrderWithAudit(id, reason);
          
          if (result.error) {
            return {
              success: false,
              error: result.error.message || 'Failed to delete purchase order'
            };
          }

          // Clear selected PO if it was deleted
          const state = get();
          if (state.selectedPO && state.selectedPO.id === id) {
            set({ selectedPO: null, selectedPOAuditHistory: [], auditSummary: null });
          }
          
          // Refresh the purchase orders list
          await get().loadPurchaseOrders(get().page, get().limit);
          
          set({ loading: false });
          return { success: true };
          
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'delete-purchase-order-audit');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
          return { success: false, error: formattedError.message };
        }
      },

      // Receive PO with audit
      receivePOWithAudit: async (id, receivedItems, receivingContext) => {
        set({ loading: true, error: null });
        
        try {
          const result = await receivePurchaseOrderWithAudit(id, receivedItems, receivingContext);
          
          if (result.error || !result.data) {
            return {
              success: false,
              error: result.error?.message || 'Failed to receive purchase order'
            };
          }

          // Refresh the selected PO with audit history
          await get().loadPurchaseOrderWithAudit(id);
          
          // Refresh the purchase orders list
          await get().loadPurchaseOrders(get().page, get().limit);
          
          set({ loading: false });
          return { success: true, data: result.data };
          
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'receive-purchase-order-audit');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
          return { success: false, error: formattedError.message };
        }
      },

      // Change status with audit
      changeStatusWithAudit: async (id, newStatus, reason) => {
        set({ loading: true, error: null });
        
        try {
          const result = await changePurchaseOrderStatus(id, newStatus, reason);
          
          if (result.error || !result.data) {
            return {
              success: false,
              error: result.error?.message || 'Failed to change purchase order status'
            };
          }

          // Refresh the selected PO with audit history
          await get().loadPurchaseOrderWithAudit(id);
          
          // Refresh the purchase orders list
          await get().loadPurchaseOrders(get().page, get().limit);
          
          set({ loading: false });
          return { success: true, data: result.data };
          
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'change-po-status-audit');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
          return { success: false, error: formattedError.message };
        }
      },

      // Approve PO with audit
      approvePOWithAudit: async (id, approvalNotes) => {
        set({ loading: true, error: null });
        
        try {
          const result = await approvePurchaseOrder(id, approvalNotes);
          
          if (result.error || !result.data) {
            return {
              success: false,
              error: result.error?.message || 'Failed to approve purchase order'
            };
          }

          // Refresh the selected PO with audit history
          await get().loadPurchaseOrderWithAudit(id);
          
          // Refresh the purchase orders list
          await get().loadPurchaseOrders(get().page, get().limit);
          
          set({ loading: false });
          return { success: true, data: result.data };
          
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'approve-purchase-order-audit');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
          return { success: false, error: formattedError.message };
        }
      },

      // Cancel PO with audit
      cancelPOWithAudit: async (id, cancellationReason) => {
        set({ loading: true, error: null });
        
        try {
          const result = await cancelPurchaseOrder(id, cancellationReason);
          
          if (result.error || !result.data) {
            return {
              success: false,
              error: result.error?.message || 'Failed to cancel purchase order'
            };
          }

          // Refresh the selected PO with audit history
          await get().loadPurchaseOrderWithAudit(id);
          
          // Refresh the purchase orders list
          await get().loadPurchaseOrders(get().page, get().limit);
          
          set({ loading: false });
          return { success: true, data: result.data };
          
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'cancel-purchase-order-audit');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
          return { success: false, error: formattedError.message };
        }
      },

      // State machine operations
      transitionStatusWithAudit: async (id, newStatus, context) => {
        const state = get();
        const purchaseOrder = state.selectedPO || state.purchaseOrders.find(po => po.id === id);
        
        if (!purchaseOrder) {
          return { success: false, errors: ['Purchase order not found'] };
        }

        // Validate transition
        const validation = purchaseOrderStateMachine.validateTransition(
          purchaseOrder,
          newStatus,
          context
        );

        if (!validation.isValid) {
          return { success: false, errors: validation.errors };
        }

        // Execute transition with audit
        const result = await get().changeStatusWithAudit(id, newStatus, context.reason);
        
        return {
          success: result.success,
          errors: result.success ? [] : [result.error || 'Transition failed'],
          auditId: result.success ? 'audit_logged' : undefined
        };
      },

      validateTransition: (purchaseOrder, newStatus, context) => {
        return purchaseOrderStateMachine.validateTransition(purchaseOrder, newStatus, context);
      },

      getValidTransitions: (currentStatus) => {
        return purchaseOrderStateMachine.getValidTransitions(currentStatus);
      },

      getNextLogicalStatus: (purchaseOrder, receivedQuantities) => {
        return purchaseOrderStateMachine.getNextLogicalStatus(purchaseOrder, receivedQuantities);
      },

      // Audit operations
      getAuditHistory: async (purchaseOrderId: string) => {
        const result = await auditService.getPurchaseOrderHistory(purchaseOrderId);
        return result.success ? result.data || [] : [];
      },

      getAuditSummary: async (purchaseOrderId: string) => {
        const result = await getPurchaseOrderAuditSummary(purchaseOrderId);
        return result.success ? result.data : null;
      },

      exportAuditReport: async (purchaseOrderId: string, format = 'json') => {
        const auditHistory = await get().getAuditHistory(purchaseOrderId);
        
        if (format === 'json') {
          return JSON.stringify(auditHistory, null, 2);
        } else if (format === 'csv') {
          // Basic CSV export
          const headers = ['ID', 'Action', 'Performed By', 'Timestamp', 'Reason'];
          const rows = auditHistory.map(log => [
            log.id,
            log.action,
            log.performedByName || log.performedBy,
            log.timestamp.toISOString(),
            log.reason || ''
          ]);
          
          return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        }
        
        return '';
      },

      // Utility actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit }),
      setSupplierFilter: (supplierId) => set({ supplierFilter: supplierId }),
      setStatusFilter: (status) => set({ statusFilter: status }),
      clearFilters: () => set({ 
        supplierFilter: null, 
        statusFilter: null, 
        page: 1 
      }),
      selectPO: (purchaseOrder) => set({ selectedPO: purchaseOrder }),
      clearError: () => set({ error: null }),
      clearAuditData: () => set({ 
        selectedPOAuditHistory: [], 
        auditSummary: null 
      }),

      // Get next PO number
      getNextPONumber: async () => {
        const result = await getNextPONumber();
        return result.data || 'PO-ERROR';
      }
    }),
    {
      name: 'enhanced-purchase-order-store',
      partialize: (state) => ({
        page: state.page,
        limit: state.limit,
        supplierFilter: state.supplierFilter,
        statusFilter: state.statusFilter
      })
    }
  )
);