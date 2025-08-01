import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Plus, Trash2, Package } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { PurchaseOrderItem, Supplier, PurchaseOrderStatus } from '../../types/business';
import { getActiveSuppliers, createPurchaseOrder, updatePurchaseOrder as updatePO, getNextPONumber } from '../../api/purchases';

interface PurchaseOrderFormProps {
  poId?: string | null;
  onClose: () => void;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ poId, onClose }) => {
  const { 
    products, 
    addPurchaseOrder, 
    updatePurchaseOrder, 
    getPurchaseOrder
  } = useBusinessStore();
  
  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDate: '',
    status: 'draft' as PurchaseOrderStatus
  });

  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [realSuppliers, setRealSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load suppliers from API
  useEffect(() => {
    const loadSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const { data, error } = await getActiveSuppliers();
        if (data && !error) {
          setRealSuppliers(data);
        } else {
          console.warn('Failed to load suppliers:', error);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, []);

  useEffect(() => {
    if (poId) {
      const po = getPurchaseOrder(poId);
      if (po) {
        setFormData({
          supplierId: po.supplierId,
          expectedDate: po.expectedDate ? new Date(po.expectedDate).toISOString().split('T')[0] : '',
          status: po.status
        });
        setItems(po.items);
      }
    }
  }, [poId, getPurchaseOrder]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required';
    }

    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    
    try {
      const supplier = realSuppliers.find(s => s.id === formData.supplierId);
      if (!supplier) {
        setErrors({ supplierId: 'Supplier not found' });
        return;
      }

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.12; // 12% VAT
      const total = subtotal + tax;

      if (poId) {
        // Update existing PO
        const updateData = {
          supplierId: formData.supplierId,
          supplierName: supplier.name,
          items,
          subtotal,
          tax,
          total,
          status: formData.status,
          expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : undefined
        };
        
        const { error } = await updatePO(poId, updateData);
        if (error) {
          console.error('Failed to update purchase order:', error);
          setErrors({ submit: 'Failed to update purchase order' });
          return;
        }
        
        // Also update local store
        updatePurchaseOrder(poId, updateData);
      } else {
        // Create new PO
        const { data: poNumber } = await getNextPONumber();
        
        const poData = {
          poNumber: poNumber || `PO-${Date.now()}`,
          supplierId: formData.supplierId,
          supplierName: supplier.name,
          items,
          subtotal,
          tax,
          total,
          status: formData.status,
          expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : undefined,
          createdBy: '1' // TODO: Get from auth store
        };
        
        const { error } = await createPurchaseOrder(poData);
        if (error) {
          console.error('Failed to create purchase order:', error);
          setErrors({ submit: 'Failed to create purchase order' });
          return;
        }
        
        // Also add to local store
        addPurchaseOrder(poData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving purchase order:', error);
      setErrors({ submit: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      sku: '',
      quantity: 1,
      cost: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total if quantity or cost changed
    if (field === 'quantity' || field === 'cost') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].cost;
    }
    
    // Update product name and SKU if product changed
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].productName = product.name;
        updatedItems[index].sku = product.sku;
      }
    }
    
    setItems(updatedItems);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto dark:border-gray-600">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {poId ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Supplier *
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => handleInputChange('supplierId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.supplierId ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">
                  {loadingSuppliers ? 'Loading suppliers...' : 'Select Supplier'}
                </option>
                {realSuppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {errors.supplierId && (
                <p className="mt-1 text-sm text-red-600">{errors.supplierId}</p>
              )}
              {errors.submit && (
                <p className="mt-1 text-sm text-red-600">{errors.submit}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Expected Date
              </label>
              <input
                type="date"
                value={formData.expectedDate}
                onChange={(e) => handleInputChange('expectedDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="partial">Partial</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Purchase Order Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
            </div>

            {errors.items && (
              <p className="mb-4 text-sm text-red-600">{errors.items}</p>
            )}

            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No items added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                          Product
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(index, 'productId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select Product</option>
                          {products.filter(p => p.isActive).map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                          Cost (₱)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.cost}
                          onChange={(e) => updateItem(index, 'cost', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                          Total (₱)
                        </label>
                        <input
                          type="number"
                          value={item.total}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-full bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Subtotal:</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₱{items.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">VAT (12%):</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₱{(items.reduce((sum, item) => sum + item.total, 0) * 0.12).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total:</p>
                  <p className="text-xl font-bold text-green-600">
                    ₱{(items.reduce((sum, item) => sum + item.total, 0) * 1.12).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingSuppliers}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : poId ? 'Update' : 'Create'} Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;                  