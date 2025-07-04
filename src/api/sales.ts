import { supabase } from '../utils/supabase';
import { Sale } from '../types/business';

// CREATE sale
export async function createSale(sale: Omit<Sale, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('sales')
    .insert([{
      invoice_number: sale.invoiceNumber,
      customer_id: sale.customerId,
      customer_name: sale.customerName,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
      total: sale.total,
      payment_method: sale.paymentMethod,
      payment_status: sale.paymentStatus,
      status: sale.status,
      cashier_id: sale.cashierId,
      notes: sale.notes
    }])
    .select(`
      id,
      invoice_number,
      customer_id,
      customer_name,
      items,
      subtotal,
      tax,
      discount,
      total,
      payment_method,
      payment_status,
      status,
      cashier_id,
      notes,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        invoiceNumber: data.invoice_number,
        customerId: data.customer_id,
        customerName: data.customer_name,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        paymentMethod: data.payment_method,
        paymentStatus: data.payment_status,
        status: data.status,
        cashierId: data.cashier_id,
        notes: data.notes,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL sales
export async function getSales(limit?: number, offset?: number) {
  let query = supabase
    .from('sales')
    .select(`
      id,
      invoice_number,
      customer_id,
      customer_name,
      items,
      subtotal,
      tax,
      discount,
      total,
      payment_method,
      payment_status,
      status,
      cashier_id,
      notes,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }
  if (offset) {
    query = query.range(offset, offset + (limit || 50) - 1);
  }

  const { data, error } = await query;

  if (data) {
    const transformedData = data.map(sale => ({
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      customerId: sale.customer_id,
      customerName: sale.customer_name,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.payment_method,
      paymentStatus: sale.payment_status,
      status: sale.status,
      cashierId: sale.cashier_id,
      notes: sale.notes,
      createdAt: new Date(sale.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE sale
export async function getSale(id: string) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      invoice_number,
      customer_id,
      customer_name,
      items,
      subtotal,
      tax,
      discount,
      total,
      payment_method,
      payment_status,
      status,
      cashier_id,
      notes,
      created_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        invoiceNumber: data.invoice_number,
        customerId: data.customer_id,
        customerName: data.customer_name,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        paymentMethod: data.payment_method,
        paymentStatus: data.payment_status,
        status: data.status,
        cashierId: data.cashier_id,
        notes: data.notes,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE sale
export async function updateSale(id: string, updates: Partial<Omit<Sale, 'id' | 'createdAt'>>) {
  const updateData: Partial<{ 
    invoice_number: string; 
    customer_id: string; 
    customer_name: string; 
    items: SaleItem[]; 
    subtotal: number; 
    tax: number; 
    total: number; 
    discount: number; 
    payment_method: string; 
    payment_status: string; 
    sale_status: string; 
    notes: string; 
    date: string;
  }> = {};
  
  if (updates.invoiceNumber) updateData.invoice_number = updates.invoiceNumber;
  if (updates.customerId !== undefined) updateData.customer_id = updates.customerId;
  if (updates.customerName !== undefined) updateData.customer_name = updates.customerName;
  if (updates.items) updateData.items = updates.items;
  if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
  if (updates.tax !== undefined) updateData.tax = updates.tax;
  if (updates.discount !== undefined) updateData.discount = updates.discount;
  if (updates.total !== undefined) updateData.total = updates.total;
  if (updates.paymentMethod) updateData.payment_method = updates.paymentMethod;
  if (updates.paymentStatus) updateData.payment_status = updates.paymentStatus;
  if (updates.status) updateData.status = updates.status;
  if (updates.cashierId) updateData.cashier_id = updates.cashierId;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from('sales')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      invoice_number,
      customer_id,
      customer_name,
      items,
      subtotal,
      tax,
      discount,
      total,
      payment_method,
      payment_status,
      status,
      cashier_id,
      notes,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        invoiceNumber: data.invoice_number,
        customerId: data.customer_id,
        customerName: data.customer_name,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        paymentMethod: data.payment_method,
        paymentStatus: data.payment_status,
        status: data.status,
        cashierId: data.cashier_id,
        notes: data.notes,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE sale
export async function deleteSale(id: string) {
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get sales by date range
export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      invoice_number,
      customer_id,
      customer_name,
      items,
      subtotal,
      tax,
      discount,
      total,
      payment_method,
      payment_status,
      status,
      cashier_id,
      notes,
      created_at
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  if (data) {
    const transformedData = data.map(sale => ({
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      customerId: sale.customer_id,
      customerName: sale.customer_name,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.payment_method,
      paymentStatus: sale.payment_status,
      status: sale.status,
      cashierId: sale.cashier_id,
      notes: sale.notes,
      createdAt: new Date(sale.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get sales by customer
export async function getSalesByCustomer(customerId: string) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      invoice_number,
      customer_id,
      customer_name,
      items,
      subtotal,
      tax,
      discount,
      total,
      payment_method,
      payment_status,
      status,
      cashier_id,
      notes,
      created_at
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (data) {
    const transformedData = data.map(sale => ({
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      customerId: sale.customer_id,
      customerName: sale.customer_name,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.payment_method,
      paymentStatus: sale.payment_status,
      status: sale.status,
      cashierId: sale.cashier_id,
      notes: sale.notes,
      createdAt: new Date(sale.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get sales summary for dashboard
export async function getSalesSummary(period: 'today' | 'week' | 'month' | 'year' = 'today') {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  const { data, error } = await supabase
    .from('sales')
    .select('total, payment_status, status, created_at')
    .gte('created_at', startDate.toISOString())
    .eq('status', 'completed');

  if (data) {
    const totalSales = data.reduce((sum, sale) => sum + sale.total, 0);
    const totalTransactions = data.length;
    const paidTransactions = data.filter(sale => sale.payment_status === 'paid').length;
    const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    return {
      data: {
        totalSales,
        totalTransactions,
        paidTransactions,
        pendingTransactions: totalTransactions - paidTransactions,
        avgTransactionValue,
        period
      },
      error: null
    };
  }

  return { data: null, error };
}

// Generate next invoice number
export async function getNextInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Get the latest invoice for this month
  const { data, error } = await supabase
    .from('sales')
    .select('invoice_number')
    .like('invoice_number', `INV-${year}${month}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (error) {
    return { data: null, error };
  }

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastInvoiceNumber = data[0].invoice_number;
    const lastNumber = parseInt(lastInvoiceNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  const invoiceNumber = `INV-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
  return { data: invoiceNumber, error: null };
}