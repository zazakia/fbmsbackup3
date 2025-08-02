import { supabase } from '../utils/supabase';
import { 
  ProductMovementHistory, 
  TransferSlip, 
  ProductHistoryFilter, 
  ProductStockSummary,
  InventoryLocation
} from '../types/business';

// CREATE product movement history entry
export async function createProductMovement(movement: Omit<ProductMovementHistory, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('stock_movements')
    .insert([{
      product_id: movement.productId,
      product_name: movement.productName,
      product_sku: movement.productSku,
      type: movement.type,
      quantity: movement.quantity,
      previous_stock: movement.previousStock,
      new_stock: movement.newStock,
      unit_cost: movement.unitCost,
      total_value: movement.totalValue,
      reason: movement.reason,
      reference_number: movement.referenceNumber,
      reference_type: movement.referenceType,
      reference_id: movement.referenceId,
      location_id: movement.locationId,
      location_name: movement.locationName,
      from_location_id: movement.fromLocationId,
      from_location_name: movement.fromLocationName,
      to_location_id: movement.toLocationId,
      to_location_name: movement.toLocationName,
      batch_number: movement.batchNumber,
      expiry_date: movement.expiryDate?.toISOString(),
      performed_by: movement.performedBy,
      performed_by_name: movement.performedByName,
      approved_by: movement.approvedBy,
      approved_by_name: movement.approvedByName,
      notes: movement.notes,
      attachments: movement.attachments,
      status: movement.status
    }])
    .select()
    .single();

  if (data) {
    return {
      data: transformMovementFromDB(data),
      error: null
    };
  }

  return { data: null, error };
}

