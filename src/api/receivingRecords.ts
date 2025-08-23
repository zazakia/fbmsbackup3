import { supabase } from '../utils/supabase';
import {
  getValidUserId,
  handleForeignKeyError
} from '../utils/userValidation';

// Database record interfaces
interface DbReceivingRecord {
  id: string;
  purchase_order_id: string;
  received_date: string;
  received_by: string;
  notes?: string;
  status: string;
  purchase_order_receiving_line_items?: unknown[];
}

interface DbReceivingLineItem {
  id: string;
  product_id: string;
  quantity_received: number;
  unit_cost: number;
  condition: string;
  notes?: string;
}

// RECEIVING RECORDS CRUD OPERATIONS

export interface ReceivingRecordDB {
  id: string;
  purchase_order_id: string;
  received_by: string;
  received_by_name?: string;
  received_date: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ReceivingLineItemDB {
  id: string;
  purchase_order_item_id: string;
  receiving_record_id: string;
  product_id: string;
  product_name: string;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  condition: 'good' | 'damaged' | 'expired' | 'returned';
  quality_notes?: string;
  batch_number?: string;
  expiry_date?: string;
  serial_numbers: string[];
  location?: string;
  received_by: string;
  received_by_name?: string;
  received_date: string;
  created_at: string;
}

// CREATE receiving record
export async function createReceivingRecord(
  purchaseOrderId: string,
  receivingData: {
    receivedBy: string;
    receivedByName?: string;
    receivedDate?: Date;
    notes?: string;
    status?: 'pending' | 'completed' | 'cancelled';
  }
) {
  try {
    // Validate user before creating record to prevent 409 errors
    const userValidation = await getValidUserId(
      receivingData.receivedBy, 
      null, // no email provided
      true  // allow system fallback
    );

    if (!userValidation.isValid) {
      return {
        data: null,
        error: new Error(`User validation failed: ${userValidation.error}`)
      };
    }

    const insertData = {
      purchase_order_id: purchaseOrderId,
      received_by: userValidation.userId,
      received_by_name: receivingData.receivedByName || userValidation.userName,
      received_date: (receivingData.receivedDate || new Date()).toISOString(),
      notes: receivingData.notes,
      status: receivingData.status || 'completed'
    };

    const { data, error } = await supabase
      .from('purchase_order_receiving_records')
      .insert([insertData])
      .select(`
        id,
        purchase_order_id,
        received_by,
        received_by_name,
        received_date,
        notes,
        status,
        created_at
      `)
      .single();

    if (error) {
      // Handle foreign key constraint violations
      const errorHandler = await handleForeignKeyError(error, 'creating receiving record');
      
      if (errorHandler.shouldRetry && errorHandler.fallbackUserId) {
        // Retry with system user
        const retryData = {
          ...insertData,
          received_by: errorHandler.fallbackUserId,
          received_by_name: errorHandler.fallbackUserName
        };

        const { data: retryResult, error: retryError } = await supabase
          .from('purchase_order_receiving_records')
          .insert([retryData])
          .select(`
            id,
            purchase_order_id,
            received_by,
            received_by_name,
            received_date,
            notes,
            status,
            created_at
          `)
          .single();

        if (retryResult) {
          console.warn('Used system user fallback for receiving record');
          return {
            data: transformReceivingRecord(retryResult),
            error: null
          };
        }

        return { data: null, error: retryError };
      }

      return { data: null, error };
    }

    if (data) {
      return {
        data: transformReceivingRecord(data),
        error: null
      };
    }

    return { data: null, error: new Error('No data returned') };
  } catch (error) {
    console.error('Error in createReceivingRecord:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

// CREATE receiving line item
export async function createReceivingLineItem(
  receivingRecordId: string,
  lineItemData: {
    purchaseOrderItemId: string;
    productId: string;
    productName: string;
    quantityReceived: number;
    unitCost: number;
    condition?: 'good' | 'damaged' | 'expired' | 'returned';
    qualityNotes?: string;
    batchNumber?: string;
    expiryDate?: Date;
    serialNumbers?: string[];
    location?: string;
    receivedBy: string;
    receivedByName?: string;
    receivedDate?: Date;
  }
) {
  const insertData = {
    receiving_record_id: receivingRecordId,
    purchase_order_item_id: lineItemData.purchaseOrderItemId,
    product_id: lineItemData.productId,
    product_name: lineItemData.productName,
    quantity_received: lineItemData.quantityReceived,
    unit_cost: lineItemData.unitCost,
    condition: lineItemData.condition || 'good',
    quality_notes: lineItemData.qualityNotes,
    batch_number: lineItemData.batchNumber,
    expiry_date: lineItemData.expiryDate?.toISOString(),
    serial_numbers: lineItemData.serialNumbers || [],
    location: lineItemData.location,
    received_by: lineItemData.receivedBy,
    received_by_name: lineItemData.receivedByName,
    received_date: (lineItemData.receivedDate || new Date()).toISOString()
  };

  const { data, error } = await supabase
    .from('purchase_order_receiving_line_items')
    .insert([insertData])
    .select(`
      id,
      purchase_order_item_id,
      receiving_record_id,
      product_id,
      product_name,
      quantity_received,
      unit_cost,
      total_cost,
      condition,
      quality_notes,
      batch_number,
      expiry_date,
      serial_numbers,
      location,
      received_by,
      received_by_name,
      received_date,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: transformReceivingLineItem(data),
      error: null
    };
  }

  return { data: null, error };
}

// READ receiving records for a purchase order
export async function getReceivingRecords(purchaseOrderId: string) {
  const { data, error } = await supabase
    .from('purchase_order_receiving_records')
    .select(`
      id,
      purchase_order_id,
      received_by,
      received_by_name,
      received_date,
      notes,
      status,
      created_at
    `)
    .eq('purchase_order_id', purchaseOrderId)
    .order('received_date', { ascending: false });

  if (data) {
    return {
      data: data.map(transformReceivingRecord),
      error: null
    };
  }

  return { data: null, error };
}

// READ receiving line items for a receiving record
export async function getReceivingLineItems(receivingRecordId: string) {
  const { data, error } = await supabase
    .from('purchase_order_receiving_line_items')
    .select(`
      id,
      purchase_order_item_id,
      receiving_record_id,
      product_id,
      product_name,
      quantity_received,
      unit_cost,
      total_cost,
      condition,
      quality_notes,
      batch_number,
      expiry_date,
      serial_numbers,
      location,
      received_by,
      received_by_name,
      received_date,
      created_at
    `)
    .eq('receiving_record_id', receivingRecordId)
    .order('created_at', { ascending: true });

  if (data) {
    return {
      data: data.map(transformReceivingLineItem),
      error: null
    };
  }

  return { data: null, error };
}

// READ full receiving history for a purchase order
export async function getFullReceivingHistory(purchaseOrderId: string) {
  const { data, error } = await supabase
    .from('purchase_order_receiving_records')
    .select(`
      id,
      purchase_order_id,
      received_by,
      received_by_name,
      received_date,
      notes,
      status,
      created_at,
      purchase_order_receiving_line_items(
        id,
        purchase_order_item_id,
        product_id,
        product_name,
        quantity_received,
        unit_cost,
        total_cost,
        condition,
        quality_notes,
        batch_number,
        expiry_date,
        serial_numbers,
        location,
        received_by,
        received_by_name,
        received_date
      )
    `)
    .eq('purchase_order_id', purchaseOrderId)
    .order('received_date', { ascending: false });

  if (data) {
    return {
      data: data.map(record => ({
        ...transformReceivingRecord(record as DbReceivingRecord),
        lineItems: (record.purchase_order_receiving_line_items as DbReceivingLineItem[] || [])
          .map(transformReceivingLineItem)
      })),
      error: null
    };
  }

  return { data: null, error };
}

// Process comprehensive receiving with both records and line items
export async function processComprehensiveReceiving(
  purchaseOrderId: string,
  receivingData: {
    receivedBy: string;
    receivedByName?: string;
    receivedDate?: Date;
    notes?: string;
    status?: 'pending' | 'completed' | 'cancelled';
    lineItems: Array<{
      purchaseOrderItemId: string;
      productId: string;
      productName: string;
      quantityReceived: number;
      unitCost: number;
      condition?: 'good' | 'damaged' | 'expired' | 'returned';
      qualityNotes?: string;
      batchNumber?: string;
      expiryDate?: Date;
      serialNumbers?: string[];
      location?: string;
    }>;
  }
) {
  // Start transaction-like behavior with error handling
  const appliedChanges: Array<{ type: 'record' | 'lineItem', id: string }> = [];

  try {
    // Pre-validate user to prevent errors during processing
    const userValidation = await getValidUserId(
      receivingData.receivedBy, 
      null, 
      true
    );

    if (!userValidation.isValid) {
      return {
        data: null,
        error: new Error(`User validation failed: ${userValidation.error}`)
      };
    }

    // Use validated user data
    const validatedReceivingData = {
      ...receivingData,
      receivedBy: userValidation.userId!,
      receivedByName: receivingData.receivedByName || userValidation.userName
    };

    // 1. Create receiving record
    const recordResult = await createReceivingRecord(purchaseOrderId, validatedReceivingData);

    if (recordResult.error || !recordResult.data) {
      return {
        data: null,
        error: recordResult.error || new Error('Failed to create receiving record')
      };
    }

    const receivingRecordId = recordResult.data.id;
    appliedChanges.push({ type: 'record', id: receivingRecordId });

    // 2. Create line items
    const lineItemResults = [];
    for (const lineItem of receivingData.lineItems) {
      const lineItemResult = await createReceivingLineItem(receivingRecordId, {
        ...lineItem,
        receivedBy: receivingData.receivedBy,
        receivedByName: receivingData.receivedByName,
        receivedDate: receivingData.receivedDate
      });

      if (lineItemResult.error || !lineItemResult.data) {
        console.error('Failed to create line item:', lineItemResult.error);
        // Continue with other line items but log the failure
        continue;
      }

      lineItemResults.push(lineItemResult.data);
      appliedChanges.push({ type: 'lineItem', id: lineItemResult.data.id });
    }

    // 3. Update purchase order items with received quantities
    // (This would integrate with the purchaseOrderItems API)
    const { updatePurchaseOrderItem } = await import('./purchaseOrderItems');
    
    for (const lineItem of receivingData.lineItems) {
      try {
        // Get current received quantity
        const { getPurchaseOrderItems } = await import('./purchaseOrderItems');
        const itemsResult = await getPurchaseOrderItems(purchaseOrderId);
        
        if (itemsResult.data) {
          const currentItem = itemsResult.data.find(item => item.id === lineItem.purchaseOrderItemId);
          if (currentItem) {
            const newReceivedQuantity = currentItem.receivedQuantity + lineItem.quantityReceived;
            
            await updatePurchaseOrderItem(lineItem.purchaseOrderItemId, {
              received_quantity: newReceivedQuantity,
              batch_number: lineItem.batchNumber,
              expiry_date: lineItem.expiryDate,
              serial_numbers: lineItem.serialNumbers
            });
          }
        }
      } catch (updateError) {
        console.error('Failed to update purchase order item:', updateError);
        // Continue with processing but log the error
      }
    }

    return {
      data: {
        receivingRecord: recordResult.data,
        lineItems: lineItemResults,
        totalItemsProcessed: lineItemResults.length,
        totalQuantityReceived: receivingData.lineItems.reduce((sum, item) => sum + item.quantityReceived, 0)
      },
      error: null
    };

  } catch (error) {
    console.error('Error in comprehensive receiving process:', error);

    // Attempt cleanup of created records (basic rollback)
    for (const change of appliedChanges) {
      try {
        if (change.type === 'record') {
          await supabase
            .from('purchase_order_receiving_records')
            .delete()
            .eq('id', change.id);
        } else if (change.type === 'lineItem') {
          await supabase
            .from('purchase_order_receiving_line_items')
            .delete()
            .eq('id', change.id);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup during rollback:', cleanupError);
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error in comprehensive receiving')
    };
  }
}

// Helper transformation functions
function transformReceivingRecord(dbRecord: ReceivingRecordDB) {
  return {
    id: dbRecord.id,
    purchaseOrderId: dbRecord.purchase_order_id,
    receivedBy: dbRecord.received_by,
    receivedByName: dbRecord.received_by_name,
    receivedDate: new Date(dbRecord.received_date),
    notes: dbRecord.notes,
    status: dbRecord.status,
    createdAt: new Date(dbRecord.created_at)
  };
}

function transformReceivingLineItem(dbLineItem: ReceivingLineItemDB) {
  return {
    id: dbLineItem.id,
    purchaseOrderItemId: dbLineItem.purchase_order_item_id,
    receivingRecordId: dbLineItem.receiving_record_id,
    productId: dbLineItem.product_id,
    productName: dbLineItem.product_name,
    quantityReceived: dbLineItem.quantity_received,
    unitCost: dbLineItem.unit_cost,
    totalCost: dbLineItem.total_cost,
    condition: dbLineItem.condition,
    qualityNotes: dbLineItem.quality_notes,
    batchNumber: dbLineItem.batch_number,
    expiryDate: dbLineItem.expiry_date ? new Date(dbLineItem.expiry_date) : undefined,
    serialNumbers: dbLineItem.serial_numbers || [],
    location: dbLineItem.location,
    receivedBy: dbLineItem.received_by,
    receivedByName: dbLineItem.received_by_name,
    receivedDate: new Date(dbLineItem.received_date),
    createdAt: new Date(dbLineItem.created_at)
  };
}

// Get receiving statistics for dashboard
export async function getReceivingStatistics(dateRange?: { startDate: Date; endDate: Date }) {
  let query = supabase
    .from('purchase_order_receiving_records')
    .select(`
      id,
      status,
      received_date,
      purchase_order_receiving_line_items(quantity_received, total_cost)
    `);

  if (dateRange) {
    query = query
      .gte('received_date', dateRange.startDate.toISOString())
      .lte('received_date', dateRange.endDate.toISOString());
  }

  const { data, error } = await query;

  if (data) {
    const stats = {
      totalReceivingRecords: data.length,
      completedRecords: data.filter(r => r.status === 'completed').length,
      pendingRecords: data.filter(r => r.status === 'pending').length,
      totalItemsReceived: data.reduce((sum, record) => 
        sum + (record.purchase_order_receiving_line_items as any[]).reduce((itemSum, item) => 
          itemSum + item.quantity_received, 0), 0),
      totalValueReceived: data.reduce((sum, record) => 
        sum + (record.purchase_order_receiving_line_items as DbReceivingLineItem[]).reduce((itemSum, item) =>
          itemSum + (item as unknown as { total_cost: number }).total_cost, 0), 0)
    };

    return { data: stats, error: null };
  }

  return { data: null, error };
}
