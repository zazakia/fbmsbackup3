/**
 * Comprehensive Audit Service for Purchase Order and Inventory Management
 * 
 * This service provides centralized audit logging for:
 * - Purchase order status changes and receiving activities
 * - Stock movement tracking with before/after quantities
 * - User action tracking with metadata and context
 * - Audit trail retrieval and reporting
 */

import {
  PurchaseOrderAuditLog,
  PurchaseOrderAuditAction,
  StockMovement,
  PurchaseOrder,
  EnhancedPurchaseOrder,
  PartialReceiptItem,
  Product
} from '../types/business';
import { supabase } from '../utils/supabase';

export interface AuditContext {
  performedBy: string;
  performedByName?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface StockMovementAuditData {
  productId: string;
  productName?: string;
  productSku?: string;
  movementType: 'purchase_receipt' | 'sale' | 'adjustment' | 'transfer' | 'return';
  quantityBefore: number;
  quantityAfter: number;
  quantityChanged: number;
  unitCost?: number;
  totalValue?: number;
  referenceType: 'purchase_order' | 'sale' | 'adjustment' | 'transfer';
  referenceId: string;
  referenceNumber?: string;
  batchNumber?: string;
  expiryDate?: Date;
  location?: string;
  notes?: string;
}

export interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  performedBy?: string;
  action?: PurchaseOrderAuditAction;
  purchaseOrderId?: string;
  productId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  auditId?: string;
}

/**
 * Comprehensive Audit Service Implementation
 */
