import { supabase } from '../utils/supabase';
import { 
  PurchaseOrder, 
  PurchaseOrderItem, 
  Supplier, 
  PurchaseOrderStatus, 
  EnhancedPurchaseOrderStatus,
  StatusTransition,
  ReceivingRecord,
  PurchaseOrderAuditAction 
} from '../types/business';
import { auditService, AuditContext } from '../services/auditService';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

// SUPPLIER CRUD OPERATIONS

// CREATE supplier
export async function createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{
      name: supplier.name,
      contact_person: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      province: supplier.province,
      zip_code: supplier.zipCode,
      is_active: supplier.isActive
    }])
    .select(`
      id,
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      is_active,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        contactPerson: data.contact_person,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.province,
        zipCode: data.zip_code,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL suppliers
export async function getSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      id,
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      is_active,
      created_at
    `)
    .order('name', { ascending: true });

  if (data) {
    const transformedData = data.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      province: supplier.province,
      zipCode: supplier.zip_code,
      isActive: supplier.is_active,
      createdAt: new Date(supplier.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE supplier
export async function getSupplier(id: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      id,
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      is_active,
      created_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        contactPerson: data.contact_person,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.province,
        zipCode: data.zip_code,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE supplier
export async function updateSupplier(id: string, updates: Partial<Omit<Supplier, 'id' | 'createdAt'>>) {
  const updateData: Partial<{ name: string; contact_person: string; email: string; phone: string; address: string; city: string; province: string; zip_code: string; is_active: boolean }> = {};
  
  if (updates.name) updateData.name = updates.name;
  if (updates.contactPerson !== undefined) updateData.contact_person = updates.contactPerson;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.city !== undefined) updateData.city = updates.city;
  if (updates.province !== undefined) updateData.province = updates.province;
  if (updates.zipCode !== undefined) updateData.zip_code = updates.zipCode;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('suppliers')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      is_active,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        contactPerson: data.contact_person,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.province,
        zipCode: data.zip_code,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE supplier
export async function deleteSupplier(id: string) {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get active suppliers
export async function getActiveSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      id,
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      province,
      zip_code,
      is_active,
      created_at
    `)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (data) {
    const transformedData = data.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      province: supplier.province,
      zipCode: supplier.zip_code,
      isActive: supplier.is_active,
      createdAt: new Date(supplier.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// PURCHASE ORDER CRUD OPERATIONS

// Get current user context for audit logging
function getCurrentUserContext(additionalContext?: Partial<AuditContext>): AuditContext {
  const { user } = useSupabaseAuthStore.getState();
  
  return {
    performedBy: user?.id || 'anonymous',
    performedByName: user?.user_metadata?.full_name || user?.email || 'Unknown User',
    ipAddress: undefined, // IP address not available in browser environment
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    ...additionalContext
  };
}

// CREATE purchase order with audit logging
export async function createPurchaseOrder(purchaseOrder: Omit<PurchaseOrder, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([{
      po_number: purchaseOrder.poNumber,
      supplier_id: purchaseOrder.supplierId,
      supplier_name: purchaseOrder.supplierName,
      items: purchaseOrder.items,
      subtotal: purchaseOrder.subtotal,
      tax: purchaseOrder.tax,
      total: purchaseOrder.total,
      status: purchaseOrder.status,
      expected_date: purchaseOrder.expectedDate?.toISOString(),
      received_date: purchaseOrder.receivedDate?.toISOString(),
      created_by: purchaseOrder.createdBy || null // Handle null/undefined values properly
    }])
    .select(`
      id,
      po_number,
      supplier_id,
      supplier_name,
      items,
      subtotal,
      tax,
      total,
      status,
      expected_date,
      received_date,
      created_by,
      created_at
    `)
    .single();

  if (data) {
    const result = {
      data: {
        id: data.id,
        poNumber: data.po_number,
        supplierId: data.supplier_id,
        supplierName: data.supplier_name,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        status: data.status,
        expectedDate: data.expected_date ? new Date(data.expected_date) : undefined,
        receivedDate: data.received_date ? new Date(data.received_date) : undefined,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at)
      },
      error: null
    };

    // Log audit trail for PO creation
    try {
      const auditContext = getCurrentUserContext({
        reason: `Purchase order created: ${data.po_number}`,
        metadata: {
          supplierName: data.supplier_name,
          itemCount: Array.isArray(data.items) ? data.items.length : 0,
          total: data.total
        }
      });

      await auditService.logPurchaseOrderAudit(
        data.id,
        data.po_number,
        PurchaseOrderAuditAction.CREATED,
        auditContext,
        {},
        {
          status: data.status,
          supplierName: data.supplier_name,
          total: data.total,
          itemCount: Array.isArray(data.items) ? data.items.length : 0
        }
      );
    } catch (auditError) {
      console.warn('Failed to log purchase order creation audit:', auditError);
    }

    return result;
  }

  return { data: null, error };
}

// READ ALL purchase orders
export async function getPurchaseOrders(limit?: number, offset?: number) {
  let query = supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      supplier_id,
      supplier_name,
      items,
      subtotal,
      tax,
      total,
      status,
      expected_date,
      received_date,
      created_by,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }
  if (offset) {
    query = query.range(offset, offset + (limit || 50) - 1);
  }

  const { data, error } = await query;

  if (data) {
    const transformedData = data.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      supplierId: po.supplier_id,
      supplierName: po.supplier_name,
      items: po.items,
      subtotal: po.subtotal,
      tax: po.tax,
      total: po.total,
      status: po.status,
      enhancedStatus: po.enhanced_status,
      expectedDate: po.expected_date ? new Date(po.expected_date) : undefined,
      receivedDate: po.received_date ? new Date(po.received_date) : undefined,
      createdBy: po.created_by,
      createdAt: new Date(po.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE purchase order
export async function getPurchaseOrder(id: string) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      supplier_id,
      supplier_name,
      items,
      subtotal,
      tax,
      total,
      status,
      expected_date,
      received_date,
      created_by,
      created_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        poNumber: data.po_number,
        supplierId: data.supplier_id,
        supplierName: data.supplier_name,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        status: data.status,
        enhancedStatus: data.status, // Fallback to status until enhanced_status is available
        expectedDate: data.expected_date ? new Date(data.expected_date) : undefined,
        receivedDate: data.received_date ? new Date(data.received_date) : undefined,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE purchase order with audit logging
export async function updatePurchaseOrder(id: string, updates: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>) {
  // Get current PO state for audit comparison
  const currentResult = await getPurchaseOrder(id);
  const currentPO = currentResult.data;
  // Align update shape with DB columns
  const updateData: Partial<{
    po_number: string;
    supplier_id: string;
    supplier_name: string;
    expected_date: string;
    status: string;
    enhanced_status: string;
    notes: string;
    items: PurchaseOrderItem[];
    total: number;
    subtotal: number;
    tax: number;
    received_date: string;
    created_by: string | null;
    approved_by: string | null;
    approved_at: string | null;
  }> = {};
  
  if (updates.poNumber) updateData.po_number = updates.poNumber;
  if (updates.supplierId) updateData.supplier_id = updates.supplierId;
  if (updates.supplierName) updateData.supplier_name = updates.supplierName;
  if (updates.items) updateData.items = updates.items;
  if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
  if (updates.tax !== undefined) updateData.tax = updates.tax;
  if (updates.total !== undefined) updateData.total = updates.total;
  if (updates.status) updateData.status = updates.status;
  if (updates.enhancedStatus) updateData.enhanced_status = updates.enhancedStatus; // ✅ Re-enabled: Schema has this column
  if (updates.expectedDate !== undefined) updateData.expected_date = updates.expectedDate?.toISOString() as string;
  if (updates.receivedDate !== undefined) updateData.received_date = updates.receivedDate ? updates.receivedDate.toISOString() : null;
  if (updates.createdBy !== undefined) updateData.created_by = updates.createdBy ?? null;
  
  // Handle approval fields - map to database column names
  if (updates.approved_by !== undefined) updateData.approved_by = updates.approved_by;
  if (updates.approved_at !== undefined) updateData.approved_at = updates.approved_at;

  const { data, error } = await supabase
    .from('purchase_orders')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      po_number,
      supplier_id,
      supplier_name,
      items,
      subtotal,
      tax,
      total,
      status,
      expected_date,
      received_date,
      created_by,
      created_at,
      enhanced_status,
      approved_by,
      approved_at
    `)
    .single();

  if (data) {
    const result = {
      data: {
        id: data.id,
        poNumber: data.po_number,
        supplierId: data.supplier_id,
        supplierName: data.supplier_name,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        status: data.status,
        enhancedStatus: data.status, // Fallback to status until enhanced_status is available
        expectedDate: data.expected_date ? new Date(data.expected_date) : undefined,
        receivedDate: data.received_date ? new Date(data.received_date) : undefined,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at)
      },
      error: null
    };

    // Log audit trail for PO update
    try {
      const auditContext = getCurrentUserContext({
        reason: `Purchase order updated: ${data.po_number}`,
        metadata: {
          updateFields: Object.keys(updates),
          supplierName: data.supplier_name
        }
      });

      // Determine audit action based on what changed
      let auditAction = PurchaseOrderAuditAction.UPDATED;
      if (updates.status && currentPO && updates.status !== currentPO.status) {
        auditAction = PurchaseOrderAuditAction.STATUS_CHANGED;
        if (updates.status === 'approved') {
          auditAction = PurchaseOrderAuditAction.APPROVED;
        } else if (updates.status === 'cancelled') {
          auditAction = PurchaseOrderAuditAction.CANCELLED;
        } else if (updates.status === 'received') {
          auditAction = PurchaseOrderAuditAction.RECEIVED;
        } else if (updates.status === 'partial') {
          auditAction = PurchaseOrderAuditAction.PARTIALLY_RECEIVED;
        }
      }

      const oldValues = currentPO ? {
        status: currentPO.status,
        supplierName: currentPO.supplierName,
        total: currentPO.total,
        itemCount: Array.isArray(currentPO.items) ? currentPO.items.length : 0
      } : {};

      const newValues = {
        status: data.status,
        supplierName: data.supplier_name,
        total: data.total,
        itemCount: Array.isArray(data.items) ? data.items.length : 0
      };

      await auditService.logPurchaseOrderAudit(
        data.id,
        data.po_number,
        auditAction,
        auditContext,
        oldValues,
        newValues
      );
    } catch (auditError) {
      console.warn('Failed to log purchase order update audit:', auditError);
    }

    return result;
  }

  return { data: null, error };
}

// DELETE purchase order
export async function deletePurchaseOrder(id: string) {
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get purchase orders by supplier
export async function getPurchaseOrdersBySupplier(supplierId: string) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      supplier_id,
      supplier_name,
      items,
      subtotal,
      tax,
      total,
      status,
      expected_date,
      received_date,
      created_by,
      created_at
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });

  if (data) {
    const transformedData = data.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      supplierId: po.supplier_id,
      supplierName: po.supplier_name,
      items: po.items,
      subtotal: po.subtotal,
      tax: po.tax,
      total: po.total,
      status: po.status,
      enhancedStatus: po.enhanced_status,
      expectedDate: po.expected_date ? new Date(po.expected_date) : undefined,
      receivedDate: po.received_date ? new Date(po.received_date) : undefined,
      createdBy: po.created_by,
      createdAt: new Date(po.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get purchase orders by status
export async function getPurchaseOrdersByStatus(status: PurchaseOrderStatus) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      supplier_id,
      supplier_name,
      items,
      subtotal,
      tax,
      total,
      status,
      enhanced_status,
      expected_date,
      received_date,
      created_by,
      created_at
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (data) {
    const transformedData = data.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      supplierId: po.supplier_id,
      supplierName: po.supplier_name,
      items: po.items,
      subtotal: po.subtotal,
      tax: po.tax,
      total: po.total,
      status: po.status,
      enhancedStatus: po.enhanced_status,
      expectedDate: po.expected_date ? new Date(po.expected_date) : undefined,
      receivedDate: po.received_date ? new Date(po.received_date) : undefined,
      createdBy: po.created_by,
      createdAt: new Date(po.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

/**
 * Get purchase orders for approval queue using enhanced statuses
 */
export async function getPurchaseOrdersForApproval() {
  console.log('🔍 Loading purchase orders for approval queue...');
  
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      supplier_id,
      supplier_name,
      items,
      subtotal,
      tax,
      total,
      status,
      enhanced_status,
      expected_date,
      received_date,
      created_by,
      created_at
    `)
    .in('enhanced_status', ['draft', 'pending_approval'])
    .order('created_at', { ascending: true }); // Oldest first for approval queue
  
  console.log('🔍 DEBUG: Approval queue query results:', { 
    count: data?.length || 0, 
    error: error?.message,
    statuses: data?.map(po => ({ id: po.id, enhanced_status: po.enhanced_status, status: po.status }))
  });

  if (data) {
    const transformedData = data.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      supplierId: po.supplier_id,
      supplierName: po.supplier_name,
      items: po.items || [],
      subtotal: po.subtotal || 0,
      tax: po.tax || 0,
      total: po.total || 0,
      status: po.enhanced_status || po.status, // Use enhanced_status as primary status
      enhancedStatus: po.enhanced_status,
      expectedDate: po.expected_date ? new Date(po.expected_date) : undefined,
      receivedDate: po.received_date ? new Date(po.received_date) : undefined,
      createdBy: po.created_by,
      createdAt: new Date(po.created_at)
    }));

    console.log('🔍 DEBUG: Transformed approval queue data:', transformedData.length, 'orders');
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Generate next PO number
export async function getNextPONumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Get the latest PO for this month
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('po_number')
    .like('po_number', `PO-${year}${month}-%`)
    .order('po_number', { ascending: false })
    .limit(1);

  if (error) {
    return { data: null, error };
  }

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastPONumber = data[0].po_number;
    const lastNumber = parseInt(lastPONumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  const poNumber = `PO-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
  return { data: poNumber, error: null };
}

interface ReceivingContext {
  receivedBy?: string;
  reason?: string;
  timestamp?: Date;
}

interface InventoryTransaction {
  productId: string;
  quantityDelta: number;
  referenceId: string;
  userId?: string;
  reason: string;
}

// Mark purchase order as received with enhanced idempotent logic and audit logging
export async function receivePurchaseOrder(
  id: string, 
  receivedItems?: PurchaseOrderItem[], 
  context?: ReceivingContext
) {
  // Enhanced idempotent receiving:
  // - Load current PO from DB with type safety
  // - Validate input and prevent double processing
  // - Calculate exact deltas needed for each item
  // - Apply inventory adjustments atomically with rollback capability
  // - Update PO with consistent receivedQuantity tracking
  // - Handle partial vs full receipt logic properly
  
  const inventoryTransactions: InventoryTransaction[] = [];
  
  try {
    // 1) Load and validate current PO
    const current = await getPurchaseOrder(id);
    if (current.error || !current.data) {
      return { 
        data: null, 
        error: current.error || new Error(`Purchase order with id ${id} not found`) 
      };
    }
    const po = current.data;

    // Validate PO status - only allow receiving for appropriate statuses
    if (!['draft', 'sent', 'partial', 'approved'].includes(po.status)) {
      return { 
        data: null, 
        error: new Error(`Cannot receive items for purchase order in status: ${po.status}`) 
      };
    }

    // Ensure items array exists and is valid
    if (!Array.isArray(po.items) || po.items.length === 0) {
      return { 
        data: null, 
        error: new Error('Purchase order has no items to receive') 
      };
    }

    // Normalize existing items with consistent receivedQuantity property  
    const existingItems = po.items.map(item => ({
      ...item,
      receivedQuantity: (item as PurchaseOrderItem & { receivedQty?: number; receivedQuantity?: number }).receivedQty || 
                       (item as PurchaseOrderItem & { receivedQty?: number; receivedQuantity?: number }).receivedQuantity || 0
    }));

    // 2) Build lookup map for incoming received items
    const incomingMap = new Map<string, PurchaseOrderItem>();
    if (Array.isArray(receivedItems)) {
      for (const item of receivedItems) {
        const key = item.productId || item.id;
        if (key) {
          // Validate incoming item has required fields
          if (!item.quantity || item.quantity < 0) {
            return { 
              data: null, 
              error: new Error(`Invalid received quantity for product ${key}: ${item.quantity}`) 
            };
          }
          incomingMap.set(key, item);
        }
      }
    }

    // 3) Calculate precise deltas for each line item
    interface ItemUpdate {
      index: number;
      productId: string;
      productName: string;
      orderedQuantity: number;
      previouslyReceived: number;
      receivingNow: number;
      newTotalReceived: number;
      isComplete: boolean;
    }

    const itemUpdates: ItemUpdate[] = [];
    const autoReceiveMode = !Array.isArray(receivedItems) || receivedItems.length === 0;

    for (let i = 0; i < existingItems.length; i++) {
      const item = existingItems[i];
      const productKey = item.productId || item.id;
      
      if (!productKey) {
        return { 
          data: null, 
          error: new Error(`Item at index ${i} missing productId`) 
        };
      }

      const orderedQuantity = Number(item.quantity) || 0;
      const previouslyReceived = Number(item.receivedQuantity) || 0;
      const incomingItem = incomingMap.get(productKey);

      // Calculate how much to receive in this operation
      let receivingNow = 0;
      
      if (autoReceiveMode) {
        // Auto mode: receive all remaining quantities
        receivingNow = Math.max(0, orderedQuantity - previouslyReceived);
      } else if (incomingItem) {
        // Explicit mode: validate and use provided quantities
        const requestedQuantity = Number(incomingItem.quantity) || 0;
        const maxReceivable = orderedQuantity - previouslyReceived;
        
        if (requestedQuantity > maxReceivable) {
          return { 
            data: null, 
            error: new Error(
              `Cannot receive ${requestedQuantity} units of ${item.productName}. ` +
              `Maximum receivable: ${maxReceivable} (ordered: ${orderedQuantity}, already received: ${previouslyReceived})`
            ) 
          };
        }
        
        receivingNow = requestedQuantity;
      }

      const newTotalReceived = previouslyReceived + receivingNow;
      const isComplete = newTotalReceived >= orderedQuantity;

      itemUpdates.push({
        index: i,
        productId: productKey,
        productName: item.productName || 'Unknown Product',
        orderedQuantity,
        previouslyReceived,
        receivingNow,
        newTotalReceived,
        isComplete
      });

      // Track inventory transactions for atomic application
      if (receivingNow > 0) {
        inventoryTransactions.push({
          productId: productKey,
          quantityDelta: receivingNow,
          referenceId: po.id,
          userId: context?.receivedBy || po.createdBy,
          reason: context?.reason || 'Purchase Order Receipt'
        });
      }
    }

    // 4) Validate that we have something to receive
    const totalReceivingNow = itemUpdates.reduce((sum, update) => sum + update.receivingNow, 0);
    if (totalReceivingNow <= 0) {
      return { 
        data: null, 
        error: new Error('No quantities specified for receiving') 
      };
    }

    // 5) Apply inventory adjustments atomically with rollback capability using audit-enabled stock API
    const { updateStockWithAudit } = await import('../api/stockMovementAuditAPI');
    const appliedTransactions: { productId: string; quantityDelta: number }[] = [];

    try {
      for (const transaction of inventoryTransactions) {
        const result = await updateStockWithAudit(
          transaction.productId,
          transaction.quantityDelta,
          'add',
          {
            referenceType: 'purchase_order',
            referenceId: transaction.referenceId,
            referenceNumber: po.poNumber,
            reason: transaction.reason,
            unitCost: po.items.find(item => item.productId === transaction.productId)?.cost
          }
        );

        if (result && 'error' in result && result.error) {
          throw new Error(`Failed to update inventory for product ${transaction.productId}: ${result.error.message}`);
        }

        appliedTransactions.push({
          productId: transaction.productId,
          quantityDelta: transaction.quantityDelta
        });
      }
    } catch (inventoryError) {
      // Rollback any successfully applied inventory changes
      console.error('Inventory update failed, attempting rollback:', inventoryError);
      
      for (const applied of appliedTransactions) {
        try {
          const { updateStock } = await import('../api/products');
          await updateStock(
            applied.productId,
            applied.quantityDelta,
            'subtract',
            {
              referenceId: po.id,
              userId: context?.receivedBy || po.createdBy,
              reason: 'Purchase Order Receipt Rollback'
            }
          );
        } catch (rollbackError) {
          console.error(`Failed to rollback inventory for product ${applied.productId}:`, rollbackError);
        }
      }

      return { 
        data: null, 
        error: inventoryError instanceof Error ? inventoryError : new Error('Inventory update failed') 
      };
    }

    // 6) Update PO items with new received quantities
    const updatedItems = existingItems.map((item, index) => {
      const update = itemUpdates[index];
      return {
        ...item,
        receivedQuantity: update.newTotalReceived,
        // Remove legacy receivedQty property for consistency
        receivedQty: undefined
      };
    });

    // 7) Determine new PO status
    const allItemsComplete = itemUpdates.every(update => update.isComplete);
    const anyItemsReceived = itemUpdates.some(update => update.newTotalReceived > 0);
    
    let nextStatus: PurchaseOrderStatus;
    let receivedDate: Date | undefined = po.receivedDate;

    if (allItemsComplete) {
      nextStatus = 'received';
      receivedDate = context?.timestamp || new Date();
    } else if (anyItemsReceived) {
      nextStatus = 'partial';
    } else {
      nextStatus = po.status; // Keep current status if nothing received
    }

    // 8) Log detailed receiving activity before persisting PO updates
    try {
      const auditContext = getCurrentUserContext({
        reason: context?.reason || `Purchase order receiving: ${totalReceivingNow} units`,
        metadata: {
          receivingType: allItemsComplete ? 'full' : 'partial',
          itemsReceived: itemUpdates.filter(u => u.receivingNow > 0).length,
          totalQuantityReceived: totalReceivingNow
        }
      });

      const receivingRecord = {
        receivingNumber: `REC-${po.poNumber}-${Date.now()}`,
        receivingType: allItemsComplete ? 'full' as const : 'partial' as const,
        itemsReceived: itemUpdates
          .filter(u => u.receivingNow > 0)
          .map(u => ({
            productId: u.productId,
            productName: u.productName,
            sku: po.items.find(item => item.productId === u.productId)?.sku || '',
            orderedQuantity: u.orderedQuantity,
            receivedQuantity: u.receivingNow,
            condition: 'good' as const
          })),
        qualityNotes: context?.reason || 'Goods received in good condition',
        vehicleInfo: undefined,
        driverInfo: undefined,
        attachments: []
      };

      await auditService.logReceivingActivityDetailed(
        po,
        receivingRecord,
        auditContext
      );
    } catch (auditError) {
      console.warn('Failed to log receiving activity audit:', auditError);
    }

    // 9) Persist PO updates
    const updateResult = await updatePurchaseOrder(id, {
      items: updatedItems,
      status: nextStatus,
      receivedDate
    });

    if (updateResult.error) {
      // If PO update fails, attempt to rollback inventory changes
      console.error('PO update failed, attempting inventory rollback:', updateResult.error);
      
      for (const applied of appliedTransactions) {
        try {
          const { updateStock } = await import('../api/products');
          await updateStock(
            applied.productId,
            applied.quantityDelta,
            'subtract',
            {
              referenceId: po.id,
              userId: context?.receivedBy || po.createdBy,
              reason: 'Purchase Order Update Failure Rollback'
            }
          );
        } catch (rollbackError) {
          console.error(`Failed to rollback inventory for product ${applied.productId}:`, rollbackError);
        }
      }
    }

    return { data: updateResult.data, error: updateResult.error };

  } catch (error) {
    console.error('Unexpected error in receivePurchaseOrder:', error);
    
    // Attempt to rollback any applied inventory transactions
    for (const applied of appliedTransactions) {
      try {
        const { updateStock } = await import('../api/products');
        await updateStock(
          applied.productId,
          applied.quantityDelta,
          'subtract',
          {
            referenceId: id,
            userId: context?.receivedBy,
            reason: 'Purchase Order Receipt Error Rollback'
          }
        );
      } catch (rollbackError) {
        console.error(`Failed to rollback inventory for product ${applied.productId}:`, rollbackError);
      }
    }

    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unexpected error during purchase order receiving') 
    };
  }
}

// ENHANCED API ENDPOINTS FOR NEW WORKFLOW

// Status transition validation
interface StatusTransitionRequest {
  purchaseOrderId: string;
  fromStatus: EnhancedPurchaseOrderStatus;
  toStatus: EnhancedPurchaseOrderStatus;
  reason?: string;
  performedBy?: string;
}

interface StatusTransitionResult {
  data: {
    isValid: boolean;
    canTransition: boolean;
    validTransitions: EnhancedPurchaseOrderStatus[];
    errors?: string[];
  } | null;
  error: Error | null;
}

// Get valid status transitions for a purchase order
export async function getValidStatusTransitions(purchaseOrderId: string): Promise<StatusTransitionResult> {
  try {
    // First get the current purchase order
    const result = await getPurchaseOrder(purchaseOrderId);
    if (result.error || !result.data) {
      return {
        data: null,
        error: result.error || new Error('Purchase order not found')
      };
    }

    const currentStatus = result.data.status;
    
    // Define valid transitions based on enhanced workflow
    const validTransitionsMap: Record<string, EnhancedPurchaseOrderStatus[]> = {
      'draft': ['pending_approval', 'cancelled'],
      'pending_approval': ['approved', 'draft', 'cancelled'],
      'approved': ['sent_to_supplier', 'partially_received', 'fully_received', 'cancelled'],
      'sent_to_supplier': ['partially_received', 'fully_received', 'cancelled'],
      'partially_received': ['fully_received', 'cancelled'],
      'fully_received': ['closed'],
      'cancelled': [],
      'closed': [],
      // Legacy status mappings
      'sent': ['partially_received', 'fully_received', 'cancelled'],
      'partial': ['fully_received', 'cancelled'],
      'received': ['closed']
    };

    const validTransitions = validTransitionsMap[currentStatus] || [];

    return {
      data: {
        isValid: true,
        canTransition: validTransitions.length > 0,
        validTransitions
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get valid transitions')
    };
  }
}

// Validate and execute status transition
export async function executeStatusTransition(request: StatusTransitionRequest): Promise<{data: PurchaseOrder | null, error: any}> {
  try {
    // Validate the transition is allowed
    const validationResult = await getValidStatusTransitions(request.purchaseOrderId);
    if (validationResult.error || !validationResult.data) {
      return {
        data: null,
        error: validationResult.error || new Error('Failed to validate transition')
      };
    }

    const { validTransitions } = validationResult.data;
    if (!validTransitions.includes(request.toStatus)) {
      return {
        data: null,
        error: new Error(`Invalid transition from ${request.fromStatus} to ${request.toStatus}`)
      };
    }

    // Get current purchase order
    const poResult = await getPurchaseOrder(request.purchaseOrderId);
    if (poResult.error || !poResult.data) {
      return {
        data: null,
        error: poResult.error || new Error('Purchase order not found')
      };
    }

    // Execute the status update
    const updateResult = await updatePurchaseOrder(request.purchaseOrderId, {
      status: request.toStatus as PurchaseOrderStatus
    });

    if (updateResult.error) {
      return {
        data: null,
        error: updateResult.error
      };
    }

    // Log the status transition
    try {
      const auditContext = getCurrentUserContext({
        reason: request.reason || `Status changed from ${request.fromStatus} to ${request.toStatus}`,
        metadata: {
          fromStatus: request.fromStatus,
          toStatus: request.toStatus,
          transitionType: 'status_change'
        }
      });

      await auditService.logPurchaseOrderAudit(
        request.purchaseOrderId,
        updateResult.data!.poNumber,
        PurchaseOrderAuditAction.STATUS_CHANGED,
        auditContext,
        { status: request.fromStatus },
        { status: request.toStatus }
      );
    } catch (auditError) {
      console.warn('Failed to log status transition audit:', auditError);
    }

    return updateResult;
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to execute status transition')
    };
  }
}

// Get purchase orders by enhanced status
export async function getPurchaseOrdersByEnhancedStatus(status: EnhancedPurchaseOrderStatus) {
  // Map enhanced status to legacy status for database query
  const statusMap: Record<EnhancedPurchaseOrderStatus, PurchaseOrderStatus[]> = {
    'draft': ['draft'],
    'pending_approval': ['draft'], // Extend logic to check approval flags
    'approved': ['sent'], // Map to existing 'sent' status
    'sent_to_supplier': ['sent'],
    'partially_received': ['partial'],
    'fully_received': ['received'],
    'cancelled': ['cancelled'],
    'closed': ['received'] // Extend logic to check closure flags
  };

  const dbStatuses = statusMap[status] || [status as PurchaseOrderStatus];
  
  try {
    // For now, query with the first mapped status
    // This can be enhanced with additional metadata fields in the future
    return await getPurchaseOrdersByStatus(dbStatuses[0]);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get purchase orders by enhanced status')
    };
  }
}

// Get purchase order status history
export async function getPurchaseOrderStatusHistory(purchaseOrderId: string): Promise<{data: StatusTransition[] | null, error: any}> {
  try {
    // For now, we'll simulate the history from audit logs
    // In a full implementation, this would query a dedicated status_transitions table
    const { data, error } = await supabase
      .from('purchase_order_audit_logs')
      .select('*')
      .eq('purchase_order_id', purchaseOrderId)
      .eq('action', 'status_changed')
      .order('timestamp', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    const statusHistory: StatusTransition[] = data?.map(log => ({
      id: log.id,
      fromStatus: log.old_values?.status as EnhancedPurchaseOrderStatus,
      toStatus: log.new_values?.status as EnhancedPurchaseOrderStatus,
      timestamp: new Date(log.timestamp),
      performedBy: log.performed_by,
      reason: log.reason,
      metadata: log.metadata
    })) || [];

    return { data: statusHistory, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get status history')
    };
  }
}

// RECEIVING API ENDPOINTS FOR PARTIAL RECEIPT PROCESSING

interface PartialReceiptItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
  condition: 'good' | 'damaged' | 'expired';
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
}

interface ReceiptRequest {
  purchaseOrderId: string;
  items: PartialReceiptItem[];
  receivedBy: string;
  receivedDate?: Date;
  notes?: string;
  attachments?: string[];
}

interface ReceiptValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Validate partial receipt data before processing
export async function validatePartialReceipt(request: ReceiptRequest): Promise<{data: ReceiptValidationResult | null, error: any}> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get the purchase order to validate against
    const poResult = await getPurchaseOrder(request.purchaseOrderId);
    if (poResult.error || !poResult.data) {
      return {
        data: {
          isValid: false,
          errors: ['Purchase order not found'],
          warnings: []
        },
        error: null
      };
    }

    const po = poResult.data;

    // Check if purchase order is in a receivable state
    if (!['sent', 'partial', 'approved', 'sent_to_supplier'].includes(po.status)) {
      errors.push(`Purchase order cannot receive items in status: ${po.status}`);
    }

    // Validate each receipt item
    for (const receiptItem of request.items) {
      const poItem = po.items.find(item => 
        item.productId === receiptItem.productId || item.id === receiptItem.productId
      );

      if (!poItem) {
        errors.push(`Product ${receiptItem.productName} (${receiptItem.productId}) not found in purchase order`);
        continue;
      }

      // Check quantities
      if (receiptItem.receivedQuantity <= 0) {
        errors.push(`Invalid received quantity for ${receiptItem.productName}: ${receiptItem.receivedQuantity}`);
      }

      if (receiptItem.receivedQuantity > receiptItem.orderedQuantity) {
        warnings.push(`Receiving more than ordered for ${receiptItem.productName}: ${receiptItem.receivedQuantity} > ${receiptItem.orderedQuantity}`);
      }

      // Check for over-receiving against total ordered
      const currentlyReceived = (poItem as any).receivedQuantity || 0;
      const totalAfterReceipt = currentlyReceived + receiptItem.receivedQuantity;
      
      if (totalAfterReceipt > poItem.quantity) {
        errors.push(`Total received quantity would exceed ordered quantity for ${receiptItem.productName}: ${totalAfterReceipt} > ${poItem.quantity}`);
      }

      // Validate expiry dates for condition items
      if (receiptItem.condition === 'expired' && !receiptItem.expiryDate) {
        warnings.push(`Expired item ${receiptItem.productName} should have expiry date specified`);
      }
    }

    // Check for required fields
    if (!request.receivedBy) {
      errors.push('Received by field is required');
    }

    if (request.items.length === 0) {
      errors.push('At least one item must be specified for receiving');
    }

    return {
      data: {
        isValid: errors.length === 0,
        errors,
        warnings
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to validate partial receipt')
    };
  }
}

// Process partial receipt with enhanced validation and inventory updates
export async function processPartialReceipt(request: ReceiptRequest): Promise<{data: PurchaseOrder | null, error: any}> {
  try {
    // First validate the receipt
    const validationResult = await validatePartialReceipt(request);
    if (validationResult.error) {
      return {
        data: null,
        error: validationResult.error
      };
    }

    if (validationResult.data && !validationResult.data.isValid) {
      return {
        data: null,
        error: new Error(`Validation failed: ${validationResult.data.errors.join(', ')}`)
      };
    }

    // Convert request items to the format expected by receivePurchaseOrder
    const receivedItems: PurchaseOrderItem[] = request.items.map(item => ({
      id: item.productId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.receivedQuantity,
      cost: 0, // This will be populated from the original PO item
      total: 0 // This will be calculated
    }));

    // Create receiving context
    const receivingContext: ReceivingContext = {
      receivedBy: request.receivedBy,
      reason: request.notes || 'Partial receipt processed',
      timestamp: request.receivedDate || new Date()
    };

    // Process the receipt using the existing enhanced receivePurchaseOrder function
    const result = await receivePurchaseOrder(
      request.purchaseOrderId,
      receivedItems,
      receivingContext
    );

    // Log detailed receiving activity if successful
    if (result.data && !result.error) {
      try {
        const auditContext = getCurrentUserContext({
          reason: `Partial receipt processed: ${request.items.length} items`,
          metadata: {
            receivingType: 'partial',
            itemCount: request.items.length,
            conditionBreakdown: request.items.reduce((acc, item) => {
              acc[item.condition] = (acc[item.condition] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          }
        });

        const receivingRecord = {
          receivingNumber: `REC-${result.data.poNumber}-${Date.now()}`,
          receivingType: 'partial' as const,
          itemsReceived: request.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            orderedQuantity: item.orderedQuantity,
            receivedQuantity: item.receivedQuantity,
            condition: item.condition
          })),
          qualityNotes: request.notes || 'Items received and processed',
          vehicleInfo: undefined,
          driverInfo: undefined,
          attachments: request.attachments || []
        };

        await auditService.logReceivingActivityDetailed(
          result.data,
          receivingRecord,
          auditContext
        );
      } catch (auditError) {
        console.warn('Failed to log partial receipt audit:', auditError);
      }
    }

    return result;
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to process partial receipt')
    };
  }
}

// Get receiving history for a purchase order
export async function getPurchaseOrderReceivingHistory(purchaseOrderId: string): Promise<{data: ReceivingRecord[] | null, error: any}> {
  try {
    // Query audit logs for receiving activities
    const { data, error } = await supabase
      .from('purchase_order_audit_logs')
      .select('*')
      .eq('purchase_order_id', purchaseOrderId)
      .in('action', ['received', 'partially_received'])
      .order('timestamp', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    // Transform audit logs into receiving records
    const receivingHistory: ReceivingRecord[] = data?.map(log => ({
      id: log.id,
      receivedDate: new Date(log.timestamp),
      receivedBy: log.performed_by_name || log.performed_by,
      items: [], // This would be populated from detailed logs in a full implementation
      notes: log.reason || 'Items received',
      vehicleInfo: log.metadata?.vehicleInfo,
      driverInfo: log.metadata?.driverInfo,
      attachments: log.metadata?.attachments || []
    })) || [];

    return { data: receivingHistory, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get receiving history')
    };
  }
}

// Get pending receipts (approved POs awaiting receipt)
export async function getPendingReceipts(limit?: number, offset?: number): Promise<{data: PurchaseOrder[] | null, error: any}> {
  try {
    let query = supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        supplier_id,
        supplier_name,
        items,
        subtotal,
        tax,
        total,
        status,
        expected_date,
        received_date,
        created_by,
        created_at
      `)
      .in('status', ['sent', 'partial', 'approved'])
      .order('expected_date', { ascending: true, nullsLast: true });

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const transformedData = data?.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      supplierId: po.supplier_id,
      supplierName: po.supplier_name,
      items: po.items,
      subtotal: po.subtotal,
      tax: po.tax,
      total: po.total,
      status: po.status,
      expectedDate: po.expected_date ? new Date(po.expected_date) : undefined,
      receivedDate: po.received_date ? new Date(po.received_date) : undefined,
      createdBy: po.created_by,
      createdAt: new Date(po.created_at)
    })) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get pending receipts')
    };
  }
}

// Get overdue purchase orders
export async function getOverduePurchaseOrders(): Promise<{data: PurchaseOrder[] | null, error: any}> {
  try {
    const currentDate = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        supplier_id,
        supplier_name,
        items,
        subtotal,
        tax,
        total,
        status,
        expected_date,
        received_date,
        created_by,
        created_at
      `)
      .in('status', ['sent', 'partial', 'approved'])
      .lt('expected_date', currentDate)
      .order('expected_date', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    const transformedData = data?.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      supplierId: po.supplier_id,
      supplierName: po.supplier_name,
      items: po.items,
      subtotal: po.subtotal,
      tax: po.tax,
      total: po.total,
      status: po.status,
      expectedDate: po.expected_date ? new Date(po.expected_date) : undefined,
      receivedDate: po.received_date ? new Date(po.received_date) : undefined,
      createdBy: po.created_by,
      createdAt: new Date(po.created_at)
    })) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get overdue purchase orders')
    };
  }
}

// APPROVAL API ENDPOINTS WITH AUTHORIZATION AND VALIDATION

interface ApprovalRequest {
  purchaseOrderId: string;
  action: 'approve' | 'reject';
  reason: string;
  approvedBy: string;
  approvalLevel?: number;
  maxApprovalAmount?: number;
}

interface ApprovalValidationResult {
  canApprove: boolean;
  errors: string[];
  warnings: string[];
  requiredLevel: number;
  userLevel: number;
}

interface BulkApprovalRequest {
  purchaseOrderIds: string[];
  action: 'approve' | 'reject';
  reason: string;
  approvedBy: string;
}

// Check if user can approve a purchase order
export async function validateApprovalPermissions(
  purchaseOrderId: string, 
  userId: string,
  userRole?: string,
  maxApprovalAmount?: number
): Promise<{data: ApprovalValidationResult | null, error: any}> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get the purchase order
    const poResult = await getPurchaseOrder(purchaseOrderId);
    if (poResult.error || !poResult.data) {
      return {
        data: {
          canApprove: false,
          errors: ['Purchase order not found'],
          warnings: [],
          requiredLevel: 0,
          userLevel: 0
        },
        error: null
      };
    }

    const po = poResult.data;

    // Check if PO is in a state that can be approved
    if (!['draft', 'pending_approval'].includes(po.status)) {
      errors.push(`Purchase order cannot be approved in status: ${po.status}`);
    }

    // Check if user is trying to approve their own PO
    if (po.createdBy === userId) {
      errors.push('Users cannot approve their own purchase orders');
    }

    // Determine required approval level based on amount
    let requiredLevel = 1; // Default approval level
    if (po.total > 50000) {
      requiredLevel = 3; // High-value POs need senior approval
    } else if (po.total > 10000) {
      requiredLevel = 2; // Medium-value POs need manager approval
    }

    // Determine user's approval level based on role and limits
    let userLevel = 0;
    if (userRole === 'admin' || userRole === 'owner') {
      userLevel = 3;
    } else if (userRole === 'manager' || userRole === 'finance_manager') {
      userLevel = 2;
    } else if (userRole === 'supervisor' || userRole === 'purchaser') {
      userLevel = 1;
    }

    // Check approval amount limits
    if (maxApprovalAmount && po.total > maxApprovalAmount) {
      errors.push(`Purchase order amount (${po.total}) exceeds your approval limit (${maxApprovalAmount})`);
    }

    // Check approval level requirements
    if (userLevel < requiredLevel) {
      errors.push(`Insufficient approval level: ${userLevel} < ${requiredLevel} required`);
    }

    // Add warnings for high-value purchases
    if (po.total > 25000) {
      warnings.push(`High-value purchase order: ${po.total}. Please review carefully.`);
    }

    return {
      data: {
        canApprove: errors.length === 0,
        errors,
        warnings,
        requiredLevel,
        userLevel
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to validate approval permissions')
    };
  }
}

// Process purchase order approval
export async function approvePurchaseOrder(request: ApprovalRequest): Promise<{data: PurchaseOrder | null, error: any}> {
  try {
    // Validate approval permissions
    const validationResult = await validateApprovalPermissions(
      request.purchaseOrderId,
      request.approvedBy,
      undefined, // Role would be fetched from user context in real implementation
      request.maxApprovalAmount
    );

    if (validationResult.error) {
      return {
        data: null,
        error: validationResult.error
      };
    }

    if (validationResult.data && !validationResult.data.canApprove) {
      return {
        data: null,
        error: new Error(`Approval denied: ${validationResult.data.errors.join(', ')}`)
      };
    }

    // Get current purchase order
    const poResult = await getPurchaseOrder(request.purchaseOrderId);
    if (poResult.error || !poResult.data) {
      return {
        data: null,
        error: poResult.error || new Error('Purchase order not found')
      };
    }

    const po = poResult.data;

    // Determine new status based on action
    let newStatus: PurchaseOrderStatus;
    let newEnhancedStatus: string;
    let auditAction: PurchaseOrderAuditAction;

    if (request.action === 'approve') {
      newStatus = 'sent'; // Map to existing 'sent' status for backward compatibility
      newEnhancedStatus = 'approved'; // Set enhanced status to 'approved' for receiving workflow
      auditAction = PurchaseOrderAuditAction.APPROVED;
    } else {
      newStatus = 'cancelled';
      newEnhancedStatus = 'cancelled';
      auditAction = PurchaseOrderAuditAction.CANCELLED;
    }

    // Update the purchase order status - now using both legacy and enhanced status
    const updateResult = await updatePurchaseOrder(request.purchaseOrderId, {
      status: newStatus,
      enhanced_status: newEnhancedStatus, // ✅ Re-enabled: Schema has this column
      approved_by: request.approvedBy, // ✅ Re-enabled: Schema has this column
      approved_at: new Date().toISOString() // ✅ Re-enabled: Schema has this column
    });

    if (updateResult.error) {
      return {
        data: null,
        error: updateResult.error
      };
    }

    // Log the approval action
    try {
      const auditContext = getCurrentUserContext({
        reason: request.reason,
        metadata: {
          approvalAction: request.action,
          approvalLevel: request.approvalLevel || validationResult.data?.userLevel || 1,
          originalStatus: po.status,
          newStatus,
          newEnhancedStatus,
          approvalAmount: po.total
        }
      });

      await auditService.logPurchaseOrderAudit(
        request.purchaseOrderId,
        po.poNumber,
        auditAction,
        auditContext,
        { status: po.status },
        { status: newStatus, enhanced_status: newEnhancedStatus, approvedBy: request.approvedBy }
      );
    } catch (auditError) {
      console.warn('Failed to log approval audit:', auditError);
    }

    return updateResult;
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to process approval')
    };
  }
}

// Process bulk approval of purchase orders
export async function bulkApprovePurchaseOrders(request: BulkApprovalRequest): Promise<{
  data: {
    successful: string[];
    failed: Array<{id: string, error: string}>;
  } | null,
  error: any
}> {
  try {
    const successful: string[] = [];
    const failed: Array<{id: string, error: string}> = [];

    // Process each purchase order
    for (const poId of request.purchaseOrderIds) {
      try {
        const approvalResult = await approvePurchaseOrder({
          purchaseOrderId: poId,
          action: request.action,
          reason: request.reason,
          approvedBy: request.approvedBy
        });

        if (approvalResult.error) {
          failed.push({
            id: poId,
            error: approvalResult.error.message || 'Unknown error'
          });
        } else {
          successful.push(poId);
        }
      } catch (error) {
        failed.push({
          id: poId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      data: {
        successful,
        failed
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to process bulk approval')
    };
  }
}

// Get purchase orders pending approval
export async function getPendingApprovals(
  limit?: number, 
  offset?: number,
  minAmount?: number,
  maxAmount?: number
): Promise<{data: PurchaseOrder[] | null, error: any}> {
  try {
    let query = supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        supplier_id,
        supplier_name,
        items,
        subtotal,
        tax,
        total,
        status,
        expected_date,
        received_date,
        created_by,
        created_at
      `)
      .eq('status', 'draft') // In enhanced workflow, this would be 'pending_approval'
      .order('created_at', { ascending: true }); // Oldest first for approval queue

    // Apply amount filters
    if (minAmount !== undefined) {
      query = query.gte('total', minAmount);
    }
    if (maxAmount !== undefined) {
      query = query.lte('total', maxAmount);
    }

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const transformedData = data?.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      supplierId: po.supplier_id,
      supplierName: po.supplier_name,
      items: po.items,
      subtotal: po.subtotal,
      tax: po.tax,
      total: po.total,
      status: po.status,
      expectedDate: po.expected_date ? new Date(po.expected_date) : undefined,
      receivedDate: po.received_date ? new Date(po.received_date) : undefined,
      createdBy: po.created_by,
      createdAt: new Date(po.created_at)
    })) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get pending approvals')
    };
  }
}

// Get approval history for a purchase order
export async function getApprovalHistory(purchaseOrderId: string): Promise<{
  data: Array<{
    id: string;
    action: string;
    performedBy: string;
    performedByName?: string;
    timestamp: Date;
    reason?: string;
    metadata?: any;
  }> | null,
  error: any
}> {
  try {
    const { data, error } = await supabase
      .from('purchase_order_audit_logs')
      .select('*')
      .eq('purchase_order_id', purchaseOrderId)
      .in('action', ['approved', 'rejected', 'cancelled'])
      .order('timestamp', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    const approvalHistory = data?.map(log => ({
      id: log.id,
      action: log.action,
      performedBy: log.performed_by,
      performedByName: log.performed_by_name,
      timestamp: new Date(log.timestamp),
      reason: log.reason,
      metadata: log.metadata
    })) || [];

    return { data: approvalHistory, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get approval history')
    };
  }
}

// Get approval workflow configuration
export async function getApprovalWorkflowConfig(): Promise<{
  data: {
    approvalLevels: Array<{
      level: number;
      name: string;
      minAmount: number;
      maxAmount: number;
      requiredRoles: string[];
    }>;
    escalationRules: Array<{
      condition: string;
      action: string;
      timeoutHours: number;
    }>;
  } | null,
  error: any
}> {
  // This would normally be loaded from database configuration
  // For now, return a default configuration
  return {
    data: {
      approvalLevels: [
        {
          level: 1,
          name: 'Standard Approval',
          minAmount: 0,
          maxAmount: 10000,
          requiredRoles: ['supervisor', 'purchaser', 'manager']
        },
        {
          level: 2,
          name: 'Manager Approval',
          minAmount: 10001,
          maxAmount: 50000,
          requiredRoles: ['manager', 'finance_manager']
        },
        {
          level: 3,
          name: 'Senior Approval',
          minAmount: 50001,
          maxAmount: Infinity,
          requiredRoles: ['admin', 'owner']
        }
      ],
      escalationRules: [
        {
          condition: 'approval_timeout',
          action: 'escalate_to_next_level',
          timeoutHours: 24
        },
        {
          condition: 'high_value',
          action: 'require_dual_approval',
          timeoutHours: 48
        }
      ]
    },
    error: null
  };
}