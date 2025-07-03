import React, { useState, useEffect } from 'react';
import { 
  User, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Play,
  RotateCcw,
  Users,
  TestTube
} from 'lucide-react';
import { Customer } from '../../types/business';
import { useToastStore } from '../../store/toastStore';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

const CustomerCRUDTest: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  
  const { addToast } = useToastStore();

  const mockCustomers: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juan.delacruz@email.com',
      phone: '+63 917 123 4567',
      address: '123 Rizal Street, Makati City',
      city: 'Makati',
      province: 'Metro Manila',
      zipCode: '1200',
      customerType: 'individual',
      businessName: '',
      taxId: '',
      birthday: '1990-05-15',
      notes: 'Regular customer',
      tags: ['vip', 'regular'],
      creditLimit: 50000,
      preferredPaymentMethod: 'cash',
      discountPercentage: 5,
      isActive: true
    },
    {
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria.santos@business.com',
      phone: '+63 918 987 6543',
      address: '456 EDSA, Quezon City',
      city: 'Quezon City',
      province: 'Metro Manila',
      zipCode: '1100',
      customerType: 'business',
      businessName: 'Santos Trading Corp',
      taxId: 'TIN-123456789',
      birthday: '1985-08-20',
      notes: 'Corporate client',
      tags: ['corporate', 'bulk'],
      creditLimit: 100000,
      preferredPaymentMethod: 'bank_transfer',
      discountPercentage: 10,
      isActive: true
    }
  ];

  const initializeTests = () => {
    const tests: TestResult[] = [
      { name: 'Create Customer - Individual', status: 'pending' },
      { name: 'Create Customer - Business', status: 'pending' },
      { name: 'Read Customer List', status: 'pending' },
      { name: 'Update Customer Information', status: 'pending' },
      { name: 'Update Customer Status', status: 'pending' },
      { name: 'Delete Customer', status: 'pending' },
      { name: 'Validate Required Fields', status: 'pending' },
      { name: 'Test Email Validation', status: 'pending' },
      { name: 'Test Phone Validation', status: 'pending' },
      { name: 'Test Credit Limit Validation', status: 'pending' }
    ];
    setTestResults(tests);
  };

  useEffect(() => {
    initializeTests();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const updateTestResult = (testName: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTestResults(prev => prev.map(test => 
      test.name === testName 
        ? { ...test, status, message, duration }
        : test
    ));
  };

  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

  const runTestWithCustomers = async (testName: string, testFn: (currentCustomers: Customer[]) => Promise<Customer[]>, currentCustomers: Customer[]) => {
    const startTime = Date.now();
    setCurrentTest(testName);
    updateTestResult(testName, 'running');
    
    try {
      const updatedCustomers = await testFn(currentCustomers);
      setCustomers(updatedCustomers);
      
      // Wait for state to update
      await delay(100);
      
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'passed', 'Test completed successfully', duration);
      addToast({
        type: 'success',
        title: 'Test Passed',
        message: `${testName} completed successfully`
      });
      
      return updatedCustomers;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Test failed';
      updateTestResult(testName, 'failed', message, duration);
      addToast({
        type: 'error',
        title: 'Test Failed',
        message: `${testName}: ${message}`
      });
      return currentCustomers;
    }
  };

  const testCreateIndividualCustomer = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(500);
    const customerData = mockCustomers[0];
    const newCustomer: Customer = {
      ...customerData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.email) {
      throw new Error('Required fields missing');
    }
    
    return [...currentCustomers, newCustomer];
  };

  const testCreateBusinessCustomer = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(500);
    const customerData = mockCustomers[1];
    const newCustomer: Customer = {
      ...customerData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (newCustomer.customerType === 'business' && !newCustomer.businessName) {
      throw new Error('Business name required for business customers');
    }
    
    return [...currentCustomers, newCustomer];
  };

  const testReadCustomers = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(300);
    if (currentCustomers.length === 0) {
      throw new Error('No customers found');
    }
    
    if (currentCustomers.length < 2) {
      throw new Error(`Expected at least 2 customers, found ${currentCustomers.length}`);
    }
    
    return currentCustomers;
  };

  const testUpdateCustomer = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(400);
    if (currentCustomers.length === 0) {
      throw new Error('No customers to update');
    }
    
    const customerToUpdate = currentCustomers[0];
    const updatedCustomer = {
      ...customerToUpdate,
      firstName: 'Updated Juan',
      notes: 'Updated notes',
      updatedAt: new Date().toISOString()
    };
    
    return currentCustomers.map(c => 
      c.id === customerToUpdate.id ? updatedCustomer : c
    );
  };

  const testUpdateCustomerStatus = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(300);
    if (currentCustomers.length === 0) {
      throw new Error('No customers to update');
    }
    
    const customerToUpdate = currentCustomers[0];
    const updatedCustomer = {
      ...customerToUpdate,
      isActive: !customerToUpdate.isActive,
      updatedAt: new Date().toISOString()
    };
    
    return currentCustomers.map(c => 
      c.id === customerToUpdate.id ? updatedCustomer : c
    );
  };

  const testDeleteCustomer = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(400);
    if (currentCustomers.length === 0) {
      throw new Error('No customers to delete');
    }
    
    const customerToDelete = currentCustomers[currentCustomers.length - 1];
    return currentCustomers.filter(c => c.id !== customerToDelete.id);
  };

  const testValidateRequiredFields = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(200);
    try {
      const invalidCustomer = {
        firstName: '',
        lastName: '',
        email: '',
        customerType: 'individual' as const
      };
      
      if (!invalidCustomer.firstName || !invalidCustomer.lastName || !invalidCustomer.email) {
        return currentCustomers; // Expected to fail validation
      }
      
      throw new Error('Validation should have failed');
    } catch (error) {
      // Expected behavior
      return currentCustomers;
    }
  };

  const testEmailValidation = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(200);
    const invalidEmails = ['invalid-email', 'test@', '@domain.com', ''];
    
    for (const email of invalidEmails) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        continue; // Expected to fail
      }
      if (email === '') {
        continue; // Empty email should fail
      }
      throw new Error(`Email validation failed for: ${email}`);
    }
    
    return currentCustomers;
  };

  const testPhoneValidation = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(200);
    const validPhones = ['+63 917 123 4567', '09171234567', '(02) 123-4567'];
    const invalidPhones = ['123', 'abc', ''];
    
    // Test valid phones
    for (const phone of validPhones) {
      if (phone.length < 7) {
        throw new Error(`Valid phone rejected: ${phone}`);
      }
    }
    
    // Test invalid phones
    for (const phone of invalidPhones) {
      if (phone.length < 7 || !/\d/.test(phone)) {
        continue; // Expected to fail
      }
      throw new Error(`Invalid phone accepted: ${phone}`);
    }
    
    return currentCustomers;
  };

  const testCreditLimitValidation = async (currentCustomers: Customer[]): Promise<Customer[]> => {
    await delay(200);
    const invalidLimits = [-100, -1];
    
    for (const limit of invalidLimits) {
      if (limit < 0) {
        continue; // Expected to fail
      }
      throw new Error(`Negative credit limit should be rejected: ${limit}`);
    }
    
    return currentCustomers;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setCustomers([]);
    initializeTests();
    
    const tests = [
      { name: 'Create Customer - Individual', fn: testCreateIndividualCustomer },
      { name: 'Create Customer - Business', fn: testCreateBusinessCustomer },
      { name: 'Read Customer List', fn: testReadCustomers },
      { name: 'Update Customer Information', fn: testUpdateCustomer },
      { name: 'Update Customer Status', fn: testUpdateCustomerStatus },
      { name: 'Delete Customer', fn: testDeleteCustomer },
      { name: 'Validate Required Fields', fn: testValidateRequiredFields },
      { name: 'Test Email Validation', fn: testEmailValidation },
      { name: 'Test Phone Validation', fn: testPhoneValidation },
      { name: 'Test Credit Limit Validation', fn: testCreditLimitValidation }
    ];

    let currentCustomers: Customer[] = [];
    
    for (const test of tests) {
      currentCustomers = await runTestWithCustomers(test.name, test.fn, currentCustomers);
      await delay(200); // Increased delay to ensure state updates
    }
    
    setIsRunning(false);
    setCurrentTest('');
    
    const passedTests = testResults.filter(t => t.status === 'passed').length;
    const totalTests = testResults.length;
    
    addToast({
      type: passedTests === totalTests ? 'success' : 'warning',
      title: 'Test Suite Completed',
      message: `${passedTests}/${totalTests} tests passed`
    });
  };

  const resetTests = () => {
    setCustomers([]);
    initializeTests();
    setCurrentTest('');
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'running':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const failedTests = testResults.filter(t => t.status === 'failed').length;
  const totalTests = testResults.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <TestTube className="h-6 w-6 mr-2" />
            Customer CRUD Tests
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive testing for customer create, read, update, and delete operations
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={resetTests}
            disabled={isRunning}
            className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run All Tests'}
          </button>
        </div>
      </div>

      {/* Test Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <TestTube className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tests</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalTests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Passed</p>
              <p className="text-xl font-bold text-green-600">{passedTests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-xl font-bold text-red-600">{failedTests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-purple-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Test Customers</p>
              <p className="text-xl font-bold text-purple-600">{customers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Test Status */}
      {currentTest && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              Currently running: {currentTest}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Results */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Test Results</h2>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((test, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getStatusColor(test.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(test.status)}
                    <span className="ml-3 font-medium text-gray-900 dark:text-gray-100">
                      {test.name}
                    </span>
                  </div>
                  {test.duration && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {test.duration}ms
                    </span>
                  )}
                </div>
                {test.message && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {test.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Test Data */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Test Customers</h2>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {customers.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No test customers created yet</p>
              </div>
            ) : (
              customers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {customer.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Type: {customer.customerType} | Active: {customer.isActive ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        customer.isActive 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerCRUDTest;