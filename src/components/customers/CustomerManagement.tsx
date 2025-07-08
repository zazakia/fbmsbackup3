import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Star,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  DollarSign,
  Award
} from 'lucide-react';
import { Customer, CustomerType } from '../../types/business';
import { getCustomers, deleteCustomer, getCustomerStats } from '../../api/customers';
import { useToastStore } from '../../store/toastStore';
import { useNotificationStore, createSystemNotification } from '../../store/notificationStore';
import CustomerForm from './CustomerForm';
import CustomerProfile from './CustomerProfile';
import CustomerStats from './CustomerStats';
import CustomerAnalytics from './CustomerAnalytics';
import LoadingSpinner from '../LoadingSpinner';
import { customerNotificationService } from '../../services/customerNotifications';

interface CustomerManagementProps {}

const CustomerManagement: React.FC<CustomerManagementProps> = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<CustomerType | 'all' | 'active' | 'inactive'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [activeView, setActiveView] = useState<'customers' | 'analytics'>('customers');

  const { addToast } = useToastStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    fetchCustomers();
    fetchStats();
    
    // Initialize customer notification monitoring
    customerNotificationService.startMonitoring();
    
    return () => {
      customerNotificationService.stopMonitoring();
    };
  }, [activeFilter, searchTerm]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      
      if (activeFilter === 'active') filters.isActive = true;
      if (activeFilter === 'inactive') filters.isActive = false;
      if (['individual', 'business', 'vip', 'wholesale'].includes(activeFilter)) {
        filters.customerType = activeFilter as CustomerType;
      }
      if (searchTerm.trim()) filters.searchTerm = searchTerm.trim();

      const result = await getCustomers(filters);
      if (result.error) {
        throw result.error;
      }
      setCustomers(result.data || []);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch customers'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await getCustomerStats();
      if (result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch customer stats:', error);
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsProfileOpen(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (window.confirm(`Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`)) {
      try {
        const result = await deleteCustomer(customer.id);
        if (result.error) {
          throw result.error;
        }
        
        addToast({
          type: 'success',
          title: 'Customer Deleted',
          message: `${customer.firstName} ${customer.lastName} has been deleted`
        });

        addNotification(createSystemNotification(
          'Customer Deleted',
          `Customer ${customer.firstName} ${customer.lastName} has been removed from the system`,
          'info'
        ));

        fetchCustomers();
        fetchStats();
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to delete customer'
        });
      }
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    fetchCustomers();
    fetchStats();
  };

  const getCustomerTypeColor = (type: CustomerType) => {
    switch (type) {
      case 'individual': return 'bg-blue-100 text-blue-800';
      case 'business': return 'bg-green-100 text-green-800';
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'wholesale': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLoyaltyTier = (points: number) => {
    if (points >= 10000) return { name: 'Platinum', color: 'text-purple-600' };
    if (points >= 5000) return { name: 'Gold', color: 'text-yellow-600' };
    if (points >= 1000) return { name: 'Silver', color: 'text-gray-600' };
    return { name: 'Bronze', color: 'text-orange-600' };
  };

  const filteredCustomers = customers;

  if (loading && customers.length === 0) {
    return <LoadingSpinner message="Loading customers..." size="lg" className="min-h-[400px]" />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="h-6 w-6 mr-2" />
            Customer Management
          </h1>
          <p className="text-gray-600 mt-1">Manage your customer relationships and track interactions</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('customers')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeView === 'customers'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeView === 'analytics'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analytics
            </button>
          </div>
          
          {activeView === 'customers' && (
            <button
              onClick={handleAddCustomer}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'analytics' ? (
        <CustomerAnalytics />
      ) : (
        <>
          {/* Stats */}
          {stats && <CustomerStats stats={stats} />}

          {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Customers</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="individual">Individual</option>
              <option value="business">Business</option>
              <option value="vip">VIP</option>
              <option value="wholesale">Wholesale</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first customer'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddCustomer}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </button>
            )}
          </div>
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loyalty & Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Purchases
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => {
                  const loyaltyTier = getLoyaltyTier(customer.loyaltyPoints);
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {customer.firstName[0]}{customer.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </div>
                            {customer.businessName && (
                              <div className="text-sm text-gray-500">{customer.businessName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="h-3 w-3 mr-1" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-3 w-3 mr-1" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.city && (
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-3 w-3 mr-1" />
                              {customer.city}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCustomerTypeColor(customer.customerType)}`}>
                            {customer.customerType}
                          </span>
                          <div className="flex items-center">
                            <div className={`h-2 w-2 rounded-full mr-2 ${customer.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                            <span className="text-xs text-gray-600">
                              {customer.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Award className={`h-4 w-4 ${loyaltyTier.color}`} />
                          <div>
                            <div className={`text-sm font-medium ${loyaltyTier.color}`}>
                              {loyaltyTier.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {customer.loyaltyPoints.toLocaleString()} pts
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            ₱{customer.totalPurchases.toLocaleString()}
                          </span>
                        </div>
                        {customer.currentBalance > 0 && (
                          <div className="text-xs text-red-600">
                            Balance: ₱{customer.currentBalance.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {customer.lastPurchase ? (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {customer.lastPurchase.toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-gray-400">No purchases</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewCustomer(customer)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Cards */}
          <div className="lg:hidden p-3 space-y-3">
            {filteredCustomers.map((customer) => {
              const loyaltyTier = getLoyaltyTier(customer.loyaltyPoints);
              return (
                <div key={customer.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {/* Customer Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-blue-600">
                          {customer.firstName[0]}{customer.lastName[0]}
                        </span>
                      </div>
                      <div className="ml-3 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {customer.firstName} {customer.lastName}
                        </div>
                        {customer.businessName && (
                          <div className="text-xs text-gray-500 truncate">{customer.businessName}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewCustomer(customer)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditCustomer(customer)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="space-y-1 mb-3">
                    {customer.email && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Customer Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <div className="flex items-center mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getCustomerTypeColor(customer.customerType)
                        }`}>
                          {customer.customerType}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <div className="flex items-center mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          customer.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Loyalty:</span>
                      <div className="flex items-center mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${loyaltyTier.color}`}>
                          {loyaltyTier.name}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Points:</span>
                      <div className="font-medium text-gray-900 mt-1">
                        {customer.loyaltyPoints.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Purchase Info */}
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200 text-xs">
                    <div>
                      <span className="text-gray-500">Total Purchases:</span>
                      <div className="font-medium text-gray-900 mt-1">
                        ₱{(customer.totalSpent || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Activity:</span>
                      <div className="text-gray-600 mt-1">
                        {customer.lastPurchaseDate 
                          ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
        </>
      )}

      {/* Modals */}
      {isFormOpen && (
        <CustomerForm
          customer={editingCustomer}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {isProfileOpen && selectedCustomer && (
        <CustomerProfile
          customer={selectedCustomer}
          onClose={() => {
            setIsProfileOpen(false);
            setSelectedCustomer(null);
          }}
          onEdit={() => {
            setIsProfileOpen(false);
            handleEditCustomer(selectedCustomer);
          }}
        />
      )}
    </div>
  );
};

export default CustomerManagement;