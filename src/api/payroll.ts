import { supabase } from '../utils/supabase';
import { 
  Employee, 
  PayrollEntry
} from '../types/business';

// EMPLOYEE CRUD OPERATIONS

// CREATE employee
export async function createEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('employees')
    .insert([{
      employee_id: employee.employeeId,
      first_name: employee.firstName,
      last_name: employee.lastName,
      middle_name: employee.middleName,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      city: employee.city,
      province: employee.province,
      zip_code: employee.zipCode,
      birth_date: employee.birthDate.toISOString(),
      hire_date: employee.hireDate.toISOString(),
      position: employee.position,
      department: employee.department,
      employment_type: employee.employmentType,
      status: employee.status,
      basic_salary: employee.basicSalary,
      allowances: employee.allowances,
      sss_number: employee.sssNumber,
      philhealth_number: employee.philhealthNumber,
      pagibig_number: employee.pagibigNumber,
      tin_number: employee.tinNumber,
      bank_name: employee.bankName,
      bank_account_number: employee.bankAccountNumber,
      emergency_contact: employee.emergencyContact
    }])
    .select(`
      id,
      employee_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      birth_date,
      hire_date,
      position,
      department,
      employment_type,
      status,
      basic_salary,
      allowances,
      sss_number,
      philhealth_number,
      pagibig_number,
      tin_number,
      bank_name,
      bank_account_number,
      emergency_contact,
      created_at,
      updated_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        employeeId: data.employee_id,
        firstName: data.first_name,
        lastName: data.last_name,
        middleName: data.middle_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.province,
        zipCode: data.zip_code,
        birthDate: new Date(data.birth_date),
        hireDate: new Date(data.hire_date),
        position: data.position,
        department: data.department,
        employmentType: data.employment_type,
        status: data.status,
        basicSalary: data.basic_salary,
        allowances: data.allowances,
        sssNumber: data.sss_number,
        philhealthNumber: data.philhealth_number,
        pagibigNumber: data.pagibig_number,
        tinNumber: data.tin_number,
        bankName: data.bank_name,
        bankAccountNumber: data.bank_account_number,
        emergencyContact: data.emergency_contact,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL employees
export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      employee_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      birth_date,
      hire_date,
      position,
      department,
      employment_type,
      status,
      basic_salary,
      allowances,
      sss_number,
      philhealth_number,
      pagibig_number,
      tin_number,
      bank_name,
      bank_account_number,
      emergency_contact,
      created_at,
      updated_at
    `)
    .order('last_name', { ascending: true });

  if (data) {
    const transformedData = data.map(employee => ({
      id: employee.id,
      employeeId: employee.employee_id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      middleName: employee.middle_name,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      city: employee.city,
      province: employee.province,
      zipCode: employee.zip_code,
      birthDate: new Date(employee.birth_date),
      hireDate: new Date(employee.hire_date),
      position: employee.position,
      department: employee.department,
      employmentType: employee.employment_type,
      status: employee.status,
      basicSalary: employee.basic_salary,
      allowances: employee.allowances,
      sssNumber: employee.sss_number,
      philhealthNumber: employee.philhealth_number,
      pagibigNumber: employee.pagibig_number,
      tinNumber: employee.tin_number,
      bankName: employee.bank_name,
      bankAccountNumber: employee.bank_account_number,
      emergencyContact: employee.emergency_contact,
      createdAt: new Date(employee.created_at),
      updatedAt: new Date(employee.updated_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE employee
export async function getEmployee(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      employee_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      birth_date,
      hire_date,
      position,
      department,
      employment_type,
      status,
      basic_salary,
      allowances,
      sss_number,
      philhealth_number,
      pagibig_number,
      tin_number,
      bank_name,
      bank_account_number,
      emergency_contact,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        employeeId: data.employee_id,
        firstName: data.first_name,
        lastName: data.last_name,
        middleName: data.middle_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.province,
        zipCode: data.zip_code,
        birthDate: new Date(data.birth_date),
        hireDate: new Date(data.hire_date),
        position: data.position,
        department: data.department,
        employmentType: data.employment_type,
        status: data.status,
        basicSalary: data.basic_salary,
        allowances: data.allowances,
        sssNumber: data.sss_number,
        philhealthNumber: data.philhealth_number,
        pagibigNumber: data.pagibig_number,
        tinNumber: data.tin_number,
        bankName: data.bank_name,
        bankAccountNumber: data.bank_account_number,
        emergencyContact: data.emergency_contact,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE employee
export async function updateEmployee(id: string, updates: Partial<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>) {
  const updateData: Partial<{ 
    employee_id: string; 
    first_name: string; 
    last_name: string; 
    middle_name: string; 
    email: string; 
    phone: string; 
    address: string; 
    city: string; 
    province: string; 
    zip_code: string; 
    birth_date: string; 
    hire_date: string; 
    position: string; 
    department: string; 
    employment_type: string; 
    status: string; 
    basic_salary: number;
    allowances: number;
    tin: string;
    sss_number: string;
    philhealth_number: string;
    pagibig_number: string;
    is_active: boolean;
  }> = {};
  
  if (updates.employeeId) updateData.employee_id = updates.employeeId;
  if (updates.firstName) updateData.first_name = updates.firstName;
  if (updates.lastName) updateData.last_name = updates.lastName;
  if (updates.middleName !== undefined) updateData.middle_name = updates.middleName;
  if (updates.email) updateData.email = updates.email;
  if (updates.phone) updateData.phone = updates.phone;
  if (updates.address) updateData.address = updates.address;
  if (updates.city) updateData.city = updates.city;
  if (updates.province) updateData.province = updates.province;
  if (updates.zipCode) updateData.zip_code = updates.zipCode;
  if (updates.birthDate) updateData.birth_date = updates.birthDate.toISOString();
  if (updates.hireDate) updateData.hire_date = updates.hireDate.toISOString();
  if (updates.position) updateData.position = updates.position;
  if (updates.department) updateData.department = updates.department;
  if (updates.employmentType) updateData.employment_type = updates.employmentType;
  if (updates.status) updateData.status = updates.status;
  if (updates.basicSalary !== undefined) updateData.basic_salary = updates.basicSalary;
  if (updates.allowances) updateData.allowances = updates.allowances;
  if (updates.sssNumber !== undefined) updateData.sss_number = updates.sssNumber;
  if (updates.philhealthNumber !== undefined) updateData.philhealth_number = updates.philhealthNumber;
  if (updates.pagibigNumber !== undefined) updateData.pagibig_number = updates.pagibigNumber;
  if (updates.tinNumber !== undefined) updateData.tin_number = updates.tinNumber;
  if (updates.bankName !== undefined) updateData.bank_name = updates.bankName;
  if (updates.bankAccountNumber !== undefined) updateData.bank_account_number = updates.bankAccountNumber;
  if (updates.emergencyContact) updateData.emergency_contact = updates.emergencyContact;

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      employee_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      birth_date,
      hire_date,
      position,
      department,
      employment_type,
      status,
      basic_salary,
      allowances,
      sss_number,
      philhealth_number,
      pagibig_number,
      tin_number,
      bank_name,
      bank_account_number,
      emergency_contact,
      created_at,
      updated_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        employeeId: data.employee_id,
        firstName: data.first_name,
        lastName: data.last_name,
        middleName: data.middle_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.province,
        zipCode: data.zip_code,
        birthDate: new Date(data.birth_date),
        hireDate: new Date(data.hire_date),
        position: data.position,
        department: data.department,
        employmentType: data.employment_type,
        status: data.status,
        basicSalary: data.basic_salary,
        allowances: data.allowances,
        sssNumber: data.sss_number,
        philhealthNumber: data.philhealth_number,
        pagibigNumber: data.pagibig_number,
        tinNumber: data.tin_number,
        bankName: data.bank_name,
        bankAccountNumber: data.bank_account_number,
        emergencyContact: data.emergency_contact,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE employee
export async function deleteEmployee(id: string) {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get active employees
export async function getActiveEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      employee_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      birth_date,
      hire_date,
      position,
      department,
      employment_type,
      status,
      basic_salary,
      allowances,
      sss_number,
      philhealth_number,
      pagibig_number,
      tin_number,
      bank_name,
      bank_account_number,
      emergency_contact,
      created_at,
      updated_at
    `)
    .eq('status', 'Active')
    .order('last_name', { ascending: true });

  if (data) {
    const transformedData = data.map(employee => ({
      id: employee.id,
      employeeId: employee.employee_id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      middleName: employee.middle_name,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      city: employee.city,
      province: employee.province,
      zipCode: employee.zip_code,
      birthDate: new Date(employee.birth_date),
      hireDate: new Date(employee.hire_date),
      position: employee.position,
      department: employee.department,
      employmentType: employee.employment_type,
      status: employee.status,
      basicSalary: employee.basic_salary,
      allowances: employee.allowances,
      sssNumber: employee.sss_number,
      philhealthNumber: employee.philhealth_number,
      pagibigNumber: employee.pagibig_number,
      tinNumber: employee.tin_number,
      bankName: employee.bank_name,
      bankAccountNumber: employee.bank_account_number,
      emergencyContact: employee.emergency_contact,
      createdAt: new Date(employee.created_at),
      updatedAt: new Date(employee.updated_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// PAYROLL CALCULATION FUNCTIONS

// Calculate SSS contribution (2024 rates)
export function calculateSSSContribution(monthlyBasicSalary: number): { employee: number; employer: number } {
  const brackets = [
    { min: 0, max: 3249.99, employee: 135, employer: 292.5 },
    { min: 3250, max: 3749.99, employee: 157.5, employer: 337.5 },
    { min: 3750, max: 4249.99, employee: 180, employer: 382.5 },
    { min: 4250, max: 4749.99, employee: 202.5, employer: 427.5 },
    { min: 4750, max: 5249.99, employee: 225, employer: 472.5 },
    { min: 5250, max: 5749.99, employee: 247.5, employer: 517.5 },
    { min: 5750, max: 6249.99, employee: 270, employer: 562.5 },
    { min: 6250, max: 6749.99, employee: 292.5, employer: 607.5 },
    { min: 6750, max: 7249.99, employee: 315, employer: 652.5 },
    { min: 7250, max: 7749.99, employee: 337.5, employer: 697.5 },
    { min: 7750, max: 8249.99, employee: 360, employer: 742.5 },
    { min: 8250, max: 8749.99, employee: 382.5, employer: 787.5 },
    { min: 8750, max: 9249.99, employee: 405, employer: 832.5 },
    { min: 9250, max: 9749.99, employee: 427.5, employer: 877.5 },
    { min: 9750, max: 10249.99, employee: 450, employer: 922.5 },
    { min: 10250, max: 10749.99, employee: 472.5, employer: 967.5 },
    { min: 10750, max: 11249.99, employee: 495, employer: 1012.5 },
    { min: 11250, max: 11749.99, employee: 517.5, employer: 1057.5 },
    { min: 11750, max: 12249.99, employee: 540, employer: 1102.5 },
    { min: 12250, max: 12749.99, employee: 562.5, employer: 1147.5 },
    { min: 12750, max: 13249.99, employee: 585, employer: 1192.5 },
    { min: 13250, max: 13749.99, employee: 607.5, employer: 1237.5 },
    { min: 13750, max: 14249.99, employee: 630, employer: 1282.5 },
    { min: 14250, max: 14749.99, employee: 652.5, employer: 1327.5 },
    { min: 14750, max: 15249.99, employee: 675, employer: 1372.5 },
    { min: 15250, max: 15749.99, employee: 697.5, employer: 1417.5 },
    { min: 15750, max: 16249.99, employee: 720, employer: 1462.5 },
    { min: 16250, max: 16749.99, employee: 742.5, employer: 1507.5 },
    { min: 16750, max: 17249.99, employee: 765, employer: 1552.5 },
    { min: 17250, max: 17749.99, employee: 787.5, employer: 1597.5 },
    { min: 17750, max: 18249.99, employee: 810, employer: 1642.5 },
    { min: 18250, max: 18749.99, employee: 832.5, employer: 1687.5 },
    { min: 18750, max: 19249.99, employee: 855, employer: 1732.5 },
    { min: 19250, max: 19749.99, employee: 877.5, employer: 1777.5 },
    { min: 19750, max: 29999.99, employee: 900, employer: 1822.5 },
  ];

  // For salaries 30,000 and above
  if (monthlyBasicSalary >= 30000) {
    return { employee: 1800, employer: 3600 }; // Maximum contribution
  }

  const bracket = brackets.find(b => monthlyBasicSalary >= b.min && monthlyBasicSalary <= b.max);
  return bracket ? { employee: bracket.employee, employer: bracket.employer } : { employee: 0, employer: 0 };
}

// Calculate PhilHealth contribution (2024 rates)
export function calculatePhilHealthContribution(monthlyBasicSalary: number): { employee: number; employer: number } {
  const rate = 0.05; // 5% total (2.5% each for employee and employer)
  const minContribution = 500;
  const maxContribution = 5000;
  
  const totalContribution = Math.max(minContribution, Math.min(monthlyBasicSalary * rate, maxContribution));
  const employeeContribution = totalContribution / 2;
  const employerContribution = totalContribution / 2;
  
  return { employee: employeeContribution, employer: employerContribution };
}

// Calculate Pag-IBIG contribution (2024 rates)
export function calculatePagIBIGContribution(monthlyBasicSalary: number): { employee: number; employer: number } {
  const rate = 0.02; // 2% each for employee and employer
  const maxContributionPerPerson = 100; // Maximum contribution per person
  
  const employeeContribution = Math.min(monthlyBasicSalary * rate, maxContributionPerPerson);
  const employerContribution = Math.min(monthlyBasicSalary * rate, maxContributionPerPerson);
  
  return { employee: employeeContribution, employer: employerContribution };
}

// Calculate withholding tax (2024 tax table)
export function calculateWithholdingTax(monthlyTaxableIncome: number): number {
  const taxBrackets = [
    { min: 0, max: 20833, rate: 0, baseTax: 0 },
    { min: 20834, max: 33332, rate: 0.15, baseTax: 0 },
    { min: 33333, max: 66666, rate: 0.20, baseTax: 1875 },
    { min: 66667, max: 166666, rate: 0.25, baseTax: 8541.80 },
    { min: 166667, max: 666666, rate: 0.30, baseTax: 33541.80 },
    { min: 666667, max: Infinity, rate: 0.35, baseTax: 183541.80 }
  ];

  const bracket = taxBrackets.find(b => monthlyTaxableIncome >= b.min && monthlyTaxableIncome <= b.max);
  if (!bracket) return 0;

  return bracket.baseTax + ((monthlyTaxableIncome - bracket.min) * bracket.rate);
}

// Calculate 13th month pay
export function calculate13thMonthPay(totalBasicSay: number): number {
  return totalBasicSay / 12;
}

// Calculate net pay
export function calculateNetPay(
  basicSalary: number,
  allowances: number,
  overtime: number,
  deductions: {
    sss: number;
    philhealth: number;
    pagibig: number;
    withholdingTax: number;
    others: number;
  }
): number {
  const grossPay = basicSalary + allowances + overtime;
  const totalDeductions = deductions.sss + deductions.philhealth + deductions.pagibig + deductions.withholdingTax + deductions.others;
  return grossPay - totalDeductions;
}

// PAYROLL ENTRY CRUD OPERATIONS

// CREATE payroll entry
export async function createPayrollEntry(payrollEntry: Omit<PayrollEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('payroll_entries')
    .insert([{
      employee_id: payrollEntry.employeeId,
      period_id: payrollEntry.periodId,
      basic_salary: payrollEntry.basicSalary,
      allowances: payrollEntry.allowances,
      gross_pay: payrollEntry.grossPay,
      sss_contribution: payrollEntry.sssContribution,
      philhealth_contribution: payrollEntry.philhealthContribution,
      pagibig_contribution: payrollEntry.pagibigContribution,
      withholding_tax: payrollEntry.withholdingTax,
      other_deductions: payrollEntry.otherDeductions,
      total_deductions: payrollEntry.totalDeductions,
      net_pay: payrollEntry.netPay,
      overtime_hours: payrollEntry.overtimeHours,
      overtime_rate: payrollEntry.overtimeRate,
      overtime_pay: payrollEntry.overtimePay,
      leave_days: payrollEntry.leaveDays,
      leave_pay: payrollEntry.leavePay,
      thirteenth_month_pay: payrollEntry.thirteenthMonthPay,
      status: payrollEntry.status,
      payment_date: payrollEntry.paymentDate?.toISOString(),
      payment_method: payrollEntry.paymentMethod,
      notes: payrollEntry.notes
    }])
    .select('*')
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        employeeId: data.employee_id,
        periodId: data.period_id,
        basicSalary: data.basic_salary,
        allowances: data.allowances,
        grossPay: data.gross_pay,
        sssContribution: data.sss_contribution,
        philhealthContribution: data.philhealth_contribution,
        pagibigContribution: data.pagibig_contribution,
        withholdingTax: data.withholding_tax,
        otherDeductions: data.other_deductions,
        totalDeductions: data.total_deductions,
        netPay: data.net_pay,
        overtimeHours: data.overtime_hours,
        overtimeRate: data.overtime_rate,
        overtimePay: data.overtime_pay,
        leaveDays: data.leave_days,
        leavePay: data.leave_pay,
        thirteenthMonthPay: data.thirteenth_month_pay,
        status: data.status,
        paymentDate: data.payment_date ? new Date(data.payment_date) : undefined,
        paymentMethod: data.payment_method,
        notes: data.notes,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// Get payroll entries by period
export async function getPayrollEntriesByPeriod(periodId: string) {
  const { data, error } = await supabase
    .from('payroll_entries')
    .select('*')
    .eq('period_id', periodId)
    .order('created_at', { ascending: false });

  if (data) {
    const transformedData = data.map(entry => ({
      id: entry.id,
      employeeId: entry.employee_id,
      periodId: entry.period_id,
      basicSalary: entry.basic_salary,
      allowances: entry.allowances,
      grossPay: entry.gross_pay,
      sssContribution: entry.sss_contribution,
      philhealthContribution: entry.philhealth_contribution,
      pagibigContribution: entry.pagibig_contribution,
      withholdingTax: entry.withholding_tax,
      otherDeductions: entry.other_deductions,
      totalDeductions: entry.total_deductions,
      netPay: entry.net_pay,
      overtimeHours: entry.overtime_hours,
      overtimeRate: entry.overtime_rate,
      overtimePay: entry.overtime_pay,
      leaveDays: entry.leave_days,
      leavePay: entry.leave_pay,
      thirteenthMonthPay: entry.thirteenth_month_pay,
      status: entry.status,
      paymentDate: entry.payment_date ? new Date(entry.payment_date) : undefined,
      paymentMethod: entry.payment_method,
      notes: entry.notes,
      createdAt: new Date(entry.created_at),
      updatedAt: new Date(entry.updated_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get payroll summary
export async function getPayrollSummary(year: number, month?: number) {
  let query = supabase
    .from('payroll_entries')
    .select('gross_pay, total_deductions, net_pay, status, created_at');

  if (month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    query = query
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
  } else {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    query = query
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
  }

  const { data, error } = await query;

  if (data) {
    const totalGrossPay = data.reduce((sum, entry) => sum + entry.gross_pay, 0);
    const totalDeductions = data.reduce((sum, entry) => sum + entry.total_deductions, 0);
    const totalNetPay = data.reduce((sum, entry) => sum + entry.net_pay, 0);
    const totalEmployees = data.length;
    const paidEntries = data.filter(entry => entry.status === 'Paid');

    return {
      data: {
        totalGrossPay,
        totalDeductions,
        totalNetPay,
        totalEmployees,
        paidEmployees: paidEntries.length,
        period: month ? `${year}-${month.toString().padStart(2, '0')}` : year.toString()
      },
      error: null
    };
  }

  return { data: null, error };
}