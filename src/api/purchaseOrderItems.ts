import { supabase } from '../utils/supabase';
import { PurchaseOrderItem } from '../types/business';

// PURCHASE ORDER ITEMS CRUD OPERATIONS

export interface PurchaseOrderItemDB {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  received_quantity: number;
  pending_quantity: number;
  unit_cost: number;
  total_cost: number;
  quality_status: 'pending' | 'approved' | 'rejected';
  batch_number?: string;
  expiry_date?: string;
  serial_numbers: string[];
  created_at: string;
  updated_at: string;
}

// CREATE purchase order items (bulk insert)
export async function createPurchaseOrderItems(
  purchaseOrderId: string, 
  items: Omit<PurchaseOrderItem, 'id'>[]
) {
  const insertData = items.map(item => ({
    purchase_order_id: purchaseOrderId,
    product_id: item.productId,
    product_name: item.productName,
    product_sku: item.sku,
    quantity: item.quantity,
    unit_cost: item.cost,
    // Initialize receiving fields
    received_quantity: 0,
    quality_status: 'pending' as const
  }));

  const { data, error } = await supabase
    .from('purchase_order_items')
    .insert(insertData)
    .select(`
      id,
      purchase_order_id,
      product_id,
      product_name,
      product_sku,
      quantity,
      received_quantity,
      pending_quantity,
      unit_cost,
      total_cost,
      quality_status,
      batch_number,
      expiry_date,
      serial_numbers,
      created_at,
      updated_at
    `);

  if (data) {
    return {
      data: data.map(transformPurchaseOrderItem),
      error: null
    };
  }

  return { data: null, error };
}

// READ purchase order items by PO ID
export async function getPurchaseOrderItems(purchaseOrderId: string) {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .select(`
      id,
      purchase_order_id,
      product_id,
      product_name,
      product_sku,
      quantity,
      received_quantity,
      pending_quantity,
      unit_cost,
      total_cost,
      quality_status,
      batch_number,
      expiry_date,
      serial_numbers,
      created_at,
      updated_at
    `)
    .eq('purchase_order_id', purchaseOrderId)
    .order('created_at', { ascending: true });

  if (data) {
    return {
      data: data.map(transformPurchaseOrderItem),
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE purchase order item (for receiving)
export async function updatePurchaseOrderItem(
  id: string, 
  updates: {
    received_quantity?: number;
    quality_status?: 'pending' | 'approved' | 'rejected';
    batch_number?: string;
    expiry_date?: Date;
    serial_numbers?: string[];
  }
) {
  const updateData: any = {};
  
  if (updates.received_quantity !== undefined) {
    updateData.received_quantity = updates.received_quantity;
  }
  if (updates.quality_status !== undefined) {
    updateData.quality_status = updates.quality_status;
  }
  if (updates.batch_number !== undefined) {
    updateData.batch_number = updates.batch_number;
  }
  if (updates.expiry_date !== undefined) {
    updateData.expiry_date = updates.expiry_date.toISOString();
  }
  if (updates.serial_numbers !== undefined) {
    updateData.serial_numbers = updates.serial_numbers;
  }

  const { data, error } = await supabase
    .from('purchase_order_items')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      purchase_order_id,
      product_id,
      product_name,
      product_sku,
      quantity,
      received_quantity,
      pending_quantity,
      unit_cost,
      total_cost,
      quality_status,
      batch_number,
      expiry_date,
      serial_numbers,
      created_at,
      updated_at
    `)
    .single();

  if (data) {
    return {
      data: transformPurchaseOrderItem(data),
      error: null
    };
  }

  return { data: null, error };
}

// Helper function to transform database record to domain model
function transformPurchaseOrderItem(dbItem: PurchaseOrderItemDB): PurchaseOrderItem & {
  receivedQuantity: number;
  pendingQuantity: number;
  qualityStatus: string;
  batchNumber?: string;
  expiryDate?: Date;
  serialNumbers: string[];
} {
  return {
    id: dbItem.id,
    productId: dbItem.product_id,
    productName: dbItem.product_name,
    sku: dbItem.product_sku,
    quantity: dbItem.quantity,
    cost: dbItem.unit_cost,
    total: dbItem.total_cost,
    receivedQuantity: dbItem.received_quantity,
    pendingQuantity: dbItem.pending_quantity,
    qualityStatus: dbItem.quality_status,
    batchNumber: dbItem.batch_number,
    expiryDate: dbItem.expiry_date ? new Date(dbItem.expiry_date) : undefined,
    serialNumbers: dbItem.serial_numbers || []
  };
}

// Get items pending receipt
export async function getItemsPendingReceipt() {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .select(`
      id,
      purchase_order_id,
      product_id,
      product_name,
      product_sku,
      quantity,
      received_quantity,
      pending_quantity,
      unit_cost,
      total_cost,
      quality_status,
      purchase_orders!inner(
        po_number,
        supplier_name,
        status,
        enhanced_status
      )
    `)
    .gt('pending_quantity', 0)
    .in('purchase_orders.enhanced_status', ['approved', 'sent_to_supplier', 'partially_received'])
    .order('purchase_orders.expected_date', { ascending: true, nullsLast: true });

  if (data) {
    return {
      data: data.map(item => ({
        ...transformPurchaseOrderItem(item as any),
        purchaseOrder: {
          poNumber: (item.purchase_orders as any).po_number,
          supplierName: (item.purchase_orders as any).supplier_name,
          status: (item.purchase_orders as any).status,
          enhancedStatus: (item.purchase_orders as any).enhanced_status
        }
      })),
      error: null
    };
  }

  return { data: null, error };
}

// Bulk update received quantities for multiple items
export async function bulkUpdateReceivedQuantities(updates: Array<{
  id: string;
  receivedQuantity: number;
  qualityStatus?: 'pending' | 'approved' | 'rejected';
}>) {
  const results = await Promise.allSettled(
    updates.map(update => 
      updatePurchaseOrderItem(update.id, {
        received_quantity: update.receivedQuantity,
        quality_status: update.qualityStatus
      })
    )
  );

  const successful = results
    .filter((result, index) => result.status === 'fulfilled' && result.value.data)
    .map((result, index) => ({ 
      id: updates[index].id, 
      data: (result as PromiseFulfilledResult<any>).value.data 
    }));

  const failed = results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.status === 'rejected' || !((result as any).value?.data))
    .map(({ index }) => ({ 
      id: updates[index].id, 
      error: 'Failed to update' 
    }));

  return {
    data: {
      successful,
      failed
    },
    error: null
  };
}
