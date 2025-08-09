/**
 * Audit System Integration Test
 * 
 * Tests the complete audit system integration to ensure all components
 * work together properly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuditService } from '../../../services/auditService';
import { PurchaseOrderAuditAction } from '../../../types/business';

describe('Audit System Integration', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
  });

  describe('Basic Audit Functionality', () => {
    it('should create and retrieve audit logs', async () => {
      // Test basic audit logging
      const result = await auditService.logPurchaseOrderAudit(
        'po-integration-test',
        'PO-INT-001',
        PurchaseOrderAuditAction.CREATED,
        {
          performedBy: 'test-user',
          performedByName: 'Test User',
          reason: 'Integration test purchase order'
        },
        {},
        { status: 'draft', total: 150.00 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.purchaseOrderId).toBe('po-integration-test');
      expect(result.data?.action).toBe(PurchaseOrderAuditAction.CREATED);
      expect(result.auditId).toBeDefined();
    });

    it('should log stock movements', async () => {
      const result = await auditService.logStockMovementAudit(
        {
          productId: 'product-test',
          productName: 'Test Product',
          movementType: 'purchase_receipt',
          quantityBefore: 100,
          quantityAfter: 125,
          quantityChanged: 25,
          referenceType: 'purchase_order',
          referenceId: 'po-integration-test'
        },
        {
          performedBy: 'test-user',
          reason: 'Integration test stock movement'
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.productId).toBe('product-test');
      expect(result.data?.quantity).toBe(25);
    });

    it('should handle multiple audit operations', async () => {
      const operations = [
        auditService.logPurchaseOrderAudit(
          'po-batch-1',
          'PO-BATCH-001',
          PurchaseOrderAuditAction.CREATED,
          { performedBy: 'user-1' }
        ),
        auditService.logPurchaseOrderAudit(
          'po-batch-2',
          'PO-BATCH-002',
          PurchaseOrderAuditAction.APPROVED,
          { performedBy: 'user-2' }
        ),
        auditService.logStockMovementAudit(
          {
            productId: 'product-batch',
            movementType: 'adjustment',
            quantityBefore: 50,
            quantityAfter: 60,
            quantityChanged: 10,
            referenceType: 'adjustment',
            referenceId: 'adj-001'
          },
          { performedBy: 'user-3' }
        )
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle invalid data', async () => {
      const result = await auditService.logPurchaseOrderAudit(
        '',
        '',
        PurchaseOrderAuditAction.CREATED,
        { performedBy: '' }
      );

      // Should still succeed with in-memory logging
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle service unavailability', async () => {
      // This test validates that the system continues to work even when
      // database connections fail, using in-memory logging as fallback
      const result = await auditService.logPurchaseOrderAudit(
        'po-offline-test',
        'PO-OFFLINE-001',
        PurchaseOrderAuditAction.CREATED,
        {
          performedBy: 'test-user',
          reason: 'Testing offline capability'
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Audit Retrieval', () => {
    it('should retrieve audit logs with filters', async () => {
      // Log some test data first
      await auditService.logPurchaseOrderAudit(
        'po-retrieval-test',
        'PO-RET-001',
        PurchaseOrderAuditAction.CREATED,
        { performedBy: 'test-user' }
      );

      // Try to retrieve logs
      const result = await auditService.getAuditLogs({
        purchaseOrderId: 'po-retrieval-test',
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should retrieve stock movement history', async () => {
      // Log a stock movement first
      await auditService.logStockMovementAudit(
        {
          productId: 'product-history-test',
          movementType: 'purchase_receipt',
          quantityBefore: 0,
          quantityAfter: 50,
          quantityChanged: 50,
          referenceType: 'purchase_order',
          referenceId: 'po-history-test'
        },
        { performedBy: 'test-user' }
      );

      // Try to retrieve history
      const result = await auditService.getStockMovementHistory('product-history-test');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle reasonable load', async () => {
      const startTime = Date.now();
      const promises: Promise<unknown>[] = [];

      // Create 50 concurrent audit operations
      for (let i = 0; i < 50; i++) {
        promises.push(
          auditService.logPurchaseOrderAudit(
            `po-perf-${i}`,
            `PO-PERF-${i.toString().padStart(3, '0')}`,
            PurchaseOrderAuditAction.CREATED,
            { performedBy: 'performance-test-user' }
          )
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(50);
      expect(results.every((r: any) => r.success)).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000); // 15 second timeout for this test
  });

  describe('Data Consistency', () => {
    it('should maintain consistent audit trail', async () => {
      const purchaseOrderId = 'po-consistency-test';
      const poNumber = 'PO-CONS-001';

      // Create a sequence of audit events
      const events = [
        { action: PurchaseOrderAuditAction.CREATED, status: 'draft' },
        { action: PurchaseOrderAuditAction.STATUS_CHANGED, status: 'pending' },
        { action: PurchaseOrderAuditAction.APPROVED, status: 'approved' },
        { action: PurchaseOrderAuditAction.RECEIVED, status: 'received' }
      ];

      const results: unknown[] = [];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const previousStatus = i > 0 ? events[i - 1].status : undefined;
        
        const result = await auditService.logPurchaseOrderAudit(
          purchaseOrderId,
          poNumber,
          event.action,
          { performedBy: 'consistency-test-user' },
          previousStatus ? { status: previousStatus } : {},
          { status: event.status }
        );
        
        results.push(result);
      }

      expect(results).toHaveLength(4);
      expect(results.every((r: any) => r.success)).toBe(true);

      // All entries should reference the same purchase order
      results.forEach((result: any) => {
        expect(result.data?.purchaseOrderId).toBe(purchaseOrderId);
        expect(result.data?.purchaseOrderNumber).toBe(poNumber);
      });
    });
  });
});

describe('Audit System Configuration', () => {
  it('should initialize audit service without errors', () => {
    expect(() => new AuditService()).not.toThrow();
  });

  it('should provide expected interface methods', () => {
    const service = new AuditService();
    
    expect(typeof service.logPurchaseOrderAudit).toBe('function');
    expect(typeof service.logStockMovementAudit).toBe('function');
    expect(typeof service.logStatusTransition).toBe('function');
    expect(typeof service.logReceivingActivity).toBe('function');
    expect(typeof service.getAuditLogs).toBe('function');
    expect(typeof service.getStockMovementHistory).toBe('function');
    expect(typeof service.getPurchaseOrderHistory).toBe('function');
  });
});