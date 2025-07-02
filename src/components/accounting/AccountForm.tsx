import React, { useState, useEffect } from 'react';
import { X, Save, BookOpen } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';

interface AccountFormProps {
  accountId?: string | null;
  onClose: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ accountId, onClose }) => {
  const { accounts, addAccount, updateAccount, getAccount } = useBusinessStore();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Asset' as 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense',
    description: '',
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (accountId) {
      const account = getAccount(accountId);
      if (account) {
        setFormData({
          code: account.code,
          name: account.name,
          type: account.type,
          description: account.description || '',
          isActive: account.isActive
        });
      }
    }
  }, [accountId, getAccount]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = 'Account code is required';
    if (!formData.name.trim()) newErrors.name = 'Account name is required';
    if (!formData.type) newErrors.type = 'Account type is required';
    // Unique code check
    const duplicate = accounts.find(a => a.code === formData.code && a.id !== accountId);
    if (duplicate) newErrors.code = 'Account code must be unique';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const accountData = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description.trim() || undefined,
      isActive: formData.isActive
    };
    if (accountId) {
      updateAccount(accountId, accountData);
    } else {
      addAccount(accountData);
    }
    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              {accountId ? 'Edit Account' : 'Add New Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={e => handleInputChange('code', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.code ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="e.g. 1001"
                autoFocus
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="e.g. Cash on Hand"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
              <select
                value={formData.type}
                onChange={e => handleInputChange('type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.type ? 'border-red-300' : 'border-gray-300'}`}
              >
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description"
              />
            </div>
            <div className="md:col-span-2 flex items-center mt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={e => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                Active Account
              </label>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {accountId ? 'Update' : 'Add'} Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountForm; 