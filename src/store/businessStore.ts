import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Customer, PurchaseOrder, Expense, ExpenseCategory, Category, Supplier } from '../types/business';

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
import { validateProductStock as stockValidationUtil } from '../utils/stockValidation';
import { createValidationMixin } from './businessStoreValidation';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createStockMovement,
  updateStock,
  createCategory as apiCreateCategory,
  getCategories as apiGetCategories,
  updateCategory as apiUpdateCategory,
  deleteCategory as apiDeleteCategory,
  getProducts as apiGetProducts
} from '../api/products';
import { BusinessService } from '../services/businessService';
import { getSales } from '../api/sales';
import {
  createExpense as apiCreateExpense,
  updateExpense as apiUpdateExpense,
  createExpenseCategory as apiCreateExpenseCategory,
  updateExpenseCategory as apiUpdateExpenseCategory,
  deleteExpenseCategory as apiDeleteExpenseCategory,
} from '../api/expenses';

export interface BusinessState {
  products: Product[];
  cart: CartItem[];
  customers: Customer[];
  sales: any[];
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  // New derived state used by POS
  categories: Category[];
  // Expenses
  expenseCategories: ExpenseCategory[];
  // Purchasing
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
}

export interface BusinessActions {
  // Customer actions
  fetchCustomers: () => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  
  // Product data loading
  fetchProducts: () => Promise<void>;
 
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

  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => Promise<void>;
  getExpense: (id: string) => Expense | undefined;
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'createdAt'>) => Promise<void>;
  updateExpenseCategory: (id: string, updates: Partial<Omit<ExpenseCategory, 'id' | 'createdAt'>>) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<void>;

  // Product category actions
  fetchCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategory: (categoryNameOrId: string) => Category | undefined;

  // Purchasing actions expected by PurchaseOrderForm
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt'>) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  getPurchaseOrder: (id: string) => PurchaseOrder | undefined;
  refreshPurchaseOrders: () => Promise<void>;

  // Supplier actions
  fetchSuppliers: () => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  

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
      expenseCategories: [],
      purchaseOrders: [],
      suppliers: [],

      // Add validation mixin
      ...createValidationMixin(get),

      // Product data loading
      fetchProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          console.log('🔄 [STORE] Fetching products from API...');
          console.log('🔍 [STORE] Current products in store before fetch:', get().products.length);
          
          const { data: productsData, error } = await apiGetProducts();
          if (error) throw error;

          console.log('✅ [STORE] API returned:', productsData?.length || 0, 'products');
          console.log('🔍 [STORE] First product from API:', productsData?.[0] ? {
            name: productsData[0].name,
            category: productsData[0].category,
            categoryId: productsData[0].categoryId,
            minStock: productsData[0].minStock,
            stock: productsData[0].stock
          } : 'None');
          
          // API already returns properly transformed data, just use it directly
          const products = productsData || [];

          console.log('🔄 [STORE] Setting products in store...', products.length, 'items');
          set({ products, isLoading: false, error: null });
          
          // Verify store was updated
          const updatedProducts = get().products;
          console.log('✅ [STORE] Store updated - now contains:', updatedProducts.length, 'products');
          console.log('🔍 [STORE] Sample product in store:', updatedProducts[0] ? { 
            name: updatedProducts[0].name, 
            category: updatedProducts[0].category, 
            categoryId: updatedProducts[0].categoryId,
            stock: updatedProducts[0].stock
          } : 'None');
          
          // Check localStorage persistence
          setTimeout(() => {
            const stored = localStorage.getItem('fbms-business');
            if (stored) {
              const parsed = JSON.parse(stored);
              const storedProducts = parsed.state?.products || [];
              console.log('💾 [STORE] Persisted to localStorage:', storedProducts.length, 'products');
            } else {
              console.log('⚠️ [STORE] No data found in localStorage after update');
            }
          }, 100);
        } catch (error) {
          console.error('Error fetching products from database:', error);
          console.log('🔄 Falling back to mock data for demonstration...');
          
          // Fallback to mock data when database fails
          const mockProducts: Product[] = [
            {
              id: 'mock-1',
              name: 'Sample Product 1',
              description: 'This is a sample product for demonstration',
              sku: 'DEMO-001',
              barcode: '1234567890123',
              category: 'Electronics',
              price: 299.99,
              cost: 199.99,
              stock: 50,
              minStock: 10,
              unit: 'pcs',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 'mock-2',
              name: 'Sample Product 2',
              description: 'Another sample product',
              sku: 'DEMO-002',
              barcode: '2345678901234',
              category: 'Clothing',
              price: 49.99,
              cost: 25.00,
              stock: 100,
              minStock: 20,
              unit: 'pcs',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ];
          
          set({ 
            products: mockProducts, 
            isLoading: false, 
            error: 'Using demo data - Database connection issue'
          });
          console.log('🔄 Mock products loaded:', mockProducts.length);
        }
      },

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
              error: null
            };
          });
        } catch (error) {
          console.error('Error creating product in database:', error);
          console.log('🔄 Adding product to mock data as fallback...');
          
          // Fallback: add to mock data when database fails
          const mockProduct: Product = {
            id: `mock-${Date.now()}`,
            name: productData.name,
            description: productData.description || '',
            sku: productData.sku,
            barcode: productData.barcode || '',
            category: productData.category,
            price: productData.price,
            cost: productData.cost || 0,
            stock: productData.stock,
            minStock: productData.minStock || 0,
            unit: productData.unit || 'pcs',
            isActive: productData.isActive ?? true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          set((state) => ({
            ...state,
            products: [...state.products, mockProduct],
            isLoading: false,
            error: 'Product added to demo data - Database connection issue'
          }));
          
          console.log('✅ Product added to mock data:', mockProduct.name);
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
              error: null
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
              error: null
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

      validateProductStock: (productId: string, quantity: number, options: any = {}) => {
        const product = get().products.find(p => p.id === productId);
        return stockValidationUtil(product, quantity, options);
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
      
      refreshPurchaseOrders: async () => {
        try {
          const { getPurchaseOrders } = await import('../api/purchases');
          const { data, error } = await getPurchaseOrders();
          
          if (error) {
            console.error('Error fetching purchase orders:', error);
            set({ error: error.message || 'Failed to fetch purchase orders' });
            return;
          }
          
          if (data) {
            console.log('🔄 Refreshed purchase orders:', data.length);
            set({ purchaseOrders: data, error: null });
          }
        } catch (err) {
          console.error('Error in refreshPurchaseOrders:', err);
          set({ error: 'Failed to refresh purchase orders' });
        }
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
                invoice_number: saleData.invoiceNumber || saleData.receiptNumber || `INV-${Date.now()}`,
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
              // Generate a valid UUID for reference or use null
              const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
              const potentialRef = line.id || saleData?.receiptNumber;
              const ref = (potentialRef && isValidUUID(potentialRef)) ? potentialRef : null;
              const result = await updateStock(productId, qty, 'subtract', {
                referenceId: ref,
                userId: saleData?.cashierId,
                reason: `POS sale - ${saleData?.receiptNumber || 'unknown'}`
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
              return { products } as Partial<BusinessState>;
            });
            try { console.info('[Store][createSale] stock deducted (UI updated)', { productId, qty }); } catch {}
          }

          // Diagnostics: completion
          try {
             
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
             
            console.info('[Store][fetchSales] loaded', { count: Array.isArray(data) ? data.length : 0 });
          } catch {}
        } catch (e) {
          console.error('[Store][fetchSales] failed', e);
          set({ isLoading: false, error: 'Failed to load sales history' });
        }
      },

      // Expense actions
      addExpense: async (expense) => {
        try {
          const { data, error } = await apiCreateExpense(expense);
          if (error || !data) throw (error as any) || new Error('Failed to create expense');
          set((state) => ({ expenses: [data as Expense, ...state.expenses] }));
        } catch (e) {
          console.error('addExpense failed:', e);
        }
      },

      updateExpense: async (id, updates) => {
        try {
          const { data, error } = await apiUpdateExpense(id, updates);
          if (error || !data) throw (error as any) || new Error('Failed to update expense');
          set((state) => ({
            expenses: state.expenses.map((ex) => (ex.id === id ? (data as Expense) : ex))
          }));
        } catch (e) {
          console.error('updateExpense failed:', e);
        }
      },

      getExpense: (id: string) => {
        return get().expenses.find((e) => e.id === id);
      },

      addExpenseCategory: async (category) => {
        try {
          const { data, error } = await apiCreateExpenseCategory(category);
          if (error || !data) throw (error as any) || new Error('Failed to create expense category');
          set((state) => ({ expenseCategories: [data as ExpenseCategory, ...state.expenseCategories] }));
        } catch (e) {
          console.error('addExpenseCategory failed:', e);
        }
      },

      updateExpenseCategory: async (id, updates) => {
        try {
          const { data, error } = await apiUpdateExpenseCategory(id, updates);
          if (error || !data) throw (error as any) || new Error('Failed to update expense category');
          set((state) => ({
            expenseCategories: state.expenseCategories.map((c) => (c.id === id ? (data as ExpenseCategory) : c))
          }));
        } catch (e) {
          console.error('updateExpenseCategory failed:', e);
        }
      },

      deleteExpenseCategory: async (id) => {
        try {
          const { error } = await apiDeleteExpenseCategory(id);
          if (error) throw error;
          set((state) => ({
            expenseCategories: state.expenseCategories.filter((c) => c.id !== id)
          }));
        } catch (e) {
          console.error('deleteExpenseCategory failed:', e);
        }
      },

      // Product category actions
      fetchCategories: async () => {
        try {
          const { data, error } = await apiGetCategories();
          if (error) throw error;
          set({ categories: Array.isArray(data) ? (data as Category[]) : [] });
        } catch (e) {
          console.error('fetchCategories failed:', e);
          console.log('🔄 Falling back to mock categories...');
          
          // Fallback to mock categories
          const mockCategories: Category[] = [
            { id: 'cat-1', name: 'Electronics', description: 'Electronic devices and accessories', isActive: true, createdAt: new Date(), updatedAt: new Date() },
            { id: 'cat-2', name: 'Clothing', description: 'Apparel and fashion items', isActive: true, createdAt: new Date(), updatedAt: new Date() },
            { id: 'cat-3', name: 'Home & Garden', description: 'Home improvement and garden supplies', isActive: true, createdAt: new Date(), updatedAt: new Date() },
            { id: 'cat-4', name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear', isActive: true, createdAt: new Date(), updatedAt: new Date() }
          ];
          
          set({ categories: mockCategories });
          console.log('✅ Mock categories loaded:', mockCategories.length);
        }
      },

      addCategory: async (category) => {
        try {
          const { data, error } = await apiCreateCategory(category);
          if (error || !data) throw (error as any) || new Error('Failed to create category');
          set((state) => ({ categories: [data as Category, ...state.categories] }));
        } catch (e) {
          console.error('addCategory failed:', e);
        }
      },

      updateCategory: async (id, updates) => {
        try {
          const { data, error } = await apiUpdateCategory(id, updates);
          if (error || !data) throw (error as any) || new Error('Failed to update category');
          set((state) => ({
            categories: state.categories.map((c) => (c.id === id ? (data as Category) : c))
          }));
        } catch (e) {
          console.error('updateCategory failed:', e);
        }
      },

      deleteCategory: async (id) => {
        try {
          const { error } = await apiDeleteCategory(id);
          if (error) throw error;
          set((state) => ({
            categories: state.categories.filter((c) => c.id !== id)
          }));
        } catch (e) {
          console.error('deleteCategory failed:', e);
        }
      },

      getCategory: (categoryNameOrId) => {
        const { categories } = get();
        // Try to find by ID first, then by name
        return categories.find(c => c.id === categoryNameOrId || c.name === categoryNameOrId);
      },

      // Supplier actions
      fetchSuppliers: async () => {
        set({ isLoading: true });
        try {
          // Mock suppliers for now - in real app this would be a Supabase call
          const mockSuppliers: Supplier[] = [
            { id: '1', name: 'ABC Supplies', contactPerson: 'John Doe', email: 'john@abc.com', phone: '+639123456789', isActive: true, createdAt: new Date() },
            { id: '2', name: 'XYZ Trading', contactPerson: 'Jane Smith', email: 'jane@xyz.com', phone: '+639987654321', isActive: true, createdAt: new Date() }
          ];
          set({ suppliers: mockSuppliers, isLoading: false });
        } catch (e) {
          console.error('fetchSuppliers failed:', e);
          set({ isLoading: false, error: 'Failed to load suppliers' });
        }
      },

      addSupplier: async (supplier) => {
        try {
          const newSupplier: Supplier = {
            id: `supplier-${Date.now()}`,
            ...supplier,
            createdAt: new Date()
          };
          set((state) => ({ suppliers: [...state.suppliers, newSupplier] }));
        } catch (e) {
          console.error('addSupplier failed:', e);
        }
      },

      updateSupplier: async (id, updates) => {
        try {
          set((state) => ({
            suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...updates } : s))
          }));
        } catch (e) {
          console.error('updateSupplier failed:', e);
        }
      },

    }),
    {
      name: 'fbms-business',
      partialize: (state) => ({
        products: state.products,
        purchaseOrders: state.purchaseOrders,
        expenses: state.expenses,
        expenseCategories: state.expenseCategories,
        categories: state.categories,
        suppliers: state.suppliers
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