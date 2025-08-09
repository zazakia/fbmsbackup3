import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  PurchaseOrder, 
  PurchaseOrderItem, 
  PurchaseOrderStatus, 
  EnhancedPurchaseOrderStatus 
} from '../types/business';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrdersBySupplier,
  getPurchaseOrdersByStatus,
  getNextPONumber,
  receivePurchaseOrder
} from '../api/purchases';
import { PerformanceService } from '../services/performanceService';
import { ErrorHandlingService } from '../services/errorHandlingService';
import { 
  purchaseOrderStateMachine, 
  ValidationResult,
  TransitionContext 
} from '../services/purchaseOrderStateMachine';

interface PurchaseOrderState {
  purchaseOrders: PurchaseOrder[];
  selectedPO: PurchaseOrder | null;
  loading: boolean;
  error: string | null;
  
  // Pagination/filtering state
  page: number;
  limit: number;
  totalCount: number;
  supplierFilter: string | null;
  statusFilter: PurchaseOrderStatus | null;
  
  // Fetch/load data
  loadPurchaseOrders: (page?: number, limit?: number) => Promise<void>;
  loadPurchaseOrder: (id: string) => Promise<void>;
  loadPurchaseOrdersBySupplier: (supplierId: string) => Promise<void>;
  loadPurchaseOrdersByStatus: (status: PurchaseOrderStatus) => Promise<void>;
  
  // CRUD operations
  createPO: (purchaseOrder: Omit<PurchaseOrder, 'id' | 'createdAt'>) => Promise<void>;
  updatePO: (id: string, updates: Partial<PurchaseOrder>) => Promise<void>;
  deletePO: (id: string) => Promise<void>;
  receivePO: (id: string, receivedItems?: PurchaseOrderItem[]) => Promise<void>;
  
  // State machine operations
  transitionStatus: (
    id: string, 
    newStatus: EnhancedPurchaseOrderStatus, 
    context: TransitionContext
  ) => Promise<{ success: boolean; errors: string[]; }>;
  validateTransition: (
    purchaseOrder: PurchaseOrder, 
    newStatus: EnhancedPurchaseOrderStatus, 
    context: TransitionContext
  ) => ValidationResult;
  getValidTransitions: (currentStatus: EnhancedPurchaseOrderStatus) => EnhancedPurchaseOrderStatus[];
  getNextLogicalStatus: (purchaseOrder: PurchaseOrder, receivedQuantities?: Record<string, number>) => EnhancedPurchaseOrderStatus | null;
  
  // Filter/pagination actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSupplierFilter: (supplierId: string | null) => void;
  setStatusFilter: (status: PurchaseOrderStatus | null) => void;
  clearFilters: () => void;
  
  // Selection actions
  selectPO: (purchaseOrder: PurchaseOrder | null) => void;
  
  // Utils
  getNextPONumber: () => Promise<string>;
  clearError: () => void;
}

