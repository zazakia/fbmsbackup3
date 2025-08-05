import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Product, Sale, PurchaseOrder, StockMovement, Customer } from '../../types/business';

// Mock Supabase Client
export class MockSupabaseClient {
  private mockData: Map<string, any[]> = new Map();
  private mockError: Error | null = null;
  private mockDelay: number = 0;

  constructor() {
    this.initializeMockTables();
  }

  private initializeMockTables() {
    this.mockData.set('products', []);
    this.mockData.set('categories', []);
    this.mockData.set('customers', []);
    this.mockData.set('sales', []);
    this.mockData.set('purchase_orders', []);
    this.mockData.set('stock_movements', []);
    this.mockData.set('inventory_locations', []);
    this.mockData.set('stock_transfers', []);
    this.mockData.set('stock_alerts', []);
  }

  // Mock database operations
  from(table: string) {
    return {
      select: (columns?: string) => {
        const createChainableQuery = (params: any = {}) => ({
          eq: (column: string, value: any) => createChainableQuery({ ...params, eq: { column, value } }),
          neq: (column: string, value: any) => createChainableQuery({ ...params, neq: { column, value } }),
          gt: (column: string, value: any) => createChainableQuery({ ...params, gt: { column, value } }),
          lt: (column: string, value: any) => createChainableQuery({ ...params, lt: { column, value } }),
          gte: (column: string, value: any) => createChainableQuery({ ...params, gte: { column, value } }),
          lte: (column: string, value: any) => createChainableQuery({ ...params, lte: { column, value } }),
          like: (column: string, pattern: string) => createChainableQuery({ ...params, like: { column, pattern } }),
          ilike: (column: string, pattern: string) => createChainableQuery({ ...params, ilike: { column, pattern } }),
          in: (column: string, values: any[]) => createChainableQuery({ ...params, in: { column, values } }),
          order: (column: string, options?: { ascending?: boolean }) => createChainableQuery({ ...params, order: { column, options } }),
          limit: (count: number) => createChainableQuery({ ...params, limit: count }),
          range: (from: number, to: number) => createChainableQuery({ ...params, range: { from, to } }),
          single: () => this.mockQuery(table, 'select', { ...params, single: true }),
          maybeSingle: () => this.mockQuery(table, 'select', { ...params, maybeSingle: true }),
          then: (resolve: any) => this.mockQuery(table, 'select', params).then(resolve)
        });
        return createChainableQuery();
      },
      insert: (data: any) => ({
        select: () => ({
          single: () => this.mockQuery(table, 'insert', { data, single: true })
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => this.mockQuery(table, 'update', { data, eq: { column, value }, select: true })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => this.mockQuery(table, 'delete', { eq: { column, value } })
      }),
      upsert: (data: any) => ({
        select: () => this.mockQuery(table, 'upsert', { data, select: true })
      })
    };
  }

  // Mock authentication
  auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' }, session: {} },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })
  };

  // Mock real-time subscriptions
  channel(name: string) {
    return {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
    };
  }

  private async mockQuery(table: string, operation: string, params: any = {}): Promise<{ data: any; error: any }> {
    if (this.mockDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.mockDelay));
    }

    if (this.mockError) {
      const error = this.mockError;
      this.mockError = null; // Reset error after throwing
      return { data: null, error };
    }

    const tableData = this.mockData.get(table) || [];

    switch (operation) {
      case 'select':
        return this.handleSelect(tableData, params);
      case 'insert':
        return this.handleInsert(table, tableData, params);
      case 'update':
        return this.handleUpdate(table, tableData, params);
      case 'delete':
        return this.handleDelete(table, tableData, params);
      case 'upsert':
        return this.handleUpsert(table, tableData, params);
      default:
        return { data: null, error: new Error(`Unknown operation: ${operation}`) };
    }
  }

  private handleSelect(tableData: any[], params: any): { data: any; error: any } {
    let filteredData = [...tableData];

    // Apply filters
    if (params.eq) {
      filteredData = filteredData.filter(item => item[params.eq.column] === params.eq.value);
    }
    if (params.neq) {
      filteredData = filteredData.filter(item => item[params.neq.column] !== params.neq.value);
    }
    if (params.gt) {
      filteredData = filteredData.filter(item => item[params.gt.column] > params.gt.value);
    }
    if (params.lt) {
      filteredData = filteredData.filter(item => item[params.lt.column] < params.lt.value);
    }
    if (params.gte) {
      filteredData = filteredData.filter(item => item[params.gte.column] >= params.gte.value);
    }
    if (params.lte) {
      filteredData = filteredData.filter(item => item[params.lte.column] <= params.lte.value);
    }
    if (params.like) {
      const pattern = params.like.pattern.replace(/%/g, '.*');
      const regex = new RegExp(pattern, 'i');
      filteredData = filteredData.filter(item => regex.test(item[params.like.column]));
    }
    if (params.ilike) {
      const pattern = params.ilike.pattern.replace(/%/g, '.*');
      const regex = new RegExp(pattern, 'i');
      filteredData = filteredData.filter(item => regex.test(item[params.ilike.column]));
    }
    if (params.in) {
      filteredData = filteredData.filter(item => params.in.values.includes(item[params.in.column]));
    }

    // Apply ordering
    if (params.order) {
      const { column, options = {} } = params.order;
      const ascending = options.ascending !== false;
      filteredData.sort((a, b) => {
        if (a[column] < b[column]) return ascending ? -1 : 1;
        if (a[column] > b[column]) return ascending ? 1 : -1;
        return 0;
      });
    }

    // Apply range/limit
    if (params.range) {
      filteredData = filteredData.slice(params.range.from, params.range.to + 1);
    } else if (params.limit) {
      filteredData = filteredData.slice(0, params.limit);
    }

    // Return single or multiple
    if (params.single || params.maybeSingle) {
      return { data: filteredData[0] || null, error: null };
    }

    return { data: filteredData, error: null };
  }

  private handleInsert(table: string, tableData: any[], params: any): { data: any; error: any } {
    const newData = Array.isArray(params.data) ? params.data : [params.data];
    const insertedData = newData.map(item => ({
      ...item,
      id: item.id || `mock-${Date.now()}-${Math.random()}`,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    tableData.push(...insertedData);
    this.mockData.set(table, tableData);

    if (params.single) {
      return { data: insertedData[0], error: null };
    }
    return { data: insertedData, error: null };
  }

  private handleUpdate(table: string, tableData: any[], params: any): { data: any; error: any } {
    const updatedItems: any[] = [];
    
    for (let i = 0; i < tableData.length; i++) {
      if (params.eq && tableData[i][params.eq.column] === params.eq.value) {
        tableData[i] = {
          ...tableData[i],
          ...params.data,
          updated_at: new Date().toISOString()
        };
        updatedItems.push(tableData[i]);
      }
    }

    this.mockData.set(table, tableData);
    return { data: updatedItems, error: null };
  }

  private handleDelete(table: string, tableData: any[], params: any): { data: any; error: any } {
    const deletedItems: any[] = [];
    const remainingData = tableData.filter(item => {
      if (params.eq && item[params.eq.column] === params.eq.value) {
        deletedItems.push(item);
        return false;
      }
      return true;
    });

    this.mockData.set(table, remainingData);
    return { data: deletedItems, error: null };
  }

  private handleUpsert(table: string, tableData: any[], params: any): { data: any; error: any } {
    const upsertData = Array.isArray(params.data) ? params.data : [params.data];
    const upsertedItems: any[] = [];

    upsertData.forEach(item => {
      const existingIndex = tableData.findIndex(existing => existing.id === item.id);
      
      if (existingIndex >= 0) {
        // Update existing
        tableData[existingIndex] = {
          ...tableData[existingIndex],
          ...item,
          updated_at: new Date().toISOString()
        };
        upsertedItems.push(tableData[existingIndex]);
      } else {
        // Insert new
        const newItem = {
          ...item,
          id: item.id || `mock-${Date.now()}-${Math.random()}`,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        tableData.push(newItem);
        upsertedItems.push(newItem);
      }
    });

    this.mockData.set(table, tableData);
    return { data: upsertedItems, error: null };
  }

  // Test utilities
  setMockData(table: string, data: any[]): void {
    this.mockData.set(table, data);
  }

  getMockData(table: string): any[] {
    return this.mockData.get(table) || [];
  }

  setMockError(error: Error | null): void {
    this.mockError = error;
  }

  setMockDelay(delay: number): void {
    this.mockDelay = delay;
  }

  clearMockData(): void {
    this.initializeMockTables();
  }

  reset(): void {
    this.clearMockData();
    this.mockError = null;
    this.mockDelay = 0;
  }
}

// Mock Payment Gateway Services
export class MockPaymentService {
  private shouldFail = false;
  private delay = 0;

  async processPayment(amount: number, method: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldFail) {
      return { success: false, error: 'Payment processing failed' };
    }

    return {
      success: true,
      transactionId: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
    };
  }

  async refundPayment(transactionId: string): Promise<{ success: boolean; refundId?: string; error?: string }> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldFail) {
      return { success: false, error: 'Refund processing failed' };
    }

    return {
      success: true,
      refundId: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
    };
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setDelay(delay: number): void {
    this.delay = delay;
  }

  reset(): void {
    this.shouldFail = false;
    this.delay = 0;
  }
}

// Mock Notification Service
export class MockNotificationService {
  private sentNotifications: Array<{ type: string; recipient: string; message: string; timestamp: Date }> = [];
  private shouldFail = false;

  async sendNotification(type: string, recipient: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (this.shouldFail) {
      return { success: false, error: 'Notification sending failed' };
    }

    this.sentNotifications.push({
      type,
      recipient,
      message,
      timestamp: new Date()
    });

    return { success: true };
  }

  async sendBulkNotifications(notifications: Array<{ type: string; recipient: string; message: string }>): Promise<{ success: boolean; failed?: number; error?: string }> {
    if (this.shouldFail) {
      return { success: false, error: 'Bulk notification sending failed' };
    }

    notifications.forEach(notification => {
      this.sentNotifications.push({
        ...notification,
        timestamp: new Date()
      });
    });

    return { success: true };
  }

  getSentNotifications(): Array<{ type: string; recipient: string; message: string; timestamp: Date }> {
    return [...this.sentNotifications];
  }

  clearNotifications(): void {
    this.sentNotifications = [];
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  reset(): void {
    this.sentNotifications = [];
    this.shouldFail = false;
  }
}

// Mock Reporting Service
export class MockReportingService {
  private generatedReports: Array<{ type: string; data: any; timestamp: Date }> = [];
  private shouldFail = false;
  private delay = 0;

  async generateReport(type: string, parameters: any): Promise<{ success: boolean; reportId?: string; data?: any; error?: string }> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldFail) {
      return { success: false, error: 'Report generation failed' };
    }

    const reportData = this.generateMockReportData(type, parameters);
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    this.generatedReports.push({
      type,
      data: reportData,
      timestamp: new Date()
    });

    return {
      success: true,
      reportId,
      data: reportData
    };
  }

  private generateMockReportData(type: string, parameters: any): any {
    switch (type) {
      case 'inventory_summary':
        return {
          totalProducts: 150,
          totalValue: 500000,
          lowStockItems: 12,
          outOfStockItems: 3
        };
      case 'sales_report':
        return {
          totalSales: 250000,
          totalTransactions: 45,
          averageTransaction: 5555.56,
          topProducts: ['Product A', 'Product B', 'Product C']
        };
      case 'stock_movement':
        return {
          totalMovements: 89,
          stockIn: 45,
          stockOut: 32,
          adjustments: 12
        };
      default:
        return { message: 'Mock report data' };
    }
  }

  getGeneratedReports(): Array<{ type: string; data: any; timestamp: Date }> {
    return [...this.generatedReports];
  }

  clearReports(): void {
    this.generatedReports = [];
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setDelay(delay: number): void {
    this.delay = delay;
  }

  reset(): void {
    this.generatedReports = [];
    this.shouldFail = false;
    this.delay = 0;
  }
}

// Centralized mock services manager
export class MockServicesManager {
  public supabase: MockSupabaseClient;
  public payment: MockPaymentService;
  public notification: MockNotificationService;
  public reporting: MockReportingService;

  constructor() {
    this.supabase = new MockSupabaseClient();
    this.payment = new MockPaymentService();
    this.notification = new MockNotificationService();
    this.reporting = new MockReportingService();
  }

  reset(): void {
    this.supabase.reset();
    this.payment.reset();
    this.notification.reset();
    this.reporting.reset();
  }

  simulateNetworkError(): void {
    this.supabase.setMockError(new Error('Network connection failed'));
    this.payment.setFailure(true);
    this.notification.setFailure(true);
    this.reporting.setFailure(true);
  }

  simulateSlowNetwork(delay: number = 2000): void {
    this.supabase.setMockDelay(delay);
    this.payment.setDelay(delay);
    this.reporting.setDelay(delay);
  }

  restoreNormalOperation(): void {
    this.supabase.setMockError(null);
    this.supabase.setMockDelay(0);
    this.payment.setFailure(false);
    this.payment.setDelay(0);
    this.notification.setFailure(false);
    this.reporting.setFailure(false);
    this.reporting.setDelay(0);
  }
}

// Export singleton instance
export const mockServices = new MockServicesManager();