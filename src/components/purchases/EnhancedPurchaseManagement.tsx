import React, { useState, useEffect } from 'react';
import PurchaseOrderForm from './PurchaseOrderForm';
import SupplierForm from './SupplierForm';
import { ApprovalQueue } from './ApprovalQueue';
import { WorkflowConfigurationPanel } from './WorkflowConfigurationPanel';
import { ReceivingInterface } from './ReceivingInterface';
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
  Truck,
  Clock,
  Eye,
  Edit,
  Download,
  Upload,
  BarChart3,
  Calculator,
  Building2,
  Settings,
  CheckSquare,
  InboxIcon
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { Supplier, PurchaseOrder } from '../../types/business';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface PurchaseStats {
  totalPurchases: number;
  totalValue: number;
  pendingOrders: number;
  receivedThisMonth: number;
  topSuppliers: Supplier[];
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  monthlyTrend: number;
}

interface PurchaseAnalytics {
  categorySpending: Array<{ category: string; amount: number; percentage: number }>;
  supplierPerformance: Array<{ 
    supplier: Supplier; 
    totalOrders: number; 
    totalValue: number; 
    onTimeDelivery: number;
    averageDeliveryDays: number;
  }>;
  seasonalTrends: Array<{ month: string; amount: number; orders: number }>;
  costAnalysis: {
    totalCost: number;
    averageCostPerUnit: number;
    savingsOpportunities: number;
  };
}

const EnhancedPurchaseManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'approval-queue' | 'suppliers' | 'receiving' | 'workflow-config' | 'analytics'>('dashboard');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [showReceivingInterface, setShowReceivingInterface] = useState(false);
  const [selectedPOForReceiving, setSelectedPOForReceiving] = useState<PurchaseOrder | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [itemsToReceiveCount, setItemsToReceiveCount] = useState(0);
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [analytics, setAnalytics] = useState<PurchaseAnalytics | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<Array<{
    productId: string;
    productName: string;
    currentStock: number;
    reorderPoint: number;
    suggestedQuantity: number;
    preferredSupplier?: Supplier;
    estimatedCost: number;
  }>>([]);


  // Initialize mock data
  useEffect(() => {
    initializeMockData();
    generateReorderSuggestions();
  }, []);

  const { products } = useBusinessStore();
  const { addToast } = useToastStore();

  const generateReorderSuggestions = () => {
    const suggestions = products
      .filter(product => product.isActive && product.stock <= product.minStock)
      .map(product => {
        const suggestedQuantity = Math.max(product.minStock * 2 - product.stock, product.minStock);
        const preferredSupplier = suppliers.find(s => s.name.includes('Metro')); // Mock preferred supplier logic
        const estimatedCost = product.cost * suggestedQuantity;

        return {
          productId: product.id,
          productName: product.name,
          currentStock: product.stock,
          reorderPoint: product.minStock,
          suggestedQuantity,
          preferredSupplier,
          estimatedCost
        };
      });

    setReorderSuggestions(suggestions);

    if (suggestions.length > 0) {
      addToast({
        type: 'info',
        title: 'Reorder Alert',
        message: `${suggestions.length} products need reordering`
      });
    }
  };

  const handleCreateReorderPO = (suggestion: typeof reorderSuggestions[0]) => {
    // This would create a new purchase order with the suggested items
    addToast({
      type: 'success',
      title: 'Purchase Order Created',
      message: `PO created for ${suggestion.productName}`
    });
  };

  // Workflow handlers
  const handlePOApproval = (po: PurchaseOrder, reason?: string) => {
    addToast({
      type: 'success',
      title: 'Purchase Order Approved',
      message: `PO ${po.poNumber} has been approved`
    });
    // Refresh data
    initializeMockData();
  };

  const handlePOReject = (po: PurchaseOrder, reason: string) => {
    addToast({
      type: 'info',
      title: 'Purchase Order Rejected',
      message: `PO ${po.poNumber} has been rejected: ${reason}`
    });
    // Refresh data
    initializeMockData();
  };

  const handleReceiveItems = (po: PurchaseOrder) => {
    setSelectedPOForReceiving(po);
    setShowReceivingInterface(true);
  };

  const handleReceiptComplete = (receivingRecord: any) => {
    addToast({
      type: 'success',
      title: 'Items Received',
      message: `Successfully received ${receivingRecord.totalItems} items`
    });
    setShowReceivingInterface(false);
    setSelectedPOForReceiving(null);
    // Refresh data
    initializeMockData();
  };

  const handleWorkflowConfigChange = (config: any) => {
    addToast({
      type: 'success',
      title: 'Workflow Configuration Updated',
      message: 'Purchase order workflow settings have been saved'
    });
  };

  const initializeMockData = () => {
    // Mock suppliers
    const mockSuppliers: Supplier[] = [
      {
        id: 'sup-1',
        name: 'Metro Supply Corp',
        contactPerson: 'Juan Dela Cruz',
        email: 'juan@metrosupply.com',
        phone: '+63-2-8123-4567',
        address: '123 Industrial Ave, Pasig City',
        isActive: true,
        createdAt: new Date('2023-01-15')
      },
      {
        id: 'sup-2',
        name: 'Global Trading Inc',
        contactPerson: 'Maria Santos',
        email: 'maria@globaltrading.ph',
        phone: '+63-2-8987-6543',
        address: '456 Commerce St, Makati City',
        isActive: true,
        createdAt: new Date('2023-03-20')
      },
      {
        id: 'sup-3',
        name: 'Prime Distribution',
        contactPerson: 'Roberto Garcia',
        email: 'roberto@primedist.com',
        phone: '+63-2-8555-1234',
        address: '789 Warehouse Blvd, Quezon City',
        isActive: true,
        createdAt: new Date('2023-02-10')
      }
    ];

    // Mock purchase orders
    const mockOrders: PurchaseOrder[] = [
      {
        id: 'po-1',
        poNumber: 'PO-2024-001',
        supplierId: 'sup-1',
        supplierName: 'Metro Supply Corp',
        status: 'received',
        items: [
          {
            id: 'poi-1',
            productId: 'prod-1',
            productName: 'Office Chair',
            sku: 'OFC-001',
            quantity: 10,
            cost: 2500,
            total: 25000,
          }
        ],
        subtotal: 25000,
        tax: 3000,
        total: 28000,
        createdBy: 'admin',
        createdAt: new Date('2024-06-15')
      },
      {
        id: 'po-2',
        poNumber: 'PO-2024-002',
        supplierId: 'sup-2',
        supplierName: 'Global Trading Inc',
        status: 'sent',
        items: [
          {
            id: 'poi-2',
            productId: 'prod-2',
            productName: 'Laptop Computer',
            sku: 'LAP-001',
            quantity: 5,
            cost: 45000,
            total: 225000
          }
        ],
        subtotal: 225000,
        tax: 27000,
        total: 252000,
        createdBy: 'admin',
        createdAt: new Date('2024-06-20')
      }
    ];

    setSuppliers(mockSuppliers);
    setPurchaseOrders(mockOrders);

    // Calculate stats
    const totalPurchases = mockOrders.length;
    const totalValue = mockOrders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = mockOrders.filter(order => order.status === 'sent').length;
    const receivedThisMonth = mockOrders.filter(order => 
      order.status === 'received'
    ).length;
    
    // Update workflow counters
    setPendingApprovalsCount(mockOrders.filter(order => 
      ['draft', 'pending'].includes(order.status)
    ).length);
    setItemsToReceiveCount(mockOrders.filter(order => 
      order.status === 'sent'
    ).length);

    setStats({
      totalPurchases,
      totalValue,
      pendingOrders,
      receivedThisMonth,
      topSuppliers: mockSuppliers.slice(0, 3),
      averageOrderValue: totalValue / totalPurchases,
      onTimeDeliveryRate: 85.5,
      monthlyTrend: 12.5
    });

    // Mock analytics
    setAnalytics({
      categorySpending: [
        { category: 'Office Supplies', amount: 125000, percentage: 35 },
        { category: 'IT Equipment', amount: 180000, percentage: 50 },
        { category: 'Furniture', amount: 55000, percentage: 15 }
      ],
      supplierPerformance: mockSuppliers.map(supplier => ({
        supplier,
        totalOrders: Math.floor(Math.random() * 20) + 5,
        totalValue: Math.floor(Math.random() * 300000) + 100000,
        onTimeDelivery: Math.floor(Math.random() * 20) + 80,
        averageDeliveryDays: Math.floor(Math.random() * 10) + 5
      })),
      seasonalTrends: [
        { month: 'Jan', amount: 45000, orders: 8 },
        { month: 'Feb', amount: 52000, orders: 12 },
        { month: 'Mar', amount: 48000, orders: 10 },
        { month: 'Apr', amount: 61000, orders: 15 },
        { month: 'May', amount: 58000, orders: 13 },
        { month: 'Jun', amount: 72000, orders: 18 }
      ],
      costAnalysis: {
        totalCost: 280000,
        averageCostPerUnit: 1250,
        savingsOpportunities: 15000
      }
    });
  };

  const filteredOrders = purchaseOrders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSupplier = supplierFilter === 'all' || order.supplierId === supplierFilter;
    
    return matchesSearch && matchesStatus && matchesSupplier;
  });



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'sent': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'partial': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'received': return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };


  return (
    <div className="p-6 space-y-6 dark:bg-dark-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Enhanced Purchase Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Streamlined procurement with intelligent analytics</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSupplierForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Add Supplier
          </button>
          <button
            onClick={() => setShowOrderForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalPurchases}</p>
                <p className="text-xs text-green-600 dark:text-green-400">+{stats.monthlyTrend}% this month</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Average: {formatCurrency(stats.averageOrderValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Awaiting delivery</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">On-time Delivery</p>
                <p className="text-2xl font-bold text-purple-600">{stats.onTimeDeliveryRate}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Supplier performance</p>
              </div>
              <Truck className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button className="flex items-center px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export Orders
            </button>
            <button className="flex items-center px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <Upload className="h-4 w-4 mr-2" />
              Import Catalog
            </button>
            <button className="flex items-center px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <Calculator className="h-4 w-4 mr-2" />
              Cost Analysis
            </button>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {formatDate(new Date(), 'time')}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="border-b border-gray-200 dark:border-gray-600">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart, badge: stats?.pendingOrders },
              { id: 'approval-queue', label: 'Approval Queue', icon: CheckSquare, badge: pendingApprovalsCount },
              { id: 'suppliers', label: 'Suppliers', icon: Building2 },
              { id: 'receiving', label: 'Receiving', icon: Package, badge: itemsToReceiveCount },
              { id: 'workflow-config', label: 'Workflow Config', icon: Settings },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Top Suppliers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Suppliers</h3>
                  <div className="space-y-3">
                    {stats.topSuppliers.map((supplier, index) => (
                      <div key={supplier.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center">
                          <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{supplier.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{supplier.contactPerson}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Math.floor(Math.random() * 300000) + 100000)}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Net 30</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Orders</h3>
                  <div className="space-y-3">
                    {purchaseOrders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{order.id}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{order.supplierName}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                          <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(order.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Analytics Overview */}
              {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Category Spending</h4>
                    <div className="space-y-3">
                      {analytics.categorySpending.map(item => (
                        <div key={item.category} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.category}</span>
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 mr-2">
                              {formatCurrency(item.amount)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">({item.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Cost Analysis</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Cost</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(analytics.costAnalysis.totalCost)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Avg Cost/Unit</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(analytics.costAnalysis.averageCostPerUnit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Savings Opportunity</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(analytics.costAnalysis.savingsOpportunities)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">On-time Delivery</span>
                        <span className="text-sm font-medium text-green-600">{stats.onTimeDeliveryRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(stats.averageOrderValue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Growth</span>
                        <span className="text-sm font-medium text-blue-600">+{stats.monthlyTrend}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders by number or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              {/* Orders Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Order #</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Supplier</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Expected</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Payment</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Total</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{order.poNumber}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{order.items.length} items</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{order.supplierName}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{formatDate(order.createdAt)}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">-</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingOrder(order.id);
                                setShowOrderForm(true);
                              }}
                              className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingOrder(order.id);
                                setShowOrderForm(true);
                              }}
                              className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                              title="Edit Order"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {order.status === 'sent' && (
                              <button
                                onClick={() => handleReceiveItems(order)}
                                className="p-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                                title="Receive Items"
                              >
                                <Package className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approval Queue Tab */}
          {activeTab === 'approval-queue' && (
            <div className="space-y-6">
              <ApprovalQueue
                onApprove={handlePOApproval}
                onReject={handlePOReject}
                onViewDetails={(po) => {
                  setEditingOrder(po.id);
                  setShowOrderForm(true);
                }}
              />
            </div>
          )}

          {/* Suppliers Tab */}
          {activeTab === 'suppliers' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Supplier Management</h3>
                <p className="text-gray-500 dark:text-gray-400">Manage supplier information, contracts, and performance metrics.</p>
              </div>
            </div>
          )}

          {/* Receiving Tab */}
          {activeTab === 'receiving' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Goods Receiving</h3>
                    <p className="text-gray-500 dark:text-gray-400">Process incoming shipments and update inventory levels</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Orders Ready for Receiving</h4>
                  {purchaseOrders
                    .filter(po => po.status === 'sent')
                    .map(po => (
                    <div key={po.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{po.poNumber}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{po.supplierName} • {po.items.length} items</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(po.total)}</span>
                        <button
                          onClick={() => handleReceiveItems(po)}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Receive Items
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {purchaseOrders.filter(po => po.status === 'sent').length === 0 && (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Items to Receive</h3>
                      <p className="text-gray-500 dark:text-gray-400">All purchase orders have been received or are pending approval.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Workflow Configuration Tab */}
          {activeTab === 'workflow-config' && (
            <div className="space-y-6">
              <WorkflowConfigurationPanel
                onConfigChange={handleWorkflowConfigChange}
              />
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Supplier Performance</h3>
                  <div className="space-y-4">
                    {analytics.supplierPerformance.map(perf => (
                      <div key={perf.supplier.id} className="bg-white dark:bg-dark-800 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{perf.supplier.name}</h4>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{perf.onTimeDelivery}% on-time</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Orders</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{perf.totalOrders}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Value</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(perf.totalValue)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Avg Days</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{perf.averageDeliveryDays}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Seasonal Trends</h3>
                  <div className="space-y-3">
                    {analytics.seasonalTrends.map(trend => (
                      <div key={trend.month} className="flex items-center justify-between p-3 bg-white dark:bg-dark-800 rounded-lg">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{trend.month}</span>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(trend.amount)}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{trend.orders} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Order Form Modal */}
      {showOrderForm && (
        <PurchaseOrderForm
          poId={editingOrder}
          onClose={() => {
            setShowOrderForm(false);
            setEditingOrder(null);
          }}
        />
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <SupplierForm
          supplierId={editingSupplier}
          onClose={() => {
            setShowSupplierForm(false);
            setEditingSupplier(null);
          }}
        />
      )}

      {/* Receiving Interface Modal */}
      {showReceivingInterface && selectedPOForReceiving && (
        <ReceivingInterface
          purchaseOrder={selectedPOForReceiving}
          onReceiptComplete={handleReceiptComplete}
          onClose={() => {
            setShowReceivingInterface(false);
            setSelectedPOForReceiving(null);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedPurchaseManagement;