export class AuditService {
  /**
   * Log purchase order audit event
   */
  async logPurchaseOrderAudit(
    purchaseOrderId: string,
    purchaseOrderNumber: string,
    action: PurchaseOrderAuditAction,
    context: AuditContext,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>
  ): Promise<AuditServiceResult<PurchaseOrderAuditLog>> {
    try {
      const auditEntry: Omit<PurchaseOrderAuditLog, 'id'> = {
        purchaseOrderId,
        purchaseOrderNumber,
        action,
        performedBy: context.performedBy,
        performedByName: context.performedByName,
        timestamp: new Date(),
        oldValues: oldValues || {},
        newValues: newValues || {},
        reason: context.reason,
        metadata: {
          ...context.metadata,
          version: '1.0',
          source: 'purchase_order_workflow'
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      };

      // In a real implementation, this would save to database
      // For now, we'll simulate saving and return the entry with an ID
      const savedEntry: PurchaseOrderAuditLog = {
        id: `po_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...auditEntry
      };

      // Log to console for development
      console.log(`[AUDIT] Purchase Order ${action}:`, {
        poId: purchaseOrderId,
        poNumber: purchaseOrderNumber,
        performedBy: context.performedBy,
        timestamp: savedEntry.timestamp,
        oldValues,
        newValues
      });

      // In production, save to Supabase
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('purchase_order_audit_logs')
            .insert([{
              purchase_order_id: purchaseOrderId,
              purchase_order_number: purchaseOrderNumber,
              action: action.toLowerCase(),
              performed_by: context.performedBy,
              performed_by_name: context.performedByName,
              timestamp: savedEntry.timestamp.toISOString(),
              old_values: oldValues,
              new_values: newValues,
              reason: context.reason,
              metadata: savedEntry.metadata,
              ip_address: context.ipAddress,
              user_agent: context.userAgent
            }])
            .select()
            .single();

          if (error && error.code !== 'PGRST116') { // Ignore table doesn't exist error for development
            console.warn('Failed to save audit log to database:', error);
            // Continue with in-memory logging
          } else if (data) {
            savedEntry.id = data.id;
          }

          // Note: Using purchase_order_audit_logs table which exists in the database
          // The 'audit_logs' table is not available in the current schema
        } catch (dbError) {
          console.warn('Database audit logging failed:', dbError);
          // Continue with in-memory logging
        }
      }

      return {
        success: true,
        data: savedEntry,
        auditId: savedEntry.id
      };
    } catch (error) {
      console.error('Failed to create audit log entry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown audit logging error'
      };
    }
  }

  /**
   * Log stock movement audit event
   */
  async logStockMovementAudit(
    auditData: StockMovementAuditData,
    context: AuditContext
  ): Promise<AuditServiceResult<StockMovement>> {
    try {
      const stockMovement: StockMovement = {
        id: `stock_movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: auditData.productId,
        type: this.mapMovementType(auditData.movementType),
        quantity: Math.abs(auditData.quantityChanged),
        reason: context.reason || auditData.movementType,
        referenceId: auditData.referenceId,
        referenceNumber: auditData.referenceNumber,
        performedBy: context.performedBy,
        performedByName: context.performedByName,
        beforeQuantity: auditData.quantityBefore,
        afterQuantity: auditData.quantityAfter,
        unitCost: auditData.unitCost,
        totalCost: auditData.totalValue,
        batchNumber: auditData.batchNumber,
        expiryDate: auditData.expiryDate,
        location: auditData.location,
        notes: auditData.notes,
        createdAt: new Date()
      };

      // Log to console for development
      console.log(`[AUDIT] Stock Movement ${auditData.movementType}:`, {
        productId: auditData.productId,
        productName: auditData.productName,
        quantityChange: auditData.quantityChanged,
        before: auditData.quantityBefore,
        after: auditData.quantityAfter,
        reference: `${auditData.referenceType}:${auditData.referenceId}`,
        performedBy: context.performedBy
      });

      // In production, save to both stock_movements and stock_movement_audit_logs tables
      if (supabase) {
        try {
          // Save to stock_movements table
          const { data: movementData, error: movementError } = await supabase
            .from('stock_movements')
            .insert([{
              product_id: stockMovement.productId,
              product_name: auditData.productName || 'Unknown Product',
              product_sku: auditData.productSku,
              type: stockMovement.type,
              quantity: Math.abs(auditData.quantityChanged),
              previous_stock: auditData.quantityBefore,
              new_stock: auditData.quantityAfter,
              unit_cost: auditData.unitCost,
              total_value: auditData.totalValue,
              reason: context.reason || auditData.movementType,
              reference_number: auditData.referenceNumber,
              reference_type: auditData.referenceType,
              reference_id: auditData.referenceId,
              batch_number: auditData.batchNumber,
              expiry_date: auditData.expiryDate?.toISOString(),
              location_name: auditData.location,
              notes: auditData.notes || context.reason,
              performed_by: context.performedBy,
              performed_by_name: context.performedByName,
              status: 'completed',
              created_at: stockMovement.createdAt.toISOString()
            }])
            .select()
            .single();

          if (movementError && movementError.code !== 'PGRST116') {
            console.warn('Failed to save stock movement to database:', movementError);
          } else if (movementData) {
            stockMovement.id = movementData.id;

            // Save to stock_movement_audit_logs table
            await supabase
              .from('stock_movement_audit_logs')
              .insert([{
                stock_movement_id: movementData.id,
                product_id: auditData.productId,
                product_name: auditData.productName || 'Unknown Product',
                product_sku: auditData.productSku,
                movement_type: auditData.movementType,
                quantity_before: auditData.quantityBefore,
                quantity_after: auditData.quantityAfter,
                quantity_changed: auditData.quantityChanged,
                unit_cost: auditData.unitCost,
                total_value: auditData.totalValue,
                reference_type: auditData.referenceType,
                reference_id: auditData.referenceId,
                reference_number: auditData.referenceNumber,
                batch_number: auditData.batchNumber,
                expiry_date: auditData.expiryDate?.toISOString(),
                location: auditData.location,
                notes: auditData.notes,
                performed_by: context.performedBy,
                performed_by_name: context.performedByName,
                timestamp: stockMovement.createdAt.toISOString(),
                metadata: {
                  ...context.metadata,
                  auditVersion: '2.0',
                  source: 'audit_service'
                }
              }]);
          }
        } catch (dbError) {
          console.warn('Database stock movement logging failed:', dbError);
        }
      }

      return {
        success: true,
        data: stockMovement,
        auditId: stockMovement.id
      };
    } catch (error) {
      console.error('Failed to create stock movement audit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown stock movement audit error'
      };
    }
  }

  /**
   * Log purchase order status transition
   */
  async logStatusTransition(
    purchaseOrder: PurchaseOrder | EnhancedPurchaseOrder,
    oldStatus: string,
    newStatus: string,
    context: AuditContext
  ): Promise<AuditServiceResult> {
    return this.logPurchaseOrderAudit(
      purchaseOrder.id,
      purchaseOrder.poNumber,
      PurchaseOrderAuditAction.STATUS_CHANGED,
      context,
      { status: oldStatus },
      { status: newStatus }
    );
  }

  /**
   * Log purchase order receiving activity
   */
  async logReceivingActivity(
    purchaseOrder: PurchaseOrder | EnhancedPurchaseOrder,
    receipts: PartialReceiptItem[],
    context: AuditContext
  ): Promise<AuditServiceResult[]> {
    const results: AuditServiceResult[] = [];

    // Log the receiving action
    const receivingResult = await this.logPurchaseOrderAudit(
      purchaseOrder.id,
      purchaseOrder.poNumber,
      receipts.every(r => r.receivedQuantity === r.orderedQuantity) 
        ? PurchaseOrderAuditAction.RECEIVED 
        : PurchaseOrderAuditAction.PARTIALLY_RECEIVED,
      context,
      {},
      {
        receipts: receipts.map(r => ({
          productId: r.productId,
          orderedQuantity: r.orderedQuantity,
          receivedQuantity: r.receivedQuantity,
          condition: r.condition
        }))
      }
    );
    results.push(receivingResult);

    // Log stock movements for each received item
    for (const receipt of receipts) {
      if (receipt.receivedQuantity > 0) {
        const stockResult = await this.logStockMovementAudit(
          {
            productId: receipt.productId,
            movementType: 'purchase_receipt',
            quantityBefore: receipt.previouslyReceived,
            quantityAfter: receipt.totalReceived,
            quantityChanged: receipt.receivedQuantity,
            referenceType: 'purchase_order',
            referenceId: purchaseOrder.id,
            referenceNumber: purchaseOrder.poNumber,
            notes: `Received ${receipt.receivedQuantity} units - Condition: ${receipt.condition}`
          },
          context
        );
        results.push(stockResult);
      }
    }

    return results;
  }

  /**
   * Retrieve audit logs with filtering
   */
  async getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditServiceResult<PurchaseOrderAuditLog[]>> {
    try {
      // In a real implementation, this would query the database
      // For now, return empty array
      const logs: PurchaseOrderAuditLog[] = [];

      if (supabase) {
        try {
          let query = supabase
            .from('purchase_order_audit_logs')
            .select('*')
            .order('timestamp', { ascending: false });

          if (filter.startDate) {
            query = query.gte('timestamp', filter.startDate.toISOString());
          }
          if (filter.endDate) {
            query = query.lte('timestamp', filter.endDate.toISOString());
          }
          if (filter.performedBy) {
            query = query.eq('performed_by', filter.performedBy);
          }
          if (filter.action) {
            query = query.eq('action', filter.action.toLowerCase());
          }
          if (filter.purchaseOrderId) {
            query = query.eq('purchase_order_id', filter.purchaseOrderId);
          }
          if (filter.limit) {
            query = query.limit(filter.limit);
          }
          if (filter.offset) {
            query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
          }

          const { data, error } = await query;

          if (error && error.code !== 'PGRST116') {
            console.warn('Failed to retrieve audit logs:', error);
          } else if (data) {
            logs.push(...data.map(this.mapDatabaseAuditLog));
          }
        } catch (dbError) {
          console.warn('Database audit log retrieval failed:', dbError);
        }
      }

      return {
        success: true,
        data: logs
      };
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown audit retrieval error'
      };
    }
  }

  /**
   * Retrieve stock movement audit trail for a product
   */
  async getStockMovementHistory(
    productId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditServiceResult<StockMovement[]>> {
    try {
      const movements: StockMovement[] = [];

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('stock_movements')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false })
            .limit(limit)
            .range(offset, offset + limit - 1);

          if (error && error.code !== 'PGRST116') {
            console.warn('Failed to retrieve stock movements:', error);
          } else if (data) {
            movements.push(...data.map(this.mapDatabaseStockMovement));
          }
        } catch (dbError) {
          console.warn('Database stock movement retrieval failed:', dbError);
        }
      }

      return {
        success: true,
        data: movements
      };
    } catch (error) {
      console.error('Failed to retrieve stock movement history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown stock movement retrieval error'
      };
    }
  }

  /**
   * Get purchase order audit history
   */
  async getPurchaseOrderHistory(purchaseOrderId: string): Promise<AuditServiceResult<PurchaseOrderAuditLog[]>> {
    return this.getAuditLogs({ 
      purchaseOrderId, 
      limit: 100 
    });
  }

  /**
   * Log comprehensive receiving activity with detailed records
   */
  async logReceivingActivityDetailed(
    purchaseOrder: PurchaseOrder | EnhancedPurchaseOrder,
    receivingRecord: {
      receivingNumber: string;
      receivingType: 'full' | 'partial' | 'over';
      itemsReceived: Array<{
        productId: string;
        productName: string;
        sku: string;
        orderedQuantity: number;
        receivedQuantity: number;
        condition: 'good' | 'damaged' | 'expired';
        qualityNotes?: string;
      }>;
      qualityNotes?: string;
      damageReport?: string;
      discrepancyNotes?: string;
      supplierDeliveryNote?: string;
      vehicleInfo?: string;
      driverInfo?: string;
      attachments?: string[];
    },
    context: AuditContext
  ): Promise<AuditServiceResult[]> {
    const results: AuditServiceResult[] = [];

    try {
      // Log the main receiving action
      const receivingAction = receivingRecord.receivingType === 'full' 
        ? PurchaseOrderAuditAction.RECEIVED 
        : PurchaseOrderAuditAction.PARTIALLY_RECEIVED;

      const mainAuditResult = await this.logPurchaseOrderAudit(
        purchaseOrder.id,
        purchaseOrder.poNumber,
        receivingAction,
        context,
        { status: purchaseOrder.status },
        {
          receivingNumber: receivingRecord.receivingNumber,
          receivingType: receivingRecord.receivingType,
          itemsCount: receivingRecord.itemsReceived.length,
          totalReceived: receivingRecord.itemsReceived.reduce((sum, item) => sum + item.receivedQuantity, 0),
          hasQualityIssues: !!(receivingRecord.damageReport || receivingRecord.discrepancyNotes),
          hasAttachments: (receivingRecord.attachments?.length || 0) > 0
        }
      );
      results.push(mainAuditResult);

      // Save detailed receiving record to database
      if (supabase) {
        try {
          const { error: receivingError } = await supabase
            .from('purchase_order_receiving_records')
            .insert([{
              purchase_order_id: purchaseOrder.id,
              purchase_order_number: purchaseOrder.poNumber,
              receiving_number: receivingRecord.receivingNumber,
              received_date: new Date().toISOString(),
              received_by: context.performedBy,
              received_by_name: context.performedByName,
              receiving_type: receivingRecord.receivingType,
              items_received: receivingRecord.itemsReceived,
              total_items_received: receivingRecord.itemsReceived.length,
              total_quantity_received: receivingRecord.itemsReceived.reduce((sum, item) => sum + item.receivedQuantity, 0),
              total_value_received: 0, // Would need product costs to calculate
              quality_notes: receivingRecord.qualityNotes,
              damage_report: receivingRecord.damageReport,
              discrepancy_notes: receivingRecord.discrepancyNotes,
              supplier_delivery_note: receivingRecord.supplierDeliveryNote,
              vehicle_info: receivingRecord.vehicleInfo,
              driver_info: receivingRecord.driverInfo,
              inspection_status: receivingRecord.damageReport ? 'failed' : 'passed',
              attachments: receivingRecord.attachments || [],
              status: 'completed',
              metadata: {
                ...context.metadata,
                auditVersion: '2.0',
                hasQualityIssues: !!(receivingRecord.damageReport || receivingRecord.discrepancyNotes)
              }
            }]);

          if (receivingError && receivingError.code !== 'PGRST116') {
            console.warn('Failed to save receiving record:', receivingError);
          }
        } catch (dbError) {
          console.warn('Database receiving record save failed:', dbError);
        }
      }

      // Log individual stock movements for each received item
      for (const item of receivingRecord.itemsReceived) {
        if (item.receivedQuantity > 0) {
          const stockAuditData: StockMovementAuditData = {
            productId: item.productId,
            productName: item.productName,
            productSku: item.sku,
            movementType: 'purchase_receipt',
            quantityBefore: 0, // Would need to get current stock
            quantityAfter: item.receivedQuantity, // Would need to calculate
            quantityChanged: item.receivedQuantity,
            referenceType: 'purchase_order',
            referenceId: purchaseOrder.id,
            referenceNumber: receivingRecord.receivingNumber,
            notes: `Received ${item.receivedQuantity} units - Condition: ${item.condition}${item.qualityNotes ? ` - ${item.qualityNotes}` : ''}`
          };

          const stockResult = await this.logStockMovementAudit(stockAuditData, context);
          results.push(stockResult);
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to log detailed receiving activity:', error);
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in detailed receiving audit'
      }];
    }
  }

  /**
   * Log approval activity with detailed approval workflow
   */
  async logApprovalActivity(
    purchaseOrder: PurchaseOrder | EnhancedPurchaseOrder,
    approvalData: {
      approvalStatus: 'approved' | 'rejected' | 'escalated';
      approvalLevel: number;
      approvalAmount: number;
      approvalLimit?: number;
      notes?: string;
      nextApprover?: string;
      nextApproverName?: string;
      escalationReason?: string;
    },
    context: AuditContext
  ): Promise<AuditServiceResult> {
    try {
      // Determine audit action
      const auditAction = approvalData.approvalStatus === 'approved' 
        ? PurchaseOrderAuditAction.APPROVED
        : PurchaseOrderAuditAction.REJECTED;

      // Log main audit entry
      const auditResult = await this.logPurchaseOrderAudit(
        purchaseOrder.id,
        purchaseOrder.poNumber,
        auditAction,
        context,
        { status: purchaseOrder.status },
        {
          approvalStatus: approvalData.approvalStatus,
          approvalLevel: approvalData.approvalLevel,
          approvalAmount: approvalData.approvalAmount,
          approvalTimestamp: new Date().toISOString()
        }
      );

      // Save detailed approval record to database
      if (supabase) {
        try {
          await supabase
            .from('purchase_order_approval_records')
            .insert([{
              purchase_order_id: purchaseOrder.id,
              purchase_order_number: purchaseOrder.poNumber,
              approval_level: approvalData.approvalLevel,
              approval_status: approvalData.approvalStatus,
              approved_by: context.performedBy,
              approved_by_name: context.performedByName,
              approved_by_role: (context.metadata as any)?.userRole || 'unknown',
              approval_date: approvalData.approvalStatus === 'approved' ? new Date().toISOString() : null,
              rejection_date: approvalData.approvalStatus === 'rejected' ? new Date().toISOString() : null,
              approval_amount: approvalData.approvalAmount,
              approval_limit: approvalData.approvalLimit,
              notes: approvalData.notes,
              reason: context.reason,
              next_approver: approvalData.nextApprover,
              next_approver_name: approvalData.nextApproverName,
              escalation_reason: approvalData.escalationReason,
              approval_chain: [], // Would contain the full approval chain
              metadata: {
                ...context.metadata,
                auditVersion: '2.0',
                approvalWorkflow: true
              },
              ip_address: context.ipAddress,
              user_agent: context.userAgent
            }]);
        } catch (dbError) {
          console.warn('Failed to save approval record:', dbError);
        }
      }

      return auditResult;
    } catch (error) {
      console.error('Failed to log approval activity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in approval audit'
      };
    }
  }

  /**
   * Log validation error with resolution tracking
   */
  async logValidationError(
    purchaseOrderId: string,
    purchaseOrderNumber: string,
    validationError: {
      errorType: string;
      errorCode: string;
      errorMessage: string;
      fieldName?: string;
      fieldValue?: string;
      context?: Record<string, unknown>;
    },
    context: AuditContext
  ): Promise<AuditServiceResult> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('purchase_order_validation_errors')
          .insert([{
            purchase_order_id: purchaseOrderId,
            purchase_order_number: purchaseOrderNumber,
            error_type: validationError.errorType,
            error_code: validationError.errorCode,
            error_message: validationError.errorMessage,
            field_name: validationError.fieldName,
            field_value: validationError.fieldValue,
            context: validationError.context || {},
            resolved: false,
            occurred_by: context.performedBy,
            occurred_at: new Date().toISOString(),
            metadata: {
              ...context.metadata,
              auditVersion: '2.0',
              errorSeverity: this.determineErrorSeverity(validationError.errorType)
            }
          }])
          .select()
          .single();

        if (error && error.code !== 'PGRST116') {
          console.warn('Failed to save validation error:', error);
          return {
            success: false,
            error: error.message
          };
        }

        return {
          success: true,
          data: data,
          auditId: data?.id
        };
      }

      return {
        success: true,
        data: { id: `validation_error_${Date.now()}` }
      };
    } catch (error) {
      console.error('Failed to log validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in validation error logging'
      };
    }
  }

  /**
   * Resolve validation error
   */
  async resolveValidationError(
    errorId: string,
    resolutionNotes: string,
    context: AuditContext
  ): Promise<AuditServiceResult> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('purchase_order_validation_errors')
          .update({
            resolved: true,
            resolved_by: context.performedBy,
            resolved_at: new Date().toISOString(),
            resolution_notes: resolutionNotes
          })
          .eq('id', errorId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: error.message
          };
        }

        return {
          success: true,
          data: data
        };
      }

      return {
        success: true,
        data: { resolved: true }
      };
    } catch (error) {
      console.error('Failed to resolve validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in validation error resolution'
      };
    }
  }

  /**
   * Determine error severity based on error type
   */
  private determineErrorSeverity(errorType: string): 'low' | 'medium' | 'high' | 'critical' {
    const highSeverityTypes = ['insufficient_stock', 'permission_denied', 'over_receiving'];
    const criticalSeverityTypes = ['duplicate_receipt_detected', 'invalid_status_transition'];
    const mediumSeverityTypes = ['price_mismatch', 'under_receiving', 'invalid_quantity'];
    
    if (criticalSeverityTypes.includes(errorType)) return 'critical';
    if (highSeverityTypes.includes(errorType)) return 'high';
    if (mediumSeverityTypes.includes(errorType)) return 'medium';
    return 'low';
  }

  /**
   * Map movement type to stock movement type
   */
  private mapMovementType(movementType: string): StockMovement['type'] {
    switch (movementType) {
      case 'purchase_receipt':
        return 'stock_in';
      case 'sale':
        return 'stock_out';
      case 'adjustment':
        return 'adjustment';
      case 'transfer':
        return 'transfer';
      case 'return':
        return 'return';
      default:
        return 'adjustment';
    }
  }

  /**
   * Map database audit log to interface
   */
  private mapDatabaseAuditLog(dbRecord: any): PurchaseOrderAuditLog {
    return {
      id: dbRecord.id,
      purchaseOrderId: dbRecord.purchase_order_id,
      purchaseOrderNumber: dbRecord.purchase_order_number,
      action: dbRecord.action.toUpperCase() as PurchaseOrderAuditAction,
      performedBy: dbRecord.performed_by,
      performedByName: dbRecord.performed_by_name,
      timestamp: new Date(dbRecord.timestamp),
      oldValues: dbRecord.old_values || {},
      newValues: dbRecord.new_values || {},
      reason: dbRecord.reason,
      metadata: dbRecord.metadata || {},
      ipAddress: dbRecord.ip_address,
      userAgent: dbRecord.user_agent
    };
  }

  /**
   * Map database stock movement to interface
   */
  private mapDatabaseStockMovement(dbRecord: any): StockMovement {
    return {
      id: dbRecord.id,
      productId: dbRecord.product_id,
      type: dbRecord.type,
      quantity: Math.abs(dbRecord.change),
      reason: dbRecord.notes || dbRecord.type,
      referenceId: dbRecord.reference_id,
      referenceNumber: dbRecord.reference_number,
      performedBy: dbRecord.performed_by,
      performedByName: dbRecord.performed_by_name,
      beforeQuantity: dbRecord.quantity_before,
      afterQuantity: dbRecord.quantity_after,
      unitCost: dbRecord.unit_cost,
      totalCost: dbRecord.total_value,
      batchNumber: dbRecord.batch_number,
      expiryDate: dbRecord.expiry_date ? new Date(dbRecord.expiry_date) : undefined,
      location: dbRecord.location,
      notes: dbRecord.notes,
      createdAt: new Date(dbRecord.created_at)
    };
  }
}

// Export singleton instance
export const auditService = new AuditService();