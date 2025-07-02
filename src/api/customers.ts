import { supabase } from '../utils/supabase';
import { Customer, CustomerContact, CustomerTransaction, CustomerType, ContactType, ContactStatus, TransactionType } from '../types/business';
import { handleSupabaseError } from '../utils/errorHandling';

// Customer CRUD Operations

export async function createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'currentBalance' | 'totalPurchases' | 'loyaltyPoints'>) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email || null,
        phone: customer.phone || null,
        address: customer.address || null,
        city: customer.city || null,
        province: customer.province || null,
        zip_code: customer.zipCode || null,
        credit_limit: customer.creditLimit || 0,
        is_active: customer.isActive !== false,
        customer_type: customer.customerType || 'individual',
        tax_id: customer.taxId || null,
        business_name: customer.businessName || null,
        birthday: customer.birthday ? customer.birthday.toISOString() : null,
        notes: customer.notes || null,
        tags: customer.tags || [],
        preferred_payment_method: customer.preferredPaymentMethod || null,
        discount_percentage: customer.discountPercentage || 0,
        current_balance: 0,
        total_purchases: 0,
        loyalty_points: 0
      }])
      .select(`
        id, first_name, last_name, email, phone, address, city, province, zip_code,
        credit_limit, current_balance, total_purchases, is_active, customer_type,
        tax_id, business_name, birthday, notes, tags, preferred_payment_method,
        discount_percentage, loyalty_points, created_at, updated_at, last_purchase, last_contact
      `)
      .single();

    if (error) throw error;

    return {
      data: transformCustomerFromDB(data),
      error: null
    };
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
    let query = supabase
      .from('customers')
      .select(`
        id, first_name, last_name, email, phone, address, city, province, zip_code,
        credit_limit, current_balance, total_purchases, is_active, customer_type,
        tax_id, business_name, birthday, notes, tags, preferred_payment_method,
        discount_percentage, loyalty_points, created_at, updated_at, last_purchase, last_contact
      `);

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.customerType) {
      query = query.eq('customer_type', filters.customerType);
    }

    if (filters?.searchTerm) {
      const term = filters.searchTerm.trim();
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,business_name.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data ? data.map(transformCustomerFromDB) : [],
      error: null
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetch customers') };
  }
}

export async function getCustomer(id: string) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id, first_name, last_name, email, phone, address, city, province, zip_code,
        credit_limit, current_balance, total_purchases, is_active, customer_type,
        tax_id, business_name, birthday, notes, tags, preferred_payment_method,
        discount_percentage, loyalty_points, created_at, updated_at, last_purchase, last_contact
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

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
    if (updates.province !== undefined) updateData.province = updates.province;
    if (updates.zipCode !== undefined) updateData.zip_code = updates.zipCode;
    if (updates.creditLimit !== undefined) updateData.credit_limit = updates.creditLimit;
    if (updates.currentBalance !== undefined) updateData.current_balance = updates.currentBalance;
    if (updates.totalPurchases !== undefined) updateData.total_purchases = updates.totalPurchases;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.customerType !== undefined) updateData.customer_type = updates.customerType;
    if (updates.taxId !== undefined) updateData.tax_id = updates.taxId;
    if (updates.businessName !== undefined) updateData.business_name = updates.businessName;
    if (updates.birthday !== undefined) updateData.birthday = updates.birthday?.toISOString();
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.preferredPaymentMethod !== undefined) updateData.preferred_payment_method = updates.preferredPaymentMethod;
    if (updates.discountPercentage !== undefined) updateData.discount_percentage = updates.discountPercentage;
    if (updates.loyaltyPoints !== undefined) updateData.loyalty_points = updates.loyaltyPoints;
    if (updates.lastPurchase !== undefined) updateData.last_purchase = updates.lastPurchase?.toISOString();
    if (updates.lastContact !== undefined) updateData.last_contact = updates.lastContact?.toISOString();

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, first_name, last_name, email, phone, address, city, province, zip_code,
        credit_limit, current_balance, total_purchases, is_active, customer_type,
        tax_id, business_name, birthday, notes, tags, preferred_payment_method,
        discount_percentage, loyalty_points, created_at, updated_at, last_purchase, last_contact
      `)
      .single();

    if (error) throw error;

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
    
    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error: handleSupabaseError(error, 'delete customer') };
  }
}

// Customer Contact Management

export async function createCustomerContact(contact: Omit<CustomerContact, 'id' | 'createdAt'>) {
  try {
    const { data, error } = await supabase
      .from('customer_contacts')
      .insert([{
        customer_id: contact.customerId,
        type: contact.type,
        subject: contact.subject,
        content: contact.content,
        follow_up_date: contact.followUpDate?.toISOString(),
        status: contact.status,
        created_by: contact.createdBy
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      data: data ? transformContactFromDB(data) : null,
      error: null
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'create customer contact') };
  }
}

export async function getCustomerContacts(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data ? data.map(transformContactFromDB) : [],
      error: null
    };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetch customer contacts') };
  }
}

// Customer Transaction History

export async function getCustomerTransactions(customerId: string) {
  try {
    // Get sales data
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('id, total_amount as amount, created_at, invoice_number as reference_number')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    // Transform sales to transactions
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
        loyaltyTier: getLoyaltyTier(customer.data.loyaltyPoints),
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
    province: data.province as string || undefined,
    zipCode: data.zip_code as string || undefined,
    creditLimit: (data.credit_limit as number) || 0,
    currentBalance: (data.current_balance as number) || 0,
    totalPurchases: (data.total_purchases as number) || 0,
    isActive: (data.is_active as boolean) !== false,
    customerType: (data.customer_type as CustomerType) || 'individual',
    taxId: data.tax_id as string || undefined,
    businessName: data.business_name as string || undefined,
    birthday: data.birthday ? new Date(data.birthday as string) : undefined,
    notes: data.notes as string || undefined,
    tags: (data.tags as string[]) || [],
    preferredPaymentMethod: data.preferred_payment_method as Customer['preferredPaymentMethod'],
    discountPercentage: (data.discount_percentage as number) || 0,
    loyaltyPoints: (data.loyalty_points as number) || 0,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
    lastPurchase: data.last_purchase ? new Date(data.last_purchase as string) : undefined,
    lastContact: data.last_contact ? new Date(data.last_contact as string) : undefined
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
      .select('customer_type, is_active, total_purchases, current_balance, loyalty_points');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      active: data?.filter(c => c.is_active).length || 0,
      inactive: data?.filter(c => !c.is_active).length || 0,
      byType: {
        individual: data?.filter(c => c.customer_type === 'individual').length || 0,
        business: data?.filter(c => c.customer_type === 'business').length || 0,
        vip: data?.filter(c => c.customer_type === 'vip').length || 0,
        wholesale: data?.filter(c => c.customer_type === 'wholesale').length || 0,
      },
      totalPurchases: data?.reduce((sum, c) => sum + (c.total_purchases || 0), 0) || 0,
      totalBalance: data?.reduce((sum, c) => sum + (c.current_balance || 0), 0) || 0,
      averageLoyaltyPoints: data?.length ? 
        (data.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) / data.length) : 0
    };

    return { data: stats, error: null };
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetch customer stats') };
  }
}