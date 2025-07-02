import React, { useEffect, useState } from 'react';
import { Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface DatabaseStatusProps {
  className?: string;
}

const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [details, setDetails] = useState<string>('');
  const [tableCount, setTableCount] = useState<number>(0);

  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  const checkDatabaseConnection = async () => {
    try {
      setStatus('checking');
      setDetails('Checking connection...');

      // Test basic connection
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('count', { count: 'exact' });

      if (customerError) {
        throw new Error(`Customers table: ${customerError.message}`);
      }

      // Test other key tables
      const tables = ['products', 'sales', 'accounts', 'employees'];
      let successCount = 1; // customers already tested

      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('count', { count: 'exact' })
            .limit(1);
          
          if (!error) {
            successCount++;
          }
        } catch (err) {
          console.warn(`Table ${table} check failed:`, err);
        }
      }

      setTableCount(successCount);
      setStatus('connected');
      setDetails(`Connected successfully! ${successCount}/5 core tables accessible`);

    } catch (error) {
      console.error('Database connection error:', error);
      setStatus('error');
      setDetails(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'border-blue-200 bg-blue-50';
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${getStatusColor()} ${className}`}>
      <Database className="h-5 w-5 text-gray-600" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-900">
            Database Status
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1 truncate">
          {details}
        </p>
      </div>
      {status === 'connected' && (
        <div className="text-xs text-green-600 font-medium">
          {tableCount}/5 Tables
        </div>
      )}
    </div>
  );
};

export default DatabaseStatus;