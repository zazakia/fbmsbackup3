import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Star,
  Gift,
  Award,
  Target,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
  Eye,
  Trash2,
  Crown,
  Zap,
  Sparkles,
  Heart,
  ShoppingBag,
  Coffee,
  Smartphone
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Customer } from '../../types/business';

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  type: 'points' | 'tiers' | 'cashback' | 'visits';
  status: 'active' | 'inactive' | 'draft';
  settings: LoyaltySettings;
  rewards: LoyaltyReward[];
  statistics: LoyaltyStats;
  createdAt: Date;
  updatedAt: Date;
}

interface LoyaltySettings {
  pointsPerPeso?: number;
  pointsPerVisit?: number;
  cashbackPercentage?: number;
  minPurchaseAmount?: number;
  pointExpiryDays?: number;
  tiers?: LoyaltyTier[];
}

interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  benefits: string[];
  multiplier: number;
  color: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'product' | 'service' | 'cashback';
  cost: number; // in points
  value: number; // monetary value or percentage
  category: string;
  isActive: boolean;
  stockLimit?: number;
  validUntil?: Date;
}

interface LoyaltyStats {
  totalMembers: number;
  activeMembers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  rewardsRedeemed: number;
  revenue: number;
  averagePointsPerMember: number;
  topRewards: Array<{ rewardId: string; redemptions: number }>;
}

interface CustomerLoyalty {
  customerId: string;
  programId: string;
  points: number;
  tier?: string;
  joinDate: Date;
  lastActivity: Date;
  totalSpent: number;
  visits: number;
  rewardsRedeemed: number;
}

