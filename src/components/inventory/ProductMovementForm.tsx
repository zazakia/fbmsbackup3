import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Truck, 
  RefreshCw, 
  ArrowUpDown,
  Search,
  Calendar,
  MapPin,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  ProductMovementHistory, 
  ProductMovementType, 
  MovementStatus,
  InventoryLocation,
  Product
} from '../../types/business';
import { 
  createProductMovement, 
  getInventoryLocations 
} from '../../api/productHistory';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';

interface ProductMovementFormProps {
  onClose: () => void;
  onSave?: (movement: ProductMovementHistory) => void;
  preselectedProductId?: string;
}

const ProductMovementForm: React.FC<ProductMovementFormProps> = ({ 
  onClose, 
  onSave, 
  preselectedProductId 
}) => {
  const [formData, setFormData] = useState({
    productId: preselectedProductId || '',
    type: 'adjustment_in' as ProductMovementType,
    quantity: 0,
    reason: '',
    referenceNumber: '',
    referenceType: 'manual' as const,
    locationId: '',
    unitCost: 0,
    batchNumber: '',
    expiryDate: '',
    notes: ''
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const { products, updateStock } = useBusinessStore();
  const { addToast } = useToastStore();
  const { user } = useSupabaseAuthStore();

  // Movement type configurations
  const movementTypes = [
    { value: 'adjustment_in', label: 'Adjustment (+)', icon: Plus, description: 'Add stock - inventory increase' },
    { value: 'adjustment_out', label: 'Adjustment (-)', icon: TrendingDown, description: 'Remove stock - inventory decrease' },
    { value: 'stock_in', label: 'Stock In', icon: TrendingUp, description: 'Receive new inventory' },
    { value: 'stock_out', label: 'Stock Out', icon: TrendingDown, description: 'Issue inventory' },
    { value: 'damage_out', label: 'Damaged', icon: TrendingDown, description: 'Remove damaged goods' },
    { value: 'expired_out', label: 'Expired', icon: TrendingDown, description: 'Remove expired goods' },
    { value: 'return_in', label: 'Return In', icon: RefreshCw, description: 'Customer/supplier return' },
    { value: 'return_out', label: 'Return Out', icon: RefreshCw, description: 'Return to supplier' },
    { value: 'recount', label: 'Recount', icon: ArrowUpDown, description: 'Physical count adjustment' }
  ];

  // Load initial data
  useEffect(() => {
    loadLocations();
    if (preselectedProductId) {
      const product = products.find(p => p.id === preselectedProductId);
      if (product) {
        setSelectedProduct(product);
        setFormData(prev => ({ 
          ...prev, 
          productId: product.id,
          unitCost: product.cost 
        }));
      }
    }
  }, [preselectedProductId, products]);

  const loadLocations = async () => {
    try {
      const { data, error } = await getInventoryLocations();
      if (data && !error) {
        setLocations(data);
        // Set default location if only one exists
        if (data.length === 1) {
          setFormData(prev => ({ ...prev, locationId: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  // Filter products for search
  const filteredProducts = products.filter(product =>
    product.isActive &&
    (product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
     product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  // Handle form changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setFormData(prev => ({ 
      ...prev, 
      productId: product.id,
      unitCost: product.cost 
    }));
    setShowProductSearch(false);
    setProductSearchTerm('');
  };

  const calculateNewStock = () => {
    if (!selectedProduct) return 0;
    const isNegative = ['stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out'].includes(formData.type);
    const change = isNegative ? -formData.quantity : formData.quantity;
    return Math.max(0, selectedProduct.stock + change);
  };

  const getTotalValue = () => {
    return formData.quantity * formData.unitCost;
  };

  // Validation
  const isFormValid = () => {
    return (
      formData.productId &&
      formData.quantity > 0 &&
      formData.reason.trim() &&
      (formData.type !== 'recount' || formData.locationId) // Location required for recount
    );
  };

  // Save function
  const handleSave = async () => {
    if (!isFormValid()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.'
      });
      return;
    }

    if (!selectedProduct) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please select a product.'
      });
      return;
    }

    setIsSaving(true);

    try {
      const previousStock = selectedProduct.stock;
      const newStock = calculateNewStock();
      const location = locations.find(loc => loc.id === formData.locationId);

      const movementData: Omit<ProductMovementHistory, 'id' | 'createdAt'> = {
        productId: formData.productId,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        type: formData.type,
        quantity: formData.quantity,
        previousStock,
        newStock,
        unitCost: formData.unitCost || undefined,
        totalValue: formData.unitCost ? getTotalValue() : undefined,
        reason: formData.reason,
        referenceNumber: formData.referenceNumber || undefined,
        referenceType: formData.referenceType,
        locationId: formData.locationId || undefined,
        locationName: location?.name,
        batchNumber: formData.batchNumber || undefined,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
        performedBy: user?.id || '',
        performedByName: user?.name || user?.email || 'Unknown User',
        notes: formData.notes || undefined,
        status: 'completed' as MovementStatus
      };

      const { data, error } = await createProductMovement(movementData);
      
      if (error) {
        addToast({
          type: 'error',
          title: 'Save Failed',
          message: 'Failed to create product movement.'
        });
        return;
      }

      // Update product stock in the business store
      const isNegative = ['stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out'].includes(formData.type);
      const stockChange = isNegative ? -formData.quantity : formData.quantity;
      updateStock(formData.productId, stockChange, formData.type, user?.id, formData.referenceNumber, formData.reason);

      addToast({
        type: 'success',
        title: 'Movement Created',
        message: `Product movement recorded successfully. New stock: ${newStock}`
      });

      if (onSave && data) {
        onSave(data);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving movement:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred while saving.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedMovementType = movementTypes.find(type => type.value === formData.type);
  const Icon = selectedMovementType?.icon || Package;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Add Product Movement
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Record inventory adjustment or movement
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-160px)]">
          <div className="space-y-6">
            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product *
              </label>
              {selectedProduct ? (
                <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-dark-600 rounded-lg bg-gray-50 dark:bg-dark-700">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedProduct.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      SKU: {selectedProduct.sku} | Current Stock: {selectedProduct.stock}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProductSearch(true)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowProductSearch(true)}
                  className="w-full p-3 border border-gray-300 dark:border-dark-600 rounded-lg text-left text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  Click to select a product...
                </button>
              )}
            </div>

            {/* Product Search Modal */}
            {showProductSearch && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
                <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-md">
                  <div className="p-4 border-b border-gray-200 dark:border-dark-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Select Product</h3>
                      <button
                        onClick={() => setShowProductSearch(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-3 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-4">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
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
              </div>
            )}

            {/* Movement Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Movement Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
              >
                {movementTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity and Stock Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity || ''}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unit Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitCost || ''}
                  onChange={(e) => handleInputChange('unitCost', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Stock Impact */}
            {selectedProduct && formData.quantity > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Stock Impact</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-400">Current Stock:</span>
                    <span className="font-medium text-blue-900 dark:text-blue-300">{selectedProduct.stock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-400">Change:</span>
                    <span className={`font-medium ${
                      ['stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out'].includes(formData.type)
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {['stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out'].includes(formData.type) ? '-' : '+'}
                      {formData.quantity}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1 border-blue-200 dark:border-blue-700">
                    <span className="text-blue-700 dark:text-blue-400">New Stock:</span>
                    <span className="font-bold text-blue-900 dark:text-blue-300">{calculateNewStock()}</span>
                  </div>
                  {formData.unitCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-400">Total Value:</span>
                      <span className="font-medium text-blue-900 dark:text-blue-300">₱{getTotalValue().toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason *
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Describe the reason for this movement..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                  placeholder="Invoice, PO number, etc."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <select
                  value={formData.locationId}
                  onChange={(e) => handleInputChange('locationId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select location (optional)</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Batch and Expiry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => handleInputChange('batchNumber', e.target.value)}
                  placeholder="Batch or lot number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                placeholder="Additional notes or comments..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isFormValid() || isSaving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Movement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductMovementForm;