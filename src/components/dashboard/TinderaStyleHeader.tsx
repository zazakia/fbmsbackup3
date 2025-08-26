import React from 'react';
import { User, Eye } from 'lucide-react';

interface TinderaStyleHeaderProps {
  userName?: string;
  balance?: string;
  businessName?: string;
}

const TinderaStyleHeader: React.FC<TinderaStyleHeaderProps> = ({
  userName = "Business Owner",
  balance = "₱156,789.00",
  businessName = "FBMS Business"
}) => {
  return (
    <div className="space-y-4">
      {/* Header with Branding */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-purple-600">{businessName}</span>
              <div className="w-8 h-5 bg-gradient-to-b from-blue-500 via-white to-red-500 rounded-sm ml-2 inline-block"></div>
            </div>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors">
            <User className="w-4 h-4" />
            Account
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🏢</div>
            <span className="text-lg font-medium">{userName}</span>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Your Balance</span>
            </div>
            <div className="text-2xl font-bold">{balance}</div>
            <div className="text-xs opacity-75">Powered by FBMS</div>
          </div>
        </div>
        
        {/* Quick Action Button */}
        <button className="w-full bg-white text-purple-600 hover:bg-gray-100 rounded-lg py-3 font-semibold transition-colors">
          🇵🇭 Activate Business Features
        </button>
      </div>
    </div>
  );
};

export default TinderaStyleHeader;