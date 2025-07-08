import React, { useState, useEffect } from 'react';
import { PayrollEntry } from '../../types/business';
import { Employee } from '../../types/business';
import { PayrollPeriod } from '../../api/payrollPeriods';
import { 
  calculateSSSContribution, 
  calculatePhilHealthContribution, 
  calculatePagIBIGContribution,
  calculateWithholdingTax,
  calculateNetPay 
} from '../../api/payroll';

interface PayrollEntryFormProps {
  entry?: PayrollEntry;
  employees: Employee[];
  periods: PayrollPeriod[];
  onSave: (entry: Omit<PayrollEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const PayrollEntryForm: React.FC<PayrollEntryFormProps> = ({ entry, employees, periods, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    periodId: '',
    basicSalary: '',
    allowances: '',
    overtimeHours: '',
    overtimeRate: '',
    overtimePay: '',
    leaveDays: '',
    leavePay: '',
    sssContribution: '',
    philhealthContribution: '',
    pagibigContribution: '',
    withholdingTax: '',
    otherDeductions: '',
    thirteenthMonthPay: '',
    status: 'Draft' as const,
    paymentMethod: 'Bank Transfer' as const,
    notes: ''
  });

  const [calculatedValues, setCalculatedValues] = useState({
    grossPay: 0,
    totalDeductions: 0,
    netPay: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoCalculate, setAutoCalculate] = useState(true);

  // Initialize form when editing
  useEffect(() => {
    if (entry) {
      setFormData({
        employeeId: entry.employeeId,
        periodId: entry.periodId,
        basicSalary: entry.basicSalary.toString(),
        allowances: entry.allowances.toString(),
        overtimeHours: entry.overtimeHours?.toString() || '',
        overtimeRate: entry.overtimeRate?.toString() || '',
        overtimePay: entry.overtimePay?.toString() || '',
        leaveDays: entry.leaveDays?.toString() || '',
        leavePay: entry.leavePay?.toString() || '',
        sssContribution: entry.sssContribution.toString(),
        philhealthContribution: entry.philhealthContribution.toString(),
        pagibigContribution: entry.pagibigContribution.toString(),
        withholdingTax: entry.withholdingTax.toString(),
        otherDeductions: entry.otherDeductions?.toString() || '',
        thirteenthMonthPay: entry.thirteenthMonthPay?.toString() || '',
        status: entry.status,
        paymentMethod: entry.paymentMethod || 'Bank Transfer',
        notes: entry.notes || ''
      });
    }
  }, [entry]);

  // Auto-calculate contributions when employee or salary changes
  useEffect(() => {
    if (autoCalculate && formData.employeeId && formData.basicSalary) {
      const basicSalary = parseFloat(formData.basicSalary) || 0;
      
      // Calculate government contributions
      const sss = calculateSSSContribution(basicSalary);
      const philhealth = calculatePhilHealthContribution(basicSalary);
      const pagibig = calculatePagIBIGContribution(basicSalary);
      
      // Calculate taxable income (basic + allowances - non-taxable deductions)
      const allowances = parseFloat(formData.allowances) || 0;
      const taxableIncome = basicSalary + allowances - sss.employee - philhealth.employee - pagibig.employee;
      const withholdingTax = calculateWithholdingTax(taxableIncome);
      
      setFormData(prev => ({
        ...prev,
        sssContribution: sss.employee.toString(),
        philhealthContribution: philhealth.employee.toString(),
        pagibigContribution: pagibig.employee.toString(),
        withholdingTax: withholdingTax.toString()
      }));
    }
  }, [formData.employeeId, formData.basicSalary, formData.allowances, autoCalculate]);

  // Calculate totals whenever relevant fields change
  useEffect(() => {
    const basicSalary = parseFloat(formData.basicSalary) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const overtimePay = parseFloat(formData.overtimePay) || 0;
    const leavePay = parseFloat(formData.leavePay) || 0;
    
    const grossPay = basicSalary + allowances + overtimePay + leavePay;
    
    const sssContribution = parseFloat(formData.sssContribution) || 0;
    const philhealthContribution = parseFloat(formData.philhealthContribution) || 0;
    const pagibigContribution = parseFloat(formData.pagibigContribution) || 0;
    const withholdingTax = parseFloat(formData.withholdingTax) || 0;
    const otherDeductions = parseFloat(formData.otherDeductions) || 0;
    
    const totalDeductions = sssContribution + philhealthContribution + pagibigContribution + withholdingTax + otherDeductions;
    const netPay = grossPay - totalDeductions;
    
    setCalculatedValues({
      grossPay,
      totalDeductions,
      netPay
    });
  }, [formData.basicSalary, formData.allowances, formData.overtimePay, formData.leavePay, 
      formData.sssContribution, formData.philhealthContribution, formData.pagibigContribution, 
      formData.withholdingTax, formData.otherDeductions]);

  // Auto-calculate overtime pay when hours or rate change
  useEffect(() => {
    const hours = parseFloat(formData.overtimeHours) || 0;
    const rate = parseFloat(formData.overtimeRate) || 0;
    const overtimePay = hours * rate;
    
    if (hours > 0 && rate > 0) {
      setFormData(prev => ({
        ...prev,
        overtimePay: overtimePay.toString()
      }));
    }
  }, [formData.overtimeHours, formData.overtimeRate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) {
      newErrors.employeeId = 'Please select an employee';
    }

    if (!formData.periodId) {
      newErrors.periodId = 'Please select a payroll period';
    }

    if (!formData.basicSalary || parseFloat(formData.basicSalary) <= 0) {
      newErrors.basicSalary = 'Basic salary must be greater than 0';
    }

    if (formData.allowances && parseFloat(formData.allowances) < 0) {
      newErrors.allowances = 'Allowances cannot be negative';
    }

    if (formData.overtimeHours && parseFloat(formData.overtimeHours) < 0) {
      newErrors.overtimeHours = 'Overtime hours cannot be negative';
    }

    if (formData.otherDeductions && parseFloat(formData.otherDeductions) < 0) {
      newErrors.otherDeductions = 'Deductions cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave({
        employeeId: formData.employeeId,
        periodId: formData.periodId,
        basicSalary: parseFloat(formData.basicSalary),
        allowances: parseFloat(formData.allowances) || 0,
        grossPay: calculatedValues.grossPay,
        sssContribution: parseFloat(formData.sssContribution) || 0,
        philhealthContribution: parseFloat(formData.philhealthContribution) || 0,
        pagibigContribution: parseFloat(formData.pagibigContribution) || 0,
        withholdingTax: parseFloat(formData.withholdingTax) || 0,
        otherDeductions: parseFloat(formData.otherDeductions) || 0,
        totalDeductions: calculatedValues.totalDeductions,
        netPay: calculatedValues.netPay,
        overtimeHours: parseFloat(formData.overtimeHours) || 0,
        overtimeRate: parseFloat(formData.overtimeRate) || 0,
        overtimePay: parseFloat(formData.overtimePay) || 0,
        leaveDays: parseFloat(formData.leaveDays) || 0,
        leavePay: parseFloat(formData.leavePay) || 0,
        thirteenthMonthPay: parseFloat(formData.thirteenthMonthPay) || 0,
        status: formData.status,
        paymentDate: formData.status === 'Paid' ? new Date() : undefined,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes
      });
    }
  };

