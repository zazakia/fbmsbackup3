import React, { useState, useEffect } from 'react';
import { X, Save, Building } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { createSupplier, updateSupplier as updateSupplierAPI, getSupplier as getSupplierAPI } from '../../api/purchases';

interface SupplierFormProps {
  supplierId?: string | null;
  onClose: () => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ supplierId, onClose }) => {
  const { suppliers, addSupplier, updateSupplier } = useBusinessStore();
  
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    zipCode: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSupplier = async () => {
      if (supplierId) {
        setLoading(true);
        try {
          const { data: supplier, error } = await getSupplierAPI(supplierId);
          if (supplier && !error) {
            setFormData({
              name: supplier.name,
              contactPerson: supplier.contactPerson || '',
              email: supplier.email || '',
              phone: supplier.phone || '',
              address: supplier.address || '',
              city: supplier.city || '',
              province: supplier.province || '',
              zipCode: supplier.zipCode || ''
            });
          } else {
            console.error('Failed to load supplier:', error);
          }
        } catch (error) {
          console.error('Error loading supplier:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadSupplier();
  }, [supplierId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Check for duplicate name
    const existingSupplier = suppliers.find(s => 
      s.name.toLowerCase() === formData.name.toLowerCase() && s.id !== supplierId
    );
    if (existingSupplier) {
      newErrors.name = 'Supplier name already exists';
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
      const supplierData = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        province: formData.province.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        isActive: true
      };

      if (supplierId) {
        // Update existing supplier
        const { error } = await updateSupplierAPI(supplierId, supplierData);
        if (error) {
          console.error('Failed to update supplier:', error);
          setErrors({ submit: 'Failed to update supplier' });
          return;
        }
        
        // Also update local store
        updateSupplier(supplierId, supplierData);
      } else {
        // Create new supplier
        const { error } = await createSupplier(supplierData);
        if (error) {
          console.error('Failed to create supplier:', error);
          setErrors({ submit: 'Failed to create supplier' });
          return;
        }
        
        // Also add to local store
        addSupplier(supplierData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving supplier:', error);
      setErrors({ submit: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-600">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {loading ? 'Loading...' : supplierId ? 'Edit Supplier' : 'Add New Supplier'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Supplier Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter supplier name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter contact person name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
              {errors.submit && (
                <p className="mt-1 text-sm text-red-600">{errors.submit}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Province
              </label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => handleInputChange('province', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter province"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter ZIP code"
              />
            </div>
          </div>

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
              disabled={saving || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : supplierId ? 'Update' : 'Add'} Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierForm;          