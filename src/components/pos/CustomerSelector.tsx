import React, { useState } from 'react';
import { Search, User, X, Plus } from 'lucide-react';
import { Customer } from '../../types/business';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import QuickCustomerAdd from './QuickCustomerAdd';

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomer?: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  showModal?: boolean;
  onClose?: () => void;
  onSelect?: (customerId: string) => void; // Legacy support
  loading?: boolean;
  onRefreshCustomers?: () => void;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({ 
  customers, 
  selectedCustomer,
  onCustomerSelect,
  showModal = false,
  onClose,
  onSelect, // Legacy support
  loading = false,
  onRefreshCustomers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  });
  
  const { addCustomer } = useBusinessStore();
  const { addToast } = useToastStore();

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

  const handleQuickCustomerAdded = (customer: Customer) => {
    // Refresh customer list
    if (onRefreshCustomers) {
      onRefreshCustomers();
    }
    // Select the newly added customer
    handleCustomerSelect(customer);
    setShowQuickAdd(false);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.firstName.trim() || !newCustomer.lastName.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'First name and last name are required'
      });
      return;
    }

    try {
      const customerData = {
        firstName: newCustomer.firstName.trim(),
        lastName: newCustomer.lastName.trim(),
        email: newCustomer.email.trim() || undefined,
        phone: newCustomer.phone.trim() || undefined,
        address: newCustomer.address.trim() || undefined,
        customerType: 'regular' as const,
        creditLimit: 0,
        currentBalance: 0,
        totalPurchases: 0,
        loyaltyPoints: 0,
        discountPercentage: 0,
        isActive: true
      };

      await addCustomer(customerData);
      
      addToast({
        type: 'success',
        title: 'Customer Added',
        message: `${customerData.firstName} ${customerData.lastName} has been added successfully`
      });

      // Reset form
      setNewCustomer({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: ''
      });
      setShowAddForm(false);
      
      // Find and select the newly added customer
      const newlyAddedCustomer = customers.find(c => 
        c.firstName === customerData.firstName && 
        c.lastName === customerData.lastName
      );
      if (newlyAddedCustomer) {
        handleCustomerSelect(newlyAddedCustomer);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add customer'
      });
    }
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
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading customers...</p>
            </div>
          ) : (
            <>
              {/* Walk-in Customer Option */}
              <button
                onClick={() => handleCustomerSelect(null)}
                className={`w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 mb-3 ${
                  !selectedCustomer ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    !selectedCustomer ? 'bg-blue-100' : 'bg-gray-200'
                  }`}>
                    <User className={`h-5 w-5 ${
                      !selectedCustomer ? 'text-blue-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <p className={`font-medium ${
                      !selectedCustomer ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      Walk-in Customer
                    </p>
                    <p className="text-sm text-gray-500">No customer information required</p>
                  </div>
                  {!selectedCustomer && (
                    <div className="ml-auto">
                      <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              </button>

              {/* Customer List Header */}
              {customers.length > 0 && (
                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 px-1">
                  Registered Customers ({filteredCustomers.length})
                </div>
              )}

              {filteredCustomers.length === 0 && searchTerm ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No customers found</p>
                  <p className="text-sm">Try adjusting your search terms or add a new customer</p>
                </div>
              ) : filteredCustomers.length === 0 && !searchTerm ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No registered customers</p>
                  <p className="text-sm">Add your first customer below</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className={`w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors ${
                        selectedCustomer?.id === customer.id ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                          selectedCustomer?.id === customer.id ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <span className={`font-medium text-sm ${
                            selectedCustomer?.id === customer.id ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${
                            selectedCustomer?.id === customer.id ? 'text-blue-900' : 'text-gray-900'
                          }`}>
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
                        {selectedCustomer?.id === customer.id && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Add Customer Options */}
        <div className="p-4 border-t border-gray-200">
          {!showAddForm ? (
            <div className="space-y-2">
              <button 
                onClick={() => setShowQuickAdd(true)}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Quick Add Customer
              </button>
              <button 
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Detailed Form
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Add New Customer</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="First Name *"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Last Name *"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <input
                type="email"
                placeholder="Email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <input
                type="tel"
                placeholder="Phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <input
                type="text"
                placeholder="Address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomer}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Customer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showQuickAdd && (
        <QuickCustomerAdd
          onCustomerAdded={handleQuickCustomerAdded}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
};

export default CustomerSelector;