  const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
  const selectedPeriod = periods.find(period => period.id === formData.periodId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {entry ? 'Edit Payroll Entry' : 'Create Payroll Entry'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee and Period Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee *
              </label>
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.employeeId ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} - {employee.employeeId}
                  </option>
                ))}
              </select>
              {errors.employeeId && <p className="text-red-500 text-xs mt-1">{errors.employeeId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payroll Period *
              </label>
              <select
                name="periodId"
                value={formData.periodId}
                onChange={handleChange}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.periodId ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select Period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {new Date(0, period.month - 1).toLocaleString('default', { month: 'long' })} {period.year}
                  </option>
                ))}
              </select>
              {errors.periodId && <p className="text-red-500 text-xs mt-1">{errors.periodId}</p>}
            </div>
          </div>

          {/* Employee Info Display */}
          {selectedEmployee && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Employee Information</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Position:</span> {selectedEmployee.position}
                </div>
                <div>
                  <span className="text-gray-600">Department:</span> {selectedEmployee.department}
                </div>
                <div>
                  <span className="text-gray-600">Base Salary:</span> ₱{selectedEmployee.basicSalary.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Auto-calculate toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoCalculate"
              checked={autoCalculate}
              onChange={(e) => setAutoCalculate(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="autoCalculate" className="text-sm text-gray-700">
              Auto-calculate government contributions and taxes
            </label>
          </div>

          {/* Salary Information */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Salary Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Basic Salary *
                </label>
                <input
                  type="number"
                  name="basicSalary"
                  value={formData.basicSalary}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.basicSalary ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.basicSalary && <p className="text-red-500 text-xs mt-1">{errors.basicSalary}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowances
                </label>
                <input
                  type="number"
                  name="allowances"
                  value={formData.allowances}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.allowances ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.allowances && <p className="text-red-500 text-xs mt-1">{errors.allowances}</p>}
              </div>
            </div>
          </div>

          {/* Overtime Information */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Overtime</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overtime Hours
                </label>
                <input
                  type="number"
                  name="overtimeHours"
                  value={formData.overtimeHours}
                  onChange={handleChange}
                  step="0.5"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overtime Rate (per hour)
                </label>
                <input
                  type="number"
                  name="overtimeRate"
                  value={formData.overtimeRate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overtime Pay
                </label>
                <input
                  type="number"
                  name="overtimePay"
                  value={formData.overtimePay}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  readOnly={!!formData.overtimeHours && !!formData.overtimeRate}
                />
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Deductions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SSS Contribution
                </label>
                <input
                  type="number"
                  name="sssContribution"
                  value={formData.sssContribution}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  readOnly={autoCalculate}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PhilHealth Contribution
                </label>
                <input
                  type="number"
                  name="philhealthContribution"
                  value={formData.philhealthContribution}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  readOnly={autoCalculate}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pag-IBIG Contribution
                </label>
                <input
                  type="number"
                  name="pagibigContribution"
                  value={formData.pagibigContribution}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  readOnly={autoCalculate}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Withholding Tax
                </label>
                <input
                  type="number"
                  name="withholdingTax"
                  value={formData.withholdingTax}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  readOnly={autoCalculate}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Deductions
                </label>
                <input
                  type="number"
                  name="otherDeductions"
                  value={formData.otherDeductions}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.otherDeductions ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.otherDeductions && <p className="text-red-500 text-xs mt-1">{errors.otherDeductions}</p>}
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Payment Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes or comments..."
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border-t">
            <h4 className="font-medium text-blue-900 mb-3">Payroll Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Gross Pay:</span>
                <div className="text-lg font-semibold text-blue-900">
                  ₱{calculatedValues.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Total Deductions:</span>
                <div className="text-lg font-semibold text-red-600">
                  ₱{calculatedValues.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Net Pay:</span>
                <div className="text-xl font-bold text-green-600">
                  ₱{calculatedValues.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              {entry ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayrollEntryForm;