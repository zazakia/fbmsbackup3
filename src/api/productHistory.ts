import { supabase } from '../utils/supabase';
import {
  ProductMovementHistory,
  TransferSlip,
  ProductHistoryFilter,
  ProductStockSummary,
  InventoryLocation,
  ProductMovementType,
  MovementStatus,
  TransferStatus
} from '../types/business';

// CREATE product movement history entry
export async function createProductMovement(movement: Omit<ProductMovementHistory, 'id' | 'createdAt'>) {
  const payload = {
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
  };

  if (import.meta.env.DEV) {
    console.debug('[persist][stock_movements.insert-ext] payload', payload);
  }

  const { data, error } = await supabase
    .from('stock_movements')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[persist][stock_movements.insert-ext] error', { code: (error as any)?.code, message: error.message, details: (error as any)?.details, hint: (error as any)?.hint });
  }
  if (data && import.meta.env.DEV) {
    console.debug('[persist][stock_movements.insert-ext] success', { id: data.id, product_id: data.product_id });
  }

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

  if (import.meta.env.DEV) {
    console.debug('[persist][stock_movements.update] payload', { id, updateData });
  }

  const { data, error } = await supabase
    .from('stock_movements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[persist][stock_movements.update] error', { id, code: (error as any)?.code, message: error.message, details: (error as any)?.details, hint: (error as any)?.hint });
  }
  if (data && import.meta.env.DEV) {
    console.debug('[persist][stock_movements.update] success', { id: data.id });
  }

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
  if (import.meta.env.DEV) {
    console.debug('[persist][inventory_locations.select] query', { is_active: true });
  }

  const { data, error } = await supabase
    .from('inventory_locations')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('[persist][inventory_locations.select] error', { code: (error as any)?.code, message: error.message, details: (error as any)?.details, hint: (error as any)?.hint });
  }

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
    if (import.meta.env.DEV) {
      console.debug('[persist][inventory_locations.select] success', { count: transformedData.length });
    }
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
  const m = dbMovement as any;
  return {
    id: String(m.id),
    productId: String(m.product_id),
    productName: String(m.product_name),
    productSku: String(m.product_sku),
    type: String(m.type) as ProductMovementType,
    quantity: Number(m.quantity),
    previousStock: Number(m.previous_stock),
    newStock: Number(m.new_stock),
    unitCost: m.unit_cost !== undefined && m.unit_cost !== null ? Number(m.unit_cost) : undefined,
    totalValue: m.total_value !== undefined && m.total_value !== null ? Number(m.total_value) : undefined,
    reason: String(m.reason),
    referenceNumber: m.reference_number ? String(m.reference_number) : undefined,
    referenceType: m.reference_type ? String(m.reference_type) as ProductMovementHistory['referenceType'] : undefined,
    referenceId: m.reference_id ? String(m.reference_id) : undefined,
    locationId: m.location_id ? String(m.location_id) : undefined,
    locationName: m.location_name ? String(m.location_name) : undefined,
    fromLocationId: m.from_location_id ? String(m.from_location_id) : undefined,
    fromLocationName: m.from_location_name ? String(m.from_location_name) : undefined,
    toLocationId: m.to_location_id ? String(m.to_location_id) : undefined,
    toLocationName: m.to_location_name ? String(m.to_location_name) : undefined,
    batchNumber: m.batch_number ? String(m.batch_number) : undefined,
    expiryDate: m.expiry_date ? new Date(String(m.expiry_date)) : undefined,
    performedBy: String(m.performed_by),
    performedByName: m.performed_by_name ? String(m.performed_by_name) : undefined,
    approvedBy: m.approved_by ? String(m.approved_by) : undefined,
    approvedByName: m.approved_by_name ? String(m.approved_by_name) : undefined,
    notes: m.notes ? String(m.notes) : undefined,
    attachments: Array.isArray(m.attachments) ? (m.attachments as string[]) : [],
    status: String(m.status) as MovementStatus,
    createdAt: new Date(String(m.created_at)),
    updatedAt: m.updated_at ? new Date(String(m.updated_at)) : undefined
  };
}

function transformTransferFromDB(dbTransfer: Record<string, unknown>): TransferSlip {
  const t = dbTransfer as any;
  return {
    id: String(t.id),
    transferNumber: String(t.transfer_number),
    fromLocationId: String(t.from_location_id),
    fromLocationName: String(t.from_location_name),
    toLocationId: String(t.to_location_id),
    toLocationName: String(t.to_location_name),
    items: Array.isArray(t.items) ? (t.items as any[]).map((it) => ({
      id: String(it.id ?? `${Date.now()}-${Math.random()}`),
      productId: String(it.productId ?? it.product_id ?? ''),
      productName: String(it.productName ?? it.product_name ?? ''),
      productSku: String(it.productSku ?? it.product_sku ?? ''),
      batchNumber: it.batchNumber ? String(it.batchNumber) : undefined,
      requestedQuantity: Number(it.requestedQuantity ?? it.quantity ?? 0),
      approvedQuantity: it.approvedQuantity !== undefined ? Number(it.approvedQuantity) : undefined,
      issuedQuantity: it.issuedQuantity !== undefined ? Number(it.issuedQuantity) : undefined,
      receivedQuantity: it.receivedQuantity !== undefined ? Number(it.receivedQuantity) : undefined,
      unitCost: Number(it.unitCost ?? it.unit_cost ?? 0),
      totalValue: Number(it.totalValue ?? it.total_value ?? 0),
      condition: it.condition as any,
      notes: it.notes ? String(it.notes) : undefined,
      expiryDate: it.expiryDate ? new Date(String(it.expiryDate)) : undefined,
      serialNumbers: Array.isArray(it.serialNumbers) ? it.serialNumbers as string[] : undefined
    })) : [],
    status: String(t.status) as TransferStatus,
    requestedBy: String(t.requested_by),
    requestedByName: t.requested_by_name ? String(t.requested_by_name) : undefined,
    approvedBy: t.approved_by ? String(t.approved_by) : undefined,
    approvedByName: t.approved_by_name ? String(t.approved_by_name) : undefined,
    issuedBy: t.issued_by ? String(t.issued_by) : undefined,
    issuedByName: t.issued_by_name ? String(t.issued_by_name) : undefined,
    receivedBy: t.received_by ? String(t.received_by) : undefined,
    receivedByName: t.received_by_name ? String(t.received_by_name) : undefined,
    transferDate: new Date(String(t.transfer_date)),
    expectedDeliveryDate: t.expected_delivery_date ? new Date(String(t.expected_delivery_date)) : undefined,
    actualDeliveryDate: t.actual_delivery_date ? new Date(String(t.actual_delivery_date)) : undefined,
    issuedDate: t.issued_date ? new Date(String(t.issued_date)) : undefined,
    receivedDate: t.received_date ? new Date(String(t.received_date)) : undefined,
    vehicleInfo: t.vehicle_info ? String(t.vehicle_info) : undefined,
    driverInfo: t.driver_info ? String(t.driver_info) : undefined,
    notes: t.notes ? String(t.notes) : undefined,
    attachments: Array.isArray(t.attachments) ? t.attachments as string[] : [],
    totalItems: Number(t.total_items),
    totalQuantity: Number(t.total_quantity),
    totalValue: Number(t.total_value),
    createdAt: new Date(String(t.created_at)),
    updatedAt: t.updated_at ? new Date(String(t.updated_at)) : undefined
  };
}