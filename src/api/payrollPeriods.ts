import { supabase } from '../utils/supabase';

export interface PayrollPeriod {
  id: string;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
  status: 'Open' | 'Processing' | 'Finalized' | 'Closed';
  createdAt: Date;
}

// CREATE payroll period
export async function createPayrollPeriod(period: Omit<PayrollPeriod, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('payroll_periods')
    .insert([{
      month: period.month,
      year: period.year,
      start_date: period.startDate.toISOString(),
      end_date: period.endDate.toISOString(),
      status: period.status
    }])
    .select('*')
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        month: data.month,
        year: data.year,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        status: data.status,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL payroll periods
export async function getPayrollPeriods() {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (data) {
    const transformedData = data.map(period => ({
      id: period.id,
      month: period.month,
      year: period.year,
      startDate: new Date(period.start_date),
      endDate: new Date(period.end_date),
      status: period.status,
      createdAt: new Date(period.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE payroll period
export async function getPayrollPeriod(id: string) {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        month: data.month,
        year: data.year,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        status: data.status,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE payroll period
export async function updatePayrollPeriod(id: string, updates: Partial<Omit<PayrollPeriod, 'id' | 'createdAt'>>) {
  const updateData: any = {};
  
  if (updates.month !== undefined) updateData.month = updates.month;
  if (updates.year !== undefined) updateData.year = updates.year;
  if (updates.startDate) updateData.start_date = updates.startDate.toISOString();
  if (updates.endDate) updateData.end_date = updates.endDate.toISOString();
  if (updates.status) updateData.status = updates.status;

  const { data, error } = await supabase
    .from('payroll_periods')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        month: data.month,
        year: data.year,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        status: data.status,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE payroll period
export async function deletePayrollPeriod(id: string) {
  // First check if there are any payroll entries for this period
  const { data: entries } = await supabase
    .from('payroll_entries')
    .select('id')
    .eq('period_id', id)
    .limit(1);

  if (entries && entries.length > 0) {
    return { 
      data: null, 
      error: { 
        message: 'Cannot delete payroll period with existing entries. Please delete all entries first.',
        code: 'PERIOD_HAS_ENTRIES'
      } 
    };
  }

  const { error } = await supabase
    .from('payroll_periods')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get current payroll period (most recent open period)
export async function getCurrentPayrollPeriod() {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('status', 'Open')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        month: data.month,
        year: data.year,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        status: data.status,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// Get payroll periods by year
export async function getPayrollPeriodsByYear(year: number) {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('year', year)
    .order('month', { ascending: true });

  if (data) {
    const transformedData = data.map(period => ({
      id: period.id,
      month: period.month,
      year: period.year,
      startDate: new Date(period.start_date),
      endDate: new Date(period.end_date),
      status: period.status,
      createdAt: new Date(period.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Check if period exists for given month/year
export async function checkPeriodExists(month: number, year: number) {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .limit(1);

  return { exists: data && data.length > 0, error };
}

// Close payroll period and create next period
export async function closePayrollPeriod(id: string) {
  const { data, error } = await supabase
    .from('payroll_periods')
    .update({ status: 'Closed' })
    .eq('id', id)
    .select('*')
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        month: data.month,
        year: data.year,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        status: data.status,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}