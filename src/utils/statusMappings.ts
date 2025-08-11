/**
 * Centralized status mapping utilities for Purchase Order workflow
 * This eliminates duplicate mapping functions across different components
 */

import { PurchaseOrderStatus, EnhancedPurchaseOrderStatus } from '../types/business';

/**
 * Map legacy status to enhanced status
 * Used when we need to work with the enhanced state machine but have legacy data
 */
export const mapLegacyToEnhanced = (legacyStatus: PurchaseOrderStatus): EnhancedPurchaseOrderStatus => {
  const statusMap: Record<PurchaseOrderStatus, EnhancedPurchaseOrderStatus> = {
    'draft': 'draft',
    'sent': 'sent_to_supplier', // Approved orders are marked as 'sent'
    'received': 'fully_received',
    'partial': 'partially_received', 
    'cancelled': 'cancelled'
  };
  return statusMap[legacyStatus] || 'draft';
};

/**
 * Map enhanced status to legacy status
 * Used when we need to save to database which still uses legacy statuses
 */
export const mapEnhancedToLegacy = (enhancedStatus: EnhancedPurchaseOrderStatus): PurchaseOrderStatus => {
  const statusMap: Record<EnhancedPurchaseOrderStatus, PurchaseOrderStatus> = {
    'draft': 'draft',
    'pending_approval': 'draft', // Map pending approval back to draft for legacy
    'approved': 'sent', // Approved becomes 'sent' in legacy system
    'sent_to_supplier': 'sent', // Both enhanced statuses map to 'sent'
    'partially_received': 'partial',
    'fully_received': 'received',
    'cancelled': 'cancelled',
    'closed': 'received' // Closed orders are considered received in legacy
  };
  return statusMap[enhancedStatus] || 'draft';
};

/**
 * Get statuses that should appear in receiving queue
 */
export const getReceivableStatuses = (): PurchaseOrderStatus[] => {
  return ['sent', 'partial']; // Orders that can be received
};

/**
 * Check if a purchase order status makes it eligible for receiving
 */
export const isReceivableStatus = (status: PurchaseOrderStatus): boolean => {
  return getReceivableStatuses().includes(status);
};

/**
 * Get enhanced statuses that should appear in receiving queue
 */
export const getReceivableEnhancedStatuses = (): EnhancedPurchaseOrderStatus[] => {
  return ['sent_to_supplier', 'partially_received'];
};

/**
 * Check if an enhanced status makes the PO eligible for receiving
 */
export const isReceivableEnhancedStatus = (status: EnhancedPurchaseOrderStatus): boolean => {
  return getReceivableEnhancedStatuses().includes(status);
};