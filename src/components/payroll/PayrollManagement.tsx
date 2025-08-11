import React, { useState } from 'react';
import { Employee } from '../../types/business';
import { useBusinessStore } from '../../store/businessStore';
import EmployeeForm from './EmployeeForm';
import EmployeeList from './EmployeeList';

const PayrollManagement: React.FC = () => {
  const { employees, deleteEmployee } = useBusinessStore();
  
  const [activeTab, setActiveTab] = useState('employees');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [viewingEmployee, setViewingEmployee] = useState<Employee | undefined>();

  const handleAddEmployee = () => {
    setEditingEmployee(undefined);
    setShowEmployeeForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      deleteEmployee(employee.id);
    }
  };

  const handleViewEmployeeDetails = (employee: Employee) => {
    setViewingEmployee(employee);
  };

  const handleSaveEmployee = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(undefined);
  };

  const handleCancelEmployee = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(undefined);
  };

  const totalEmployees = (employees || []).length;
  const activeEmployees = (employees || []).filter(emp => emp.status === 'Active').length;
  const totalPayroll = (employees || []).reduce((sum, emp) => {
    const allowances = (emp.allowances || []).reduce((a, b) => a + b.amount, 0);
    return sum + emp.basicSalary + allowances;
  }, 0);

  const tabs = [
    { id: 'employees', name: 'Employees', count: totalEmployees },
    { id: 'payroll', name: 'Payroll Processing', count: 0 },
    { id: 'attendance', name: 'Time & Attendance', count: 0 },
    { id: 'leaves', name: 'Leave Management', count: 0 },
    { id: 'reports', name: 'Reports', count: 0 },
    { id: 'settings', name: 'Settings', count: 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
            <p className="text-gray-600">Manage employees, process payroll, and handle compliance</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalEmployees}</div>
                <div className="text-sm text-gray-600">Total Employees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{activeEmployees}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">₱{totalPayroll.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Monthly Payroll</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Employee Management</h2>
                <button
                  onClick={handleAddEmployee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Employee
                </button>
              </div>
              
              <EmployeeList
                onEdit={handleEditEmployee}
                onDelete={handleDeleteEmployee}
                onViewDetails={handleViewEmployeeDetails}
              />
            </div>
          )}

          {/* Payroll Processing Tab */}
          {activeTab === 'payroll' && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payroll Processing</h3>
              <p className="text-gray-500 mb-6">
                Process payroll, calculate deductions, and generate payslips for your employees.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Generate Payroll</h4>
                  <p className="text-sm text-blue-700">Create payroll for the current period</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">13th Month Pay</h4>
                  <p className="text-sm text-green-700">Calculate and process 13th month pay</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900">Government Reports</h4>
                  <p className="text-sm text-purple-700">Generate SSS, PhilHealth, and Pag-IBIG reports</p>
                </div>
              </div>
            </div>
          )}

          {/* Time & Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Time & Attendance</h3>
              <p className="text-gray-500 mb-6">
                Track employee attendance, overtime, and working hours.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Time Tracking</h4>
                  <p className="text-sm text-blue-700">Record time in/out and breaks</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">Overtime Management</h4>
                  <p className="text-sm text-green-700">Calculate and approve overtime</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900">Attendance Reports</h4>
                  <p className="text-sm text-purple-700">Generate attendance summaries</p>
                </div>
              </div>
            </div>
          )}

          {/* Leave Management Tab */}
          {activeTab === 'leaves' && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Leave Management</h3>
              <p className="text-gray-500 mb-6">
                Manage employee leave requests, approvals, and leave balances.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Leave Requests</h4>
                  <p className="text-sm text-blue-700">Submit and approve leave applications</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">Leave Balances</h4>
                  <p className="text-sm text-green-700">Track vacation and sick leave credits</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900">Leave Calendar</h4>
                  <p className="text-sm text-purple-700">View team leave schedule</p>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payroll Reports</h3>
              <p className="text-gray-500 mb-6">
                Generate comprehensive payroll reports and analytics.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Payroll Summary</h4>
                  <p className="text-sm text-blue-700">Monthly payroll overview</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">Tax Reports</h4>
                  <p className="text-sm text-green-700">BIR withholding tax reports</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900">Government Reports</h4>
                  <p className="text-sm text-purple-700">SSS, PhilHealth, Pag-IBIG</p>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payroll Settings</h3>
              <p className="text-gray-500 mb-6">
                Configure payroll settings, tax rates, and compliance parameters.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Tax Settings</h4>
                  <p className="text-sm text-blue-700">Configure withholding tax rates</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">Government Rates</h4>
                  <p className="text-sm text-green-700">SSS, PhilHealth, Pag-IBIG rates</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900">Overtime Rules</h4>
                  <p className="text-sm text-purple-700">Configure overtime calculations</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Employee Form Modal */}
      {showEmployeeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EmployeeForm
              employee={editingEmployee}
              onSave={handleSaveEmployee}
              onCancel={handleCancelEmployee}
            />
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Employee Details
                </h2>
                <button
                  onClick={() => setViewingEmployee(undefined)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.employeeId}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm text-gray-900">
                        {viewingEmployee.firstName} {viewingEmployee.middleName} {viewingEmployee.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Position</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.position}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.department}</p>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Employment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Employment Type</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.employmentType}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.status}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.hireDate.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Basic Salary</label>
                      <p className="text-sm text-gray-900">₱{viewingEmployee.basicSalary.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Government IDs */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Government IDs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SSS Number</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.sssNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">PhilHealth Number</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.philhealthNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pag-IBIG Number</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.pagibigNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">TIN Number</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.tinNumber || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Allowances */}
                {(viewingEmployee.allowances || []).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Allowances</h3>
                    <div className="space-y-2">
                      {(viewingEmployee.allowances || []).map((allowance) => (
                        <div key={allowance.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{allowance.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({allowance.type})</span>
                            {allowance.isTaxable && <span className="text-sm text-red-600 ml-2">Taxable</span>}
                          </div>
                          <span className="font-medium">₱{allowance.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.emergencyContact.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Relationship</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.emergencyContact.relationship}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{viewingEmployee.emergencyContact.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement; 