// READ product movements with filtering
export async function getProductMovements(filter: ProductHistoryFilter = {}, limit = 50, offset = 0) {
  let query = supabase
    .from('stock_movements')
    .select(`
      id,
      product_id,
      product_name,
      product_sku,
      type,
      quantity,
      previous_stock,
      new_stock,
      unit_cost,
      total_value,
      reason,
      reference_number,
      reference_type,
      reference_id,
      location_id,
      location_name,
      from_location_id,
      from_location_name,
      to_location_id,
      to_location_name,
      batch_number,
      expiry_date,
      performed_by,
      performed_by_name,
      approved_by,
      approved_by_name,
      notes,
      attachments,
      status,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filter.productId) {
    query = query.eq('product_id', filter.productId);
  }
  if (filter.productName) {
    query = query.ilike('product_name', `%${filter.productName}%`);
  }
  if (filter.movementType) {
    query = query.eq('type', filter.movementType);
  }
  if (filter.locationId) {
    query = query.or(`location_id.eq.${filter.locationId},from_location_id.eq.${filter.locationId},to_location_id.eq.${filter.locationId}`);
  }
  if (filter.fromDate) {
    query = query.gte('created_at', filter.fromDate.toISOString());
  }
  if (filter.toDate) {
    query = query.lte('created_at', filter.toDate.toISOString());
  }
  if (filter.performedBy) {
    query = query.eq('performed_by', filter.performedBy);
  }
  if (filter.status) {
    query = query.eq('status', filter.status);
  }
  if (filter.batchNumber) {
    query = query.eq('batch_number', filter.batchNumber);
  }
  if (filter.referenceNumber) {
    query = query.ilike('reference_number', `%${filter.referenceNumber}%`);
  }
  if (filter.minQuantity !== undefined) {
    query = query.gte('quantity', filter.minQuantity);
  }
  if (filter.maxQuantity !== undefined) {
    query = query.lte('quantity', filter.maxQuantity);
  }

  // Apply pagination
  if (limit) {
    query = query.limit(limit);
  }
  if (offset) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (data) {
    const transformedData = data.map(transformMovementFromDB);
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ single product movement
export async function getProductMovement(id: string) {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: transformMovementFromDB(data),
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE product movement
export async function updateProductMovement(id: string, updates: Partial<ProductMovementHistory>) {
  const updateData: Record<string, unknown> = {};
  
  if (updates.status) updateData.status = updates.status;
  if (updates.approvedBy) updateData.approved_by = updates.approvedBy;
  if (updates.approvedByName) updateData.approved_by_name = updates.approvedByName;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.attachments) updateData.attachments = updates.attachments;
  
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('stock_movements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (data) {
    return {
      data: transformMovementFromDB(data),
      error: null
    };
  }

  return { data: null, error };
}

// CREATE transfer slip
export async function createTransferSlip(transfer: Omit<TransferSlip, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('transfer_slips')
    .insert([{
      transfer_number: transfer.transferNumber,
      from_location_id: transfer.fromLocationId,
      from_location_name: transfer.fromLocationName,
      to_location_id: transfer.toLocationId,
      to_location_name: transfer.toLocationName,
      items: transfer.items,
      status: transfer.status,
      requested_by: transfer.requestedBy,
      requested_by_name: transfer.requestedByName,
      approved_by: transfer.approvedBy,
      approved_by_name: transfer.approvedByName,
      issued_by: transfer.issuedBy,
      issued_by_name: transfer.issuedByName,
      received_by: transfer.receivedBy,
      received_by_name: transfer.receivedByName,
      transfer_date: transfer.transferDate.toISOString(),
      expected_delivery_date: transfer.expectedDeliveryDate?.toISOString(),
      actual_delivery_date: transfer.actualDeliveryDate?.toISOString(),
      issued_date: transfer.issuedDate?.toISOString(),
      received_date: transfer.receivedDate?.toISOString(),
      vehicle_info: transfer.vehicleInfo,
      driver_info: transfer.driverInfo,
      notes: transfer.notes,
      attachments: transfer.attachments,
      total_items: transfer.totalItems,
      total_quantity: transfer.totalQuantity,
      total_value: transfer.totalValue
    }])
    .select()
    .single();

  if (data) {
    return {
      data: transformTransferFromDB(data),
      error: null
    };
  }

  return { data: null, error };
}

// READ transfer slips
export async function getTransferSlips(limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('transfer_slips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);

  if (data) {
    const transformedData = data.map(transformTransferFromDB);
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// UPDATE transfer slip
export async function updateTransferSlip(id: string, updates: Partial<TransferSlip>) {
  const updateData: Record<string, unknown> = {};
  
  if (updates.status) updateData.status = updates.status;
  if (updates.approvedBy) updateData.approved_by = updates.approvedBy;
  if (updates.approvedByName) updateData.approved_by_name = updates.approvedByName;
  if (updates.issuedBy) updateData.issued_by = updates.issuedBy;
  if (updates.issuedByName) updateData.issued_by_name = updates.issuedByName;
  if (updates.receivedBy) updateData.received_by = updates.receivedBy;
  if (updates.receivedByName) updateData.received_by_name = updates.receivedByName;
  if (updates.issuedDate) updateData.issued_date = updates.issuedDate.toISOString();
  if (updates.receivedDate) updateData.received_date = updates.receivedDate.toISOString();
  if (updates.actualDeliveryDate) updateData.actual_delivery_date = updates.actualDeliveryDate.toISOString();
  if (updates.vehicleInfo) updateData.vehicle_info = updates.vehicleInfo;
  if (updates.driverInfo) updateData.driver_info = updates.driverInfo;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.items) updateData.items = updates.items;
  
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('transfer_slips')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (data) {
    return {
      data: transformTransferFromDB(data),
      error: null
    };
  }

  return { data: null, error };
}

// GET product stock summary
export async function getProductStockSummary(productId: string): Promise<{ data: ProductStockSummary | null; error: Error | null }> {
  try {
    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, sku, stock, cost')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return { data: null, error: productError };
    }

    // Get all movements for this product
    const { data: movements, error: movementsError } = await getProductMovements({ productId });

    if (movementsError) {
      return { data: null, error: movementsError };
    }

    // Calculate summary
    const movementList = movements || [];
    const summary: ProductStockSummary = {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      currentStock: product.stock,
      totalStockIn: movementList
        .filter(m => ['stock_in', 'adjustment_in', 'transfer_in', 'return_in', 'initial_stock'].includes(m.type))
        .reduce((sum, m) => sum + m.quantity, 0),
      totalStockOut: movementList
        .filter(m => ['stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out'].includes(m.type))
        .reduce((sum, m) => sum + m.quantity, 0),
      totalAdjustments: movementList
        .filter(m => ['adjustment_in', 'adjustment_out', 'recount'].includes(m.type))
        .reduce((sum, m) => sum + (m.type === 'adjustment_out' ? -m.quantity : m.quantity), 0),
      totalTransfersIn: movementList
        .filter(m => m.type === 'transfer_in')
        .reduce((sum, m) => sum + m.quantity, 0),
      totalTransfersOut: movementList
        .filter(m => m.type === 'transfer_out')
        .reduce((sum, m) => sum + m.quantity, 0),
      totalReturns: movementList
        .filter(m => ['return_in', 'return_out'].includes(m.type))
        .reduce((sum, m) => sum + m.quantity, 0),
      totalDamaged: movementList
        .filter(m => m.type === 'damage_out')
        .reduce((sum, m) => sum + m.quantity, 0),
      lastMovementDate: movementList.length > 0 ? movementList[0].createdAt : undefined,
      lastMovementType: movementList.length > 0 ? movementList[0].type : undefined,
      averageCost: product.cost,
      totalValue: product.stock * product.cost,
      movements: movementList
    };

    return { data: summary, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// GET inventory locations
export async function getInventoryLocations(): Promise<{ data: InventoryLocation[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('inventory_locations')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (data) {
    const transformedData = data.map((location: Record<string, unknown>) => ({
      id: location.id,
      name: location.name,
      description: location.description,
      type: location.type,
      address: location.address,
      isActive: location.is_active,
      createdAt: new Date(location.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Generate next transfer number
export async function getNextTransferNumber(): Promise<{ data: string | null; error: Error | null }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const { data, error } = await supabase
    .from('transfer_slips')
    .select('transfer_number')
    .like('transfer_number', `TR-${year}${month}-%`)
    .order('transfer_number', { ascending: false })
    .limit(1);

  if (error) {
    return { data: null, error };
  }

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastTransferNumber = data[0].transfer_number;
    const lastNumber = parseInt(lastTransferNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  const transferNumber = `TR-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
  return { data: transferNumber, error: null };
}

// Helper functions to transform database objects
function transformMovementFromDB(dbMovement: Record<string, unknown>): ProductMovementHistory {
  return {
    id: dbMovement.id,
    productId: dbMovement.product_id,
    productName: dbMovement.product_name,
    productSku: dbMovement.product_sku,
    type: dbMovement.type,
    quantity: dbMovement.quantity,
    previousStock: dbMovement.previous_stock,
    newStock: dbMovement.new_stock,
    unitCost: dbMovement.unit_cost,
    totalValue: dbMovement.total_value,
    reason: dbMovement.reason,
    referenceNumber: dbMovement.reference_number,
    referenceType: dbMovement.reference_type,
    referenceId: dbMovement.reference_id,
    locationId: dbMovement.location_id,
    locationName: dbMovement.location_name,
    fromLocationId: dbMovement.from_location_id,
    fromLocationName: dbMovement.from_location_name,
    toLocationId: dbMovement.to_location_id,
    toLocationName: dbMovement.to_location_name,
    batchNumber: dbMovement.batch_number,
    expiryDate: dbMovement.expiry_date ? new Date(dbMovement.expiry_date) : undefined,
    performedBy: dbMovement.performed_by,
    performedByName: dbMovement.performed_by_name,
    approvedBy: dbMovement.approved_by,
    approvedByName: dbMovement.approved_by_name,
    notes: dbMovement.notes,
    attachments: dbMovement.attachments || [],
    status: dbMovement.status,
    createdAt: new Date(dbMovement.created_at),
    updatedAt: dbMovement.updated_at ? new Date(dbMovement.updated_at) : undefined
  };
}

function transformTransferFromDB(dbTransfer: Record<string, unknown>): TransferSlip {
  return {
    id: dbTransfer.id,
    transferNumber: dbTransfer.transfer_number,
    fromLocationId: dbTransfer.from_location_id,
    fromLocationName: dbTransfer.from_location_name,
    toLocationId: dbTransfer.to_location_id,
    toLocationName: dbTransfer.to_location_name,
    items: dbTransfer.items || [],
    status: dbTransfer.status,
    requestedBy: dbTransfer.requested_by,
    requestedByName: dbTransfer.requested_by_name,
    approvedBy: dbTransfer.approved_by,
    approvedByName: dbTransfer.approved_by_name,
    issuedBy: dbTransfer.issued_by,
    issuedByName: dbTransfer.issued_by_name,
    receivedBy: dbTransfer.received_by,
    receivedByName: dbTransfer.received_by_name,
    transferDate: new Date(dbTransfer.transfer_date),
    expectedDeliveryDate: dbTransfer.expected_delivery_date ? new Date(dbTransfer.expected_delivery_date) : undefined,
    actualDeliveryDate: dbTransfer.actual_delivery_date ? new Date(dbTransfer.actual_delivery_date) : undefined,
    issuedDate: dbTransfer.issued_date ? new Date(dbTransfer.issued_date) : undefined,
    receivedDate: dbTransfer.received_date ? new Date(dbTransfer.received_date) : undefined,
    vehicleInfo: dbTransfer.vehicle_info,
    driverInfo: dbTransfer.driver_info,
    notes: dbTransfer.notes,
    attachments: dbTransfer.attachments || [],
    totalItems: dbTransfer.total_items,
    totalQuantity: dbTransfer.total_quantity,
    totalValue: dbTransfer.total_value,
    createdAt: new Date(dbTransfer.created_at),
    updatedAt: dbTransfer.updated_at ? new Date(dbTransfer.updated_at) : undefined
  };
}