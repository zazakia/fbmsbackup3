import React, { useState, useEffect } from 'react';
import {
  History,
  User,
  Calendar,
  Filter,
  Search,
  Eye,
  RefreshCw,
  Download,
  Clock,
  Edit,
  Trash2,
  Plus,
  DollarSign,
  Package,
  Users
} from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { supabase } from '../../utils/supabase';

interface HistoryRecord {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data?: any;
  new_data?: any;
  changed_fields?: string[];
  user_id?: string;
  user_email?: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

interface HistoryFilter {
  table: string;
  operation: string;
  dateRange: string;
  userId: string;
}

const DataHistoryTracking: React.FC = () => {
  const { addToast } = useToastStore();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState<HistoryFilter>({
    table: 'all',
    operation: 'all',
    dateRange: '7',
    userId: 'all'
  });

  const tableOptions = [
    { value: 'all', label: 'All Tables' },
    { value: 'customers', label: 'Customers' },
    { value: 'suppliers', label: 'Suppliers' },
    { value: 'sales', label: 'Sales' },
    { value: 'purchases', label: 'Purchases' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'users', label: 'Users' }
  ];

  const operationOptions = [
    { value: 'all', label: 'All Operations' },
    { value: 'INSERT', label: 'Created' },
    { value: 'UPDATE', label: 'Updated' },
    { value: 'DELETE', label: 'Deleted' }
  ];

  const dateRangeOptions = [
    { value: '1', label: 'Last 24 Hours' },
    { value: '7', label: 'Last 7 Days' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  const operationColors = {
    INSERT: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800'
  };

  const operationIcons = {
    INSERT: Plus,
    UPDATE: Edit,
    DELETE: Trash2
  };

  const tableIcons = {
    customers: Users,
    suppliers: Package,
    sales: DollarSign,
    purchases: Package,
    inventory: Package,
    users: User
  };

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.table !== 'all') {
        query = query.eq('table_name', filters.table);
      }

      if (filters.operation !== 'all') {
        query = query.eq('operation', filters.operation);
      }

      if (filters.userId !== 'all') {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.dateRange !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(filters.dateRange));
        query = query.gte('created_at', daysAgo.toISOString());
      }

      const { data, error } = await query.limit(1000);

      if (error) {
        console.error('Error loading history:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load history data'
        });
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('Error in loadHistory:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load history data'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportHistory = () => {
    const csvContent = [
      ['Timestamp', 'Table', 'Action', 'Record ID', 'User', 'Changes'].join(','),
      ...filteredHistory.map(record => [
        new Date(record.created_at).toLocaleString(),
        record.table_name,
        record.operation,
        record.id,
        record.user_email || 'Unknown',
        record.changed_fields?.join('; ') || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Export Complete',
      message: 'Audit log exported successfully'
    });
  };

  const viewDetails = (record: HistoryRecord) => {
    setSelectedRecord(record);
    setShowDetails(true);
  };

  const filteredHistory = history.filter(record => {
    const matchesSearch = 
      record.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.operation.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatFieldChange = (field: string, oldValue: any, newValue: any) => {
    return (
      <div key={field} className="mb-2">
        <span className="font-medium text-gray-700">{field}:</span>
        <div className="ml-4">
          {oldValue !== undefined && (
            <div className="text-red-600">
              <span className="text-xs">Old:</span> {JSON.stringify(oldValue)}
            </div>
          )}
          {newValue !== undefined && (
            <div className="text-green-600">
              <span className="text-xs">New:</span> {JSON.stringify(newValue)}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data History & Audit Log</h2>
          <p className="text-gray-600 dark:text-gray-400">Track all changes to customer and transaction data</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportHistory}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={loadHistory}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <History className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{history.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Plus className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {history.filter(h => h.operation === 'INSERT').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Edit className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Updated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {history.filter(h => h.operation === 'UPDATE').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Trash2 className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deleted</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {history.filter(h => h.operation === 'DELETE').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Table
            </label>
            <select
              value={filters.table}
              onChange={(e) => setFilters({...filters, table: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {tableOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Operation
            </label>
            <select
              value={filters.operation}
              onChange={(e) => setFilters({...filters, operation: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {operationOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Record ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Changes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredHistory.map((record) => {
                const OperationIcon = operationIcons[record.operation];
                const TableIcon = tableIcons[record.table_name] || Package;
                
                return (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(record.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(record.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TableIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white capitalize">
                          {record.table_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${operationColors[record.operation]}`}>
                        <OperationIcon className="h-3 w-3 mr-1" />
                        {record.operation.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {record.id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {record.user_email || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {record.changed_fields?.length || 0} field(s)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewDetails(record)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Change Details
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Eye className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Table:</span> {selectedRecord.table_name}</div>
                  <div><span className="font-medium">Operation:</span> {selectedRecord.operation}</div>
                  <div><span className="font-medium">Record ID:</span> {selectedRecord.id}</div>
                  <div><span className="font-medium">User:</span> {selectedRecord.user_email || 'Unknown'}</div>
                  <div><span className="font-medium">Timestamp:</span> {new Date(selectedRecord.created_at).toLocaleString()}</div>
                  {selectedRecord.ip_address && (
                    <div><span className="font-medium">IP Address:</span> {selectedRecord.ip_address}</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Changes</h4>
                <div className="text-sm max-h-96 overflow-y-auto">
                  {selectedRecord.operation === 'INSERT' && selectedRecord.new_data && (
                    <div>
                      <span className="font-medium text-green-600">New Record:</span>
                      <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedRecord.new_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {selectedRecord.operation === 'UPDATE' && selectedRecord.changed_fields && (
                    <div>
                      {selectedRecord.changed_fields.map((field) => {
                        const oldValue = selectedRecord.old_data?.[field];
                        const newValue = selectedRecord.new_data?.[field];
                        return formatFieldChange(field, oldValue, newValue);
                      })}
                    </div>
                  )}
                  
                  {selectedRecord.operation === 'DELETE' && selectedRecord.old_data && (
                    <div>
                      <span className="font-medium text-red-600">Deleted Record:</span>
                      <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedRecord.old_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataHistoryTracking;