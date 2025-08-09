import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Filter, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Package, 
  Clock,
  DollarSign,
  Users,
  FileText,
  Eye
} from 'lucide-react';

interface ReportFilters {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  suppliers: string[];
  status: string[];
  orderValueRange: {
    min: number;
    max: number;
  };
  reportType: 'summary' | 'detailed' | 'performance' | 'compliance';
}

interface ReceivingReportData {
  summary: {
    totalOrders: number;
    totalValue: number;
    avgProcessingTime: number;
    onTimeRate: number;
    accuracyRate: number;
  };
  
  ordersByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
    totalValue: number;
  }>;
  
  supplierPerformance: Array<{
    supplierId: string;
    supplierName: string;
    ordersReceived: number;
    totalValue: number;
    avgProcessingTime: number;
    onTimeDeliveryRate: number;
    qualityScore: number;
    issuesCount: number;
  }>;
  
  dailyTrends: Array<{
    date: string;
    ordersReceived: number;
    itemsReceived: number;
    totalValue: number;
    avgProcessingTime: number;
  }>;
  
  topProducts: Array<{
    productId: string;
    productName: string;
    quantityReceived: number;
    totalValue: number;
    avgUnitCost: number;
    suppliersCount: number;
  }>;
  
  complianceMetrics: {
    documentationComplete: number;
    qualityChecksCompleted: number;
    receiptTimeliness: number;
    auditTrailIntegrity: number;
  };
}

interface ReceivingReportsProps {
  onRefresh?: () => void;
}

const ReceivingReports: React.FC<ReceivingReportsProps> = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReceivingReportData | null>(null);
  const [activeReportType, setActiveReportType] = useState<'summary' | 'detailed' | 'performance' | 'compliance'>('summary');
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    suppliers: [],
    status: [],
    orderValueRange: {
      min: 0,
      max: 1000000
    },
    reportType: 'summary'
  });

  // Mock data for demonstration
  const mockReportData: ReceivingReportData = useMemo(() => ({
    summary: {
      totalOrders: 152,
      totalValue: 2847500,
      avgProcessingTime: 2.4,
      onTimeRate: 87.5,
      accuracyRate: 94.2
    },
    ordersByStatus: [
      { status: 'fully_received', count: 98, percentage: 64.5, totalValue: 1834200 },
      { status: 'partially_received', count: 32, percentage: 21.1, totalValue: 672100 },
      { status: 'pending_receipt', count: 22, percentage: 14.4, totalValue: 341200 }
    ],
    supplierPerformance: [
      {
        supplierId: 'S001',
        supplierName: 'ABC Trading Corp',
        ordersReceived: 28,
        totalValue: 567800,
        avgProcessingTime: 1.8,
        onTimeDeliveryRate: 92.8,
        qualityScore: 96.5,
        issuesCount: 2
      },
      {
        supplierId: 'S002',
        supplierName: 'XYZ Supply Chain',
        ordersReceived: 22,
        totalValue: 445200,
        avgProcessingTime: 2.1,
        onTimeDeliveryRate: 86.4,
        qualityScore: 91.2,
        issuesCount: 4
      },
      {
        supplierId: 'S003',
        supplierName: 'Global Distributors Inc',
        ordersReceived: 19,
        totalValue: 398700,
        avgProcessingTime: 3.2,
        onTimeDeliveryRate: 84.2,
        qualityScore: 89.8,
        issuesCount: 6
      }
    ],
    dailyTrends: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ordersReceived: Math.floor(Math.random() * 10) + 3,
      itemsReceived: Math.floor(Math.random() * 150) + 50,
      totalValue: Math.floor(Math.random() * 200000) + 50000,
      avgProcessingTime: Math.random() * 3 + 1
    })),
    topProducts: [
      {
        productId: 'P001',
        productName: 'Premium Rice 25kg',
        quantityReceived: 450,
        totalValue: 337500,
        avgUnitCost: 750,
        suppliersCount: 3
      },
      {
        productId: 'P002',
        productName: 'Cooking Oil 1L',
        quantityReceived: 320,
        totalValue: 128000,
        avgUnitCost: 400,
        suppliersCount: 2
      }
    ],
    complianceMetrics: {
      documentationComplete: 96.8,
      qualityChecksCompleted: 89.5,
      receiptTimeliness: 87.2,
      auditTrailIntegrity: 99.1
    }
  }), []);

  React.useEffect(() => {
    // Simulate loading report data
    setReportData(mockReportData);
  }, [filters, activeReportType, mockReportData]);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReportData(mockReportData);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    // Simulate export functionality
    console.log(`Exporting report as ${format.toUpperCase()}`);
    
    // In a real implementation, this would trigger the actual export
    const filename = `receiving_report_${activeReportType}_${new Date().toISOString().split('T')[0]}.${format}`;
    
    // Create a mock download
    const element = document.createElement('a');
    element.href = 'data:text/plain;charset=utf-8,Mock export data would go here';
    element.download = filename;
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const reportTypes = [
    { id: 'summary', name: 'Executive Summary', icon: BarChart3 },
    { id: 'detailed', name: 'Detailed Analysis', icon: FileText },
    { id: 'performance', name: 'Performance Review', icon: TrendingUp },
    { id: 'compliance', name: 'Compliance Report', icon: Eye }
  ] as const;

  const renderSummaryReport = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-900">{reportData.summary.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-600">Total Value</p>
                <p className="text-2xl font-bold text-green-900">₱{reportData.summary.totalValue.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Processing</p>
                <p className="text-2xl font-bold text-purple-900">{reportData.summary.avgProcessingTime}d</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-orange-600">On-Time Rate</p>
                <p className="text-2xl font-bold text-orange-900">{reportData.summary.onTimeRate}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-cyan-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-cyan-600">Accuracy Rate</p>
                <p className="text-2xl font-bold text-cyan-900">{reportData.summary.accuracyRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders by Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Orders by Status</h4>
            <div className="space-y-3">
              {reportData.ordersByStatus.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className="w-4 h-4 rounded-full mr-3" 
                         style={{ backgroundColor: ['#10B981', '#F59E0B', '#EF4444'][index] }}></div>
                    <span className="text-sm text-gray-700 capitalize">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{item.count}</p>
                    <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Top Performing Suppliers</h4>
            <div className="space-y-4">
              {reportData.supplierPerformance.slice(0, 3).map((supplier, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{supplier.supplierName}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{supplier.ordersReceived} orders</span>
                      <span>{supplier.onTimeDeliveryRate.toFixed(1)}% on-time</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₱{supplier.totalValue.toLocaleString()}
                    </p>
                    <div className="flex items-center mt-1">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-green-500 rounded-full"
                          style={{ width: `${supplier.qualityScore}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {supplier.qualityScore.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedReport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Detailed Purchase Order Analysis</h4>
        <p className="text-gray-600">Comprehensive breakdown of all receiving activities with detailed metrics and analysis.</p>
        {/* Detailed tables and charts would go here */}
      </div>
    </div>
  );

  const renderPerformanceReport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Review</h4>
        <p className="text-gray-600">Performance trends, efficiency metrics, and improvement recommendations.</p>
        {/* Performance charts and analysis would go here */}
      </div>
    </div>
  );

  const renderComplianceReport = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Compliance Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(reportData.complianceMetrics).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center">
                  <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
                    <div 
                      className={`h-2 rounded-full ${
                        value >= 95 ? 'bg-green-500' : 
                        value >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${value}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{value.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    switch (activeReportType) {
      case 'summary':
        return renderSummaryReport();
      case 'detailed':
        return renderDetailedReport();
      case 'performance':
        return renderPerformanceReport();
      case 'compliance':
        return renderComplianceReport();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            const isActive = activeReportType === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => setActiveReportType(type.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {type.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </button>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(filters.dateRange.startDate).toLocaleDateString()} - {new Date(filters.dateRange.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
            ) : (
              <BarChart3 className="h-4 w-4 mr-1" />
            )}
            Generate Report
          </button>
          
          <div className="relative">
            <button
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => exportReport('pdf')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => exportReport('excel')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as Excel
                </button>
                <button
                  onClick={() => exportReport('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Report Filters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange.startDate}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, startDate: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={filters.dateRange.endDate}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, endDate: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Value Range</label>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Minimum value"
                  value={filters.orderValueRange.min || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    orderValueRange: { ...prev.orderValueRange, min: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Maximum value"
                  value={filters.orderValueRange.max || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    orderValueRange: { ...prev.orderValueRange, max: parseInt(e.target.value) || 1000000 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <div className="space-y-2">
                {['fully_received', 'partially_received', 'pending_receipt'].map((status) => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({
                            ...prev,
                            status: [...prev.status, status]
                          }));
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            status: prev.status.filter(s => s !== status)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {status.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Generating report...</span>
        </div>
      ) : (
        renderReportContent()
      )}
    </div>
  );
};

export default ReceivingReports;