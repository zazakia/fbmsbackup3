import { supabase } from '../utils/supabase';
import { Product, Category } from '../types/business';

// PRODUCT CRUD OPERATIONS

// CREATE product
export async function createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('products')
    .insert([{
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      min_stock: product.minStock,
      unit: product.unit,
      is_active: product.isActive
    }])
    .select(`
      id,
      name,
      description,
      sku,
      barcode,
      category,
      price,
      cost,
      stock,
      min_stock,
      unit,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        category: data.category,
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        minStock: data.min_stock,
        unit: data.unit,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL products
export async function getProducts(limit?: number, offset?: number) {
  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      sku,
      barcode,
      category,
      price,
      cost,
      stock,
      min_stock,
      unit,
      is_active,
      created_at,
      updated_at
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
    const transformedData = data.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.min_stock,
      unit: product.unit,
      isActive: product.is_active,
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE product
export async function getProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      sku,
      barcode,
      category,
      price,
      cost,
      stock,
      min_stock,
      unit,
      is_active,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        category: data.category,
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        minStock: data.min_stock,
        unit: data.unit,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE product
export async function updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) {
  const updateData: Partial<{ name: string; description: string; sku: string; barcode: string; category: string; price: number; cost: number; stock: number; min_stock: number; unit: string; is_active: boolean }> = {};
  
  if (updates.name) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.sku) updateData.sku = updates.sku;
  if (updates.barcode !== undefined) updateData.barcode = updates.barcode;
  if (updates.category) updateData.category = updates.category;
  if (updates.price !== undefined) updateData.price = updates.price;
  if (updates.cost !== undefined) updateData.cost = updates.cost;
  if (updates.stock !== undefined) updateData.stock = updates.stock;
  if (updates.minStock !== undefined) updateData.min_stock = updates.minStock;
  if (updates.unit) updateData.unit = updates.unit;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      name,
      description,
      sku,
      barcode,
      category,
      price,
      cost,
      stock,
      min_stock,
      unit,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        category: data.category,
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        minStock: data.min_stock,
        unit: data.unit,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE product
export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Search products
export async function searchProducts(query: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      sku,
      barcode,
      category,
      price,
      cost,
      stock,
      min_stock,
      unit,
      is_active,
      created_at,
      updated_at
    `)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (data) {
    const transformedData = data.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.min_stock,
      unit: product.unit,
      isActive: product.is_active,
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get products by category
export async function getProductsByCategory(category: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      sku,
      barcode,
      category,
      price,
      cost,
      stock,
      min_stock,
      unit,
      is_active,
      created_at,
      updated_at
    `)
    .eq('category', category)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (data) {
    const transformedData = data.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.min_stock,
      unit: product.unit,
      isActive: product.is_active,
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Get low stock products
export async function getLowStockProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      sku,
      barcode,
      category,
      price,
      cost,
      stock,
      min_stock,
      unit,
      is_active,
      created_at,
      updated_at
    `)
    .lte('stock', 'min_stock')
    .eq('is_active', true)
    .order('stock', { ascending: true });

  if (data) {
    const transformedData = data.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.min_stock,
      unit: product.unit,
      isActive: product.is_active,
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Log stock movement to inventory ledger
async function logStockMovement({
  productId,
  change,
  type,
  resultingStock,
  referenceId,
  userId,
  reason
}: {
  productId: string;
  change: number;
  type: string;
  resultingStock: number;
  referenceId?: string;
  userId?: string;
  reason?: string;
}) {
  return supabase.from('stock_movements').insert([
    {
      product_id: productId,
      change,
      type,
      resulting_stock: resultingStock,
      reference_id: referenceId,
      user_id: userId,
      reason
    }
  ]);
}

// Update stock
export async function updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set', options?: { referenceId?: string; userId?: string; reason?: string; }) {
  if (operation === 'set') {
    // For direct set, log the difference as an adjustment
    const { data: product, error: getError } = await getProduct(id);
    if (getError || !product) {
      return { data: null, error: getError || new Error('Product not found') };
    }
    const change = quantity - product.stock;
    const result = await updateProduct(id, { stock: quantity });
    if (!result.error && change !== 0) {
      await logStockMovement({
        productId: id,
        change,
        type: 'adjustment',
        resultingStock: quantity,
        referenceId: options?.referenceId,
        userId: options?.userId,
        reason: options?.reason || 'Manual stock set'
      });
    }
    return result;
  }

  // For add/subtract operations, we need to get current stock first
  const { data: product, error: getError } = await getProduct(id);
  if (getError || !product) {
    return { data: null, error: getError || new Error('Product not found') };
  }

  let newStock: number;
  let change: number;
  let type: string;
  if (operation === 'add') {
    newStock = product.stock + quantity;
    change = quantity;
    type = 'in';
  } else {
    newStock = product.stock - quantity;
    change = -quantity;
    type = 'out';
  }

  // Prevent negative stock
  if (newStock < 0) {
    return { data: null, error: new Error('Insufficient stock') };
  }

  const result = await updateProduct(id, { stock: newStock });
  if (!result.error && change !== 0) {
    await logStockMovement({
      productId: id,
      change,
      type: options?.reason ? 'adjustment' : type,
      resultingStock: newStock,
      referenceId: options?.referenceId,
      userId: options?.userId,
      reason: options?.reason
    });
  }
  return result;
}

// CATEGORY CRUD OPERATIONS

// CREATE category
export async function createCategory(category: Omit<Category, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('categories')
    .insert([{
      name: category.name,
      description: category.description,
      is_active: category.isActive
    }])
    .select(`
      id,
      name,
      description,
      is_active,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL categories
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      description,
      is_active,
      created_at
    `)
    .order('name', { ascending: true });

  if (data) {
    const transformedData = data.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.is_active,
      createdAt: new Date(category.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE category
export async function getCategory(id: string) {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      description,
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
        description: data.description,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE category
export async function updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) {
  const updateData: Partial<{ name: string; description: string; is_active: boolean }> = {};
  
  if (updates.name) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      name,
      description,
      is_active,
      created_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        isActive: data.is_active,
        createdAt: new Date(data.created_at)
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE category
export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get active categories
export async function getActiveCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      description,
      is_active,
      created_at
    `)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (data) {
    const transformedData = data.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.is_active,
      createdAt: new Date(category.created_at)
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// Fetch stock movements for a product with optional filters
// CREATE stock movement
export async function createStockMovement(movement: {
  productId: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  previousStock: number;
  newStock: number;
  userId: string;
  reference?: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('stock_movements')
    .insert([{
      product_id: movement.productId,
      type: movement.type,
      quantity: movement.quantity,
      previous_stock: movement.previousStock,
      new_stock: movement.newStock,
      user_id: movement.userId,
      reference: movement.reference,
      notes: movement.notes
    }])
    .select()
    .single();

  if (error) return { data: null, error };
  return { data, error: null };
}

export async function getStockMovements(productId: string, filters?: { startDate?: Date; endDate?: Date; type?: string; userId?: string; }) {
  let query = supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  const { data, error } = await query;
  if (error) return { data: null, error };
  return {
    data: (data || []).map((m: any) => ({ ...m, created_at: new Date(m.created_at) })),
    error: null
  };
}