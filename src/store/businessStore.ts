import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Customer, PurchaseOrder } from '../types/business';

// Unified validation types used across Store and POS
export type POSStockValidationError = {
  code?: string;
  message: string;
  productId?: string;
  productName?: string;
  requestedQuantity?: number;
  availableStock?: number;
  suggestions?: string[];
};

export type StockValidationResult = { isValid: boolean; errors: POSStockValidationError[]; warnings: POSStockValidationError[] };
import { supabase } from '../utils/supabase';
import { createValidationMixin } from './businessStoreValidation';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createStockMovement,
  updateStock
} from '../api/products';
import { BusinessService } from '../services/businessService';
import { getSales } from '../api/sales';

export interface BusinessState {
  products: Product[];
  cart: CartItem[];
  customers: Customer[];
  sales: any[];
  expenses: any[];
  isLoading: boolean;
  error: string | null;
  // New derived state used by POS
  categories: Array<{ id: string; name: string }>;
  // Purchasing
  purchaseOrders: PurchaseOrder[];
}

export interface BusinessActions {
  // Customer actions
  fetchCustomers: () => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
 
  // Stock validation actions (temporarily relaxed to any to unblock diagnostics)
  validateProductStock: any;
  validateCartStock: any;
  validateStockUpdate: any;
  validateSaleStock: any;
  
  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  
  // Cart actions
  // Keep return type as void; POS will validate separately if needed
  addToCart: (product: Product, quantity: number) => void;
  updateCartItem: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // POS helpers
  getCartSubtotal: () => number;
  getCartTax: (taxRate?: number) => number;
  getCartTotal: (taxRate?: number) => number;
  createSale: (saleData: any) => Promise<void>;

  // Sales history
  fetchSales: (limit?: number, offset?: number) => Promise<void>;

  // Purchasing actions expected by PurchaseOrderForm
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt'>) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  getPurchaseOrder: (id: string) => PurchaseOrder | undefined;

  // Utility actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type BusinessStore = BusinessState & BusinessActions;

// Create the store with validation mixin
export const useBusinessStore = create<BusinessStore>()(
  persist(
    (set, get) => ({
      // Initial state
      products: [],
      cart: [],
      customers: [],
      sales: [],
      expenses: [],
      isLoading: false,
      error: null,
      categories: [],
      purchaseOrders: [],

      // Add validation mixin
      ...createValidationMixin(get),

      // Customer actions
      fetchCustomers: async () => {
        set({ isLoading: true });
        try {
          const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .order('first_name', { ascending: true });

          if (error) throw error;

          const transformedCustomers: Customer[] = (customers || []).map((customer: any) => ({
            id: customer.id,
            firstName: customer.first_name,
            lastName: customer.last_name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            province: customer.province,
            zipCode: customer.postal_code,
            country: customer.country,
            customerType: customer.customer_type || 'individual',
            loyaltyPoints: customer.loyalty_points || 0,
            currentBalance: customer.current_balance || 0,
            totalPurchases: customer.total_purchases || 0,
            creditLimit: customer.credit_limit || 0,
            discountPercentage: customer.discount_percentage || 0,
            isActive: customer.is_active ?? true,
            tags: customer.tags || [],
            createdAt: new Date(customer.created_at),
            updatedAt: new Date(customer.updated_at)
          })) as Customer[];

          set({ customers: transformedCustomers, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch customers', isLoading: false });
          console.error('Error fetching customers:', error);
        }
      },

      updateCustomer: async (id, updates) => {
        try {
          const { error } = await supabase
            .from('customers')
            .update({
              // map only known fields; ignore unknown updates
              total_purchases: (updates as any).totalPurchases,
              loyalty_points: (updates as any).loyaltyPoints,
              current_balance: (updates as any).currentBalance
            })
            .eq('id', id);
          if (error) throw error;

          set((state) => ({
            customers: state.customers.map(c => c.id === id ? { ...c, ...updates } : c)
          }));
        } catch (e) {
          console.error('updateCustomer failed:', e);
        }
      },

      // Product actions
      addProduct: async (productData) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: product, error } = await createProduct(productData);
          
          if (error || !product) {
            throw new Error(error?.message || 'Failed to create product');
          }
          
          set((state) => {
            const products = [...state.products, product as Product];
            return {
              products,
              isLoading: false,
              error: null,
              categories: deriveCategories(products)
            };
          });
        } catch (error) {
          set((state) => ({
            ...state,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to add product'
          }));
          throw error;
        }
      },

      updateProduct: async (id, updates) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: product, error } = await updateProduct(id, updates);
          
          if (error || !product) {
            throw new Error(error?.message || 'Failed to update product');
          }
          
          set((state) => {
            const products = state.products.map(p =>
              p.id === id ? (product as Product) : p
            );
            return {
              products,
              isLoading: false,
              error: null,
              categories: deriveCategories(products)
            };
          });
        } catch (error) {
          set((state) => ({
            ...state,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update product'
          }));
          throw error;
        }
      },

      deleteProduct: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await deleteProduct(id);
          
          if (error) {
            throw new Error(error.message || 'Failed to delete product');
          }
          
          set((state) => {
            const products = state.products.filter(product => product.id !== id);
            return {
              products,
              isLoading: false,
              error: null,
              categories: deriveCategories(products)
            };
          });
        } catch (error) {
          set((state) => ({
            ...state,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to delete product'
          }));
          throw error;
        }
      },

      getProduct: (id) => {
        return get().products.find(product => product.id === id);
      },

      getCustomer: (id: string) => {
        return get().customers.find(customer => customer.id === id);
      },

      // Purchasing (minimal local store to support UI)
      addPurchaseOrder: (po) => {
        // Append locally for immediate UI feedback; server insert handled by API in form
        set((state) => ({
          purchaseOrders: [
            ...(state.purchaseOrders || []),
            {
              // local temp id if missing
              id: (po as any).id || `po-${Date.now()}`,
              ...po,
              createdAt: (po as any).createdAt || new Date()
            } as PurchaseOrder
          ]
        }));
      },

      updatePurchaseOrder: (id, updates) => {
        set((state) => ({
          purchaseOrders: (state.purchaseOrders || []).map((p) =>
            p.id === id ? ({ ...p, ...updates } as PurchaseOrder) : p
          )
        }));
      },

      getPurchaseOrder: (id: string) => {
        return (get().purchaseOrders || []).find((p) => p.id === id);
      },
      
      // Cart actions
      addToCart: (product, quantity) => {
        // Validate stock before adding to cart
        const validation: any = (BusinessService.validateProductStock as any)(product, quantity, {
          movementType: 'sale',
          preventNegative: true
        });
 
        try {
          // Targeted runtime diagnostics
          const firstErr = validation?.errors?.[0];
          const firstWarn = validation?.warnings?.[0];
          // eslint-disable-next-line no-console
          console.info('[Store][addToCart] validation summary', {
            isValid: validation?.isValid,
            errorsType: Array.isArray(validation?.errors) ? 'array' : typeof validation?.errors,
            warningsType: Array.isArray(validation?.warnings) ? 'array' : typeof validation?.warnings,
            firstErrorType: firstErr ? typeof firstErr : 'none',
            firstErrorKeys: firstErr ? Object.keys(firstErr) : [],
            firstWarningType: firstWarn ? typeof firstWarn : 'none',
            firstWarningKeys: firstWarn ? Object.keys(firstWarn) : []
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[Store][addToCart] diagnostics failed', e);
        }
        
        if (!validation?.isValid) {
          const msg = (validation?.errors?.[0] && (validation.errors[0] as any).message) || 'Stock validation failed';
          set({ error: msg as any });
          return;
        }
        
        set((state) => {
          const existingItem = state.cart.find(item => item.product.id === product.id);
          
          if (existingItem) {
            const updated: CartItem = {
              ...existingItem,
              quantity: existingItem.quantity + quantity,
              total: (existingItem.quantity + quantity) * product.price
            };
            return {
              cart: state.cart.map(item =>
                item.product.id === product.id ? updated : item
              )
            };
          } else {
            // Build a CartItem respecting the declared type
            const newItem: CartItem = {
              product,
              quantity,
              total: product.price * quantity
            } as CartItem;
            return { cart: [...state.cart, newItem] };
          }
        });
      },

      updateCartItem: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        
        // Get product for validation
        const product = get().products.find(p => p.id === productId);
        if (!product) return;
        
        // Validate new quantity
        const validation: any = (BusinessService.validateProductStock as any)(product, quantity, {
          movementType: 'sale',
          preventNegative: true
        });
 
        try {
          const firstErr = validation?.errors?.[0];
          const firstWarn = validation?.warnings?.[0];
          // eslint-disable-next-line no-console
          console.info('[Store][updateCartItem] validation summary', {
            isValid: validation?.isValid,
            errorsType: Array.isArray(validation?.errors) ? 'array' : typeof validation?.errors,
            warningsType: Array.isArray(validation?.warnings) ? 'array' : typeof validation?.warnings,
            firstErrorType: firstErr ? typeof firstErr : 'none',
            firstErrorKeys: firstErr ? Object.keys(firstErr) : [],
            firstWarningType: firstWarn ? typeof firstWarn : 'none',
            firstWarningKeys: firstWarn ? Object.keys(firstWarn) : []
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[Store][updateCartItem] diagnostics failed', e);
        }
        
        if (!validation?.isValid) {
          const msg = (validation?.errors?.[0] && (validation.errors[0] as any).message) || 'Stock validation failed';
          set({ error: msg as any });
          return;
        }
        
        set((state) => ({
          cart: state.cart.map(item =>
            item.product.id === productId
              ? { ...item, quantity, total: item.product.price * quantity }
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

      // POS helpers
      getCartSubtotal: () => {
        const { cart } = get();
        return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      },
      getCartTax: (taxRate = 0.12) => {
        const subtotal = get().getCartSubtotal(); // discount handled externally in POS
        return subtotal * taxRate;
      },
      getCartTotal: (taxRate = 0.12) => {
        const discountedSubtotal = get().getCartSubtotal();
        return discountedSubtotal + get().getCartTax(taxRate);
      },

      // Create sale and apply stock deductions
      createSale: async (saleData: any) => {
        // Diagnostics: entry
        try {
          // eslint-disable-next-line no-console
          console.info('[Store][createSale] start', {
            itemsCount: Array.isArray(saleData?.items) ? saleData.items.length : 'n/a',
            total: saleData?.total,
            paymentMethod: saleData?.paymentMethod
          });
        } catch {}
        try {
          // 1) Append sale to in-memory log
          set((state) => ({ sales: [{ id: `sale-${Date.now()}`, ...saleData }, ...state.sales] }));
          
          // 2) Persist sale if backend exists
          if ((supabase as any)) {
            try {
              await supabase.from('sales').insert({
                customer_id: saleData.customerId || null,
                customer_name: saleData.customerName,
                items: saleData.items,
                subtotal: saleData.subtotal,
                tax: saleData.tax,
                discount: saleData.discount,
                total: saleData.total,
                payment_method: saleData.paymentMethod,
                payment_status: saleData.paymentStatus,
                status: saleData.status,
                cashier_id: saleData.cashierId,
                notes: saleData.notes || null
              });
            } catch (dbErr) {
              console.warn('[Store][createSale] DB insert warning (optional table):', dbErr);
            }
          }

          // 3) Apply stock deductions per item using updateStock API (which logs movements)
          const items = Array.isArray(saleData?.items) ? saleData.items : [];
          for (const line of items) {
            const productId = line.productId || line.product?.id;
            const qty = Number(line.quantity) || 0;
            if (!productId || qty <= 0) {
              console.warn('[Store][createSale] skip stock move - invalid line', { productId, qty });
              continue;
            }
            try {
              // Persisted stock deduction; updateStock will also log a stock movement
              const ref = line.id || saleData?.receiptNumber || `txn-${Date.now()}`;
              const result = await updateStock(productId, qty, 'subtract', {
                referenceId: ref,
                userId: saleData?.cashierId,
                reason: 'POS sale'
              });
              if ((result as any)?.error) {
                console.error('[Store][createSale] updateStock error', { productId, qty, error: (result as any).error });
              }
            } catch (stockErr) {
              console.error('[Store][createSale] updateStock failed', { productId, qty, error: stockErr });
            }
            // Update local in-memory products to reflect deduction regardless, so UI is consistent
            set((state) => {
              const products = state.products.map((p) => {
                if (p.id === productId) {
                  const nextStock = Math.max(0, (p.stock || 0) - qty);
                  return { ...p, stock: nextStock };
                }
                return p;
              });
              return { products, categories: deriveCategories(products) };
            });
            try { console.info('[Store][createSale] stock deducted (UI updated)', { productId, qty }); } catch {}
          }

          // Diagnostics: completion
          try {
            // eslint-disable-next-line no-console
            console.info('[Store][createSale] completed. Products updated.');
          } catch {}
        } catch (e) {
          console.error('createSale failed:', e);
          throw e;
        }
      },

      // Utility actions
      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      // Sales history loader used by SalesHistory page
      fetchSales: async (limit?: number, offset?: number) => {
        set({ isLoading: true });
        try {
          const { data, error } = await getSales(limit, offset);
          if (error) throw error;
          // Fallback to empty array if null
          set({ sales: Array.isArray(data) ? data : [], isLoading: false, error: null });
          try {
            // eslint-disable-next-line no-console
            console.info('[Store][fetchSales] loaded', { count: Array.isArray(data) ? data.length : 0 });
          } catch {}
        } catch (e) {
          console.error('[Store][fetchSales] failed', e);
          set({ isLoading: false, error: 'Failed to load sales history' });
        }
      }
    }),
    {
      name: 'fbms-business',
      partialize: (state) => ({
        products: state.products,
        purchaseOrders: state.purchaseOrders
      })
    }
  )
);

// Helper to derive categories from products
function deriveCategories(products: Product[]): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  for (const p of products) {
    const id = (p as any).categoryId || (p as any).category_id || 'uncategorized';
    const name = (p as any).categoryName || (p as any).category_name || id;
    if (!map.has(id)) map.set(id, name);
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}