import React from 'react';
import { supabase } from './supabase';

export interface DatabaseLoadResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  success: boolean;
  retryCount: number;
}

export class DatabaseLoader {
  private static readonly DEFAULT_TIMEOUT = 8000; // 8 seconds
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  static async loadWithTimeout<T>(
    queryFn: () => Promise<{ data: T; error: any }>,
    timeout: number = DatabaseLoader.DEFAULT_TIMEOUT
  ): Promise<DatabaseLoadResult<T>> {
    let retryCount = 0;
    let lastError: string | null = null;

    while (retryCount < DatabaseLoader.MAX_RETRIES) {
      try {
        console.log(`🔄 Database query attempt ${retryCount + 1}/${DatabaseLoader.MAX_RETRIES}`);
        
        const result = await Promise.race([
          queryFn(),
          new Promise<{ data: null; error: { message: string } }>((_, reject) =>
            setTimeout(() => reject(new Error(`Query timed out after ${timeout}ms`)), timeout)
          ),
        ]);

        if (result.error) {
          throw new Error(result.error.message || 'Database query failed');
        }

        console.log('✅ Database query successful');
        return {
          data: result.data,
          error: null,
          loading: false,
          success: true,
          retryCount,
        };
      } catch (error: any) {
        retryCount++;
        lastError = error.message || 'Unknown database error';
        
        console.warn(`⚠️ Database query failed (attempt ${retryCount}):`, lastError);

        if (retryCount < DatabaseLoader.MAX_RETRIES) {
          console.log(`⏳ Retrying in ${DatabaseLoader.RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, DatabaseLoader.RETRY_DELAY));
        }
      }
    }

    console.error('❌ All database query attempts failed');
    return {
      data: null,
      error: lastError || 'Database connection failed after multiple attempts',
      loading: false,
      success: false,
      retryCount: retryCount - 1,
    };
  }

  static async loadProducts() {
    return DatabaseLoader.loadWithTimeout(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, cost, stock, min_stock, category, sku, unit, is_active')
        .eq('is_active', true)
        .order('name');
      
      return { data, error };
    });
  }

  static async loadCategories() {
    return DatabaseLoader.loadWithTimeout(async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('name');
      
      return { data, error };
    });
  }

  static async loadCustomers() {
    return DatabaseLoader.loadWithTimeout(async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone, is_active')
        .eq('is_active', true)
        .order('first_name', { ascending: true });
      
      return { data, error };
    });
  }

  static async loadSales() {
    return DatabaseLoader.loadWithTimeout(async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id, 
          total, 
          created_at,
          customer_name,
          payment_method,
          status
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      return { data, error };
    });
  }

  static async testConnection(): Promise<DatabaseLoadResult<boolean>> {
    console.log('🔍 Testing database connection...');
    
    return DatabaseLoader.loadWithTimeout(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('count')
        .limit(1);
      
      return { data: !error, error };
    }, 5000); // Shorter timeout for connection test
  }
}

// Hook for React components
export function useDatabaseLoader() {
  const [connectionStatus, setConnectionStatus] = React.useState<'unknown' | 'connecting' | 'connected' | 'failed'>('unknown');

  React.useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      if (!mounted) return;
      
      setConnectionStatus('connecting');
      const result = await DatabaseLoader.testConnection();
      
      if (!mounted) return;
      
      setConnectionStatus(result.success ? 'connected' : 'failed');
    };

    checkConnection();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    connectionStatus,
    loadProducts: DatabaseLoader.loadProducts,
    loadCategories: DatabaseLoader.loadCategories,
    loadCustomers: DatabaseLoader.loadCustomers,
    loadSales: DatabaseLoader.loadSales,
    testConnection: DatabaseLoader.testConnection,
  };
}

// Export for direct usage
export { DatabaseLoader as default };