export const usePurchaseOrderStore = create<PurchaseOrderState>()(
  persist(
    (set, get) => ({
      // State
      purchaseOrders: [],
      selectedPO: null,
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

          // Record performance metrics
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

      // Load single purchase order
      loadPurchaseOrder: async (id: string) => {
        set({ loading: true, error: null });
        
        try {
          const { data, error } = await getPurchaseOrder(id);
          
          if (error) {
            throw error;
          }
          
          if (data) {
            // Cache the loaded PO
            PerformanceService.cacheProduct(data);
            set({ selectedPO: data });
          }
          
          set({ loading: false });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'load-purchase-order');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Load purchase orders by supplier
      loadPurchaseOrdersBySupplier: async (supplierId: string) => {
        set({ loading: true, error: null });
        
        try {
          const { data, error } = await getPurchaseOrdersBySupplier(supplierId);
          
          if (error) {
            throw error;
          }
          
          set({
            purchaseOrders: data || [],
            supplierFilter: supplierId,
            loading: false
          });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'load-supplier-pos');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Load purchase orders by status
      loadPurchaseOrdersByStatus: async (status: PurchaseOrderStatus) => {
        set({ loading: true, error: null });
        
        try {
          const { data, error } = await getPurchaseOrdersByStatus(status);
          
          if (error) {
            throw error;
          }
          
          set({
            purchaseOrders: data || [],
            statusFilter: status,
            loading: false
          });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'load-status-pos');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Create purchase order
      createPO: async (purchaseOrder) => {
        set({ loading: true, error: null });
        
        try {
          const { data, error } = await createPurchaseOrder(purchaseOrder);
          
          if (error) {
            throw error;
          }
          
          if (data) {
            set(state => ({
              purchaseOrders: [data, ...state.purchaseOrders],
              selectedPO: data
            }));
          }
          
          set({ loading: false });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'create-po');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Update purchase order
      updatePO: async (id, updates) => {
        set({ loading: true, error: null });
        
        try {
          const { data, error } = await updatePurchaseOrder(id, updates);
          
          if (error) {
            throw error;
          }
          
          if (data) {
            set(state => ({
              purchaseOrders: state.purchaseOrders.map(po =>
                po.id === id ? data : po
              ),
              selectedPO: state.selectedPO?.id === id ? data : state.selectedPO
            }));
          }
          
          set({ loading: false });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'update-po');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Delete purchase order
      deletePO: async (id) => {
        set({ loading: true, error: null });
        
        try {
          const { error } = await deletePurchaseOrder(id);
          
          if (error) {
            throw error;
          }
          
          set(state => ({
            purchaseOrders: state.purchaseOrders.filter(po => po.id !== id),
            selectedPO: state.selectedPO?.id === id ? null : state.selectedPO
          }));
          
          set({ loading: false });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'delete-po');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
        }
      },

      // Receive purchase order with enhanced context
      receivePO: async (id, receivedItems) => {
        set({ loading: true, error: null });
        
        try {
          // Get current user context (you may need to adjust this based on your auth system)
          const currentUserId = get().purchaseOrders.find(po => po.id === id)?.createdBy || 'system';
          
          const { data, error } = await receivePurchaseOrder(id, receivedItems, {
            receivedBy: currentUserId,
            reason: receivedItems && receivedItems.length > 0 ? 'Partial Receipt' : 'Full Receipt',
            timestamp: new Date()
          });
          
          if (error) {
            throw error;
          }
          
          if (data) {
            set(state => ({
              purchaseOrders: state.purchaseOrders.map(po =>
                po.id === id ? data : po
              ),
              selectedPO: state.selectedPO?.id === id ? data : state.selectedPO
            }));
          }
          
          set({ loading: false });
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'receive-po');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
          
          // Re-throw to allow components to handle the error
          throw formattedError;
        }
      },

      // Filter/pagination actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit }),
      setSupplierFilter: (supplierId) => set({ supplierFilter: supplierId, page: 1 }),
      setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),
      clearFilters: () => set({
        supplierFilter: null,
        statusFilter: null,
        page: 1
      }),

      // Selection actions
      selectPO: (purchaseOrder) => set({ selectedPO: purchaseOrder }),

      // State machine operations
      transitionStatus: async (id, newStatus, context) => {
        set({ loading: true, error: null });
        
        try {
          const state = get();
          const purchaseOrder = state.purchaseOrders.find(po => po.id === id) || 
                               (state.selectedPO?.id === id ? state.selectedPO : null);
          
          if (!purchaseOrder) {
            set({ loading: false, error: 'Purchase order not found' });
            return { success: false, errors: ['Purchase order not found'] };
          }

          // Validate the transition using state machine
          const result = await purchaseOrderStateMachine.executeTransition(
            purchaseOrder,
            newStatus,
            context
          );

          if (!result.isValid) {
            const errorMessages = result.errors.map(e => e.message);
            set({ loading: false, error: errorMessages.join(', ') });
            return { success: false, errors: errorMessages };
          }

          // Update the purchase order via API
          const { data, error } = await updatePurchaseOrder(id, {
            status: result.updatedPurchaseOrder.status,
            receivedDate: result.updatedPurchaseOrder.receivedDate
          });

          if (error) {
            throw error;
          }

          if (data) {
            set(state => ({
              purchaseOrders: state.purchaseOrders.map(po =>
                po.id === id ? data : po
              ),
              selectedPO: state.selectedPO?.id === id ? data : state.selectedPO
            }));
          }

          set({ loading: false });
          return { success: true, errors: [] };
          
        } catch (error) {
          const formattedError = ErrorHandlingService.formatDatabaseError(error, 'transition-status');
          ErrorHandlingService.logError(formattedError);
          set({
            loading: false,
            error: formattedError.message
          });
          return { success: false, errors: [formattedError.message] };
        }
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

      // Utils
      getNextPONumber: async () => {
        const { data } = await getNextPONumber();
        return data || '';
      },
      clearError: () => set({ error: null })
    }),
    {
      name: 'fbms-purchase-orders',
      partialize: (state) => ({
        page: state.page,
        limit: state.limit,
        supplierFilter: state.supplierFilter,
        statusFilter: state.statusFilter
      })
    }
  )
);