const LoyaltyPrograms: React.FC = () => {
  const { customers } = useBusinessStore();
  const { addToast } = useToastStore();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProgram, setSelectedProgram] = useState<LoyaltyProgram | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerLoyalty, setCustomerLoyalty] = useState<CustomerLoyalty[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    generateSamplePrograms();
    generateCustomerLoyaltyData();
  }, [customers]);

  const generateSamplePrograms = () => {
    const samplePrograms: LoyaltyProgram[] = [
      {
        id: '1',
        name: 'VIP Rewards Club',
        description: 'Earn points on every purchase and unlock exclusive rewards',
        type: 'points',
        status: 'active',
        settings: {
          pointsPerPeso: 1,
          minPurchaseAmount: 100,
          pointExpiryDays: 365,
          tiers: [
            {
              id: 'bronze',
              name: 'Bronze',
              minPoints: 0,
              benefits: ['1x points', 'Birthday discount'],
              multiplier: 1,
              color: 'bg-amber-100 text-amber-800'
            },
            {
              id: 'silver',
              name: 'Silver',
              minPoints: 1000,
              benefits: ['1.5x points', 'Free shipping', 'Early access'],
              multiplier: 1.5,
              color: 'bg-gray-100 text-gray-800'
            },
            {
              id: 'gold',
              name: 'Gold',
              minPoints: 5000,
              benefits: ['2x points', 'VIP support', 'Exclusive events'],
              multiplier: 2,
              color: 'bg-yellow-100 text-yellow-800'
            }
          ]
        },
        rewards: [
          {
            id: 'r1',
            name: '10% Off Next Purchase',
            description: 'Get 10% discount on your next order',
            type: 'discount',
            cost: 500,
            value: 10,
            category: 'Discount',
            isActive: true
          },
          {
            id: 'r2',
            name: 'Free Coffee',
            description: 'Complimentary coffee of your choice',
            type: 'product',
            cost: 200,
            value: 150,
            category: 'Beverage',
            isActive: true,
            stockLimit: 50
          },
          {
            id: 'r3',
            name: '₱100 Cashback',
            description: 'Direct cashback to your account',
            type: 'cashback',
            cost: 1000,
            value: 100,
            category: 'Cashback',
            isActive: true
          }
        ],
        statistics: {
          totalMembers: 450,
          activeMembers: 280,
          pointsIssued: 125000,
          pointsRedeemed: 45000,
          rewardsRedeemed: 180,
          revenue: 850000,
          averagePointsPerMember: 278,
          topRewards: [
            { rewardId: 'r1', redemptions: 85 },
            { rewardId: 'r2', redemptions: 60 },
            { rewardId: 'r3', redemptions: 35 }
          ]
        },
        createdAt: new Date(2024, 8, 1),
        updatedAt: new Date(2024, 11, 5)
      },
      {
        id: '2',
        name: 'Cashback Rewards',
        description: 'Get cashback on every purchase, no points to track',
        type: 'cashback',
        status: 'active',
        settings: {
          cashbackPercentage: 2,
          minPurchaseAmount: 500
        },
        rewards: [
          {
            id: 'c1',
            name: 'Instant Cashback',
            description: '2% cashback on all purchases',
            type: 'cashback',
            cost: 0,
            value: 2,
            category: 'Automatic',
            isActive: true
          }
        ],
        statistics: {
          totalMembers: 320,
          activeMembers: 250,
          pointsIssued: 0,
          pointsRedeemed: 0,
          rewardsRedeemed: 520,
          revenue: 650000,
          averagePointsPerMember: 0,
          topRewards: [
            { rewardId: 'c1', redemptions: 520 }
          ]
        },
        createdAt: new Date(2024, 9, 15),
        updatedAt: new Date(2024, 11, 3)
      },
      {
        id: '3',
        name: 'Visit Punch Card',
        description: 'Complete 10 visits to earn a free item',
        type: 'visits',
        status: 'active',
        settings: {
          pointsPerVisit: 1,
          minPurchaseAmount: 50
        },
        rewards: [
          {
            id: 'v1',
            name: 'Free Item (up to ₱500)',
            description: 'Choose any item worth up to ₱500',
            type: 'product',
            cost: 10,
            value: 500,
            category: 'Free Item',
            isActive: true
          }
        ],
        statistics: {
          totalMembers: 180,
          activeMembers: 120,
          pointsIssued: 1200,
          pointsRedeemed: 450,
          rewardsRedeemed: 45,
          revenue: 280000,
          averagePointsPerMember: 6.7,
          topRewards: [
            { rewardId: 'v1', redemptions: 45 }
          ]
        },
        createdAt: new Date(2024, 10, 1),
        updatedAt: new Date(2024, 11, 4)
      }
    ];

    setPrograms(samplePrograms);
  };

  const generateCustomerLoyaltyData = () => {
    const loyaltyData: CustomerLoyalty[] = customers.slice(0, 20).map((customer, index) => ({
      customerId: customer.id,
      programId: ['1', '2', '3'][index % 3],
      points: Math.floor(Math.random() * 2000) + 100,
      tier: index % 3 === 0 ? ['bronze', 'silver', 'gold'][Math.floor(Math.random() * 3)] : undefined,
      joinDate: new Date(2024, Math.floor(Math.random() * 6) + 6, Math.floor(Math.random() * 28) + 1),
      lastActivity: new Date(2024, 11, Math.floor(Math.random() * 30) + 1),
      totalSpent: customer.totalSpent,
      visits: Math.floor(Math.random() * 20) + 5,
      rewardsRedeemed: Math.floor(Math.random() * 5)
    }));

    setCustomerLoyalty(loyaltyData);
  };

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'bronze': return <Award className="h-4 w-4 text-amber-600" />;
      case 'silver': return <Star className="h-4 w-4 text-gray-600" />;
      case 'gold': return <Crown className="h-4 w-4 text-yellow-600" />;
      default: return <Gift className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'points': return <Star className="h-5 w-5" />;
      case 'cashback': return <DollarSign className="h-5 w-5" />;
      case 'visits': return <Coffee className="h-5 w-5" />;
      case 'tiers': return <Crown className="h-5 w-5" />;
      default: return <Gift className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'inactive': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const totalStats = programs.reduce((totals, program) => ({
    members: totals.members + program.statistics.totalMembers,
    revenue: totals.revenue + program.statistics.revenue,
    rewards: totals.rewards + program.statistics.rewardsRedeemed,
    points: totals.points + program.statistics.pointsIssued
  }), { members: 0, revenue: 0, rewards: 0, points: 0 });

  const filteredCustomers = customerLoyalty.filter(loyalty => {
    const customer = customers.find(c => c.id === loyalty.customerId);
    return customer ? `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) : false;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loyalty Programs</h1>
            <p className="text-gray-600">Manage customer loyalty and rewards programs</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Program</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Star },
                { id: 'programs', label: 'Programs', icon: Gift },
                { id: 'members', label: 'Members', icon: Users },
                { id: 'rewards', label: 'Rewards', icon: Award }
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
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100">Total Members</p>
                        <p className="text-2xl font-bold">{totalStats.members.toLocaleString()}</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-200" />
                    </div>
                    <div className="mt-2 text-sm text-purple-100">
                      Across {programs.length} programs
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">Loyalty Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalStats.revenue)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-200" />
                    </div>
                    <div className="mt-2 text-sm text-green-100">
                      From loyalty members
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">Rewards Redeemed</p>
                        <p className="text-2xl font-bold">{totalStats.rewards.toLocaleString()}</p>
                      </div>
                      <Gift className="h-8 w-8 text-blue-200" />
                    </div>
                    <div className="mt-2 text-sm text-blue-100">
                      This month
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100">Points Issued</p>
                        <p className="text-2xl font-bold">{totalStats.points.toLocaleString()}</p>
                      </div>
                      <Sparkles className="h-8 w-8 text-orange-200" />
                    </div>
                    <div className="mt-2 text-sm text-orange-100">
                      All time
                    </div>
                  </div>
                </div>

                {/* Program Performance */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Performance</h3>
                  <div className="space-y-4">
                    {programs.map((program) => (
                      <div key={program.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            {getTypeIcon(program.type)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{program.name}</h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(program.status)}`}>
                                {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{program.description}</p>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <span>{program.statistics.totalMembers} members</span>
                              <span>{program.statistics.rewardsRedeemed} rewards redeemed</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(program.statistics.revenue)}</p>
                          <p className="text-sm text-gray-600">Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Programs Tab */}
            {activeTab === 'programs' && (
              <div className="space-y-6">
                <div className="grid gap-6">
                  {programs.map((program) => (
                    <div key={program.id} className="bg-white border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            {getTypeIcon(program.type)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{program.name}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(program.status)}`}>
                                {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3">{program.description}</p>
                            
                            {/* Program Settings */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-gray-500">Members</p>
                                <p className="font-medium">{program.statistics.totalMembers}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Active Rate</p>
                                <p className="font-medium">
                                  {((program.statistics.activeMembers / program.statistics.totalMembers) * 100).toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Avg Points</p>
                                <p className="font-medium">{Math.round(program.statistics.averagePointsPerMember)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Revenue</p>
                                <p className="font-medium">{formatCurrency(program.statistics.revenue)}</p>
                              </div>
                            </div>

                            {/* Tiers */}
                            {program.settings.tiers && (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Tiers</p>
                                <div className="flex space-x-2">
                                  {program.settings.tiers.map((tier) => (
                                    <span
                                      key={tier.id}
                                      className={`px-2 py-1 text-xs font-medium rounded-full ${tier.color}`}
                                    >
                                      {tier.name} ({tier.minPoints}+ pts)
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-600">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Top Rewards */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Popular Rewards</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {program.rewards.slice(0, 3).map((reward) => (
                            <div key={reward.id} className="border border-gray-200 rounded p-3">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium text-sm">{reward.name}</p>
                                <span className="text-xs text-gray-500">{reward.cost} pts</span>
                              </div>
                              <p className="text-xs text-gray-600">{reward.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* Search */}
                <div className="flex space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Members List */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Program
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points/Tier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lifetime Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCustomers.slice(0, 10).map((loyalty) => {
                        const customer = customers.find(c => c.id === loyalty.customerId);
                        const program = programs.find(p => p.id === loyalty.programId);
                        
                        if (!customer || !program) return null;

                        return (
                          <tr key={loyalty.customerId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {customer.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                  <div className="text-sm text-gray-500">{customer.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {getTypeIcon(program.type)}
                                <span className="text-sm text-gray-900">{program.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {loyalty.tier && getTierIcon(loyalty.tier)}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {loyalty.points} points
                                  </div>
                                  {loyalty.tier && (
                                    <div className="text-xs text-gray-500 capitalize">{loyalty.tier} tier</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>
                                <div>{loyalty.visits} visits</div>
                                <div>{formatDate(loyalty.lastActivity)}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(loyalty.totalSpent)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rewards Tab */}
            {activeTab === 'rewards' && (
              <div className="space-y-6">
                <div className="grid gap-6">
                  {programs.map((program) => (
                    <div key={program.id} className="bg-white border rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          {getTypeIcon(program.type)}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{program.name}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {program.rewards.map((reward) => (
                          <div key={reward.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <Gift className="h-5 w-5 text-blue-600" />
                                <h4 className="font-medium text-gray-900">{reward.name}</h4>
                              </div>
                              <span className="text-sm font-medium text-blue-600">{reward.cost} pts</span>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Value: {formatCurrency(reward.value)}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                reward.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {reward.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            
                            {reward.stockLimit && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Stock</span>
                                  <span>{reward.stockLimit} remaining</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                  <div 
                                    className="bg-blue-600 h-1 rounded-full" 
                                    style={{ width: `${(reward.stockLimit / 100) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPrograms;