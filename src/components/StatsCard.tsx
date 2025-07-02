import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'blue' | 'purple' | 'indigo' | 'red' | 'orange';
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color 
}) => {
  const colorClasses = {
    green: 'bg-green-500 text-green-600 bg-green-50',
    blue: 'bg-blue-500 text-blue-600 bg-blue-50',
    purple: 'bg-purple-500 text-purple-600 bg-purple-50',
    indigo: 'bg-indigo-500 text-indigo-600 bg-indigo-50',
    red: 'bg-red-500 text-red-600 bg-red-50',
    orange: 'bg-orange-500 text-orange-600 bg-orange-50'
  };

  const [, textColor, lightBg] = colorClasses[color].split(' ');

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className="flex items-center mt-2">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {change}
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last month</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${lightBg}`}>
          <Icon className={`h-6 w-6 ${textColor}`} />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;