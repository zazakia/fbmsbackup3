import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Package,
  DollarSign,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import type { Sale, PurchaseOrder } from '../../types/business';

interface TestResult {
  name: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  message: string;
  details?: string;
}

const IntegrationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  
  const { 
    products, 
    accounts, 
    journalEntries, 
    sales, 
    purchaseOrders,
    createSale,
    addPurchaseOrder,
    receivePurchaseOrder,
    updateStock,
    addToCart,
    clearCart
  } = useBusinessStore();
  
  const { addToast } = useToastStore();

  const updateTestResult = (testName: string, status: TestResult['status'], message: string, details?: string) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === testName);
      if (existing) {
        return prev.map(r => r.name === testName ? { ...r, status, message, details } : r);
      }
      return [...prev, { name: testName, status, message, details }];
    });
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const testSalesAccountingIntegration = async () => {
    const testName = 'Sales → Accounting Integration';
    updateTestResult(testName, 'running', 'Testing automatic journal entry creation...');
    
    try {
      const initialJournalCount = journalEntries.length;
      const initialProduct = products.find(p => p.isActive && p.stock > 0);
      
      if (!initialProduct) {
        updateTestResult(testName, 'failed', 'No active products with stock found');
        return;
      }

      // Create a test sale
      const testSale: Omit<Sale, 'id' | 'createdAt'> = {
        invoiceNumber: `TEST-${Date.now()}`,
        customerId: undefined,
        customerName: 'Integration Test Customer',
        items: [{
          id: 'test-item-1',
          productId: initialProduct.id,
          productName: initialProduct.name,
          sku: initialProduct.sku,
          quantity: 1,
          price: initialProduct.price,
          total: initialProduct.price
        }],
        subtotal: initialProduct.price,
        tax: initialProduct.price * 0.12,
        discount: 0,
        total: initialProduct.price * 1.12,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        status: 'completed',
        cashierId: 'test-user',
        notes: 'Integration test sale'
      };

      await sleep(500);
      await createSale(testSale);
      await sleep(500);

      // Verify journal entry was created
      const currentJournalCount = useBusinessStore.getState().journalEntries.length;
      if (currentJournalCount > initialJournalCount) {
        const latestEntry = useBusinessStore.getState().journalEntries[currentJournalCount - 1];
        
        // Check if entry has correct structure
        const hasDebitCredit = latestEntry.lines.every(line => 
          (line.debit > 0 && line.credit === 0) || (line.debit === 0 && line.credit > 0)
        );
        
        const totalDebits = latestEntry.lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredits = latestEntry.lines.reduce((sum, line) => sum + line.credit, 0);
        const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
        
        if (hasDebitCredit && isBalanced) {
          updateTestResult(testName, 'passed', 
            `✓ Journal entry created with ${latestEntry.lines.length} lines`, 
            `Debits: ₱${totalDebits.toFixed(2)}, Credits: ₱${totalCredits.toFixed(2)}`
          );
        } else {
          updateTestResult(testName, 'failed', 
            'Journal entry created but not properly balanced',
            `Debits: ₱${totalDebits.toFixed(2)}, Credits: ₱${totalCredits.toFixed(2)}`
          );
        }
      } else {
        updateTestResult(testName, 'failed', 'No journal entry was created');
      }
    } catch (error) {
      updateTestResult(testName, 'failed', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testPurchaseInventoryIntegration = async () => {
    const testName = 'Purchase → Inventory Integration';
    updateTestResult(testName, 'running', 'Testing inventory updates from purchase receiving...');
    
    try {
      const testProduct = products.find(p => p.isActive);
      if (!testProduct) {
        updateTestResult(testName, 'failed', 'No active products found');
        return;
      }

      const initialStock = testProduct.stock;
      
      // Create a test purchase order
      const testPO: Omit<PurchaseOrder, 'id' | 'createdAt'> = {
        poNumber: `PO-TEST-${Date.now()}`,
        supplierId: 'test-supplier',
        supplierName: 'Test Supplier',
        items: [{
          id: 'po-item-1',
          productId: testProduct.id,
          productName: testProduct.name,
          sku: testProduct.sku,
          quantity: 10,
          cost: testProduct.cost || 50,
          total: (testProduct.cost || 50) * 10
        }],
        subtotal: (testProduct.cost || 50) * 10,
        tax: (testProduct.cost || 50) * 10 * 0.12,
        total: (testProduct.cost || 50) * 10 * 1.12,
        status: 'draft',
        expectedDate: new Date(),
        createdBy: 'test-user'
      };

      await sleep(500);
      addPurchaseOrder(testPO);
      
      // Get the created PO
      const createdPOs = useBusinessStore.getState().purchaseOrders;
      const createdPO = createdPOs[createdPOs.length - 1];
      
      await sleep(500);
      
      // Receive the items
      const receivedItems = [{
        productId: testProduct.id,
        receivedQuantity: 10
      }];
      
      receivePurchaseOrder(createdPO.id, receivedItems);
      await sleep(500);

      // Check inventory update
      const updatedProduct = useBusinessStore.getState().products.find(p => p.id === testProduct.id);
      const expectedStock = initialStock + 10;
      
      if (updatedProduct && updatedProduct.stock === expectedStock) {
        updateTestResult(testName, 'passed', 
          `✓ Inventory updated correctly`, 
          `Stock: ${initialStock} → ${updatedProduct.stock} (+10)`
        );
      } else {
        updateTestResult(testName, 'failed', 
          `Inventory not updated correctly`,
          `Expected: ${expectedStock}, Actual: ${updatedProduct?.stock || 'undefined'}`
        );
      }
    } catch (error) {
      updateTestResult(testName, 'failed', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testPurchaseAccountingIntegration = async () => {
    const testName = 'Purchase → Accounting Integration';
    updateTestResult(testName, 'running', 'Testing automatic journal entry for purchase receiving...');
    
    try {
      const initialJournalCount = journalEntries.length;
      const testProduct = products.find(p => p.isActive);
      
      if (!testProduct) {
        updateTestResult(testName, 'failed', 'No active products found');
        return;
      }

      // Create and receive a purchase order
      const testPO: Omit<PurchaseOrder, 'id' | 'createdAt'> = {
        poNumber: `PO-ACC-TEST-${Date.now()}`,
        supplierId: 'test-supplier',
        supplierName: 'Test Supplier for Accounting',
        items: [{
          id: 'po-item-1',
          productId: testProduct.id,
          productName: testProduct.name,
          sku: testProduct.sku,
          quantity: 5,
          cost: 100,
          total: 500
        }],
        subtotal: 500,
        tax: 60,
        total: 560,
        status: 'draft',
        expectedDate: new Date(),
        createdBy: 'test-user'
      };

      await sleep(500);
      addPurchaseOrder(testPO);
      
      const createdPOs = useBusinessStore.getState().purchaseOrders;
      const createdPO = createdPOs[createdPOs.length - 1];
      
      await sleep(500);
      
      const receivedItems = [{
        productId: testProduct.id,
        receivedQuantity: 5
      }];
      
      receivePurchaseOrder(createdPO.id, receivedItems);
      await sleep(500);

      // Check journal entry creation
      const currentJournalCount = useBusinessStore.getState().journalEntries.length;
      
      if (currentJournalCount > initialJournalCount) {
        const latestEntry = useBusinessStore.getState().journalEntries[currentJournalCount - 1];
        
        const totalDebits = latestEntry.lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredits = latestEntry.lines.reduce((sum, line) => sum + line.credit, 0);
        const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
        
        const hasInventoryDebit = latestEntry.lines.some(line => 
          line.accountName === 'Inventory' && line.debit > 0
        );
        const hasAPCredit = latestEntry.lines.some(line => 
          line.accountName === 'Accounts Payable' && line.credit > 0
        );
        
        if (isBalanced && hasInventoryDebit && hasAPCredit) {
          updateTestResult(testName, 'passed', 
            `✓ Purchase journal entry created correctly`, 
            `Inventory debited, AP credited. Total: ₱${totalDebits.toFixed(2)}`
          );
        } else {
          updateTestResult(testName, 'failed', 
            'Journal entry created but incorrect structure',
            `Balanced: ${isBalanced}, Inventory DR: ${hasInventoryDebit}, AP CR: ${hasAPCredit}`
          );
        }
      } else {
        updateTestResult(testName, 'failed', 'No journal entry was created for purchase');
      }
    } catch (error) {
      updateTestResult(testName, 'failed', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAccountStructure = async () => {
    const testName = 'Account Structure Validation';
    updateTestResult(testName, 'running', 'Validating chart of accounts...');
    
    try {
      const requiredAccounts = [
        { code: '1000', name: 'Cash on Hand' },
        { code: '1300', name: 'Inventory' },
        { code: '2000', name: 'Accounts Payable' },
        { code: '4000', name: 'Sales Revenue' },
        { code: '5000', name: 'Cost of Goods Sold' }
      ];

      const missingAccounts = requiredAccounts.filter(req => 
        !accounts.some(acc => acc.code === req.code)
      );

      if (missingAccounts.length === 0) {
        updateTestResult(testName, 'passed', 
          `✓ All required accounts found (${requiredAccounts.length} accounts)`,
          'Chart of accounts is properly configured'
        );
      } else {
        updateTestResult(testName, 'failed', 
          `Missing required accounts: ${missingAccounts.map(a => a.code).join(', ')}`,
          'Integration requires these accounts to function properly'
        );
      }
    } catch (error) {
      updateTestResult(testName, 'failed', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    setTestResults([]);
    
    try {
      addToast({
        type: 'info',
        title: 'Integration Tests',
        message: 'Running comprehensive integration tests...'
      });

      await testAccountStructure();
      await sleep(1000);
      
      await testSalesAccountingIntegration();
      await sleep(1000);
      
      await testPurchaseInventoryIntegration();
      await sleep(1000);
      
      await testPurchaseAccountingIntegration();
      await sleep(500);

      const allPassed = testResults.every(result => result.status === 'passed');
      const passedCount = testResults.filter(result => result.status === 'passed').length;
      
      addToast({
        type: allPassed ? 'success' : 'warning',
        title: 'Integration Tests Complete',
        message: `${passedCount}/${testResults.length} tests passed`
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Test Error',
        message: 'Failed to run integration tests'
      });
    } finally {
      setIsRunningAll(false);
    }
  };

  const resetTests = () => {
    setTestResults([]);
    addToast({
      type: 'info',
      title: 'Tests Reset',
      message: 'All test results cleared'
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'passed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="p-6 space-y-6 dark:bg-dark-950 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integration Tests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test the critical integrations between Sales, Purchase, Inventory, and Accounting modules
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={resetTests}
            disabled={isRunningAll}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={runAllTests}
            disabled={isRunningAll}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
          >
            {isRunningAll ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunningAll ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>
      </div>

      {/* Test Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Sales → Accounting</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Auto journal entries</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Purchase → Inventory</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Stock updates</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Purchase → Accounting</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">AP entries</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Account Structure</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Chart validation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Test Results</h2>
        </div>
        
        <div className="p-4">
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tests run yet. Click "Run All Tests" to start.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(result.status)}
                      <div className="ml-3">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {result.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {result.message}
                        </p>
                        {result.details && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {result.details}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Individual Test Buttons */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Individual Tests</h2>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={testAccountStructure}
            disabled={isRunningAll}
            className="p-4 text-left border border-gray-200 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-orange-500 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Account Structure</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Validate chart of accounts</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={testSalesAccountingIntegration}
            disabled={isRunningAll}
            className="p-4 text-left border border-gray-200 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Sales Integration</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Test automatic journal entries</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={testPurchaseInventoryIntegration}
            disabled={isRunningAll}
            className="p-4 text-left border border-gray-200 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center">
              <Package className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Purchase-Inventory</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Test stock updates</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={testPurchaseAccountingIntegration}
            disabled={isRunningAll}
            className="p-4 text-left border border-gray-200 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-purple-500 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Purchase-Accounting</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Test AP entries</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationTest;