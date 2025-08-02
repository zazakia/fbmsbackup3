import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  Truck, 
  Package, 
  Search, 
  Calendar, 
  MapPin,
  User,
  FileText,
  Save,
  Send,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import { 
  TransferSlip as TransferSlipType, 
  TransferSlipItem, 
  TransferStatus,
  InventoryLocation,
  Product
} from '../../types/business';
import { 
  createTransferSlip, 
  updateTransferSlip, 
  getNextTransferNumber, 
  getInventoryLocations 
} from '../../api/productHistory';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';

interface TransferSlipProps {
  transfer?: TransferSlipType;
  onClose: () => void;
  onSave?: (transfer: TransferSlipType) => void;
  mode?: 'create' | 'edit' | 'view';
}

const TransferSlip: React.FC<TransferSlipProps> = ({ 
  transfer, 
  onClose, 
  onSave, 
  mode = 'create' 
}) => {
  const [formData, setFormData] = useState<Partial<TransferSlipType>>({
    transferNumber: '',
    fromLocationId: '',
    fromLocationName: '',
    toLocationId: '',
    toLocationName: '',
    items: [],
    status: 'draft',
    transferDate: new Date(),
    expectedDeliveryDate: undefined,
    vehicleInfo: '',
    driverInfo: '',
    notes: '',
    totalItems: 0,
    totalQuantity: 0,
    totalValue: 0
  });

  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { products } = useBusinessStore();
  const { addToast } = useToastStore();
  const { user } = useSupabaseAuthStore();

  // Load initial data
  useEffect(() => {
    if (transfer) {
      setFormData(transfer);
    } else {
      loadNextTransferNumber();
    }
    loadLocations();
  }, [transfer]);

  const loadNextTransferNumber = async () => {
    try {
      const { data, error } = await getNextTransferNumber();
      if (data && !error) {
        setFormData(prev => ({ ...prev, transferNumber: data }));
      }
    } catch (error) {
      console.error('Error loading transfer number:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const { data, error } = await getInventoryLocations();
      if (data && !error) {
        setLocations(data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  // Filter products for search
  const filteredProducts = products.filter(product =>
    product.isActive &&
    product.stock > 0 &&
    (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle form changes
  const handleInputChange = (field: keyof TransferSlipType, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Update location names when IDs change
    if (field === 'fromLocationId') {
      const location = locations.find(loc => loc.id === value);
      setFormData(prev => ({ ...prev, fromLocationName: location?.name || '' }));
    }
    if (field === 'toLocationId') {
      const location = locations.find(loc => loc.id === value);
      setFormData(prev => ({ ...prev, toLocationName: location?.name || '' }));
    }
  };

  // Handle item changes
  const addItem = (product: Product) => {
    const existingItem = formData.items?.find(item => item.productId === product.id);
    
    if (existingItem) {
      updateItemQuantity(product.id, existingItem.requestedQuantity + 1);
    } else {
      const newItem: TransferSlipItem = {
        id: `temp-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        requestedQuantity: 1,
        unitCost: product.cost,
        totalValue: product.cost
      };

      setFormData(prev => ({
        ...prev,
        items: [...(prev.items || []), newItem]
      }));
    }

    setShowProductSearch(false);
    setSearchTerm('');
    calculateTotals();
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: prev.items?.map(item => 
        item.productId === productId
          ? { 
              ...item, 
              requestedQuantity: quantity,
              totalValue: item.unitCost * quantity
            }
          : item
      ) || []
    }));
    calculateTotals();
  };

  const removeItem = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.productId !== productId) || []
    }));
    calculateTotals();
  };

  const calculateTotals = useCallback(() => {
    const items = formData.items || [];
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.requestedQuantity, 0);
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

    setFormData(prev => ({
      ...prev,
      totalItems,
      totalQuantity,
      totalValue
    }));
  }, [formData.items]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  // Status configurations
  const statusConfig = {
    draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
    pending: { label: 'Pending Approval', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100' },
    issued: { label: 'Issued', color: 'text-purple-600', bg: 'bg-purple-100' },
    in_transit: { label: 'In Transit', color: 'text-indigo-600', bg: 'bg-indigo-100' },
    partially_received: { label: 'Partially Received', color: 'text-orange-600', bg: 'bg-orange-100' },
    received: { label: 'Received', color: 'text-green-600', bg: 'bg-green-100' },
    completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-200' },
    cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
    rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-200' }
  };

  // Save functions
  const handleSave = async (newStatus?: TransferStatus) => {
    if (!formData.fromLocationId || !formData.toLocationId) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select both from and to locations.'
      });
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please add at least one item to transfer.'
      });
      return;
    }

    if (formData.fromLocationId === formData.toLocationId) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'From and To locations cannot be the same.'
      });
      return;
    }

    setIsSaving(true);

    try {
      const transferData: Omit<TransferSlipType, 'id' | 'createdAt'> = {
        transferNumber: formData.transferNumber || '',
        fromLocationId: formData.fromLocationId || '',
        fromLocationName: formData.fromLocationName || '',
        toLocationId: formData.toLocationId || '',
        toLocationName: formData.toLocationName || '',
        items: formData.items || [],
        status: newStatus || formData.status || 'draft',
        requestedBy: user?.id || '',
        requestedByName: user?.name || '',
        transferDate: formData.transferDate || new Date(),
        expectedDeliveryDate: formData.expectedDeliveryDate,
        vehicleInfo: formData.vehicleInfo,
        driverInfo: formData.driverInfo,
        notes: formData.notes,
        totalItems: formData.totalItems || 0,
        totalQuantity: formData.totalQuantity || 0,
        totalValue: formData.totalValue || 0
      };

      let result;
      if (transfer?.id) {
        result = await updateTransferSlip(transfer.id, transferData);
      } else {
        result = await createTransferSlip(transferData);
      }

      if (result.error) {
        addToast({
          type: 'error',
          title: 'Save Failed',
          message: 'Failed to save transfer slip.'
        });
        return;
      }

      addToast({
        type: 'success',
        title: 'Transfer Slip Saved',
        message: `Transfer slip ${newStatus === 'pending' ? 'submitted for approval' : 'saved as draft'} successfully.`
      });

      if (onSave && result.data) {
        onSave(result.data);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving transfer slip:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred while saving.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = mode !== 'view' && (!formData.status || ['draft', 'rejected'].includes(formData.status));
  const canSubmit = canEdit && formData.status === 'draft';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {mode === 'create' ? 'New Transfer Slip' : mode === 'edit' ? 'Edit Transfer Slip' : 'Transfer Slip Details'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.transferNumber && `Transfer #${formData.transferNumber}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {formData.status && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[formData.status]?.bg} ${statusConfig[formData.status]?.color}`}>
                  {statusConfig[formData.status]?.label}
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Transfer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Transfer Information
              </h3>
              
              {/* Transfer Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transfer Number
                </label>
                <input
                  type="text"
                  value={formData.transferNumber || ''}
                  onChange={(e) => handleInputChange('transferNumber', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-dark-700"
                />
              </div>

              {/* From Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Location *
                </label>
                <select
                  value={formData.fromLocationId || ''}
                  onChange={(e) => handleInputChange('fromLocationId', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-dark-700"
                >
                  <option value="">Select source location</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* To Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Location *
                </label>
                <select
                  value={formData.toLocationId || ''}
                  onChange={(e) => handleInputChange('toLocationId', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-dark-700"
                >
                  <option value="">Select destination location</option>
                  {locations.filter(loc => loc.id !== formData.fromLocationId).map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transfer Date
                </label>
                <input
                  type="date"
                  value={formData.transferDate ? formData.transferDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('transferDate', new Date(e.target.value))}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-dark-700"
                />
              </div>

              {/* Expected Delivery Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate ? formData.expectedDeliveryDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value ? new Date(e.target.value) : undefined)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-dark-700"
                />
              </div>
            </div>

            {/* Delivery Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Delivery Information
              </h3>

              {/* Vehicle Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Information
                </label>
                <input
                  type="text"
                  value={formData.vehicleInfo || ''}
                  onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Vehicle type, plate number, etc."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-dark-700"
                />
              </div>

              {/* Driver Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Driver Information
                </label>
                <input
                  type="text"
                  value={formData.driverInfo || ''}
                  onChange={(e) => handleInputChange('driverInfo', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Driver name, contact, etc."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-dark-700"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  disabled={!canEdit}
                  rows={4}
                  placeholder="Additional notes or instructions..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-dark-700"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                    <span className="text-gray-900 dark:text-gray-100">{formData.totalItems || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Quantity:</span>
                    <span className="text-gray-900 dark:text-gray-100">{formData.totalQuantity || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                    <span className="text-gray-900 dark:text-gray-100">₱{(formData.totalValue || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Items to Transfer
              </h3>
              {canEdit && (
                <button
                  onClick={() => setShowProductSearch(true)}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              )}
            </div>

            {/* Product Search Modal */}
            {showProductSearch && (
              <div className="mb-4 p-4 border border-gray-200 dark:border-dark-600 rounded-lg bg-gray-50 dark:bg-dark-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Add Product</h4>
                  <button
                    onClick={() => setShowProductSearch(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addItem(product)}
                      className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        SKU: {product.sku} | Stock: {product.stock} | Cost: ₱{product.cost.toFixed(2)}
                      </div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No products found
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items Table */}
            {formData.items && formData.items.length > 0 ? (
              <div className="border border-gray-200 dark:border-dark-600 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total
                      </th>
                      {canEdit && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                    {formData.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {item.productSku}
                        </td>
                        <td className="px-4 py-3">
                          {canEdit ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateItemQuantity(item.productId, item.requestedQuantity - 1)}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[2rem] text-center">
                                {item.requestedQuantity}
                              </span>
                              <button
                                onClick={() => updateItemQuantity(item.productId, item.requestedQuantity + 1)}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {item.requestedQuantity}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          ₱{item.unitCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          ₱{item.totalValue.toFixed(2)}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No items added yet. Click "Add Item" to start building your transfer slip.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              {mode === 'view' ? 'Close' : 'Cancel'}
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  className="flex items-center px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                {canSubmit && (
                  <button
                    onClick={() => handleSave('pending')}
                    disabled={isSaving}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSaving ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferSlip;