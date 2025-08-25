import { vi } from 'vitest';

// Mock Supabase client with all necessary methods
export const mockSupabase = {
  // Authentication methods
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null }))
  },

  // Database operations
  from: vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: vi.fn((callback: any) => Promise.resolve({ data: [], error: null }).then(callback))
  })),

  // RPC methods
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),

  // Storage methods
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
      download: vi.fn(() => Promise.resolve({ data: null, error: null })),
      remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
      list: vi.fn(() => Promise.resolve({ data: [], error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'mock-url' } }))
    }))
  },

  // Realtime
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(() => Promise.resolve()),
    unsubscribe: vi.fn(() => Promise.resolve())
  })),

  // Functions
  functions: {
    invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
  }
};

// Mock data generators for different table types
export const mockData = {
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
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  
  sales: [
    {
      id: 'sale-1',
      customer_id: 'cust-1',
      total_amount: 100.00,
      tax_amount: 12.00,
      discount_amount: 0.00,
      payment_method: 'cash',
      status: 'completed',
      receipt_number: 'RCP-001',
      created_at: '2024-01-01T00:00:00Z'
    }
  ],

  customers: [
    {
      id: 'cust-1',
      name: 'Juan dela Cruz',
      email: 'juan@example.com',
      phone: '+63917123456',
      address: 'Manila, Philippines',
      loyalty_points: 100,
      created_at: '2024-01-01T00:00:00Z'
    }
  ],

  purchase_orders: [
    {
      id: 'po-1',
      supplier_id: 'sup-1',
      total_amount: 500.00,
      status: 'pending',
      order_date: '2024-01-01',
      expected_delivery: '2024-01-07',
      created_at: '2024-01-01T00:00:00Z'
    }
  ]
};

// Enhanced mock with table-specific responses
export const createMockSupabaseClient = () => {
  const mockClient = { ...mockSupabase };
  
  // Override from method to return table-specific mock data
  mockClient.from = vi.fn((table: string) => {
    const tableData = mockData[table as keyof typeof mockData] || [];
    
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn((data: any) => ({
        select: vi.fn(() => Promise.resolve({
          data: Array.isArray(data) ? data : [{ id: `mock-${Date.now()}`, ...data }],
          error: null
        }))
      })),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ 
        data: tableData.length > 0 ? tableData[0] : null, 
        error: null 
      })),
      maybeSingle: vi.fn(() => Promise.resolve({ 
        data: tableData.length > 0 ? tableData[0] : null, 
        error: null 
      })),
      then: vi.fn((callback: any) => 
        Promise.resolve({ data: tableData, error: null }).then(callback)
      )
    };
  });
  
  return mockClient;
};

// Mock Supabase module
export const mockSupabaseModule = {
  supabase: createMockSupabaseClient(),
  createClient: vi.fn(() => createMockSupabaseClient())
};