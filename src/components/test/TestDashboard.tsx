import React, { useState } from 'react';
import { 
  TestTube, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  FileText,
  Settings,
  Activity,
  BarChart3
} from 'lucide-react';
import CustomerCRUDTest from './CustomerCRUDTest';
import ProductCRUDTest from './ProductCRUDTest';
import AuthTest from './AuthTest';
import NavigationTest from './NavigationTest';
import POSTest from './POSTest';
import ReportsTest from './ReportsTest';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  category: 'core' | 'business' | 'system';
  estimatedTime: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
}

const TestDashboard: React.FC = () => {
  const [activeTest, setActiveTest] = useState<string>('overview');
  const [completedTests, setCompletedTests] = useState<string[]>([]);

  const testSuites: TestSuite[] = [
    {
      id: 'customer-crud',
      name: 'Customer CRUD',
      description: 'Test customer create, read, update, and delete operations',
      icon: Users,
      component: CustomerCRUDTest,
      category: 'core',
      estimatedTime: '2-3 min',
      complexity: 'basic'
    },
    {
      id: 'product-crud',
      name: 'Product CRUD',
      description: 'Test product inventory management and operations',
      icon: Package,
      component: ProductCRUDTest,
      category: 'core',
      estimatedTime: '3-4 min',
      complexity: 'intermediate'
    },
    {
      id: 'pos-system',
      name: 'POS System',
      description: 'Test point of sale transactions and cart operations',
      icon: ShoppingCart,
      component: POSTest,
      category: 'business',
      estimatedTime: '4-5 min',
      complexity: 'advanced'
    },
    {
      id: 'authentication',
      name: 'Authentication',
      description: 'Test user login, logout, and session management',
      icon: CreditCard,
      component: AuthTest,
      category: 'system',
      estimatedTime: '2-3 min',
      complexity: 'basic'
    },
    {
      id: 'navigation',
      name: 'Navigation',
      description: 'Test app navigation, routing, and menu functionality',
      icon: Settings,
      component: NavigationTest,
      category: 'system',
      estimatedTime: '2-3 min',
      complexity: 'basic'
    },
    {
      id: 'reports',
      name: 'Reports & Analytics',
      description: 'Test data visualization and report generation',
      icon: BarChart3,
      component: ReportsTest,
      category: 'business',
      estimatedTime: '3-4 min',
      complexity: 'intermediate'
    }
  ];

  const markTestCompleted = (testId: string) => {
    if (!completedTests.includes(testId)) {
      setCompletedTests(prev => [...prev, testId]);
    }
  };

  const renderOverview = () => {
    const coreTests = testSuites.filter(t => t.category === 'core');
    const businessTests = testSuites.filter(t => t.category === 'business');
    const systemTests = testSuites.filter(t => t.category === 'system');

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            FBMS Test Suite Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Comprehensive testing suite for the Filipino Business Management System. 
            Test all core functionality including CRUD operations, business processes, and system features.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-dark-800 p-6 rounded-lg border border-gray-200 dark:border-dark-700">
            <div className="flex items-center">
              <TestTube className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Test Suites</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{testSuites.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-800 p-6 rounded-lg border border-gray-200 dark:border-dark-700">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedTests.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-800 p-6 rounded-lg border border-gray-200 dark:border-dark-700">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
                <p className="text-2xl font-bold text-orange-600">{testSuites.length - completedTests.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-800 p-6 rounded-lg border border-gray-200 dark:border-dark-700">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Coverage</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round((completedTests.length / testSuites.length) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Categories */}
        <div className="space-y-8">
          {/* Core Tests */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Core Functionality Tests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coreTests.map((test) => (
                <TestCard 
                  key={test.id} 
                  test={test} 
                  isCompleted={completedTests.includes(test.id)}
                  onStart={() => setActiveTest(test.id)}
                />
              ))}
            </div>
          </div>

          {/* Business Tests */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Business Process Tests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessTests.map((test) => (
                <TestCard 
                  key={test.id} 
                  test={test} 
                  isCompleted={completedTests.includes(test.id)}
                  onStart={() => setActiveTest(test.id)}
                />
              ))}
            </div>
          </div>

          {/* System Tests */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              System Integration Tests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemTests.map((test) => (
                <TestCard 
                  key={test.id} 
                  test={test} 
                  isCompleted={completedTests.includes(test.id)}
                  onStart={() => setActiveTest(test.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setActiveTest('customer-crud')}
              className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Users className="h-5 w-5 mr-2" />
              Start Customer Tests
            </button>
            <button 
              onClick={() => setActiveTest('product-crud')}
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Package className="h-5 w-5 mr-2" />
              Start Product Tests
            </button>
            <button 
              onClick={() => setActiveTest('pos-system')}
              className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Start POS Tests
            </button>
          </div>
        </div>
      </div>
    );
  };

  const activeTestSuite = testSuites.find(t => t.id === activeTest);

  if (activeTest === 'overview') {
    return (
      <div className="p-6">
        {renderOverview()}
      </div>
    );
  }

  if (activeTestSuite) {
    const TestComponent = activeTestSuite.component;
    return (
      <div>
        {/* Back Button */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <button
            onClick={() => setActiveTest('overview')}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
          >
            ← Back to Test Dashboard
          </button>
        </div>
        <TestComponent />
      </div>
    );
  }

  return null;
};

interface TestCardProps {
  test: TestSuite;
  isCompleted: boolean;
  onStart: () => void;
}

const TestCard: React.FC<TestCardProps> = ({ test, isCompleted, onStart }) => {
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'basic':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'intermediate':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'advanced':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'business':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'system':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <test.icon className="h-8 w-8 text-blue-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {test.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {test.description}
            </p>
          </div>
        </div>
        {isCompleted && (
          <CheckCircle className="h-6 w-6 text-green-500" />
        )}
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(test.category)}`}>
          {test.category}
        </span>
        <span className={`px-2 py-1 text-xs rounded-full ${getComplexityColor(test.complexity)}`}>
          {test.complexity}
        </span>
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          {test.estimatedTime}
        </span>
      </div>

      <button
        onClick={onStart}
        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Play className="h-4 w-4 mr-2" />
        {isCompleted ? 'Run Again' : 'Start Test'}
      </button>
    </div>
  );
};

export default TestDashboard;