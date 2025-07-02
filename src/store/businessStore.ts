import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Category, Customer, Sale, CartItem, Supplier, PurchaseOrder, Expense, ExpenseCategory } from '../types/business';

interface BusinessState {
  // Products
  products: Product[];
  categories: Category[];
  
  // Customers
  customers: Customer[];
  
  // Sales
  sales: Sale[];
  cart: CartItem[];
  
  // Suppliers & Purchases
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  
  // Expenses
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

interface BusinessActions {
  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  getProductsByCategoryId: (categoryId: string) => Product[];
  updateStock: (productId: string, quantity: number) => void;
  
  // Category actions
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  getCategory: (id: string) => Category | undefined;
  
  // Customer actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;
  
  // Cart actions
  addToCart: (product: Product, quantity: number) => void;
  updateCartItem: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartSubtotal: () => number;
  getCartTax: () => number;
  
  // Sale actions
  createSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  updateSale: (id: string, updates: Partial<Sale>) => void;
  getSale: (id: string) => Sale | undefined;
  getSalesByCustomer: (customerId: string) => Sale[];
  
  // Supplier actions
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  getSupplier: (id: string) => Supplier | undefined;
  
  // Purchase Order actions
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt'>) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  getPurchaseOrder: (id: string) => PurchaseOrder | undefined;
  
  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getExpense: (id: string) => Expense | undefined;
  
  // Expense Category actions
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'createdAt'>) => void;
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => void;
  getExpenseCategory: (id: string) => ExpenseCategory | undefined;
  
  // Utility actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type BusinessStore = BusinessState & BusinessActions;

// Generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Generate invoice number
const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV${year}${month}${day}${random}`;
};

// Generate PO number
const generatePONumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PO${year}${month}${day}${random}`;
};

// Mock initial data
const initialCategories: Category[] = [
  { id: '1', name: 'Beverages', description: 'Drinks and beverages', isActive: true, createdAt: new Date() },
  { id: '2', name: 'Snacks', description: 'Snacks and chips', isActive: true, createdAt: new Date() },
  { id: '3', name: 'Personal Care', description: 'Personal hygiene products', isActive: true, createdAt: new Date() },
  { id: '4', name: 'Household', description: 'Household items', isActive: true, createdAt: new Date() },
];

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'San Miguel Beer 330ml',
    description: 'San Miguel Pale Pilsen 330ml bottle',
    sku: 'SMB-330',
    barcode: '4800016644443',
    category: '1',
    price: 45,
    cost: 38,
    stock: 120,
    minStock: 20,
    unit: 'bottle',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Lucky Me Instant Noodles',
    description: 'Lucky Me Chicken Flavor 55g',
    sku: 'LM-CHK-55',
    barcode: '4800016001234',
    category: '2',
    price: 12,
    cost: 9,
    stock: 200,
    minStock: 50,
    unit: 'pack',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Coca-Cola 355ml',
    description: 'Coca-Cola Regular 355ml can',
    sku: 'CC-355',
    barcode: '4902430123456',
    category: '1',
    price: 25,
    cost: 20,
    stock: 150,
    minStock: 30,
    unit: 'can',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    name: 'Pantene Shampoo 170ml',
    description: 'Pantene Pro-V Classic Clean 170ml',
    sku: 'PAN-170',
    barcode: '8001090123456',
    category: '3',
    price: 89,
    cost: 72,
    stock: 45,
    minStock: 10,
    unit: 'bottle',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const initialCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@email.com',
    phone: '+639171234567',
    address: '123 Rizal Street',
    city: 'Quezon City',
    province: 'Metro Manila',
    zipCode: '1100',
    creditLimit: 5000,
    currentBalance: 0,
    isActive: true,
    createdAt: new Date(),
    lastPurchase: new Date()
  },
  {
    id: '2',
    firstName: 'Jose',
    lastName: 'Cruz',
    email: 'jose.cruz@email.com',
    phone: '+639181234567',
    address: '456 Bonifacio Avenue',
    city: 'Manila',
    province: 'Metro Manila',
    zipCode: '1000',
    creditLimit: 3000,
    currentBalance: 0,
    isActive: true,
    createdAt: new Date(),
    lastPurchase: new Date()
  }
];

const initialSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'San Miguel Corporation',
    contactPerson: 'Juan Dela Cruz',
    email: 'purchasing@sanmiguel.com.ph',
    phone: '+63281234567',
    address: '40 San Miguel Avenue',
    city: 'Mandaluyong City',
    province: 'Metro Manila',
    zipCode: '1550',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '2',
    name: 'Universal Robina Corporation',
    contactPerson: 'Maria Garcia',
    email: 'orders@urc.com.ph',
    phone: '+63287654321',
    address: 'E. Rodriguez Jr. Avenue',
    city: 'Quezon City',
    province: 'Metro Manila',
    zipCode: '1110',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '3',
    name: 'Nestle Philippines',
    contactPerson: 'Pedro Santos',
    email: 'supply@nestle.com.ph',
    phone: '+63278901234',
    address: 'Rockwell Business Center',
    city: 'Makati City',
    province: 'Metro Manila',
    zipCode: '1200',
    isActive: true,
    createdAt: new Date()
  }
];

const initialExpenseCategories: ExpenseCategory[] = [
  {
    id: '1',
    name: 'Utilities',
    description: 'Electricity, water, internet, phone bills',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '2',
    name: 'Rent',
    description: 'Office and store rental expenses',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '3',
    name: 'Supplies',
    description: 'Office supplies and materials',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '4',
    name: 'Transportation',
    description: 'Fuel, maintenance, and travel expenses',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '5',
    name: 'Marketing',
    description: 'Advertising and promotional expenses',
    birClassification: 'Selling Expenses',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: '6',
    name: 'Salaries',
    description: 'Employee salaries and wages',
    birClassification: 'Operating Expenses',
    isActive: true,
    createdAt: new Date()
  }
];

export const useBusinessStore = create<BusinessStore>()(
  persist(
    (set, get) => ({
      // Initial state
      products: initialProducts,
      categories: initialCategories,
      customers: initialCustomers,
      sales: [],
      cart: [],
      suppliers: initialSuppliers,
      purchaseOrders: [],
      expenses: [],
      expenseCategories: initialExpenseCategories,
      isLoading: false,
      error: null,

      // Product actions
      addProduct: (productData) => {
        const product: Product = {
          ...productData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        set((state) => ({
          products: [...state.products, product]
        }));
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map(product =>
            product.id === id
              ? { ...product, ...updates, updatedAt: new Date() }
              : product
          )
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter(product => product.id !== id)
        }));
      },

      getProduct: (id) => {
        return get().products.find(product => product.id === id);
      },

      getProductsByCategoryId: (categoryId) => {
        return get().products.filter(product => product.category === categoryId && product.isActive);
      },

      updateStock: (productId, quantity) => {
        set((state) => ({
          products: state.products.map(product =>
            product.id === productId
              ? { ...product, stock: product.stock + quantity, updatedAt: new Date() }
              : product
          )
        }));
      },

      // Category actions
      addCategory: (categoryData) => {
        const category: Category = {
          ...categoryData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          categories: [...state.categories, category]
        }));
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map(category =>
            category.id === id ? { ...category, ...updates } : category
          )
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter(category => category.id !== id)
        }));
      },

      getCategory: (id) => {
        return get().categories.find(category => category.id === id);
      },

      // Customer actions
      addCustomer: (customerData) => {
        const customer: Customer = {
          ...customerData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          customers: [...state.customers, customer]
        }));
      },

      updateCustomer: (id, updates) => {
        set((state) => ({
          customers: state.customers.map(customer =>
            customer.id === id ? { ...customer, ...updates } : customer
          )
        }));
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter(customer => customer.id !== id)
        }));
      },

      getCustomer: (id) => {
        return get().customers.find(customer => customer.id === id);
      },

      // Cart actions
      addToCart: (product, quantity) => {
        set((state) => {
          const existingItem = state.cart.find(item => item.product.id === product.id);
          
          if (existingItem) {
            return {
              cart: state.cart.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * product.price }
                  : item
              )
            };
          } else {
            return {
              cart: [...state.cart, {
                product,
                quantity,
                total: quantity * product.price
              }]
            };
          }
        });
      },

      updateCartItem: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        
        set((state) => ({
          cart: state.cart.map(item =>
            item.product.id === productId
              ? { ...item, quantity, total: quantity * item.product.price }
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

      getCartSubtotal: () => {
        return get().cart.reduce((total, item) => total + item.total, 0);
      },

      getCartTax: () => {
        const subtotal = get().getCartSubtotal();
        return subtotal * 0.12; // 12% VAT
      },

      getCartTotal: () => {
        return get().getCartSubtotal() + get().getCartTax();
      },

      // Sale actions
      createSale: (saleData) => {
        const sale: Sale = {
          ...saleData,
          id: generateId(),
          invoiceNumber: generateInvoiceNumber(),
          createdAt: new Date()
        };
        
        set((state) => ({
          sales: [...state.sales, sale]
        }));

        // Update product stock
        sale.items.forEach(item => {
          get().updateStock(item.productId, -item.quantity);
        });

        // Clear cart after sale
        get().clearCart();
      },

      updateSale: (id, updates) => {
        set((state) => ({
          sales: state.sales.map(sale =>
            sale.id === id ? { ...sale, ...updates } : sale
          )
        }));
      },

      getSale: (id) => {
        return get().sales.find(sale => sale.id === id);
      },

      getSalesByCustomer: (customerId) => {
        return get().sales.filter(sale => sale.customerId === customerId);
      },

      // Supplier actions
      addSupplier: (supplierData) => {
        const supplier: Supplier = {
          ...supplierData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          suppliers: [...state.suppliers, supplier]
        }));
      },

      updateSupplier: (id, updates) => {
        set((state) => ({
          suppliers: state.suppliers.map(supplier =>
            supplier.id === id ? { ...supplier, ...updates } : supplier
          )
        }));
      },

      deleteSupplier: (id) => {
        set((state) => ({
          suppliers: state.suppliers.filter(supplier => supplier.id !== id)
        }));
      },

      getSupplier: (id) => {
        return get().suppliers.find(supplier => supplier.id === id);
      },

      // Purchase Order actions
      addPurchaseOrder: (poData) => {
        const purchaseOrder: PurchaseOrder = {
          ...poData,
          id: generateId(),
          poNumber: generatePONumber(),
          createdAt: new Date()
        };
        set((state) => ({
          purchaseOrders: [...state.purchaseOrders, purchaseOrder]
        }));
      },

      updatePurchaseOrder: (id, updates) => {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map(po =>
            po.id === id ? { ...po, ...updates } : po
          )
        }));
      },

      getPurchaseOrder: (id) => {
        return get().purchaseOrders.find(po => po.id === id);
      },

      deletePurchaseOrder: (id) => {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter(po => po.id !== id)
        }));
      },

      // Expense actions
      addExpense: (expenseData) => {
        const expense: Expense = {
          ...expenseData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          expenses: [...state.expenses, expense]
        }));
      },

      updateExpense: (id, updates) => {
        set((state) => ({
          expenses: state.expenses.map(expense =>
            expense.id === id ? { ...expense, ...updates } : expense
          )
        }));
      },

      deleteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter(expense => expense.id !== id)
        }));
      },

      getExpense: (id) => {
        return get().expenses.find(expense => expense.id === id);
      },

      // Expense Category actions
      addExpenseCategory: (categoryData) => {
        const category: ExpenseCategory = {
          ...categoryData,
          id: generateId(),
          createdAt: new Date()
        };
        set((state) => ({
          expenseCategories: [...state.expenseCategories, category]
        }));
      },

      updateExpenseCategory: (id, updates) => {
        set((state) => ({
          expenseCategories: state.expenseCategories.map(category =>
            category.id === id ? { ...category, ...updates } : category
          )
        }));
      },

      deleteExpenseCategory: (id) => {
        set((state) => ({
          expenseCategories: state.expenseCategories.filter(category => category.id !== id)
        }));
      },

      getExpenseCategory: (id) => {
        return get().expenseCategories.find(category => category.id === id);
      },

      // Utility actions
      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'fbms-business',
      partialize: (state) => ({
        products: state.products,
        categories: state.categories,
        customers: state.customers,
        sales: state.sales,
        suppliers: state.suppliers,
        purchaseOrders: state.purchaseOrders,
        expenses: state.expenses,
        expenseCategories: state.expenseCategories
      })
    }
  )
);