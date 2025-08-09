import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { 
  InventoryValueAdjustmentService, 
  GLConfiguration, 
  JournalEntry, 
  JournalEntryLine 
} from '../../../services/inventoryValueAdjustmentService';
import { InventoryValueAdjustment } from '../../../services/weightedAverageCostService';
import { supabase } from '../../../utils/supabase';

// Mock Supabase
vi.mock('../../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

const mockSupabase = supabase as {
  from: Mock;
  rpc: Mock;
};

describe('InventoryValueAdjustmentService', () => {
  let service: InventoryValueAdjustmentService;

  beforeEach(() => {
    service = new InventoryValueAdjustmentService();
    vi.clearAllMocks();
  });

  describe('processInventoryValueAdjustments', () => {
    it('should process inventory value adjustments and create GL entries', async () => {
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockUpdate = vi.fn(() => ({ error: null }));
      const mockFrom = vi.fn((table) => {
        if (table === 'products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ 
                  data: { name: 'Test Product', sku: 'TEST001' }, 
                  error: null 
                })
              }))
            }))
          };
        }
        return {
          insert: mockInsert,
          update: mockUpdate,
          eq: vi.fn(() => ({ error: null }))
        };
      });
      
      const mockRpc = vi.fn().mockResolvedValue({ data: 'JE-000001', error: null });

      mockSupabase.from.mockImplementation(mockFrom);
      mockSupabase.rpc.mockImplementation(mockRpc);

      const adjustments: InventoryValueAdjustment[] = [
        {
          productId: 'product1',
          oldCost: 10.0,
          newCost: 12.0,
          stockQuantity: 100,
          oldTotalValue: 1000,
          newTotalValue: 1200,
          adjustmentAmount: 200,
          adjustmentType: 'increase'
        }
      ];

      const result = await service.processInventoryValueAdjustments(
        adjustments,
        'po123',
        'purchase_order',
        'Inventory cost adjustment from purchase order receipt',
        'user1'
      );

      expect(result.journalEntry).toBeDefined();
      expect(result.journalEntry.status).toBe('draft');
      expect(result.journalEntry.totalDebit).toBe(200);
      expect(result.journalEntry.totalCredit).toBe(200);

      expect(result.journalLines).toHaveLength(2); // Debit and credit entries
      expect(result.journalLines[0].debitAmount).toBe(200);
      expect(result.journalLines[1].creditAmount).toBe(200);

      expect(result.summary.totalProducts).toBe(1);
      expect(result.summary.totalAdjustmentAmount).toBe(200);
      expect(result.summary.adjustmentsByType.increases.count).toBe(1);
      expect(result.summary.adjustmentsByType.increases.amount).toBe(200);

      // Verify database calls
      expect(mockInsert).toHaveBeenCalledTimes(2); // Journal entry + lines
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'posted',
        posted_at: expect.any(String),
        posted_by: 'system'
      });
    });

    it('should handle multiple products with mixed adjustment types', async () => {
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockUpdate = vi.fn(() => ({ error: null }));
      const mockFrom = vi.fn((table) => {
        if (table === 'products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn()
                  .mockResolvedValueOnce({ data: { name: 'Product 1', sku: 'SKU001' }, error: null })
                  .mockResolvedValueOnce({ data: { name: 'Product 2', sku: 'SKU002' }, error: null })
              }))
            }))
          };
        }
        return {
          insert: mockInsert,
          update: mockUpdate,
          eq: vi.fn(() => ({ error: null }))
        };
      });
      
      const mockRpc = vi.fn().mockResolvedValue({ data: 'JE-000001', error: null });

      mockSupabase.from.mockImplementation(mockFrom);
      mockSupabase.rpc.mockImplementation(mockRpc);

      const adjustments: InventoryValueAdjustment[] = [
        {
          productId: 'product1',
          oldCost: 10.0,
          newCost: 12.0,
          stockQuantity: 100,
          oldTotalValue: 1000,
          newTotalValue: 1200,
          adjustmentAmount: 200,
          adjustmentType: 'increase'
        },
        {
          productId: 'product2',
          oldCost: 15.0,
          newCost: 13.0,
          stockQuantity: 50,
          oldTotalValue: 750,
          newTotalValue: 650,
          adjustmentAmount: 100,
          adjustmentType: 'decrease'
        }
      ];

      const result = await service.processInventoryValueAdjustments(
        adjustments,
        'po123',
        'purchase_order',
        'Mixed inventory adjustments',
        'user1'
      );

      expect(result.journalLines).toHaveLength(4); // 2 products × 2 lines each

      expect(result.summary.totalProducts).toBe(2);
      expect(result.summary.totalAdjustmentAmount).toBe(300); // 200 + 100
      expect(result.summary.adjustmentsByType.increases.count).toBe(1);
      expect(result.summary.adjustmentsByType.increases.amount).toBe(200);
      expect(result.summary.adjustmentsByType.decreases.count).toBe(1);
      expect(result.summary.adjustmentsByType.decreases.amount).toBe(100);
    });

    it('should use custom GL configuration', async () => {
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockUpdate = vi.fn(() => ({ error: null }));
      const mockFrom = vi.fn((table) => {
        if (table === 'products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ 
                  data: { name: 'Test Product', sku: 'TEST001' }, 
                  error: null 
                })
              }))
            }))
          };
        }
        return {
          insert: mockInsert,
          update: mockUpdate,
          eq: vi.fn(() => ({ error: null }))
        };
      });
      
      const mockRpc = vi.fn().mockResolvedValue({ data: 'JE-000001', error: null });

      mockSupabase.from.mockImplementation(mockFrom);
      mockSupabase.rpc.mockImplementation(mockRpc);

      const customGLConfig: Partial<GLConfiguration> = {
        inventoryAssetAccount: '1300',
        accountsPayableAccount: '2100'
      };

      const adjustments: InventoryValueAdjustment[] = [
        {
          productId: 'product1',
          oldCost: 10.0,
          newCost: 12.0,
          stockQuantity: 100,
          oldTotalValue: 1000,
          newTotalValue: 1200,
          adjustmentAmount: 200,
          adjustmentType: 'increase'
        }
      ];

      const result = await service.processInventoryValueAdjustments(
        adjustments,
        'po123',
        'purchase_order',
        'Custom GL accounts test',
        'user1',
        customGLConfig
      );

      expect(result.journalLines[0].accountCode).toBe('1300'); // Custom inventory account
      expect(result.journalLines[1].accountCode).toBe('2100'); // Custom AP account
    });
  });

  describe('determineAccounts', () => {
    it('should return correct accounts for purchase order increases', () => {
      const result = (service as any).determineAccounts(
        'increase',
        'purchase_order',
        {
          inventoryAssetAccount: '1200',
          accountsPayableAccount: '2000'
        }
      );

      expect(result.debitAccount.code).toBe('1200');
      expect(result.debitAccount.name).toBe('Inventory Asset');
      expect(result.creditAccount.code).toBe('2000');
      expect(result.creditAccount.name).toBe('Accounts Payable');
    });

    it('should return correct accounts for purchase order decreases', () => {
      const result = (service as any).determineAccounts(
        'decrease',
        'purchase_order',
        {
          inventoryAssetAccount: '1200',
          purchaseVarianceAccount: '5100'
        }
      );

      expect(result.debitAccount.code).toBe('5100');
      expect(result.debitAccount.name).toBe('Purchase Price Variance');
      expect(result.creditAccount.code).toBe('1200');
      expect(result.creditAccount.name).toBe('Inventory Asset');
    });

    it('should return correct accounts for inventory adjustments', () => {
      const increaseResult = (service as any).determineAccounts(
        'increase',
        'inventory_adjustment',
        {
          inventoryAssetAccount: '1200',
          inventoryAdjustmentAccount: '5200'
        }
      );

      expect(increaseResult.debitAccount.code).toBe('1200');
      expect(increaseResult.creditAccount.code).toBe('5200');

      const decreaseResult = (service as any).determineAccounts(
        'decrease',
        'inventory_adjustment',
        {
          inventoryAssetAccount: '1200',
          inventoryAdjustmentAccount: '5200'
        }
      );

      expect(decreaseResult.debitAccount.code).toBe('5200');
      expect(decreaseResult.creditAccount.code).toBe('1200');
    });

    it('should return correct accounts for cost updates', () => {
      const result = (service as any).determineAccounts(
        'increase',
        'cost_update',
        {
          inventoryAssetAccount: '1200',
          cogsAccount: '5000'
        }
      );

      expect(result.debitAccount.code).toBe('1200');
      expect(result.creditAccount.code).toBe('5000');
    });
  });

  describe('generateValuationSummary', () => {
    it('should generate correct summary from adjustments and journal lines', () => {
      const adjustments: InventoryValueAdjustment[] = [
        {
          productId: 'product1',
          oldCost: 10.0,
          newCost: 12.0,
          stockQuantity: 100,
          oldTotalValue: 1000,
          newTotalValue: 1200,
          adjustmentAmount: 200,
          adjustmentType: 'increase'
        },
        {
          productId: 'product2',
          oldCost: 15.0,
          newCost: 13.0,
          stockQuantity: 50,
          oldTotalValue: 750,
          newTotalValue: 650,
          adjustmentAmount: 100,
          adjustmentType: 'decrease'
        }
      ];

      const journalLines: JournalEntryLine[] = [
        {
          id: '1',
          journalEntryId: 'je1',
          lineNumber: 1,
          accountCode: '1200',
          accountName: 'Inventory',
          description: 'Test',
          debitAmount: 200,
          creditAmount: 0
        },
        {
          id: '2',
          journalEntryId: 'je1',
          lineNumber: 2,
          accountCode: '2000',
          accountName: 'AP',
          description: 'Test',
          debitAmount: 0,
          creditAmount: 200
        },
        {
          id: '3',
          journalEntryId: 'je1',
          lineNumber: 3,
          accountCode: '5100',
          accountName: 'Variance',
          description: 'Test',
          debitAmount: 100,
          creditAmount: 0
        },
        {
          id: '4',
          journalEntryId: 'je1',
          lineNumber: 4,
          accountCode: '1200',
          accountName: 'Inventory',
          description: 'Test',
          debitAmount: 0,
          creditAmount: 100
        }
      ];

      const summary = (service as any).generateValuationSummary(adjustments, journalLines);

      expect(summary.totalProducts).toBe(2);
      expect(summary.totalInventoryValue).toBe(1850); // 1200 + 650
      expect(summary.totalAdjustmentAmount).toBe(300); // 200 + 100
      expect(summary.adjustmentsByType.increases.count).toBe(1);
      expect(summary.adjustmentsByType.increases.amount).toBe(200);
      expect(summary.adjustmentsByType.decreases.count).toBe(1);
      expect(summary.adjustmentsByType.decreases.amount).toBe(100);
      expect(summary.glEntries.totalDebits).toBe(300);
      expect(summary.glEntries.totalCredits).toBe(300);
      expect(summary.glEntries.entryCount).toBe(4);
    });
  });

  describe('validateAndPostJournalEntry', () => {
    it('should successfully post balanced journal entry', async () => {
      const mockUpdate = vi.fn(() => ({ error: null }));
      const mockFrom = vi.fn(() => ({
        update: mockUpdate,
        eq: vi.fn(() => ({ error: null }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const journalLines: JournalEntryLine[] = [
        {
          id: '1',
          journalEntryId: 'je1',
          lineNumber: 1,
          accountCode: '1200',
          accountName: 'Inventory',
          description: 'Test',
          debitAmount: 100,
          creditAmount: 0
        },
        {
          id: '2',
          journalEntryId: 'je1',
          lineNumber: 2,
          accountCode: '2000',
          accountName: 'AP',
          description: 'Test',
          debitAmount: 0,
          creditAmount: 100
        }
      ];

      await expect(
        (service as any).validateAndPostJournalEntry('je1', journalLines)
      ).resolves.not.toThrow();

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'posted',
        posted_at: expect.any(String),
        posted_by: 'system'
      });
    });

    it('should reject unbalanced journal entry', async () => {
      const journalLines: JournalEntryLine[] = [
        {
          id: '1',
          journalEntryId: 'je1',
          lineNumber: 1,
          accountCode: '1200',
          accountName: 'Inventory',
          description: 'Test',
          debitAmount: 100,
          creditAmount: 0
        },
        {
          id: '2',
          journalEntryId: 'je1',
          lineNumber: 2,
          accountCode: '2000',
          accountName: 'AP',
          description: 'Test',
          debitAmount: 0,
          creditAmount: 90 // Unbalanced
        }
      ];

      await expect(
        (service as any).validateAndPostJournalEntry('je1', journalLines)
      ).rejects.toThrow('Journal entry is not balanced');
    });

    it('should allow minor rounding differences', async () => {
      const mockUpdate = vi.fn(() => ({ error: null }));
      const mockFrom = vi.fn(() => ({
        update: mockUpdate,
        eq: vi.fn(() => ({ error: null }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const journalLines: JournalEntryLine[] = [
        {
          id: '1',
          journalEntryId: 'je1',
          lineNumber: 1,
          accountCode: '1200',
          accountName: 'Inventory',
          description: 'Test',
          debitAmount: 100,
          creditAmount: 0
        },
        {
          id: '2',
          journalEntryId: 'je1',
          lineNumber: 2,
          accountCode: '2000',
          accountName: 'AP',
          description: 'Test',
          debitAmount: 0,
          creditAmount: 99.999 // Within 0.01 tolerance
        }
      ];

      await expect(
        (service as any).validateAndPostJournalEntry('je1', journalLines)
      ).resolves.not.toThrow();
    });
  });

  describe('getInventoryValuationReport', () => {
    it('should generate inventory valuation report', async () => {
      const mockJournalData = [
        {
          id: 'je1',
          date: '2024-01-15',
          reference_id: 'po123',
          description: 'Cost adjustment',
          total_debit: 200
        },
        {
          id: 'je2',
          date: '2024-01-20',
          reference_id: 'po124',
          description: 'Another adjustment',
          total_debit: 150
        }
      ];

      const mockInventoryData = [
        { stock: 100, cost: 10 },
        { stock: 50, cost: 15 }
      ];

      const mockFrom = vi.fn((table) => {
        if (table === 'journal_entries') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: mockJournalData, error: null }))
                  }))
                }))
              }))
            }))
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockInventoryData, error: null }))
            }))
          };
        }
        return { select: vi.fn() };
      });

      mockSupabase.from.mockImplementation(mockFrom);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      const report = await service.getInventoryValuationReport(dateFrom, dateTo);

      expect(report.totalValue).toBe(1750); // (100 * 10) + (50 * 15)
      expect(report.productCount).toBe(2);
      expect(report.adjustmentSummary.totalAdjustmentAmount).toBe(350); // 200 + 150
      expect(report.recentAdjustments).toHaveLength(2);
      expect(report.recentAdjustments[0].adjustmentAmount).toBe(200);
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
              }))
            }))
          }))
        }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      await expect(
        service.getInventoryValuationReport(dateFrom, dateTo)
      ).rejects.toThrow('Failed to get inventory valuation report');
    });
  });

  describe('getGLAccount', () => {
    it('should retrieve GL account information', async () => {
      const mockAccountData = {
        id: 'acc1',
        code: '1200',
        name: 'Inventory',
        type: 'asset',
        category: 'current_assets',
        is_active: true
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockAccountData, error: null }))
            }))
          }))
        }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const account = await service.getGLAccount('1200');

      expect(account).toEqual({
        id: 'acc1',
        code: '1200',
        name: 'Inventory',
        type: 'asset',
        category: 'current_assets',
        isActive: true
      });
    });

    it('should return null for non-existent accounts', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } }))
            }))
          }))
        }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const account = await service.getGLAccount('9999');

      expect(account).toBeNull();
    });
  });
});