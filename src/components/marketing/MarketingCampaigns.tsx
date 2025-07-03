import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Target,
  Users,
  Mail,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Eye,
  Edit,
  Play,
  Pause,
  Stop,
  Send,
  Copy,
  ExternalLink,
  DollarSign,
  Percent,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  Gift,
  Megaphone
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Customer } from '../../types/business';

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'sms' | 'social' | 'discount' | 'loyalty';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled';
  startDate: Date;
  endDate: Date;
  budget: number;
  spent: number;
  targetAudience: CampaignAudience;
  metrics: CampaignMetrics;
  content: CampaignContent;
  createdAt: Date;
  updatedAt: Date;
}

interface CampaignAudience {
  type: 'all' | 'segment' | 'custom';
  criteria?: {
    minPurchases?: number;
    minSpent?: number;
    lastPurchase?: number; // days ago
    location?: string;
    tags?: string[];
  };
  customerCount: number;
  selectedCustomers?: string[];
}

interface CampaignMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  roi: number;
  cost: number;
}

interface CampaignContent {
  subject?: string;
  message: string;
  cta?: string;
  ctaUrl?: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    code?: string;
  };
  template?: string;
}

const MarketingCampaigns: React.FC = () => {
  const { customers } = useBusinessStore();
  const { addToast } = useToastStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    generateSampleCampaigns();
  }, [customers]);

  const generateSampleCampaigns = () => {
    const sampleCampaigns: Campaign[] = [
      {
        id: '1',
        name: 'Holiday Season Sale',
        description: '50% off on selected items for the holiday season',
        type: 'email',
        status: 'active',
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2024, 11, 31),
        budget: 10000,
        spent: 3500,
        targetAudience: {
          type: 'segment',
          criteria: { minPurchases: 3, minSpent: 5000 },
          customerCount: 150
        },
        metrics: {
          sent: 150,
          delivered: 145,
          opened: 87,
          clicked: 23,
          converted: 12,
          revenue: 45000,
          roi: 285,
          cost: 3500
        },
        content: {
          subject: '🎄 Holiday Special - 50% Off Selected Items!',
          message: 'Get ready for the holidays with our biggest sale of the year!',
          cta: 'Shop Now',
          ctaUrl: '/shop',
          discount: { type: 'percentage', value: 50, code: 'HOLIDAY50' }
        },
        createdAt: new Date(2024, 10, 25),
        updatedAt: new Date(2024, 11, 5)
      },
      {
        id: '2',
        name: 'Welcome New Customers',
        description: 'Automated welcome series for new customer onboarding',
        type: 'email',
        status: 'active',
        startDate: new Date(2024, 10, 1),
        endDate: new Date(2025, 2, 28),
        budget: 5000,
        spent: 1200,
        targetAudience: {
          type: 'custom',
          criteria: { lastPurchase: 7 },
          customerCount: 45
        },
        metrics: {
          sent: 45,
          delivered: 44,
          opened: 32,
          clicked: 18,
          converted: 8,
          revenue: 12000,
          roi: 400,
          cost: 1200
        },
        content: {
          subject: 'Welcome to Our Store Family! 🎉',
          message: 'Thank you for choosing us. Here\'s 20% off your next purchase!',
          cta: 'Claim Discount',
          discount: { type: 'percentage', value: 20, code: 'WELCOME20' }
        },
        createdAt: new Date(2024, 9, 20),
        updatedAt: new Date(2024, 11, 3)
      },
      {
        id: '3',
        name: 'Loyalty Points Reminder',
        description: 'SMS campaign to remind customers about unused loyalty points',
        type: 'sms',
        status: 'completed',
        startDate: new Date(2024, 10, 15),
        endDate: new Date(2024, 10, 30),
        budget: 2000,
        spent: 1800,
        targetAudience: {
          type: 'segment',
          criteria: { minPurchases: 5 },
          customerCount: 200
        },
        metrics: {
          sent: 200,
          delivered: 195,
          opened: 195,
          clicked: 45,
          converted: 22,
          revenue: 18500,
          roi: 527,
          cost: 1800
        },
        content: {
          message: 'You have 500 loyalty points expiring soon! Use them before Dec 31. Reply STOP to opt out.',
          cta: 'Use Points'
        },
        createdAt: new Date(2024, 10, 10),
        updatedAt: new Date(2024, 10, 30)
      }
    ];

    setCampaigns(sampleCampaigns);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || campaign.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'paused': return 'text-yellow-700 bg-yellow-100';
      case 'completed': return 'text-blue-700 bg-blue-100';
      case 'scheduled': return 'text-purple-700 bg-purple-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'social': return <Users className="h-4 w-4" />;
      case 'discount': return <Percent className="h-4 w-4" />;
      case 'loyalty': return <Gift className="h-4 w-4" />;
      default: return <Megaphone className="h-4 w-4" />;
    }
  };

  const calculateConversionRate = (campaign: Campaign) => {
    return campaign.metrics.sent > 0 
      ? ((campaign.metrics.converted / campaign.metrics.sent) * 100).toFixed(1)
      : '0.0';
  };

  const calculateOpenRate = (campaign: Campaign) => {
    return campaign.metrics.delivered > 0 
      ? ((campaign.metrics.opened / campaign.metrics.delivered) * 100).toFixed(1)
      : '0.0';
  };

  const totalMetrics = campaigns.reduce((totals, campaign) => ({
    sent: totals.sent + campaign.metrics.sent,
    delivered: totals.delivered + campaign.metrics.delivered,
    opened: totals.opened + campaign.metrics.opened,
    clicked: totals.clicked + campaign.metrics.clicked,
    converted: totals.converted + campaign.metrics.converted,
    revenue: totals.revenue + campaign.metrics.revenue,
    cost: totals.cost + campaign.metrics.cost
  }), {
    sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0, revenue: 0, cost: 0
  });

  const totalROI = totalMetrics.cost > 0 
    ? (((totalMetrics.revenue - totalMetrics.cost) / totalMetrics.cost) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketing Campaigns</h1>
            <p className="text-gray-600">Manage and track your marketing campaigns</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Campaign</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                { id: 'audiences', label: 'Audiences', icon: Users }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">Total Campaigns</p>
                        <p className="text-2xl font-bold">{campaigns.length}</p>
                      </div>
                      <Megaphone className="h-8 w-8 text-blue-200" />
                    </div>
                    <div className="mt-2 text-sm text-blue-100">
                      {campaigns.filter(c => c.status === 'active').length} active
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">Total Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalMetrics.revenue)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-200" />
                    </div>
                    <div className="mt-2 text-sm text-green-100">
                      ROI: {totalROI}%
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100">Messages Sent</p>
                        <p className="text-2xl font-bold">{totalMetrics.sent.toLocaleString()}</p>
                      </div>
                      <Send className="h-8 w-8 text-purple-200" />
                    </div>
                    <div className="mt-2 text-sm text-purple-100">
                      {totalMetrics.converted} conversions
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100">Conversion Rate</p>
                        <p className="text-2xl font-bold">
                          {totalMetrics.sent > 0 
                            ? ((totalMetrics.converted / totalMetrics.sent) * 100).toFixed(1)
                            : '0.0'
                          }%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-orange-200" />
                    </div>
                    <div className="mt-2 text-sm text-orange-100">
                      Open rate: {totalMetrics.delivered > 0 
                        ? ((totalMetrics.opened / totalMetrics.delivered) * 100).toFixed(1)
                        : '0.0'
                      }%
                    </div>
                  </div>
                </div>

                {/* Recent Campaigns */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h3>
                  <div className="space-y-4">
                    {campaigns.slice(0, 3).map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            {getTypeIcon(campaign.type)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{campaign.name}</p>
                            <p className="text-sm text-gray-600">{campaign.description}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(campaign.metrics.revenue)}</p>
                          <p className="text-sm text-gray-600">{campaign.metrics.converted} conversions</p>
                          <p className="text-xs text-gray-500">ROI: {campaign.metrics.roi}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
              <div className="space-y-6">
                {/* Search and Filter */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search campaigns..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                </div>

                {/* Campaigns List */}
                <div className="space-y-4">
                  {filteredCampaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-white border rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            {getTypeIcon(campaign.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3">{campaign.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-gray-500">Sent</p>
                                <p className="font-medium">{campaign.metrics.sent.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Open Rate</p>
                                <p className="font-medium">{calculateOpenRate(campaign)}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Conversions</p>
                                <p className="font-medium">{campaign.metrics.converted}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Revenue</p>
                                <p className="font-medium">{formatCurrency(campaign.metrics.revenue)}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{campaign.targetAudience.customerCount} customers</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <DollarSign className="h-3 w-3" />
                                <span>{formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-600">
                            <Edit className="h-4 w-4" />
                          </button>
                          {campaign.status === 'active' ? (
                            <button className="p-2 text-gray-400 hover:text-yellow-600">
                              <Pause className="h-4 w-4" />
                            </button>
                          ) : campaign.status === 'paused' ? (
                            <button className="p-2 text-gray-400 hover:text-green-600">
                              <Play className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance Analytics</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Revenue by Campaign Type</h4>
                      <div className="space-y-3">
                        {['email', 'sms', 'social', 'discount'].map((type) => {
                          const typeRevenue = campaigns
                            .filter(c => c.type === type)
                            .reduce((sum, c) => sum + c.metrics.revenue, 0);
                          const percentage = totalMetrics.revenue > 0 ? (typeRevenue / totalMetrics.revenue) * 100 : 0;
                          
                          return (
                            <div key={type} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getTypeIcon(type)}
                                <span className="capitalize font-medium">{type}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium w-20 text-right">
                                  {formatCurrency(typeRevenue)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Top Performing Campaigns</h4>
                      <div className="space-y-3">
                        {campaigns
                          .sort((a, b) => b.metrics.roi - a.metrics.roi)
                          .slice(0, 5)
                          .map((campaign) => (
                            <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{campaign.name}</p>
                                <p className="text-sm text-gray-600">{campaign.type}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900">ROI: {campaign.metrics.roi}%</p>
                                <p className="text-sm text-gray-600">{formatCurrency(campaign.metrics.revenue)}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audiences Tab */}
            {activeTab === 'audiences' && (
              <div className="space-y-6">
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Star className="h-4 w-4 text-green-600" />
                        </div>
                        <h4 className="font-medium text-gray-900">VIP Customers</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Customers with 10+ purchases or ₱50,000+ spent</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-gray-900">
                          {customers.filter(c => c.totalSpent > 50000).length}
                        </span>
                        <span className="text-sm text-gray-500">customers</span>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <h4 className="font-medium text-gray-900">Regular Customers</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Customers with 3-9 purchases</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-gray-900">
                          {customers.filter(c => c.totalSpent >= 10000 && c.totalSpent <= 50000).length}
                        </span>
                        <span className="text-sm text-gray-500">customers</span>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Gift className="h-4 w-4 text-yellow-600" />
                        </div>
                        <h4 className="font-medium text-gray-900">New Customers</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Customers with 1-2 purchases</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-gray-900">
                          {customers.filter(c => c.totalSpent < 10000).length}
                        </span>
                        <span className="text-sm text-gray-500">customers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingCampaigns;