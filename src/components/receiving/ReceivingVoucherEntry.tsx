import React, { useState, useEffect } from 'react';
import { Save, Package, Calendar, User, FileText, Receipt, Plus, Trash2, Building2, AlertTriangle } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { supabase } from '../../utils/supabase';

interface PurchaseOrderReceivingRecord {
  id?: string;
  purchase_order_id?: string | null;
  received_by: string;
  received_by_name: string;
  received_date: string;
  notes: string;
  status: 'pending' | 'completed' | 'cancelled';
}

interface ReceivingItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

const ReceivingVoucherEntry: React.FC = () => {
  const { products, fetchProducts } = useBusinessStore();
  const { addToast } = useToastStore();
  const { user } = useSupabaseAuthStore();

  const [receivingRecord, setReceivingRecord] = useState<PurchaseOrderReceivingRecord>({
    purchase_order_id: null,
    received_by: user?.id || '',
    received_by_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email?.split('@')[0] || '',
    received_date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'pending'
  });

  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [availablePOs, setAvailablePOs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Manual item entry
  const [items, setItems] = useState<ReceivingItem[]>([]);
  const [newItem, setNewItem] = useState({
    productId: '',
    quantity: 1,
    unitCost: 0
  });

  // Load data on component mount
  useEffect(() => {
    loadAvailablePurchaseOrders();
    loadSuppliers();
    loadUsers();
    
    // Load products if not already loaded
    if (products.length === 0 && fetchProducts) {
      fetchProducts().catch(error => {
        console.error('Failed to load products:', error);
        addToast({ type: 'error', title: 'Error', message: 'Failed to load products' });
      });
    }
  }, [products.length, fetchProducts]);

  const loadAvailablePurchaseOrders = async () => {
    try {
      // Get purchase orders that are approved/confirmed but not fully received (optional)
      const { data: pos, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          supplier_name,
          total,
          status,
          enhanced_status,
          expected_date,
          items
        `)
        .in('status', ['approved', 'confirmed', 'partially_received'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailablePOs(pos || []);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      addToast({ type: 'error', title: 'Error', message: 'Failed to load purchase orders' });
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data: supplierData, error } = await supabase
        .from('suppliers')
        .select('id, name, contact_person, email, phone, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setSuppliers(supplierData || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      addToast({ type: 'error', title: 'Error', message: 'Failed to load suppliers' });
    }
  };

  const loadUsers = async () => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, full_name')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setUsers(userData || []);
    } catch (error) {
      console.error('Error loading users:', error);
      addToast({ type: 'error', title: 'Error', message: 'Failed to load users' });
    }
  };

  const handlePOChange = (poId: string) => {
    if (!poId) {
      setSelectedPO(null);
      setReceivingRecord(prev => ({ ...prev, purchase_order_id: null }));
      return;
    }

    const po = availablePOs.find(p => p.id === poId);
    setSelectedPO(po);
    setReceivingRecord(prev => ({ ...prev, purchase_order_id: poId }));

    // Auto-populate items from PO if available
    if (po && po.items && Array.isArray(po.items)) {
      const poItems: ReceivingItem[] = po.items.map((item: any, index: number) => ({
        id: `item-${Date.now()}-${index}`,
        productId: item.productId || item.id || '',
        productName: item.productName || item.name || '',
        quantity: item.quantity || 1,
        unitCost: item.unitCost || item.price || 0,
        totalCost: (item.quantity || 1) * (item.unitCost || item.price || 0)
      }));
      setItems(poItems);
    }
  };

  const addItem = () => {
    if (!newItem.productId) {
      addToast({ type: 'error', title: 'Error', message: 'Please select a product' });
      return;
    }

    if (newItem.quantity <= 0) {
      addToast({ type: 'error', title: 'Error', message: 'Quantity must be greater than 0' });
      return;
    }

    if (newItem.unitCost < 0) {
      addToast({ type: 'error', title: 'Error', message: 'Unit cost cannot be negative' });
      return;
    }

    const product = products.find(p => p.id === newItem.productId);
    if (!product) {
      addToast({ type: 'error', title: 'Error', message: 'Product not found' });
      return;
    }

    const totalCost = newItem.quantity * newItem.unitCost;
    const item: ReceivingItem = {
      id: `item-${Date.now()}`,
      productId: newItem.productId,
      productName: product.name,
      quantity: newItem.quantity,
      unitCost: newItem.unitCost,
      totalCost
    };

    setItems(prev => {
      const updatedItems = [...prev, item];
      console.log('➕ Item added to list:', item);
      console.log('📋 Total items now:', updatedItems.length);
      return updatedItems;
    });
    setNewItem({ productId: '', quantity: 1, unitCost: 0 });
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: 'quantity' | 'unitCost', value: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        updated.totalCost = updated.quantity * updated.unitCost;
        return updated;
      }
      return item;
    }));
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const updateInventory = async () => {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      addToast({ type: 'info', title: 'Processing', message: 'Updating inventory...' });
      console.log('🔄 Starting inventory update for', items.length, 'items');
      
      // Enhanced diagnostics - log user and items info
      console.log('User info:', { id: user?.id, email: user?.email });
      console.log('Items to process:', items.map(item => ({
        id: item.productId,
        name: item.productName,
        quantity: item.quantity
      })));

      // Early validation
      if (!user?.id) {
        throw new Error('User not authenticated - cannot update inventory');
      }
      
      if (items.length === 0) {
        throw new Error('No items to process');
      }

      for (const item of items) {
        try {
          console.log(`📦 Processing item: ${item.productName} (ID: ${item.productId})`);
          
          // Enhanced validation for item data
          if (!item.productId || item.productId.trim() === '') {
            console.error('❌ Invalid product ID for item:', item);
            errors.push(`${item.productName || 'Unknown product'}: Invalid product ID`);
            errorCount++;
            continue;
          }
          
          if (item.quantity <= 0) {
            console.error('❌ Invalid quantity for item:', item);
            errors.push(`${item.productName}: Invalid quantity (${item.quantity})`);
            errorCount++;
            continue;
          }
          
          // Check if product exists first
          console.log(`🔍 Checking if product exists: ${item.productId}`);
          const { data: currentProduct, error: fetchError } = await supabase
            .from('products')
            .select('id, stock, name, is_active')
            .eq('id', item.productId)
            .single();

          if (fetchError) {
            console.error('❌ Error fetching product:', item.productName, {
              error: fetchError,
              code: fetchError.code,
              message: fetchError.message,
              details: fetchError.details,
              hint: fetchError.hint
            });
            errors.push(`Failed to fetch ${item.productName}: ${fetchError.message} (${fetchError.code})`);
            errorCount++;
            continue;
          }
          
          if (!currentProduct) {
            console.error('❌ Product not found in database:', item.productId);
            errors.push(`Product not found: ${item.productName} (ID: ${item.productId})`);
            errorCount++;
            continue;
          }
          
          if (!currentProduct.is_active) {
            console.error('❌ Product is inactive:', item.productName);
            errors.push(`Product is inactive: ${item.productName}`);
            errorCount++;
            continue;
          }

          const oldStock = currentProduct.stock || 0;
          // Ensure quantities are integers for database compatibility
          const quantityToAdd = Math.round(Math.abs(item.quantity)); // Convert to positive integer
          const newStock = oldStock + quantityToAdd;
          
          console.log(`📊 ${item.productName}: ${oldStock} → ${newStock} (+${quantityToAdd})`);

          // Update product stock with enhanced error details
          const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update({ 
              stock: newStock,
              updated_at: new Date().toISOString() // Force updated timestamp
            })
            .eq('id', item.productId)
            .select('id, stock')
            .single();

          if (updateError) {
            console.error('❌ Error updating product stock:', item.productName, {
              error: updateError,
              code: updateError.code,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              oldStock,
              newStock,
              quantityToAdd
            });
            errors.push(`Failed to update ${item.productName}: ${updateError.message} (${updateError.code})`);
            errorCount++;
            continue;
          }
          
          // Verify the update was successful
          if (!updatedProduct || updatedProduct.stock !== newStock) {
            console.error('❌ Stock update verification failed:', {
              expected: newStock,
              actual: updatedProduct?.stock,
              product: item.productName
            });
            errors.push(`Stock update verification failed for ${item.productName}`);
            errorCount++;
            continue;
          }

          // Create stock movement record (non-critical - don't fail if this fails)
          try {
            const { error: movementError } = await supabase
              .from('stock_movements')
              .insert([{
                product_id: item.productId,
                change: quantityToAdd, // Use the same rounded integer value
                type: 'receiving',
                user_id: user.id,
                reason: `Receiving voucher - ${receivingRecord.notes || 'Item received'}`,
                resulting_stock: newStock,
                created_at: new Date().toISOString()
              }]);

            if (movementError) {
              console.error('⚠️ Stock updated but movement record failed:', item.productName, movementError);
              // Don't count this as error since stock was updated successfully
            } else {
              console.log('📝 Stock movement recorded successfully');
            }
          } catch (movementError) {
            console.error('⚠️ Non-critical error creating movement record:', movementError);
            // Don't fail the inventory update for this
          }

          console.log(`✅ Successfully updated ${item.productName}`);
          successCount++;

        } catch (itemError) {
          console.error('❌ Unexpected error processing item:', item.productName, itemError);
          errors.push(`Unexpected error with ${item.productName}: ${itemError instanceof Error ? itemError.message : String(itemError)}`);
          errorCount++;
        }
      }

      // Report results
      console.log(`📈 Inventory update complete: ${successCount} success, ${errorCount} errors`);
      
      if (successCount > 0 && errorCount === 0) {
        addToast({ type: 'success', title: 'Inventory Updated', message: `Successfully updated inventory for ${successCount} items` });
      } else if (successCount > 0 && errorCount > 0) {
        addToast({ type: 'warning', title: 'Partial Success', message: `Updated ${successCount} items, ${errorCount} failed. Check console for details.` });
      } else {
        // Enhanced error reporting for complete failure
        const errorSummary = errors.length > 0 ? errors.join('; ') : 'Unknown error';
        addToast({ 
          type: 'error', 
          title: 'Update Failed', 
          message: `Failed to update any items. First error: ${errors[0] || 'Unknown'}`,
          duration: 10000 // Longer duration for critical errors
        });
        console.error('📋 Complete error list:', errors);
        throw new Error(`All ${errorCount} inventory updates failed. Errors: ${errorSummary}`);
      }

      if (errors.length > 0) {
        console.error('Inventory update errors:', errors);
      }

    } catch (error) {
      console.error('❌ Critical error updating inventory:', error);
      addToast({ 
        type: 'error', 
        title: 'Critical Error', 
        message: `Failed to update inventory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 10000
      });
      throw error;
    }
  };

  const getOrCreateDummySupplier = async () => {
    try {
      // Check if dummy supplier already exists
      const { data: existingSupplier, error: fetchError } = await supabase
        .from('suppliers')
        .select('id')
        .eq('name', 'Manual Entry - No Supplier')
        .single();

      if (existingSupplier) {
        return existingSupplier.id;
      }

      // Create dummy supplier if it doesn't exist
      const dummySupplier = {
        name: 'Manual Entry - No Supplier',
        contact_person: 'System Generated',
        email: null,
        phone: null,
        address: null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert([dummySupplier])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating dummy supplier:', error);
      throw error;
    }
  };

  const createDummyPOForManualEntry = async () => {
    try {
      let supplierId: string;
      let supplierName: string;

      // Use selected supplier if available, otherwise use dummy supplier
      if (selectedSupplier) {
        const supplier = suppliers.find(s => s.id === selectedSupplier);
        supplierId = selectedSupplier;
        supplierName = supplier?.name || 'Unknown Supplier';
      } else {
        // Fallback to dummy supplier
        supplierId = await getOrCreateDummySupplier();
        supplierName = 'Manual Entry - No Supplier';
      }
      
      // Create a PO for manual entries
      const manualPO = {
        po_number: `MANUAL-${Date.now()}`,
        supplier_id: supplierId,
        supplier_name: supplierName,
        items: JSON.stringify(items),
        subtotal: getTotalAmount(),
        tax: 0,
        total: getTotalAmount(),
        status: 'received',
        created_by: user?.id,
        enhanced_status: 'completed'
      };

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert([manualPO])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating manual PO:', error);
      throw error;
    }
  };

  const handleSave = async (status: 'pending' | 'completed' | 'cancelled') => {
    console.log('🚀 Starting save process:', { status, itemsCount: items.length, items });
    
    // Enhanced validation with detailed logging
    if (items.length === 0) {
      console.log('❌ Validation failed: No items added');
      addToast({ 
        type: 'error', 
        title: 'Cannot Save Receiving Voucher', 
        message: 'Please add at least one item before saving. Use the "Add Item" button above.' 
      });
      return;
    }

    if (!receivingRecord.received_by_name.trim()) {
      console.log('❌ Validation failed: No received_by_name');
      addToast({ type: 'error', title: 'Validation Error', message: 'Please enter who received the items' });
      return;
    }

    // Validate each item has valid data
    const invalidItems = items.filter(item => 
      !item.productId || 
      item.quantity <= 0 || 
      item.unitCost < 0 ||
      !item.productName
    );

    if (invalidItems.length > 0) {
      console.log('❌ Validation failed: Invalid items found:', invalidItems);
      addToast({ 
        type: 'error', 
        title: 'Invalid Items', 
        message: `${invalidItems.length} items have invalid data. Please check quantities and costs.` 
      });
      return;
    }

    console.log('✅ Validation passed, proceeding with save...');

    setLoading(true);
    try {
      let finalStatus = status;
      // If the receiving record status is 'completed' but the button clicked is not 'completed',
      // it means we are saving an already completed record, so we just save it without re-updating inventory.
      if (receivingRecord.status === 'completed' && status !== 'completed') {
        finalStatus = 'completed'; 
      }

      let purchaseOrderId = receivingRecord.purchase_order_id;
      
      // If no PO is selected, create a dummy PO for manual entry
      if (!purchaseOrderId) {
        console.log('📝 Creating dummy PO for manual entry with supplier:', selectedSupplier);
        addToast({ type: 'info', title: 'Processing', message: 'Creating manual entry record...' });
        purchaseOrderId = await createDummyPOForManualEntry();
        console.log('✅ Dummy PO created:', purchaseOrderId);
      }

      const finalRecord = {
        purchase_order_id: purchaseOrderId,
        received_by: user?.id || receivingRecord.received_by,
        received_by_name: receivingRecord.received_by_name,
        received_date: new Date(receivingRecord.received_date).toISOString(),
        notes: `${receivingRecord.notes}\n\nItems:\n${items.map(item => 
          `${item.productName} - Qty: ${item.quantity}, Cost: ₱${item.unitCost.toFixed(2)}, Total: ₱${item.totalCost.toFixed(2)}`
        ).join('\n')}\n\nTotal Amount: ₱${getTotalAmount().toFixed(2)}`,
        status: finalStatus,
      };

      // Save receiving record
      console.log('💾 Saving receiving record to database:', finalRecord);
      const { data, error } = await supabase
        .from('purchase_order_receiving_records')
        .insert([finalRecord])
        .select();

      if (error) {
        console.error('❌ Database error saving receiving record:', error);
        throw error;
      }

      console.log('✅ Receiving record saved successfully:', data);

      // Update inventory if status is completed
      if (finalStatus === 'completed') {
        await updateInventory();
        // Refresh product data to show updated inventory
        if (fetchProducts) {
          try {
            await fetchProducts();
            console.log('🔄 Product data refreshed after inventory update');
          } catch (refreshError) {
            console.error('Failed to refresh product data:', refreshError);
          }
        }
        addToast({ type: 'success', title: 'Success', message: 'Receiving completed and inventory updated' });
      } else {
        addToast({ type: 'success', title: 'Record Saved', message: `Receiving record ${finalStatus === 'cancelled' ? 'cancelled' : 'saved'}` });
      }
      
      // Reset form
      setReceivingRecord({
        purchase_order_id: null,
        received_by: user?.id || '',
        received_by_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email?.split('@')[0] || '',
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'pending'
      });
      setSelectedPO(null);
      setSelectedSupplier('');
      setItems([]);

      // Reload available POs
      loadAvailablePurchaseOrders();
    } catch (error) {
      console.error('Error saving receiving record:', error);
      addToast({ type: 'error', title: 'Error', message: 'Failed to save receiving record' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30 dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receiving Voucher Entry</h1>
        </div>

        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Receipt className="inline h-4 w-4 mr-1" />
              Purchase Order (Optional)
            </label>
            <select
              value={receivingRecord.purchase_order_id || ''}
              onChange={(e) => handlePOChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">No Purchase Order (Manual Entry)</option>
              {availablePOs.map(po => (
                <option key={po.id} value={po.id}>
                  {po.po_number} - {po.supplier_name} (₱{po.total?.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="inline h-4 w-4 mr-1" />
              Supplier (For Manual Entry)
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              disabled={!!receivingRecord.purchase_order_id}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
            >
              <option value="">No Specific Supplier</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} {supplier.contact_person && `(${supplier.contact_person})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Received Date *
            </label>
            <input
              type="date"
              value={receivingRecord.received_date}
              onChange={(e) => setReceivingRecord(prev => ({ ...prev, received_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Received By *
            </label>
            <select
              value={receivingRecord.received_by}
              onChange={(e) => {
                const selectedUser = users.find(u => u.id === e.target.value);
                setReceivingRecord(prev => ({ 
                  ...prev, 
                  received_by: e.target.value,
                  received_by_name: selectedUser ? 
                    `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || 
                    selectedUser.full_name || 
                    selectedUser.email?.split('@')[0] || 'Unknown' : ''
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name && user.last_name ? 
                    `${user.first_name} ${user.last_name}` : 
                    user.full_name || 
                    user.email?.split('@')[0] || 'Unknown'
                  }
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={receivingRecord.status}
              onChange={(e) => setReceivingRecord(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Received By Name
            </label>
            <input
              type="text"
              value={receivingRecord.received_by_name}
              onChange={(e) => setReceivingRecord(prev => ({ ...prev, received_by_name: e.target.value }))}
              placeholder="Auto-filled from user selection"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-50 dark:bg-gray-600"
            />
          </div>
        </div>

        {/* Purchase Order Details (only if PO is selected) */}
        {selectedPO && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Purchase Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">PO Number:</span>
                <p className="text-gray-900 dark:text-white">{selectedPO.po_number}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Supplier:</span>
                <p className="text-gray-900 dark:text-white">{selectedPO.supplier_name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Total:</span>
                <p className="text-gray-900 dark:text-white">₱{selectedPO.total?.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Supplier Details (only if manual entry with supplier selected) */}
        {!receivingRecord.purchase_order_id && selectedSupplier && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Supplier Information</h3>
            {(() => {
              const supplier = suppliers.find(s => s.id === selectedSupplier);
              return supplier ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Supplier:</span>
                    <p className="text-gray-900 dark:text-white">{supplier.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Contact Person:</span>
                    <p className="text-gray-900 dark:text-white">{supplier.contact_person || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                    <p className="text-gray-900 dark:text-white">{supplier.email || 'Not specified'}</p>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Add Item Section */}
        <div className="border-t pt-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product *
              </label>
              <select
                value={newItem.productId}
                onChange={(e) => setNewItem(prev => ({ ...prev, productId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name} (Stock: {product.stock})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit Cost *
              </label>
              <input
                type="number"
                value={newItem.unitCost}
                onChange={(e) => setNewItem(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Stock
              </label>
              <input
                type="text"
                value={(() => {
                  const product = products.find(p => p.id === newItem.productId);
                  return product ? `${product.stock} ${product.unit || 'pcs'}` : 'Select product first';
                })()}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Cost
              </label>
              <input
                type="text"
                value={`₱${(newItem.quantity * newItem.unitCost).toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={addItem}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Items List */}
        {items.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Items to Receive</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Receiving Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">New Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unit Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((item) => {
                    const product = products.find(p => p.id === item.productId);
                    const currentStock = product?.stock || 0;
                    const newStock = currentStock + item.quantity;
                    
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-xs text-gray-500">Unit: {product?.unit || 'pcs'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${currentStock <= (product?.minStock || 0) ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                            {currentStock} {product?.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0.01"
                            step="0.01"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="font-medium text-green-600">
                            {newStock} {product?.unit || 'pcs'}
                          </span>
                          <div className="text-xs text-gray-500">
                            (+{item.quantity})
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">₱{item.totalCost.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="font-medium">Items to receive:</span> {items.length}
                  </div>
                  <div>
                    <span className="font-medium">Total quantity:</span> {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                  <div>
                    <span className="font-medium">Low stock items:</span>{' '}
                    <span className="text-red-600">
                      {items.filter(item => {
                        const product = products.find(p => p.id === item.productId);
                        return (product?.stock || 0) <= (product?.minStock || 0);
                      }).length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Total Amount: ₱{getTotalAmount().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Notes
          </label>
          <textarea
            value={receivingRecord.notes}
            onChange={(e) => setReceivingRecord(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Additional notes about the receiving process..."
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {items.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    No items added yet
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Please add at least one item using the "Add Item" button above before saving the receiving voucher.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={() => handleSave('pending')}
              disabled={loading || items.length === 0}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md flex items-center gap-2"
              title={items.length === 0 ? "Add items before saving" : "Save as pending"}
            >
              <Save className="h-4 w-4" />
              Save as Pending
            </button>
            <button
              onClick={() => handleSave('completed')}
              disabled={loading || items.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md flex items-center gap-2"
              title={items.length === 0 ? "Add items before completing" : "Complete and update inventory"}
            >
              <Save className="h-4 w-4" />
              Complete & Update Inventory
            </button>
            <button
              onClick={() => handleSave('cancelled')}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-md flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Saving...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceivingVoucherEntry;