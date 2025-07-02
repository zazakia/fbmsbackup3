import { supabase } from '../utils/supabase';
import { Expense, ExpenseCategory } from '../types/business';

// EXPENSE CATEGORY CRUD OPERATIONS

// CREATE expense category
export async function createExpenseCategory(category: Omit<ExpenseCategory, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert([{
      name: category.name,
      description: category.description,
      bir_classification: category.birClassification,
      is_active: category.isActive
    }])
    .select(`
      id,
      name,
      description,
      bir_classification,
      is_active,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        birClassification: data.bir_classification,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL expense categories
export async function getExpenseCategories() {
  const { data, error } = await supabase
    .from('expense_categories')
    .select(`
      id,
      name,
      description,
      bir_classification,
      is_active,
      created_at
    `)
    .order('name', { ascending: true });

  if (data) {
    const transformedData = data.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      birClassification: category.bir_classification,
      isActive: category.is_active,
      createdAt: new Date(category.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE expense category
export async function getExpenseCategory(id: string) {
  const { data, error } = await supabase
    .from('expense_categories')
    .select(`
      id,
      name,
      description,
      bir_classification,
      is_active,
      created_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        birClassification: data.bir_classification,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE expense category
export async function updateExpenseCategory(id: string, updates: Partial<Omit<ExpenseCategory, 'id' | 'createdAt'>>) {
  const updateData: Partial<{ name: string; description: string; bir_classification: string; is_active: boolean }> = {};
  
  if (updates.name) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.birClassification !== undefined) updateData.bir_classification = updates.birClassification;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('expense_categories')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      name,
      description,
      bir_classification,
      is_active,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        birClassification: data.bir_classification,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE expense category
export async function deleteExpenseCategory(id: string) {
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get active expense categories
export async function getActiveExpenseCategories() {
  const { data, error } = await supabase
    .from('expense_categories')
    .select(`
      id,
      name,
      description,
      bir_classification,
      is_active,
      created_at
    `)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (data) {
    const transformedData = data.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      birClassification: category.bir_classification,
      isActive: category.is_active,
      createdAt: new Date(category.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// EXPENSE CRUD OPERATIONS

// CREATE expense
export async function createExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      tax_amount: expense.taxAmount,
      total_amount: expense.totalAmount,
      date: expense.date.toISOString(),
      vendor: expense.vendor,
      payment_method: expense.paymentMethod,
      status: expense.status,
      notes: expense.notes,
      is_recurring: expense.isRecurring,
      recurring_interval: expense.recurringInterval,
      created_by: expense.createdBy
    }])
    .select(`
      id,
      description,
      category,
      amount,
      tax_amount,
      total_amount,
      date,
      vendor,
      payment_method,
      status,
      notes,
      is_recurring,
      recurring_interval,
      created_by,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        description: data.description,
        category: data.category,
        amount: data.amount,
        taxAmount: data.tax_amount,
        totalAmount: data.total_amount,
        date: new Date(data.date),
        vendor: data.vendor,
        paymentMethod: data.payment_method,
        status: data.status,
        notes: data.notes,
        isRecurring: data.is_recurring,
        recurringInterval: data.recurring_interval,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL expenses
export async function getExpenses(limit?: number, offset?: number) {
  let query = supabase
    .from('expenses')
    .select(`
      id,
      description,
      category,
      amount,
      tax_amount,
      total_amount,
      date,
      vendor,
      payment_method,
      status,
      notes,
      is_recurring,
      recurring_interval,
      created_by,
      created_at
    `)
    .order('date', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }
  if (offset) {
    query = query.range(offset, offset + (limit || 50) - 1);
  }

  const { data, error } = await query;

  if (data) {
    const transformedData = data.map(expense => ({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      taxAmount: expense.tax_amount,
      totalAmount: expense.total_amount,
      date: new Date(expense.date),
      vendor: expense.vendor,
      paymentMethod: expense.payment_method,
      status: expense.status,
      notes: expense.notes,
      isRecurring: expense.is_recurring,
      recurringInterval: expense.recurring_interval,
      createdBy: expense.created_by,
      createdAt: new Date(expense.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE expense
export async function getExpense(id: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      category,
      amount,
      tax_amount,
      total_amount,
      date,
      vendor,
      payment_method,
      status,
      notes,
      is_recurring,
      recurring_interval,
      created_by,
      created_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        description: data.description,
        category: data.category,
        amount: data.amount,
        taxAmount: data.tax_amount,
        totalAmount: data.total_amount,
        date: new Date(data.date),
        vendor: data.vendor,
        paymentMethod: data.payment_method,
        status: data.status,
        notes: data.notes,
        isRecurring: data.is_recurring,
        recurringInterval: data.recurring_interval,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE expense
export async function updateExpense(id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) {
  const updateData: Partial<{ description: string; category: string; amount: number; tax_amount: number; total_amount: number; date: string; vendor: string; payment_method: string; status: string; notes: string; is_recurring: boolean; recurring_interval: string }> = {};
  
  if (updates.description) updateData.description = updates.description;
  if (updates.category) updateData.category = updates.category;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.taxAmount !== undefined) updateData.tax_amount = updates.taxAmount;
  if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount;
  if (updates.date) updateData.date = updates.date.toISOString();
  if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
  if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
  if (updates.status) updateData.status = updates.status;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring;
  if (updates.recurringInterval !== undefined) updateData.recurring_interval = updates.recurringInterval;
  if (updates.createdBy) updateData.created_by = updates.createdBy;

  const { data, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      description,
      category,
      amount,
      tax_amount,
      total_amount,
      date,
      vendor,
      payment_method,
      status,
      notes,
      is_recurring,
      recurring_interval,
      created_by,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        description: data.description,
        category: data.category,
        amount: data.amount,
        taxAmount: data.tax_amount,
        totalAmount: data.total_amount,
        date: new Date(data.date),
        vendor: data.vendor,
        paymentMethod: data.payment_method,
        status: data.status,
        notes: data.notes,
        isRecurring: data.is_recurring,
        recurringInterval: data.recurring_interval,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE expense
export async function deleteExpense(id: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get expenses by category
export async function getExpensesByCategory(category: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      category,
      amount,
      tax_amount,
      total_amount,
      date,
      vendor,
      payment_method,
      status,
      notes,
      is_recurring,
      recurring_interval,
      created_by,
      created_at
    `)
    .eq('category', category)
    .order('date', { ascending: false });

  if (data) {
    const transformedData = data.map(expense => ({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      taxAmount: expense.tax_amount,
      totalAmount: expense.total_amount,
      date: new Date(expense.date),
      vendor: expense.vendor,
      paymentMethod: expense.payment_method,
      status: expense.status,
      notes: expense.notes,
      isRecurring: expense.is_recurring,
      recurringInterval: expense.recurring_interval,
      createdBy: expense.created_by,
      createdAt: new Date(expense.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get expenses by date range
export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      category,
      amount,
      tax_amount,
      total_amount,
      date,
      vendor,
      payment_method,
      status,
      notes,
      is_recurring,
      recurring_interval,
      created_by,
      created_at
    `)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .order('date', { ascending: false });

  if (data) {
    const transformedData = data.map(expense => ({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      taxAmount: expense.tax_amount,
      totalAmount: expense.total_amount,
      date: new Date(expense.date),
      vendor: expense.vendor,
      paymentMethod: expense.payment_method,
      status: expense.status,
      notes: expense.notes,
      isRecurring: expense.is_recurring,
      recurringInterval: expense.recurring_interval,
      createdBy: expense.created_by,
      createdAt: new Date(expense.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get expenses by status
export async function getExpensesByStatus(status: 'pending' | 'approved' | 'rejected' | 'paid') {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      category,
      amount,
      tax_amount,
      total_amount,
      date,
      vendor,
      payment_method,
      status,
      notes,
      is_recurring,
      recurring_interval,
      created_by,
      created_at
    `)
    .eq('status', status)
    .order('date', { ascending: false });

  if (data) {
    const transformedData = data.map(expense => ({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      taxAmount: expense.tax_amount,
      totalAmount: expense.total_amount,
      date: new Date(expense.date),
      vendor: expense.vendor,
      paymentMethod: expense.payment_method,
      status: expense.status,
      notes: expense.notes,
      isRecurring: expense.is_recurring,
      recurringInterval: expense.recurring_interval,
      createdBy: expense.created_by,
      createdAt: new Date(expense.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get recurring expenses
export async function getRecurringExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      category,
      amount,
      tax_amount,
      total_amount,
      date,
      vendor,
      payment_method,
      status,
      notes,
      is_recurring,
      recurring_interval,
      created_by,
      created_at
    `)
    .eq('is_recurring', true)
    .eq('status', 'approved')
    .order('date', { ascending: false });

  if (data) {
    const transformedData = data.map(expense => ({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      taxAmount: expense.tax_amount,
      totalAmount: expense.total_amount,
      date: new Date(expense.date),
      vendor: expense.vendor,
      paymentMethod: expense.payment_method,
      status: expense.status,
      notes: expense.notes,
      isRecurring: expense.is_recurring,
      recurringInterval: expense.recurring_interval,
      createdBy: expense.created_by,
      createdAt: new Date(expense.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get expense summary for dashboard
export async function getExpenseSummary(period: 'today' | 'week' | 'month' | 'year' = 'month') {
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
    .from('expenses')
    .select('total_amount, status, category, created_at')
    .gte('date', startDate.toISOString());

  if (data) {
    const totalExpenses = data.reduce((sum, expense) => sum + expense.total_amount, 0);
    const approvedExpenses = data.filter(expense => expense.status === 'approved');
    const totalApproved = approvedExpenses.reduce((sum, expense) => sum + expense.total_amount, 0);
    const paidExpenses = data.filter(expense => expense.status === 'paid');
    const totalPaid = paidExpenses.reduce((sum, expense) => sum + expense.total_amount, 0);
    const pendingExpenses = data.filter(expense => expense.status === 'pending');
    const totalPending = pendingExpenses.reduce((sum, expense) => sum + expense.total_amount, 0);

    // Group by category
    const categoryTotals = data.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.total_amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      data: {
        totalExpenses,
        totalApproved,
        totalPaid,
        totalPending,
        totalTransactions: data.length,
        approvedTransactions: approvedExpenses.length,
        paidTransactions: paidExpenses.length,
        pendingTransactions: pendingExpenses.length,
        categoryBreakdown: categoryTotals,
        period
      },
      error: null
    };
  }

  return { data: null, error };
}

// Approve expense
export async function approveExpense(id: string) {
  return updateExpense(id, { status: 'approved' });
}

// Reject expense
export async function rejectExpense(id: string, rejectedBy: string, reason?: string) {
  const updates: { status: string; notes?: string } = { status: 'rejected' };
  if (reason) {
    updates.notes = reason;
  }
  return updateExpense(id, updates);
}

// Mark expense as paid
export async function markExpenseAsPaid(id: string) {
  return updateExpense(id, { status: 'paid' });
}