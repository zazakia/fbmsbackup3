import React from 'react';
import { Users, TrendingUp, DollarSign, Award, Building2, UserCheck, UserX, Star } from 'lucide-react';

interface CustomerStatsProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    byType: {
      individual: number;
      business: number;
      vip: number;
      wholesale: number;
    };
    totalPurchases: number;
    totalBalance: number;
    averageLoyaltyPoints: number;
  };
}

const CustomerStats: React.FC<CustomerStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Customers',
      value: stats.total.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Active Customers',
      value: stats.active.toLocaleString(),
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      subtitle: `${stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% of total`
    },
    {
      title: 'Total Purchases',
      value: `₱${stats.totalPurchases.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      subtitle: stats.active > 0 ? `₱${(stats.totalPurchases / stats.active).toLocaleString()} avg` : ''
    },
    {
      title: 'Outstanding Balance',
      value: `₱${stats.totalBalance.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  const typeStats = [
    {
      type: 'Individual',
      count: stats.byType.individual,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      type: 'Business',
      count: stats.byType.business,
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      type: 'VIP',
      count: stats.byType.vip,
      icon: Star,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      type: 'Wholesale',
      count: stats.byType.wholesale,
      icon: Award,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg border ${stat.borderColor} p-6 ${stat.bgColor}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
              {stat.subtitle && (
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Customer Type Breakdown & Loyalty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Types */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Customer Types
          </h3>
          <div className="space-y-3">
            {typeStats.map((type, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${type.bgColor}`}>
                    <type.icon className={`h-4 w-4 ${type.color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{type.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-gray-900">{type.count}</span>
                  <span className="text-xs text-gray-500">
                    ({stats.total > 0 ? ((type.count / stats.total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loyalty & Engagement */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Loyalty & Engagement
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Loyalty Points</span>
              <span className="text-lg font-bold text-purple-600">
                {stats.averageLoyaltyPoints.toFixed(0)}
              </span>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Customer Retention</span>
                <span className="text-sm font-medium text-green-600">
                  {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                  <div className="text-xs text-gray-500">Inactive</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerStats;