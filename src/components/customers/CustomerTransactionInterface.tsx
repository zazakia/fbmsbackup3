import React, { useState, useEffect } from 'react';
import {
  User,
  ShoppingCart,
  DollarSign,
  Package,
  Calendar,
  TrendingUp,
  Eye,
  Plus,
  Filter,
  Search,
  Download,
  CreditCard,
  Receipt,
  BarChart3
} from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { supabase } from '../../utils/supabase';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_at: string;
  updated_at: string;
  // Computed fields (not in DB)
  name?: string;
  status?: 'active' | 'inactive';
  total_purchases?: number;
  total_spent?: number;
  last_purchase_date?: string;
  average_order_value?: number;
  purchase_frequency?: number;
}

interface Transaction {
  id: string;
  customer_id: string;
  type: 'sale' | 'purchase' | 'return';
  amount: number;
  status: 'completed' | 'pending' | 'cancelled';
  payment_method: string;
  transaction_date: string;
  items_count: number;
  reference_number: string;
  notes?: string;
}

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalTransactions: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCustomers: Customer[];
}

const CustomerTransactionInterface: React.FC = () => {
  const { addToast } = useToastStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    topCustomers: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transactionFilter, setTransactionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [showNewTransaction, setShowNewTransaction] = useState(false);

  useEffect(() => {
    loadData();
  }, [dateRange, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCustomers(),
        loadTransactions(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load data'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading customers:', error);
        return;
      }

      // Enhance customer data with computed fields and sales stats
      const enhancedCustomers = await Promise.all(
        (data || []).map(async (customer) => {
          // Get customer sales data
          const { data: salesData } = await supabase
            .from('sales')
            .select('total, created_at')
            .eq('customer_id', customer.id);

          const totalSales = salesData?.length || 0;
          const totalSpent = salesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
          const avgOrderValue = totalSales > 0 ? totalSpent / totalSales : 0;
          const lastSaleDate = salesData?.length > 0 
            ? salesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
            : undefined;

          return {
            ...customer,
            name: `${customer.first_name} ${customer.last_name}`,
            status: 'active' as const, // Default status since DB doesn't have this field
            total_purchases: totalSales,
            total_spent: totalSpent,
            average_order_value: avgOrderValue,
            last_purchase_date: lastSaleDate
          };
        })
      );

      // Filter by status if needed
      const filteredCustomers = statusFilter === 'all' 
        ? enhancedCustomers
        : enhancedCustomers.filter(c => c.status === statusFilter);

      setCustomers(filteredCustomers);
    } catch (error) {
      console.error('Error in loadCustomers:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      let query = supabase
        .from('sales')
        .select(`
          id,
          invoice_number,
          customer_id,
          customer_name,
          total,
          payment_method,
          created_at,
          status
        `)
        .order('created_at', { ascending: false });

      if (dateRange !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
        query = query.gte('created_at', daysAgo.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error loading transactions:', error);
        return;
      }

      // Transform sales data to match transaction interface
      const transformedData = data?.map(sale => ({
        id: sale.id,
        customer_id: sale.customer_id,
        type: 'sale' as const,
        amount: sale.total,
        status: sale.status || 'completed' as const,
        payment_method: sale.payment_method,
        transaction_date: sale.created_at,
        items_count: 1, // Default value
        reference_number: sale.invoice_number,
        notes: ''
      })) || [];

      setTransactions(transformedData);
    } catch (error) {
      console.error('Error in loadTransactions:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Get customer stats
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*');

      if (customerError) {
        console.error('Error loading customer stats:', customerError);
        return;
      }

      // Get transaction stats from sales table
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total, status');

      if (salesError) {
        console.error('Error loading sales stats:', salesError);
        return;
      }

      const totalCustomers = customerData?.length || 0;
      const activeCustomers = customerData?.filter(c => c.status === 'active').length || 0;
      const totalTransactions = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
      const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const topCustomers = customerData?.slice(0, 5) || [];

      setStats({
        totalCustomers,
        activeCustomers,
        totalTransactions,
        totalRevenue,
        averageOrderValue,
        topCustomers
      });
    } catch (error) {
      console.error('Error in loadStats:', error);
    }
  };

  const createQuickSale = async (customerId: string, amount: number, paymentMethod: string) => {
    try {
      const sale = {
        id: crypto.randomUUID(),
        invoice_number: `INV-${Date.now()}`,
        customer_id: customerId,
        customer_name: `${customers.find(c => c.id === customerId)?.first_name || ''} ${customers.find(c => c.id === customerId)?.last_name || ''}`.trim(),
        items: [{ name: 'Quick Sale Item', quantity: 1, price: amount }],
        subtotal: amount,
        tax: 0,
        discount: 0,
        total: amount,
        payment_method: paymentMethod,
        status: 'completed',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('sales')
        .insert([sale]);

      if (error) {
        console.error('Error creating sale:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to create sale'
        });
        return;
      }

      // Note: Customer stats will be recalculated on next load
      // The customers table doesn't have total_spent, total_purchases fields
      // These are computed from sales data

      addToast({
        type: 'success',
        title: 'Success',
        message: 'Transaction created successfully'
      });

      loadData();
      setShowNewTransaction(false);
    } catch (error) {
      console.error('Error in createQuickSale:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create transaction'
      });
    }
  };

  const getCustomerTransactions = (customerId: string) => {
    return transactions.filter(t => t.customer_id === customerId);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.includes(searchTerm);
    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const exportCustomerData = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Total Spent', 'Total Purchases', 'Last Purchase', 'Status'].join(','),
      ...filteredCustomers.map(customer => [
        customer.name,
        customer.email,
        customer.phone,
        customer.total_spent?.toString() || '0',
        customer.total_purchases?.toString() || '0',
        customer.last_purchase_date ? new Date(customer.last_purchase_date).toLocaleDateString() : 'Never',
        customer.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Export Complete',
      message: 'Customer data exported successfully'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Transactions</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage customer relationships and transactions</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportCustomerData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowNewTransaction(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Quick Sale
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeCustomers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTransactions}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.averageOrderValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Customer List with Transaction Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Purchases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Purchase
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCustomers.map((customer) => {
                const customerTransactions = getCustomerTransactions(customer.id);
                
                return (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {customer.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {customer.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {customer.email}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(customer.total_spent || 0)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Avg: {formatCurrency(customer.average_order_value || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {customer.total_purchases || 0} orders
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {customerTransactions.length} this period
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {customer.last_purchase_date ? 
                          new Date(customer.last_purchase_date).toLocaleDateString() : 
                          'Never'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        customer.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            // Quick sale functionality
                            const amount = prompt('Enter sale amount:');
                            if (amount && !isNaN(parseFloat(amount))) {
                              createQuickSale(customer.id, parseFloat(amount), 'cash');
                            }
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Customer Details: {selectedCustomer.name}
              </h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Eye className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {selectedCustomer.name}</div>
                  <div><span className="font-medium">Email:</span> {selectedCustomer.email}</div>
                  <div><span className="font-medium">Phone:</span> {selectedCustomer.phone}</div>
                  <div><span className="font-medium">Address:</span> {selectedCustomer.address}</div>
                  <div><span className="font-medium">Status:</span> {selectedCustomer.status}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Transaction Summary</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Total Spent:</span> {formatCurrency(selectedCustomer.total_spent || 0)}</div>
                  <div><span className="font-medium">Total Purchases:</span> {selectedCustomer.total_purchases || 0}</div>
                  <div><span className="font-medium">Average Order:</span> {formatCurrency(selectedCustomer.average_order_value || 0)}</div>
                  <div><span className="font-medium">Last Purchase:</span> {
                    selectedCustomer.last_purchase_date ? 
                      new Date(selectedCustomer.last_purchase_date).toLocaleDateString() : 
                      'Never'
                  }</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Recent Transactions</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Payment</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCustomerTransactions(selectedCustomer.id).slice(0, 10).map((transaction) => (
                      <tr key={transaction.id} className="border-t">
                        <td className="px-4 py-2">{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 capitalize">{transaction.type}</td>
                        <td className="px-4 py-2">{formatCurrency(transaction.amount)}</td>
                        <td className="px-4 py-2 capitalize">{transaction.payment_method}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transaction.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerTransactionInterface;