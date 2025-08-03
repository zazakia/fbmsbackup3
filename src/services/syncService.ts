import { OfflineTransaction, useOfflineStore } from '../store/offlineStore';
import { createSale } from '../api/sales';
import { updateCustomer } from '../api/customers';
import { Sale, Customer } from '../types/business';

export interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
}

class SyncService {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  async syncTransaction(transaction: OfflineTransaction): Promise<SyncResult> {
    try {
      switch (transaction.type) {
        case 'sale':
          return await this.syncSale(transaction.data);
        case 'customer_update':
          return await this.syncCustomerUpdate(transaction.data);
        case 'inventory_update':
          return await this.syncInventoryUpdate(transaction.data);
        default:
          throw new Error(`Unknown transaction type: ${transaction.type}`);
      }
    } catch (error) {
      console.error('Sync transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async syncSale(saleData: any): Promise<SyncResult> {
    try {
      // Validate sale data
      if (!saleData || !saleData.items || saleData.items.length === 0) {
        throw new Error('Invalid sale data: missing items');
      }

      // Check if sale already exists (prevent duplicates)
      if (saleData.offlineId) {
        // You might want to check if this offline sale was already synced
        // This would require additional API endpoint or local tracking
      }

      // Create the sale using the existing API
      const { data, error } = await createSale(saleData);
      
      if (error) {
        throw new Error(error);
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync sale',
      };
    }
  }

  private async syncCustomerUpdate(customerData: any): Promise<SyncResult> {
    try {
      if (!customerData.id) {
        throw new Error('Invalid customer data: missing ID');
      }

      const { data, error } = await updateCustomer(customerData.id, customerData.updates);
      
      if (error) {
        throw new Error(error);
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync customer update',
      };
    }
  }

  private async syncInventoryUpdate(inventoryData: any): Promise<SyncResult> {
    try {
      // This would sync inventory updates
      // Implementation depends on your inventory API
      console.log('Syncing inventory update:', inventoryData);
      
      // For now, just return success
      return {
        success: true,
        data: inventoryData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync inventory update',
      };
    }
  }

  async syncAllPendingTransactions(transactions: OfflineTransaction[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const transaction of transactions) {
      try {
        const result = await this.syncTransaction(transaction);
        if (result.success) {
          successful++;
        } else {
          failed++;
          if (result.error) {
            errors.push(`Transaction ${transaction.id}: ${result.error}`);
          }
        }
      } catch (error) {
        failed++;
        errors.push(`Transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Add small delay between syncs to avoid overwhelming the server
      await this.delay(100);
    }

    return { successful, failed, errors };
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test connection by trying to fetch a simple endpoint
      // In a real app, you might have a dedicated health check endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(window.location.origin, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const syncService = new SyncService();