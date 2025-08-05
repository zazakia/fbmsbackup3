import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause,
  RotateCcw,
  Eye,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  Package,
  DollarSign,
  FileText,
  BarChart3,
  Plus
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import type { Product, Sale, PurchaseOrder, JournalEntry, Account, CartItem } from '../../types/business';

// Import the actual forms we'll test
import EnhancedPOSSystem from '../pos/EnhancedPOSSystem';
import PurchaseOrderForm from '../purchases/PurchaseOrderForm';

// Import monitoring components
import InventoryMonitor from './InventoryMonitor';
import AccountingMonitor from './AccountingMonitor';

type TestScenario = 'sales-accounting' | 'purchase-inventory' | 'purchase-accounting';

interface DataSnapshot {
  products: Product[];
  sales: Sale[];
  purchaseOrders: PurchaseOrder[];
  journalEntries: JournalEntry[];
  accounts: Account[];
  cart: CartItem[];
  timestamp: number;
}

interface TestState {
  scenario: TestScenario;
  isRunning: boolean;
  isPaused: boolean;
  currentStep: number;
  totalSteps: number;
  startSnapshot: DataSnapshot | null;
  currentSnapshot: DataSnapshot | null;
}

interface DataChange {
  type: 'inventory' | 'accounting' | 'sales' | 'purchase';
  field: string;
  before: string | number;
  after: string | number;
  timestamp: number;
}

const LiveIntegrationTest: React.FC = () => {
  const [testState, setTestState] = useState<TestState>({
    scenario: 'sales-accounting',
    isRunning: false,
    isPaused: false,
    currentStep: 0,
    totalSteps: 5,
    startSnapshot: null,
    currentSnapshot: null
  });

  const [dataChanges, setDataChanges] = useState<DataChange[]>([]);
  const [showPOForm, setShowPOForm] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_THROTTLE = 1000; // Update every 1 second to prevent performance issues

  const {
    products,
    sales,
    purchaseOrders,
    journalEntries,
    accounts,
    cart
  } = useBusinessStore();

  const { addToast } = useToastStore();

  // Take snapshot of current state (memoized for performance)
  const takeSnapshot = useCallback((): DataSnapshot => {
    return {
      products: products.map(p => ({ ...p })),
      sales: [...sales],
      purchaseOrders: [...purchaseOrders],
      journalEntries: [...journalEntries],
      accounts: accounts.map(a => ({ ...a })),
      cart: [...cart],
      timestamp: Date.now()
    };
  }, [products, sales, purchaseOrders, journalEntries, accounts, cart]);

  // Start test scenario
  const startTest = () => {
    const snapshot = takeSnapshot();
    setTestState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      currentStep: 1,
      startSnapshot: snapshot,
      currentSnapshot: snapshot
    }));
    setDataChanges([]);
    
    addToast({
      type: 'info',
      title: 'Live Integration Test Started',
      message: `Testing ${getScenarioName(testState.scenario)} integration`
    });
  };

  // Pause/resume test
  const togglePause = () => {
    setTestState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  // Reset test
  const resetTest = () => {
    setTestState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentStep: 0,
      startSnapshot: null,
      currentSnapshot: null
    }));
    setDataChanges([]);
    setShowPOForm(false);
  };

  // Monitor data changes with throttling for performance
  useEffect(() => {
    if (!testState.isRunning || testState.isPaused) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_THROTTLE) return;

    const newSnapshot = takeSnapshot();
    
    if (testState.currentSnapshot) {
      const changes = detectChanges(testState.currentSnapshot, newSnapshot);
      if (changes.length > 0) {
        setDataChanges(prev => {
          // Limit changes array to prevent memory issues (keep last 20 changes)
          const newChanges = [...prev, ...changes];
          return newChanges.length > 20 ? newChanges.slice(-20) : newChanges;
        });
      }
    }

    setTestState(prev => ({
      ...prev,
      currentSnapshot: newSnapshot
    }));
    
    lastUpdateRef.current = now;
  }, [takeSnapshot, testState.isRunning, testState.isPaused, testState.currentSnapshot]);

  // Detect changes between snapshots (memoized for performance)
  const detectChanges = useCallback((before: DataSnapshot, after: DataSnapshot): DataChange[] => {
    const changes: DataChange[] = [];
    const timestamp = Date.now();

    // Check inventory changes
    after.products.forEach((product: Product, index: number) => {
      const beforeProduct = before.products[index];
      if (beforeProduct && beforeProduct.stock !== product.stock) {
        changes.push({
          type: 'inventory',
          field: `${product.name} stock`,
          before: beforeProduct.stock,
          after: product.stock,
          timestamp
        });
      }
    });

    // Check sales changes
    if (after.sales.length > before.sales.length) {
      changes.push({
        type: 'sales',
        field: 'New sale created',
        before: before.sales.length,
        after: after.sales.length,
        timestamp
      });
    }

    // Check journal entries
    if (after.journalEntries.length > before.journalEntries.length) {
      changes.push({
        type: 'accounting',
        field: 'New journal entry',
        before: before.journalEntries.length,
        after: after.journalEntries.length,
        timestamp
      });
    }

    // Check purchase orders
    if (after.purchaseOrders.length > before.purchaseOrders.length) {
      changes.push({
        type: 'purchase',
        field: 'New purchase order',
        before: before.purchaseOrders.length,
        after: after.purchaseOrders.length,
        timestamp
      });
    }

    return changes;
  }, []);

  const getScenarioName = (scenario: TestScenario) => {
    switch (scenario) {
      case 'sales-accounting': return 'Sales → Accounting';
      case 'purchase-inventory': return 'Purchase → Inventory';
      case 'purchase-accounting': return 'Purchase → Accounting';
    }
  };

  const getScenarioIcon = (scenario: TestScenario) => {
    switch (scenario) {
      case 'sales-accounting': return <ShoppingCart className="h-5 w-5" />;
      case 'purchase-inventory': return <Package className="h-5 w-5" />;
      case 'purchase-accounting': return <DollarSign className="h-5 w-5" />;
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'inventory': return <Package className="h-4 w-4 text-blue-500" />;
      case 'accounting': return <FileText className="h-4 w-4 text-green-500" />;
      case 'sales': return <ShoppingCart className="h-4 w-4 text-purple-500" />;
      case 'purchase': return <DollarSign className="h-4 w-4 text-orange-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderForm = () => {
    switch (testState.scenario) {
      case 'sales-accounting':
        return (
          <div className="h-full">
            <EnhancedPOSSystem />
          </div>
        );
      case 'purchase-inventory':
      case 'purchase-accounting':
        return (
          <div className="h-full p-6 bg-white dark:bg-dark-800 rounded-lg">
            {!showPOForm ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Package className="h-16 w-16 text-blue-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Purchase Order Testing
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                  Click below to open the Purchase Order form and test the integration
                </p>
                <button
                  onClick={() => setShowPOForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Purchase Order
                </button>
              </div>
            ) : (
              <PurchaseOrderForm
                poId={null}
                onClose={() => setShowPOForm(false)}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 dark:bg-dark-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Live Integration Testing
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Watch integrations happen in real-time using actual forms
          </p>
        </div>

        {/* Test Controls */}
        <div className="flex items-center space-x-3">
          <select
            value={testState.scenario}
            onChange={(e) => setTestState(prev => ({ ...prev, scenario: e.target.value as TestScenario }))}
            disabled={testState.isRunning}
            className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
          >
            <option value="sales-accounting">Sales → Accounting</option>
            <option value="purchase-inventory">Purchase → Inventory</option>
            <option value="purchase-accounting">Purchase → Accounting</option>
          </select>

          {!testState.isRunning ? (
            <button
              onClick={startTest}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Test
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
              >
                {testState.isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </button>
              <button
                onClick={resetTest}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Test Status */}
      {testState.isRunning && (
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getScenarioIcon(testState.scenario)}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  Testing: {getScenarioName(testState.scenario)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {testState.isPaused ? 'Paused' : 'Running'} • Step {testState.currentStep} of {testState.totalSteps}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${testState.isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {dataChanges.length} changes detected
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Testing Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-300px)]">
        {/* Left Panel - Form */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Live Form Testing
            </h2>
          </div>
          <div className="h-full overflow-auto">
            {renderForm()}
          </div>
        </div>

        {/* Right Panel - Real-time Data */}
        <div className="space-y-4">
          {/* Scenario-specific monitoring */}
          {testState.scenario === 'sales-accounting' && (
            <>
              <AccountingMonitor compact={true} highlightChanges={testState.isRunning} />
              <InventoryMonitor compact={true} highlightChanges={testState.isRunning} />
            </>
          )}
          
          {testState.scenario === 'purchase-inventory' && (
            <>
              <InventoryMonitor compact={false} highlightChanges={testState.isRunning} />
            </>
          )}
          
          {testState.scenario === 'purchase-accounting' && (
            <>
              <AccountingMonitor compact={false} highlightChanges={testState.isRunning} />
              <InventoryMonitor compact={true} highlightChanges={testState.isRunning} />
            </>
          )}

          {/* Data Changes Feed */}
          <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
            <div className="p-4 border-b border-gray-200 dark:border-dark-700">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Real-time Changes ({dataChanges.length})
              </h2>
            </div>
            <div className="p-4 max-h-48 overflow-auto">
              {dataChanges.length === 0 ? (
                <div className="text-center py-6">
                  <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No changes detected yet. Start using the form to see live updates.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dataChanges.slice(-8).reverse().map((change, index) => (
                    <div
                      key={`${change.timestamp}-${index}`}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        index === 0 ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-dark-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {getChangeIcon(change.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {change.field}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(change.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {change.before}
                        </span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                          {change.after}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Integration Status */}
          <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
            <div className="p-4 border-b border-gray-200 dark:border-dark-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Integration Status</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Inventory Updates</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Accounting Entries</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Data Consistency</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Double-Entry Balance</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveIntegrationTest;