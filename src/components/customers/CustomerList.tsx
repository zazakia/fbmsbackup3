import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Edit, Trash2, Grid, List } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';

const CustomerList: React.FC = () => {
  const { customers, fetchCustomers, deleteCustomer, isLoading, error } = useBusinessStore();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading customers...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  const handleEdit = (customerId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit customer:', customerId);
  };

  const handleDelete = (customerId: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      deleteCustomer(customerId);
    }
  };

  const renderMobileCards = () => (
    <div className="space-y-4">
      {customers.map((customer) => (
        <div key={customer.id} className="mobile-table-card">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {customer.firstName} {customer.lastName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Customer since {new Date(customer.createdAt).getFullYear()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEdit(customer.id)}
                className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(customer.id)}
                className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100">{customer.email}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-gray-900 dark:text-gray-100">{customer.address}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderDesktopTable = () => (
    <div className="mobile-table-wrapper">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
        <thead className="bg-gray-50 dark:bg-dark-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Customer
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Address
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Joined
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {customer.firstName} {customer.lastName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {customer.phone || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {customer.address || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {new Date(customer.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(customer.id)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No customers found</h3>
        <p className="text-gray-500 dark:text-gray-400">Add your first customer to get started</p>
      </div>
    );
  }

  return (
    <div>
      {/* View Toggle - Show on mobile */}
      <div className="md:hidden mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Customers</h3>
        <div className="flex bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden">
        {viewMode === 'cards' ? renderMobileCards() : renderDesktopTable()}
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block">
        {renderDesktopTable()}
      </div>
    </div>
  );
};

export default CustomerList; 