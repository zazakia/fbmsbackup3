import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen, Filter } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import AccountForm from './AccountForm';

const ChartOfAccounts: React.FC = () => {
  const { accounts, deleteAccount } = useBusinessStore();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch =
      account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || account.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleEdit = (accountId: string) => {
    setEditingAccount(accountId);
    setShowForm(true);
  };

  const handleDelete = (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      deleteAccount(accountId);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your business accounts for Philippine-compliant bookkeeping</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="Asset">Asset</option>
            <option value="Liability">Liability</option>
            <option value="Equity">Equity</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No accounts found. Add your first account!
                </td>
              </tr>
            ) : (
              filteredAccounts.map(account => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-700">{account.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{account.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{account.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{account.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(account.id)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        aria-label="Edit account"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        aria-label="Delete account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <AccountForm
          accountId={editingAccount}
          onClose={() => {
            setShowForm(false);
            setEditingAccount(null);
          }}
        />
      )}
    </div>
  );
};

export default ChartOfAccounts; 