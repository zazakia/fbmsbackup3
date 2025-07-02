import React from 'react';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

const RecentTransactions: React.FC = () => {
  const transactions = [
    { id: 'TXN-001', type: 'sale', customer: 'Maria Santos', amount: 1250, time: '2 hours ago', status: 'completed' },
    { id: 'TXN-002', type: 'expense', vendor: 'Meralco', amount: -3200, time: '5 hours ago', status: 'completed' },
    { id: 'TXN-003', type: 'sale', customer: 'Jose Cruz', amount: 890, time: '1 day ago', status: 'completed' },
    { id: 'TXN-004', type: 'purchase', vendor: 'ABC Supplier', amount: -5600, time: '1 day ago', status: 'pending' },
    { id: 'TXN-005', type: 'sale', customer: 'Ana Reyes', amount: 2100, time: '2 days ago', status: 'completed' }
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                transaction.type === 'sale' ? 'bg-green-100' : 
                transaction.type === 'expense' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {transaction.type === 'sale' ? (
                  <ArrowUpRight className={`h-4 w-4 ${
                    transaction.type === 'sale' ? 'text-green-600' : 'text-blue-600'
                  }`} />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {transaction.customer || transaction.vendor}
                </p>
                <p className="text-sm text-gray-500">
                  {transaction.id} • {transaction.time}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className={`font-semibold ${
                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₱{Math.abs(transaction.amount).toLocaleString()}
              </p>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  transaction.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {transaction.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                  {transaction.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTransactions;