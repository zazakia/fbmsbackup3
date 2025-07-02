import { supabase } from '../utils/supabase';
import { PurchaseOrder, PurchaseOrderItem, Supplier, PurchaseOrderStatus } from '../types/business';

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

// CREATE purchase order
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
      created_by: purchaseOrder.createdBy
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

// UPDATE purchase order
export async function updatePurchaseOrder(id: string, updates: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>) {
  const updateData: Partial<{ po_number: string; supplier_id: string; expected_date: string; status: string; notes: string; items: any[]; total_amount: number }> = {};
  
  if (updates.poNumber) updateData.po_number = updates.poNumber;
  if (updates.supplierId) updateData.supplier_id = updates.supplierId;
  if (updates.supplierName) updateData.supplier_name = updates.supplierName;
  if (updates.items) updateData.items = updates.items;
  if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
  if (updates.tax !== undefined) updateData.tax = updates.tax;
  if (updates.total !== undefined) updateData.total = updates.total;
  if (updates.status) updateData.status = updates.status;
  if (updates.expectedDate !== undefined) updateData.expected_date = updates.expectedDate?.toISOString();
  if (updates.receivedDate !== undefined) updateData.received_date = updates.receivedDate?.toISOString();
  if (updates.createdBy) updateData.created_by = updates.createdBy;

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
      created_at
    `)
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
      expectedDate: po.expected_date ? new Date(po.expected_date) : undefined,
      receivedDate: po.received_date ? new Date(po.received_date) : undefined,
      createdBy: po.created_by,
      createdAt: new Date(po.created_at)
    }));
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

// Mark purchase order as received
export async function receivePurchaseOrder(id: string, receivedItems?: PurchaseOrderItem[]) {
  const updateData: { status: string; received_date: string; items?: any[] } = {
    status: 'received',
    received_date: new Date().toISOString()
  };

  if (receivedItems) {
    updateData.items = receivedItems;
  }

  const { data, error } = await updatePurchaseOrder(id, updateData);
  
  // TODO: Update product stock levels when PO is received
  // This would require integration with the products API
  
  return { data, error };
}