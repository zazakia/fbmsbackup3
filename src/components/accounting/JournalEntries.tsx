import React, { useState } from 'react';
import { Plus, Search, Filter, Calendar, FileText, Eye, Edit, Trash2, Download } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import JournalEntryForm from './JournalEntryForm';

const JournalEntries: React.FC = () => {
  const { journalEntries, accounts, deleteJournalEntry } = useBusinessStore();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');

  const filteredEntries = journalEntries.filter(entry => {
    const matchesSearch =
      entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateFilter || 
      new Date(entry.date).toISOString().split('T')[0] === dateFilter;
    
    const matchesAccount = !accountFilter || 
      entry.lines.some(line => line.accountId === accountFilter);
    
    return matchesSearch && matchesDate && matchesAccount;
  });

  const handleEdit = (entryId: string) => {
    setEditingEntry(entryId);
    setShowForm(true);
  };

  const handleDelete = (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
      deleteJournalEntry(entryId);
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.code} - ${account.name}` : 'Unknown Account';
  };

  const getAccountType = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.type || 'Unknown';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Reference', 'Description', 'Account', 'Debit', 'Credit', 'Memo'];
    const csvContent = [
      headers.join(','),
      ...filteredEntries.flatMap(entry =>
        entry.lines.map(line => [
          formatDate(entry.date),
          entry.reference,
          entry.description,
          getAccountName(line.accountId),
          line.debit || 0,
          line.credit || 0,
          entry.memo || ''
        ].join(','))
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-entries-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-gray-600 mt-1">Manage your double-entry bookkeeping transactions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Accounts</option>
            {accounts
              .filter(account => account.isActive)
              .sort((a, b) => a.code.localeCompare(b.code))
              .map(account => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
          </select>
        </div>
        
        <div className="text-sm text-gray-600 flex items-center">
          {filteredEntries.length} of {journalEntries.length} entries
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries found</h3>
            <p className="text-gray-600 mb-4">Create your first journal entry to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Entry
            </button>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Entry Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-mono text-blue-700">{entry.reference}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedEntry(selectedEntry === entry.id ? null : entry.id)}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(entry.id)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Entry"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="font-medium text-gray-900">{entry.description}</h3>
                  {entry.memo && (
                    <p className="text-sm text-gray-600 mt-1">{entry.memo}</p>
                  )}
                </div>
              </div>

              {/* Entry Lines */}
              {selectedEntry === entry.id && (
                <div className="px-6 py-4">
                  <div className="space-y-3">
                    {entry.lines.map((line, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {getAccountName(line.accountId)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getAccountType(line.accountId)} • {line.description || 'No description'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          {line.debit > 0 && (
                            <div className="text-right">
                              <div className="font-mono text-green-600">
                                ₱{line.debit.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">Debit</div>
                            </div>
                          )}
                          {line.credit > 0 && (
                            <div className="text-right">
                              <div className="font-mono text-red-600">
                                ₱{line.credit.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">Credit</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Entry Totals */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Debits:</span>
                      <span className="font-mono text-green-600">
                        ₱{entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-medium text-gray-700">Total Credits:</span>
                      <span className="font-mono text-red-600">
                        ₱{entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Journal Entry Form Modal */}
      {showForm && (
        <JournalEntryForm
          entryId={editingEntry}
          onClose={() => {
            setShowForm(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
};

export default JournalEntries; 