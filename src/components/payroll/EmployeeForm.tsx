import React, { useState, useEffect } from 'react';
import { Employee, Allowance } from '../../types/business';
import { useBusinessStore } from '../../store/businessStore';

interface EmployeeFormProps {
  employee?: Employee;
  onSave: () => void;
  onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onSave, onCancel }) => {
  const { addEmployee, updateEmployee } = useBusinessStore();
  
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    birthDate: '',
    hireDate: '',
    position: '',
    department: '',
    employmentType: 'Regular' as const,
    status: 'Active' as const,
    basicSalary: '',
    sssNumber: '',
    philhealthNumber: '',
    pagibigNumber: '',
    tinNumber: '',
    bankName: '',
    bankAccountNumber: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    allowances: [] as Allowance[]
  });

  const [newAllowance, setNewAllowance] = useState({
    name: '',
    amount: '',
    type: 'Fixed' as const,
    isTaxable: false,
    description: ''
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        middleName: employee.middleName || '',
        email: employee.email,
        phone: employee.phone,
        address: employee.address,
        city: employee.city,
        province: employee.province,
        zipCode: employee.zipCode,
        birthDate: employee.birthDate.toISOString().split('T')[0],
        hireDate: employee.hireDate.toISOString().split('T')[0],
        position: employee.position,
        department: employee.department,
        employmentType: employee.employmentType,
        status: employee.status,
        basicSalary: employee.basicSalary.toString(),
        sssNumber: employee.sssNumber || '',
        philhealthNumber: employee.philhealthNumber || '',
        pagibigNumber: employee.pagibigNumber || '',
        tinNumber: employee.tinNumber || '',
        bankName: employee.bankName || '',
        bankAccountNumber: employee.bankAccountNumber || '',
        emergencyContactName: employee.emergencyContact.name,
        emergencyContactRelationship: employee.emergencyContact.relationship,
        emergencyContactPhone: employee.emergencyContact.phone,
        allowances: [...employee.allowances]
      });
    }
  }, [employee]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAllowanceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNewAllowance(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const addAllowance = () => {
    if (newAllowance.name && newAllowance.amount) {
      const allowance: Allowance = {
        id: Date.now().toString(),
        name: newAllowance.name,
        amount: parseFloat(newAllowance.amount),
        type: newAllowance.type,
        isTaxable: newAllowance.isTaxable,
        description: newAllowance.description
      };
      
      setFormData(prev => ({
        ...prev,
        allowances: [...prev.allowances, allowance]
      }));
      
      setNewAllowance({
        name: '',
        amount: '',
        type: 'Fixed',
        isTaxable: false,
        description: ''
      });
    }
  };

  const removeAllowance = (id: string) => {
    setFormData(prev => ({
      ...prev,
      allowances: prev.allowances.filter(a => a.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const employeeData = {
      employeeId: formData.employeeId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleName: formData.middleName || undefined,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      province: formData.province,
      zipCode: formData.zipCode,
      birthDate: new Date(formData.birthDate),
      hireDate: new Date(formData.hireDate),
      position: formData.position,
      department: formData.department,
      employmentType: formData.employmentType,
      status: formData.status,
      basicSalary: parseFloat(formData.basicSalary),
      allowances: formData.allowances,
      sssNumber: formData.sssNumber || undefined,
      philhealthNumber: formData.philhealthNumber || undefined,
      pagibigNumber: formData.pagibigNumber || undefined,
      tinNumber: formData.tinNumber || undefined,
      bankName: formData.bankName || undefined,
      bankAccountNumber: formData.bankAccountNumber || undefined,
      emergencyContact: {
        name: formData.emergencyContactName,
        relationship: formData.emergencyContactRelationship,
        phone: formData.emergencyContactPhone
      }
    };

    if (employee) {
      updateEmployee(employee.id, employeeData);
    } else {
      addEmployee(employeeData);
    }
    
    onSave();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {employee ? 'Edit Employee' : 'Add New Employee'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID *
            </label>
            <input
              type="text"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Middle Name
            </label>
            <input
              type="text"
              name="middleName"
              value={formData.middleName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Province *
            </label>
            <input
              type="text"
              name="province"
              value={formData.province}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code *
            </label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Employment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Birth Date *
            </label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hire Date *
            </label>
            <input
              type="date"
              name="hireDate"
              value={formData.hireDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position *
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department *
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employment Type *
            </label>
            <select
              name="employmentType"
              value={formData.employmentType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Regular">Regular</option>
              <option value="Contractual">Contractual</option>
              <option value="Probationary">Probationary</option>
              <option value="Part-time">Part-time</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Terminated">Terminated</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Basic Salary (₱) *
            </label>
            <input
              type="number"
              name="basicSalary"
              value={formData.basicSalary}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        {/* Government IDs */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Government IDs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SSS Number
              </label>
              <input
                type="text"
                name="sssNumber"
                value={formData.sssNumber}
                onChange={handleInputChange}
                placeholder="XX-XXXXXXX-X"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PhilHealth Number
              </label>
              <input
                type="text"
                name="philhealthNumber"
                value={formData.philhealthNumber}
                onChange={handleInputChange}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pag-IBIG Number
              </label>
              <input
                type="text"
                name="pagibigNumber"
                value={formData.pagibigNumber}
                onChange={handleInputChange}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TIN Number
              </label>
              <input
                type="text"
                name="tinNumber"
                value={formData.tinNumber}
                onChange={handleInputChange}
                placeholder="XXX-XXX-XXX-XXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                name="bankAccountNumber"
                value={formData.bankAccountNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship *
              </label>
              <input
                type="text"
                name="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Allowances */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Allowances</h3>
          
          {/* Current Allowances */}
          {formData.allowances.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-2">Current Allowances</h4>
              <div className="space-y-2">
                {formData.allowances.map((allowance) => (
                  <div key={allowance.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div>
                      <span className="font-medium">{allowance.name}</span>
                      <span className="text-gray-600 ml-2">₱{allowance.amount.toLocaleString()}</span>
                      <span className="text-sm text-gray-500 ml-2">({allowance.type})</span>
                      {allowance.isTaxable && <span className="text-sm text-red-600 ml-2">Taxable</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAllowance(allowance.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Add New Allowance */}
          <div className="bg-white p-4 rounded border">
            <h4 className="text-md font-medium text-gray-700 mb-3">Add New Allowance</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={newAllowance.name}
                  onChange={handleAllowanceChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={newAllowance.amount}
                  onChange={handleAllowanceChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={newAllowance.type}
                  onChange={handleAllowanceChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Percentage">Percentage</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isTaxable"
                    checked={newAllowance.isTaxable}
                    onChange={handleAllowanceChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Taxable</span>
                </label>
              </div>
            </div>
            
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                name="description"
                value={newAllowance.description}
                onChange={handleAllowanceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              type="button"
              onClick={addAllowance}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Allowance
            </button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {employee ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm; 