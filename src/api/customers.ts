import { supabase, isSupabaseAuthenticated } from '../utils/supabase';
import { Customer, CustomerContact, CustomerTransaction, CustomerType, ContactType, ContactStatus, TransactionType } from '../types/business';
import { handleSupabaseError } from '../utils/errorHandling';

// Mock data for development (only used when Supabase is completely unavailable)
const mockCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+63123456789',
    address: '123 Main Street',
    city: 'Manila',
    province: 'Metro Manila',
    zipCode: '1234',
    creditLimit: 1000,
    currentBalance: 0,
    totalPurchases: 0,
    isActive: true,
    customerType: 'individual',
    taxId: undefined,
    businessName: undefined,
    birthday: undefined,
    notes: 'Test customer',
    tags: ['test'],
    preferredPaymentMethod: 'cash',
    discountPercentage: 0,
    loyaltyPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastPurchase: undefined,
    lastContact: undefined
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '+63987654321',
    address: '456 Business Ave',
    city: 'Quezon City',
    province: 'Metro Manila',
    zipCode: '5678',
    creditLimit: 2000,
    currentBalance: 0,
    totalPurchases: 0,
    isActive: true,
    customerType: 'business',
    taxId: '123456789',
    businessName: 'Smith Enterprises',
    birthday: undefined,
    notes: 'Business customer',
    tags: ['business'],
    preferredPaymentMethod: 'credit',
    discountPercentage: 5,
    loyaltyPoints: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastPurchase: undefined,
    lastContact: undefined
  }
];

// Customer CRUD Operations

export async function createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'currentBalance' | 'totalPurchases' | 'loyaltyPoints'>) {
  try {
    // Check if we're authenticated with Supabase
    const isAuthenticated = await isSupabaseAuthenticated();
    
    if (isAuthenticated) {
      console.log('Creating customer in Supabase...');
      
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          first_name: customer.firstName,
          last_name: customer.lastName,
          email: customer.email || null,
          phone: customer.phone || null,
          address: customer.address || null,
          city: customer.city || null,
          state: customer.province || null, // Map province to state
          postal_code: customer.zipCode || null, // Map zipCode to postal_code
          country: 'Philippines'
        }])
        .select(`
          id, first_name, last_name, email, phone, address, city, state, postal_code, country, created_at, updated_at
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return {
        data: transformCustomerFromDB(data),
        error: null
      };
    } else {
      // Fallback to mock data in development
      if (import.meta.env.DEV) {
        console.log('Not authenticated with Supabase, using mock data for development');
        const mockCustomer: Customer = {
          id: Date.now().toString(),
          ...customer,
          creditLimit: 0,
          currentBalance: 0,
          totalPurchases: 0,
          isActive: true,
          customerType: 'individual',
          taxId: undefined,
          businessName: undefined,
          birthday: undefined,
          notes: undefined,
          tags: [],
          preferredPaymentMethod: undefined,
          discountPercentage: 0,
          loyaltyPoints: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastPurchase: undefined,
          lastContact: undefined
        };
        return { data: mockCustomer, error: null };
      } else {
        throw new Error('Authentication required. Please log in to create customers.');
      }
    }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'create customer') };
  }
}

export async function getCustomers(filters?: {
  isActive?: boolean;
  customerType?: CustomerType;
  searchTerm?: string;
}) {
  try {
    // Check if we're authenticated with Supabase
    const isAuthenticated = await isSupabaseAuthenticated();
    
    if (isAuthenticated) {
      console.log('Fetching customers from Supabase...');
      
      let query = supabase
        .from('customers')
        .select(`
          id, first_name, last_name, email, phone, address, city, state, postal_code, country, created_at, updated_at
        `);

      if (filters?.searchTerm) {
        const term = filters.searchTerm.trim();
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return {
        data: data ? data.map(transformCustomerFromDB) : [],
        error: null
      };
    } else {
      // Fallback to mock data in development
      if (import.meta.env.DEV) {
        console.log('Not authenticated with Supabase, using mock data for development');
        let filteredCustomers = [...mockCustomers];
        
        if (filters?.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          filteredCustomers = filteredCustomers.filter(customer => 
            customer.firstName.toLowerCase().includes(term) ||
            customer.lastName.toLowerCase().includes(term) ||
            customer.email?.toLowerCase().includes(term) ||
            customer.phone?.toLowerCase().includes(term)
          );
        }
        
        return { data: filteredCustomers, error: null };
      } else {
        throw new Error('Authentication required. Please log in to view customers.');
      }
    }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetch customers') };
  }
}

export async function getCustomer(id: string) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id, first_name, last_name, email, phone, address, city, state, postal_code, country, created_at, updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        // In development, return mock data instead of throwing error
        if (import.meta.env.DEV) {
          console.log('Using mock data for development');
          const mockCustomer = mockCustomers.find(c => c.id === id);
          return { data: mockCustomer || null, error: null };
        }
        throw new Error('Authentication required. Please log in to view customer.');
      }
      throw error;
    }

    return {
      data: data ? transformCustomerFromDB(data) : null,
      error: null
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetch customer') };
  }
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.province !== undefined) updateData.state = updates.province;
    if (updates.zipCode !== undefined) updateData.postal_code = updates.zipCode;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, first_name, last_name, email, phone, address, city, state, postal_code, country, created_at, updated_at
      `)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        // In development, return mock data instead of throwing error
        if (import.meta.env.DEV) {
          console.log('Using mock data for development');
          const mockCustomer = mockCustomers.find(c => c.id === id);
          if (mockCustomer) {
            const updatedCustomer = { ...mockCustomer, ...updates, updatedAt: new Date() };
            return { data: updatedCustomer, error: null };
          }
          return { data: null, error: null };
        }
        throw new Error('Authentication required. Please log in to update customer.');
      }
      throw error;
    }

    return {
      data: data ? transformCustomerFromDB(data) : null,
      error: null
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'update customer') };
  }
}

export async function deleteCustomer(id: string) {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        // In development, return success instead of throwing error
        if (import.meta.env.DEV) {
          console.log('Using mock data for development');
          return { error: null };
        }
        throw new Error('Authentication required. Please log in to delete customer.');
      }
      throw error;
    }

    return { error: null };
  } catch (error) {
    return { error: handleSupabaseError(error, 'delete customer') };
  }
}

// Customer Contact Management

export async function createCustomerContact(contact: Omit<CustomerContact, 'id' | 'createdAt'>) {
  try {
    console.warn('Customer contacts functionality not implemented - table may not exist');
    return {
      data: null,
      error: new Error('Customer contacts functionality not yet implemented')
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'create customer contact') };
  }
}

export async function getCustomerContacts(customerId: string) {
  try {
    console.warn('Customer contacts functionality not implemented - table may not exist');
    return {
      data: [],
      error: null
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetch customer contacts') };
  }
}

// Customer Transaction History

export async function getCustomerTransactions(customerId: string) {
  try {
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('id, total as amount, created_at, invoice_number as reference_number')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    const transactions: CustomerTransaction[] = salesData?.map(sale => ({
      id: sale.id,
      customerId,
      type: 'sale' as TransactionType,
      amount: sale.amount,
      description: `Sale - Invoice #${sale.reference_number}`,
      referenceNumber: sale.reference_number,
      createdAt: new Date(sale.created_at)
    })) || [];

    return {
      data: transactions,
      error: null
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetch customer transactions') };
  }
}

// Customer Analytics

export async function getCustomerAnalytics(customerId: string) {
  try {
    const customer = await getCustomer(customerId);
    if (customer.error || !customer.data) {
      throw new Error('Customer not found');
    }

    const transactions = await getCustomerTransactions(customerId);
    if (transactions.error) {
      throw transactions.error;
    }

    const totalSales = transactions.data?.reduce((sum, t) => 
      t.type === 'sale' ? sum + t.amount : sum, 0) || 0;
    
    const totalTransactions = transactions.data?.filter(t => t.type === 'sale').length || 0;
    
    const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    const lastTransaction = transactions.data?.[0];

    return {
      data: {
        customer: customer.data,
        totalSales,
        totalTransactions,
        averageOrderValue,
        lastTransactionDate: lastTransaction?.createdAt,
        lifetimeValue: totalSales,
        loyaltyTier: 'Bronze',
        transactions: transactions.data || []
      },
      error: null
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetch customer analytics') };
  }
}

// Utility Functions

function transformCustomerFromDB(data: Record<string, unknown>): Customer {
  return {
    id: data.id as string,
    firstName: data.first_name as string,
    lastName: data.last_name as string,
    email: data.email as string || undefined,
    phone: data.phone as string || undefined,
    address: data.address as string || undefined,
    city: data.city as string || undefined,
    province: data.state as string || undefined,
    zipCode: data.postal_code as string || undefined,
    creditLimit: 0,
    currentBalance: 0,
    totalPurchases: 0,
    isActive: true,
    customerType: 'individual' as CustomerType,
    taxId: undefined,
    businessName: undefined,
    birthday: undefined,
    notes: undefined,
    tags: [],
    preferredPaymentMethod: undefined,
    discountPercentage: 0,
    loyaltyPoints: 0,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
    lastPurchase: undefined,
    lastContact: undefined
  };
}

function transformContactFromDB(data: Record<string, unknown>): CustomerContact {
  return {
    id: data.id as string,
    customerId: data.customer_id as string,
    type: data.type as ContactType,
    subject: data.subject as string,
    content: data.content as string,
    followUpDate: data.follow_up_date ? new Date(data.follow_up_date as string) : undefined,
    status: data.status as ContactStatus,
    createdBy: data.created_by as string,
    createdAt: new Date(data.created_at as string)
  };
}

function getLoyaltyTier(points: number): string {
  if (points >= 10000) return 'Platinum';
  if (points >= 5000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Bronze';
}

// Customer Statistics
export async function getCustomerStats() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email');

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        // In development, return mock data instead of throwing error
        if (import.meta.env.DEV) {
          console.log('Using mock data for development');
          const stats = {
            total: mockCustomers.length,
            active: mockCustomers.length,
            inactive: 0,
            byType: {
              individual: mockCustomers.filter(c => c.customerType === 'individual').length,
              business: mockCustomers.filter(c => c.customerType === 'business').length,
              vip: mockCustomers.filter(c => c.customerType === 'vip').length,
              wholesale: mockCustomers.filter(c => c.customerType === 'wholesale').length,
            },
            totalPurchases: mockCustomers.reduce((sum, c) => sum + c.totalPurchases, 0),
            totalBalance: mockCustomers.reduce((sum, c) => sum + c.currentBalance, 0),
            averageLoyaltyPoints: mockCustomers.length ? 
              (mockCustomers.reduce((sum, c) => sum + c.loyaltyPoints, 0) / mockCustomers.length) : 0
          };
          return { data: stats, error: null };
        }
        throw new Error('Authentication required. Please log in to view customer stats.');
      }
      throw error;
    }

    const stats = {
      total: data?.length || 0,
      active: data?.length || 0, // Assume all are active since is_active column doesn't exist
      inactive: 0, // No inactive customers since column doesn't exist
      byType: {
        individual: data?.length || 0, // Assume all are individual since customer_type column doesn't exist
        business: 0,
        vip: 0,
        wholesale: 0,
      },
      totalPurchases: 0, // Column doesn't exist
      totalBalance: 0, // Column doesn't exist
      averageLoyaltyPoints: 0 // Column doesn't exist
    };

    return {
      data: stats,
      error: null
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetch customer stats') };
  }
}