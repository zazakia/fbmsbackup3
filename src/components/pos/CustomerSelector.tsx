import React, { useState } from 'react';
import { Search, User, X, Plus } from 'lucide-react';
import { Customer } from '../../types/business';

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomer?: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  showModal?: boolean;
  onClose?: () => void;
  onSelect?: (customerId: string) => void; // Legacy support
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({ 
  customers, 
  selectedCustomer,
  onCustomerSelect,
  showModal = false,
  onClose,
  onSelect // Legacy support
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(customer =>
    customer.isActive && (
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)
    )
  );

  const handleCustomerSelect = (customer: Customer | null) => {
    onCustomerSelect(customer);
    // Legacy support for onSelect prop
    if (onSelect && customer) {
      onSelect(customer.id);
    }
    if (onClose) onClose();
  };

  if (!showModal) {
    // Inline customer display for cart
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Customer</label>
        <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Walk-in Customer'}
              </p>
              <p className="text-xs text-gray-500">
                {selectedCustomer?.email || 'No customer selected'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onCustomerSelect(null)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  // Modal display
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Customer</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Walk-in Customer Option */}
          <button
            onClick={() => handleCustomerSelect(null)}
            className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 mb-2"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Walk-in Customer</p>
                <p className="text-sm text-gray-500">No customer information</p>
              </div>
            </div>
          </button>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4" />
              <p className="font-medium">No customers found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-medium text-sm">
                        {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {customer.email || customer.phone || 'No contact info'}
                      </p>
                      {customer.currentBalance > 0 && (
                        <p className="text-xs text-red-600">
                          Balance: ₱{customer.currentBalance.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => {
              // TODO: Implement customer creation functionality
              console.log('Add new customer functionality to be implemented');
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Customer
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerSelector;