import { vi } from 'vitest';
import { StateCreator } from 'zustand';

// Mock business store with all essential methods
export const createMockBusinessStore = () => ({
  // Products
  products: [
    {
      id: 'prod-1',
      name: 'Sample Product',
      sku: 'PROD-001',
      price: 100.00,
      cost: 50.00,
      stock: 25,
      min_stock: 5,
      category: 'Electronics',
      description: 'Sample product for testing',
      is_active: true,
      location: 'main-warehouse',
      created_at: '2024-01-01T00:00:00Z'
    }
  ],
  addProduct: vi.fn((product: any) => {
    console.log('Mock addProduct called with:', product);
  }),
  updateProduct: vi.fn((id: string, updates: any) => {
    console.log('Mock updateProduct called:', id, updates);
  }),
  removeProduct: vi.fn((id: string) => {
    console.log('Mock removeProduct called:', id);
  }),
  updateStock: vi.fn((productId: string, quantity: number) => {
    console.log('Mock updateStock called:', productId, quantity);
  }),

  // Customers
  customers: [
    {
      id: 'cust-1',
      name: 'Juan dela Cruz',
      email: 'juan@example.com',
      phone: '+63917123456',
      address: 'Manila, Philippines',
      loyalty_points: 100
    }
  ],
  addCustomer: vi.fn((customer: any) => {
    console.log('Mock addCustomer called with:', customer);
  }),
  updateCustomer: vi.fn((id: string, updates: any) => {
    console.log('Mock updateCustomer called:', id, updates);
  }),
  removeCustomer: vi.fn((id: string) => {
    console.log('Mock removeCustomer called:', id);
  }),

  // Sales
  sales: [],
  addSale: vi.fn((sale: any) => {
    console.log('Mock addSale called with:', sale);
  }),
  updateSale: vi.fn((id: string, updates: any) => {
    console.log('Mock updateSale called:', id, updates);
  }),

  // Cart
  cart: [],
  addToCart: vi.fn((product: any) => {
    console.log('Mock addToCart called with:', product);
  }),
  removeFromCart: vi.fn((productId: string) => {
    console.log('Mock removeFromCart called:', productId);
  }),
  clearCart: vi.fn(() => {
    console.log('Mock clearCart called');
  }),
  updateCartQuantity: vi.fn((productId: string, quantity: number) => {
    console.log('Mock updateCartQuantity called:', productId, quantity);
  }),

  // Accounts (for accounting)
  accounts: [
    {
      id: 'acc-1',
      code: '1000',
      name: 'Cash',
      type: 'asset',
      balance: 10000.00
    },
    {
      id: 'acc-2', 
      code: '4000',
      name: 'Sales Revenue',
      type: 'revenue',
      balance: 0.00
    },
    {
      id: 'acc-3',
      code: '5000',
      name: 'Cost of Goods Sold',
      type: 'expense', 
      balance: 0.00
    }
  ],
  addAccount: vi.fn((account: any) => {
    console.log('Mock addAccount called with:', account);
  }),

  // Purchase Orders
  purchaseOrders: [],
  addPurchaseOrder: vi.fn((po: any) => {
    console.log('Mock addPurchaseOrder called with:', po);
  }),
  updatePurchaseOrder: vi.fn((id: string, updates: any) => {
    console.log('Mock updatePurchaseOrder called:', id, updates);
  }),

  // Loading states
  isLoading: false,
  setLoading: vi.fn((loading: boolean) => {
    console.log('Mock setLoading called:', loading);
  }),

  // Error handling
  error: null,
  setError: vi.fn((error: any) => {
    console.log('Mock setError called:', error);
  }),
  clearError: vi.fn(() => {
    console.log('Mock clearError called');
  })
});

// Mock notification store
export const createMockNotificationStore = () => ({
  notifications: [],
  addNotification: vi.fn((notification: any) => {
    console.log('Mock addNotification called:', notification);
  }),
  removeNotification: vi.fn((id: string) => {
    console.log('Mock removeNotification called:', id);
  }),
  clearNotifications: vi.fn(() => {
    console.log('Mock clearNotifications called');
  })
});

// Mock auth store
export const createMockAuthStore = () => ({
  user: {
    id: 'user-1',
    email: 'test@example.com',
    role: 'manager',
    permissions: ['read', 'write', 'admin']
  },
  session: {
    access_token: 'mock-token',
    expires_at: Date.now() + 3600000
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn((credentials: any) => {
    console.log('Mock login called:', credentials);
    return Promise.resolve({ success: true });
  }),
  logout: vi.fn(() => {
    console.log('Mock logout called');
    return Promise.resolve();
  }),
  checkPermission: vi.fn((permission: string) => {
    console.log('Mock checkPermission called:', permission);
    return true;
  })
});

// Mock cart store
export const createMockCartStore = () => ({
  items: [],
  total: 0,
  itemCount: 0,
  addItem: vi.fn((product: any) => {
    console.log('Mock addItem called:', product);
  }),
  removeItem: vi.fn((productId: string) => {
    console.log('Mock removeItem called:', productId);
  }),
  updateQuantity: vi.fn((productId: string, quantity: number) => {
    console.log('Mock updateQuantity called:', productId, quantity);
  }),
  clear: vi.fn(() => {
    console.log('Mock clear called');
  }),
  calculateTotal: vi.fn(() => 0)
});

// Mock settings store
export const createMockSettingsStore = () => ({
  settings: {
    business_name: 'Test Business',
    address: 'Test Address',
    phone: '+63917123456',
    email: 'test@business.com',
    tax_rate: 0.12,
    currency: 'PHP'
  },
  updateSettings: vi.fn((updates: any) => {
    console.log('Mock updateSettings called:', updates);
  }),
  getSetting: vi.fn((key: string) => {
    console.log('Mock getSetting called:', key);
    return 'mock-value';
  })
});

// Store mock registry for easy access
export const mockStores = {
  business: createMockBusinessStore(),
  notification: createMockNotificationStore(),
  auth: createMockAuthStore(),
  cart: createMockCartStore(),
  settings: createMockSettingsStore()
};

// Helper to reset all mocks
export const resetAllStoreMocks = () => {
  Object.values(mockStores).forEach(store => {
    Object.values(store).forEach(method => {
      if (vi.isMockFunction(method)) {
        method.mockClear();
      }
    });
  });
};

// Mock zustand create function
export const mockZustandCreate = vi.fn((storeInitializer: StateCreator<any, any, any>) => {
  return () => mockStores.business;
});