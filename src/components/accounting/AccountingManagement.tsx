import React, { useState } from 'react';
import { BookOpen, FileText, BarChart3, Calculator, TrendingUp, DollarSign } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import ChartOfAccounts from './ChartOfAccounts';
import JournalEntries from './JournalEntries';

const AccountingManagement: React.FC = () => {
  const { accounts, journalEntries } = useBusinessStore();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen },
    { id: 'journal-entries', label: 'Journal Entries', icon: FileText }
  ];

  // Calculate accounting statistics
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(acc => acc.isActive).length;
  const totalEntries = journalEntries.length;
  const thisMonthEntries = journalEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    const now = new Date();
    return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
  }).length;

  const totalDebits = journalEntries.reduce((sum, entry) => 
    sum + entry.lines.reduce((lineSum, line) => lineSum + (line.debit || 0), 0), 0
  );
  const totalCredits = journalEntries.reduce((sum, entry) => 
    sum + entry.lines.reduce((lineSum, line) => lineSum + (line.credit || 0), 0), 0
  );

  const accountTypes = {
    Asset: accounts.filter(acc => acc.type === 'Asset').length,
    Liability: accounts.filter(acc => acc.type === 'Liability').length,
    Equity: accounts.filter(acc => acc.type === 'Equity').length,
    Income: accounts.filter(acc => acc.type === 'Income').length,
    Expense: accounts.filter(acc => acc.type === 'Expense').length
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{totalAccounts}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              {activeAccounts} active
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Journal Entries</p>
              <p className="text-2xl font-bold text-gray-900">{totalEntries}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-blue-600">
              {thisMonthEntries} this month
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Debits</p>
              <p className="text-2xl font-bold text-gray-900">₱{totalDebits.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-600">
              Balanced: {Math.abs(totalDebits - totalCredits) < 0.01 ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Calculator className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Credits</p>
              <p className="text-2xl font-bold text-gray-900">₱{totalCredits.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600">
              Difference: ₱{Math.abs(totalDebits - totalCredits).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Account Types Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Types Distribution</h3>
          <div className="space-y-4">
            {Object.entries(accountTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{type}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(count / totalAccounts) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => setActiveTab('chart-of-accounts')}
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Manage Chart of Accounts</span>
              </div>
              <span className="text-sm text-gray-500">→</span>
            </button>
            
            <button
              onClick={() => setActiveTab('journal-entries')}
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Create Journal Entry</span>
              </div>
              <span className="text-sm text-gray-500">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Journal Entries</h3>
        {journalEntries.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">No journal entries yet. Create your first entry to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {journalEntries
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map(entry => (
                <div key={entry.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="font-medium text-gray-900">{entry.description}</div>
                    <div className="text-sm text-gray-500">
                      {entry.reference} • {new Date(entry.date).toLocaleDateString('en-PH')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-gray-900">
                      ₱{entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.lines.length} lines
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'chart-of-accounts':
        return <ChartOfAccounts />;
      case 'journal-entries':
        return <JournalEntries />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting Management</h1>
        <p className="text-gray-600 mt-1">Complete financial management for Philippine small businesses</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
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

      {/* Content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default AccountingManagement; 