import { InventoryValueAdjustment } from './weightedAverageCostService';
import { supabase } from '../utils/supabase';

export interface GLAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  isActive: boolean;
}

export interface JournalEntry {
  id: string;
  batchId: string;
  entryNumber: string;
  date: Date;
  description: string;
  referenceId: string;
  referenceType: 'purchase_order' | 'inventory_adjustment' | 'cost_update';
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'draft' | 'posted' | 'reversed';
  createdBy: string;
  createdAt: Date;
  postedBy?: string;
  postedAt?: Date;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  lineNumber: number;
  accountCode: string;
  accountName: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  productId?: string;
  productName?: string;
  quantity?: number;
  unitCost?: number;
}

export interface InventoryValuationSummary {
  totalProducts: number;
  totalInventoryValue: number;
  totalAdjustmentAmount: number;
  adjustmentsByType: {
    increases: { count: number; amount: number };
    decreases: { count: number; amount: number };
  };
  glEntries: {
    totalDebits: number;
    totalCredits: number;
    entryCount: number;
  };
}

export interface GLConfiguration {
  inventoryAssetAccount: string;
  accountsPayableAccount: string;
  cogsAccount: string;
  purchaseVarianceAccount: string;
  inventoryAdjustmentAccount: string;
}

/**
 * Service for handling inventory value adjustments and their integration with the general ledger.
 * This service creates proper accounting entries when inventory costs are updated.
 */
export class InventoryValueAdjustmentService {
  private readonly defaultGLConfig: GLConfiguration = {
    inventoryAssetAccount: '1200', // Current Assets - Inventory
    accountsPayableAccount: '2000', // Current Liabilities - Accounts Payable
    cogsAccount: '5000', // Cost of Goods Sold
    purchaseVarianceAccount: '5100', // Purchase Price Variance
    inventoryAdjustmentAccount: '5200' // Inventory Adjustment Expense
  };

  /**
   * Process inventory value adjustments and create corresponding general ledger entries
   */
  async processInventoryValueAdjustments(
    adjustments: InventoryValueAdjustment[],
    referenceId: string,
    referenceType: 'purchase_order' | 'inventory_adjustment' | 'cost_update',
    description: string,
    processedBy: string,
    glConfig?: Partial<GLConfiguration>
  ): Promise<{
    journalEntry: JournalEntry;
    journalLines: JournalEntryLine[];
    summary: InventoryValuationSummary;
  }> {
    const config = { ...this.defaultGLConfig, ...glConfig };
    const batchId = this.generateBatchId();
    
    try {
      // Create journal entry
      const journalEntry = await this.createJournalEntry({
        batchId,
        description,
        referenceId,
        referenceType,
        adjustments,
        processedBy
      });

      // Create journal entry lines
      const journalLines = await this.createJournalEntryLines(
        journalEntry.id,
        adjustments,
        config,
        referenceType
      );

      // Generate summary
      const summary = this.generateValuationSummary(adjustments, journalLines);

      // Validate and post the journal entry
      await this.validateAndPostJournalEntry(journalEntry.id, journalLines);

      return {
        journalEntry,
        journalLines,
        summary
      };

    } catch (error) {
      console.error('Error processing inventory value adjustments:', error);
      throw new Error(`Failed to process inventory value adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a journal entry header
   */
  private async createJournalEntry(params: {
    batchId: string;
    description: string;
    referenceId: string;
    referenceType: string;
    adjustments: InventoryValueAdjustment[];
    processedBy: string;
  }): Promise<JournalEntry> {
    const totalAdjustment = params.adjustments.reduce(
      (sum, adj) => sum + Math.abs(adj.adjustmentAmount), 
      0
    );

    const journalEntry: JournalEntry = {
      id: this.generateId(),
      batchId: params.batchId,
      entryNumber: await this.generateEntryNumber(),
      date: new Date(),
      description: params.description,
      referenceId: params.referenceId,
      referenceType: params.referenceType as any,
      totalDebit: totalAdjustment,
      totalCredit: totalAdjustment,
      isBalanced: true,
      status: 'draft',
      createdBy: params.processedBy,
      createdAt: new Date()
    };

    // Save to database
    const { error } = await supabase
      .from('journal_entries')
      .insert({
        id: journalEntry.id,
        batch_id: journalEntry.batchId,
        entry_number: journalEntry.entryNumber,
        date: journalEntry.date.toISOString(),
        description: journalEntry.description,
        reference_id: journalEntry.referenceId,
        reference_type: journalEntry.referenceType,
        total_debit: journalEntry.totalDebit,
        total_credit: journalEntry.totalCredit,
        is_balanced: journalEntry.isBalanced,
        status: journalEntry.status,
        created_by: journalEntry.createdBy,
        created_at: journalEntry.createdAt.toISOString()
      });

    if (error) {
      throw new Error(`Failed to create journal entry: ${error.message}`);
    }

    return journalEntry;
  }

  /**
   * Create journal entry lines for inventory adjustments
   */
  private async createJournalEntryLines(
    journalEntryId: string,
    adjustments: InventoryValueAdjustment[],
    config: GLConfiguration,
    referenceType: string
  ): Promise<JournalEntryLine[]> {
    const lines: JournalEntryLine[] = [];
    let lineNumber = 1;

    for (const adjustment of adjustments) {
      const product = await this.getProductInfo(adjustment.productId);
      
      if (adjustment.adjustmentAmount !== 0) {
        // Create debit and credit entries based on adjustment type and reference type
        const { debitAccount, creditAccount } = this.determineAccounts(
          adjustment.adjustmentType,
          referenceType,
          config
        );

        // Debit entry
        const debitLine: JournalEntryLine = {
          id: this.generateId(),
          journalEntryId,
          lineNumber: lineNumber++,
          accountCode: debitAccount.code,
          accountName: debitAccount.name,
          description: `Inventory cost adjustment - ${product?.name || adjustment.productId}`,
          debitAmount: adjustment.adjustmentAmount,
          creditAmount: 0,
          productId: adjustment.productId,
          productName: product?.name,
          quantity: adjustment.stockQuantity,
          unitCost: adjustment.newCost
        };

        // Credit entry
        const creditLine: JournalEntryLine = {
          id: this.generateId(),
          journalEntryId,
          lineNumber: lineNumber++,
          accountCode: creditAccount.code,
          accountName: creditAccount.name,
          description: `Inventory cost adjustment offset - ${product?.name || adjustment.productId}`,
          debitAmount: 0,
          creditAmount: adjustment.adjustmentAmount,
          productId: adjustment.productId,
          productName: product?.name,
          quantity: adjustment.stockQuantity,
          unitCost: adjustment.oldCost
        };

        lines.push(debitLine, creditLine);
      }
    }

    // Save lines to database
    if (lines.length > 0) {
      const { error } = await supabase
        .from('journal_entry_lines')
        .insert(lines.map(line => ({
          id: line.id,
          journal_entry_id: line.journalEntryId,
          line_number: line.lineNumber,
          account_code: line.accountCode,
          account_name: line.accountName,
          description: line.description,
          debit_amount: line.debitAmount,
          credit_amount: line.creditAmount,
          product_id: line.productId,
          product_name: line.productName,
          quantity: line.quantity,
          unit_cost: line.unitCost
        })));

      if (error) {
        throw new Error(`Failed to create journal entry lines: ${error.message}`);
      }
    }

    return lines;
  }

  /**
   * Determine appropriate GL accounts based on adjustment type and context
   */
  private determineAccounts(
    adjustmentType: 'increase' | 'decrease',
    referenceType: string,
    config: GLConfiguration
  ): { debitAccount: { code: string; name: string }; creditAccount: { code: string; name: string } } {
    
    switch (referenceType) {
      case 'purchase_order':
        if (adjustmentType === 'increase') {
          return {
            debitAccount: { code: config.inventoryAssetAccount, name: 'Inventory Asset' },
            creditAccount: { code: config.accountsPayableAccount, name: 'Accounts Payable' }
          };
        } else {
          return {
            debitAccount: { code: config.purchaseVarianceAccount, name: 'Purchase Price Variance' },
            creditAccount: { code: config.inventoryAssetAccount, name: 'Inventory Asset' }
          };
        }
      
      case 'inventory_adjustment':
        if (adjustmentType === 'increase') {
          return {
            debitAccount: { code: config.inventoryAssetAccount, name: 'Inventory Asset' },
            creditAccount: { code: config.inventoryAdjustmentAccount, name: 'Inventory Adjustment' }
          };
        } else {
          return {
            debitAccount: { code: config.inventoryAdjustmentAccount, name: 'Inventory Adjustment' },
            creditAccount: { code: config.inventoryAssetAccount, name: 'Inventory Asset' }
          };
        }
      
      case 'cost_update':
      default:
        if (adjustmentType === 'increase') {
          return {
            debitAccount: { code: config.inventoryAssetAccount, name: 'Inventory Asset' },
            creditAccount: { code: config.cogsAccount, name: 'Cost of Goods Sold' }
          };
        } else {
          return {
            debitAccount: { code: config.cogsAccount, name: 'Cost of Goods Sold' },
            creditAccount: { code: config.inventoryAssetAccount, name: 'Inventory Asset' }
          };
        }
    }
  }

  /**
   * Generate inventory valuation summary
   */
  private generateValuationSummary(
    adjustments: InventoryValueAdjustment[],
    journalLines: JournalEntryLine[]
  ): InventoryValuationSummary {
    const increases = adjustments.filter(adj => adj.adjustmentType === 'increase');
    const decreases = adjustments.filter(adj => adj.adjustmentType === 'decrease');
    
    const totalAdjustmentAmount = adjustments.reduce(
      (sum, adj) => sum + adj.adjustmentAmount, 
      0
    );
    
    const totalInventoryValue = adjustments.reduce(
      (sum, adj) => sum + adj.newTotalValue, 
      0
    );

    const totalDebits = journalLines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredits = journalLines.reduce((sum, line) => sum + line.creditAmount, 0);

    return {
      totalProducts: adjustments.length,
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      totalAdjustmentAmount: Number(totalAdjustmentAmount.toFixed(2)),
      adjustmentsByType: {
        increases: {
          count: increases.length,
          amount: Number(increases.reduce((sum, adj) => sum + adj.adjustmentAmount, 0).toFixed(2))
        },
        decreases: {
          count: decreases.length,
          amount: Number(decreases.reduce((sum, adj) => sum + adj.adjustmentAmount, 0).toFixed(2))
        }
      },
      glEntries: {
        totalDebits: Number(totalDebits.toFixed(2)),
        totalCredits: Number(totalCredits.toFixed(2)),
        entryCount: journalLines.length
      }
    };
  }

  /**
   * Validate journal entry balances and post to GL
   */
  private async validateAndPostJournalEntry(
    journalEntryId: string,
    journalLines: JournalEntryLine[]
  ): Promise<void> {
    // Validate debits equal credits
    const totalDebits = journalLines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredits = journalLines.reduce((sum, line) => sum + line.creditAmount, 0);
    const difference = Math.abs(totalDebits - totalCredits);

    if (difference > 0.01) { // Allow for minor rounding differences
      throw new Error(`Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}, Difference: ${difference}`);
    }

    // Post the journal entry
    const { error } = await supabase
      .from('journal_entries')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: 'system' // Should be actual user in production
      })
      .eq('id', journalEntryId);

    if (error) {
      throw new Error(`Failed to post journal entry: ${error.message}`);
    }
  }

  /**
   * Get product information for journal entry descriptions
   */
  private async getProductInfo(productId: string): Promise<{ name: string; sku: string } | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, sku')
        .eq('id', productId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        name: data.name,
        sku: data.sku
      };
    } catch (error) {
      console.warn(`Could not get product info for ${productId}:`, error);
      return null;
    }
  }

  /**
   * Generate sequential journal entry number
   */
  private async generateEntryNumber(): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('get_next_journal_entry_number');

      if (error || !data) {
        // Fallback to timestamp-based number
        return `JE-${Date.now()}`;
      }

      return `JE-${String(data).padStart(6, '0')}`;
    } catch (error) {
      console.warn('Could not generate journal entry number, using fallback:', error);
      return `JE-${Date.now()}`;
    }
  }

  /**
   * Retrieve GL account information by code
   */
  async getGLAccount(accountCode: string): Promise<GLAccount | null> {
    try {
      const { data, error } = await supabase
        .from('gl_accounts')
        .select('*')
        .eq('code', accountCode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        code: data.code,
        name: data.name,
        type: data.type,
        category: data.category,
        isActive: data.is_active
      };
    } catch (error) {
      console.warn(`Could not get GL account ${accountCode}:`, error);
      return null;
    }
  }

  /**
   * Get inventory valuation report
   */
  async getInventoryValuationReport(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalValue: number;
    productCount: number;
    adjustmentSummary: InventoryValuationSummary;
    recentAdjustments: Array<{
      date: Date;
      referenceId: string;
      description: string;
      adjustmentAmount: number;
    }>;
  }> {
    try {
      const query = supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines(*)
        `)
        .eq('reference_type', 'cost_update')
        .eq('status', 'posted');

      if (dateFrom) {
        query.gte('date', dateFrom.toISOString());
      }
      if (dateTo) {
        query.lte('date', dateTo.toISOString());
      }

      const { data: entries, error } = await query.order('date', { ascending: false });

      if (error) {
        throw new Error(`Failed to get inventory valuation report: ${error.message}`);
      }

      // Process entries to create report
      const totalAdjustmentAmount = entries?.reduce(
        (sum, entry) => sum + (entry.total_debit || 0), 
        0
      ) || 0;

      const recentAdjustments = entries?.slice(0, 10).map(entry => ({
        date: new Date(entry.date),
        referenceId: entry.reference_id,
        description: entry.description,
        adjustmentAmount: entry.total_debit || 0
      })) || [];

      // Get current total inventory value
      const { data: inventoryValue, error: inventoryError } = await supabase
        .from('products')
        .select('stock, cost')
        .eq('is_active', true);

      if (inventoryError) {
        throw new Error(`Failed to calculate inventory value: ${inventoryError.message}`);
      }

      const totalValue = inventoryValue?.reduce(
        (sum, product) => sum + (product.stock * product.cost), 
        0
      ) || 0;

      const productCount = inventoryValue?.length || 0;

      return {
        totalValue: Number(totalValue.toFixed(2)),
        productCount,
        adjustmentSummary: {
          totalProducts: productCount,
          totalInventoryValue: totalValue,
          totalAdjustmentAmount,
          adjustmentsByType: {
            increases: { count: 0, amount: 0 },
            decreases: { count: 0, amount: 0 }
          },
          glEntries: {
            totalDebits: totalAdjustmentAmount,
            totalCredits: totalAdjustmentAmount,
            entryCount: entries?.length || 0
          }
        },
        recentAdjustments
      };

    } catch (error) {
      console.error('Error generating inventory valuation report:', error);
      throw error;
    }
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `gl_batch_${timestamp}_${random}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${timestamp}_${random}`;
  }
}

// Export singleton instance
export const inventoryValueAdjustmentService = new InventoryValueAdjustmentService();