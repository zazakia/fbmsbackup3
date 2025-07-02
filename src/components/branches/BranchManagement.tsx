import React, { useState } from 'react';
import { useBusinessStore } from '../../store/businessStore';

interface Branch {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  manager: string;
  status: 'active' | 'inactive';
  openingDate: string;
  sales: number;
  inventory: number;
  employees: number;
}

interface InterBranchTransfer {
  id: string;
  fromBranch: string;
  toBranch: string;
  productId: string;
  productName: string;
  quantity: number;
  date: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  notes: string;
}

const BranchManagement: React.FC = () => {
  const { products, sales } = useBusinessStore();
  const [selectedTab, setSelectedTab] = useState<string>('overview');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Sample branch data
  const branches: Branch[] = [
    {
      id: 'main',
      name: 'Main Branch',
      address: '123 Business Street, Makati City, Metro Manila',
      contactNumber: '+63 912 345 6789',
      email: 'main@business.com',
      manager: 'Juan Santos',
      status: 'active',
      openingDate: '2024-01-01',
      sales: 150000,
      inventory: 45,
      employees: 12
    },
    {
      id: 'quezon',
      name: 'Quezon City Branch',
      address: '456 Commonwealth Ave, Quezon City, Metro Manila',
      contactNumber: '+63 912 345 6790',
      email: 'quezon@business.com',
      manager: 'Maria Garcia',
      status: 'active',
      openingDate: '2024-03-15',
      sales: 120000,
      inventory: 38,
      employees: 8
    },
    {
      id: 'pasig',
      name: 'Pasig City Branch',
      address: '789 Ortigas Ave, Pasig City, Metro Manila',
      contactNumber: '+63 912 345 6791',
      email: 'pasig@business.com',
      manager: 'Pedro Cruz',
      status: 'active',
      openingDate: '2024-06-01',
      sales: 95000,
      inventory: 32,
      employees: 6
    },
    {
      id: 'manila',
      name: 'Manila Branch',
      address: '321 Rizal Ave, Manila City, Metro Manila',
      contactNumber: '+63 912 345 6792',
      email: 'manila@business.com',
      manager: 'Ana Reyes',
      status: 'inactive',
      openingDate: '2024-08-01',
      sales: 0,
      inventory: 0,
      employees: 0
    }
  ];

  // Sample inter-branch transfers
  const transfers: InterBranchTransfer[] = [
    {
      id: 'T001',
      fromBranch: 'main',
      toBranch: 'quezon',
      productId: 'P001',
      productName: 'Premium Coffee Beans',
      quantity: 50,
      date: '2024-12-15',
      status: 'completed',
      notes: 'Regular stock replenishment'
    },
    {
      id: 'T002',
      fromBranch: 'quezon',
      toBranch: 'pasig',
      productId: 'P002',
      productName: 'Organic Tea Leaves',
      quantity: 30,
      date: '2024-12-16',
      status: 'approved',
      notes: 'High demand in Pasig branch'
    },
    {
      id: 'T003',
      fromBranch: 'main',
      toBranch: 'pasig',
      productId: 'P003',
      productName: 'Artisan Bread Mix',
      quantity: 25,
      date: '2024-12-17',
      status: 'pending',
      notes: 'New product introduction'
    }
  ];

  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || branchId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Branch Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Branches</p>
              <p className="text-2xl font-semibold text-gray-900">{branches.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">₱{branches.reduce((sum, b) => sum + b.sales, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Inventory</p>
              <p className="text-2xl font-semibold text-gray-900">{branches.reduce((sum, b) => sum + b.inventory, 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-semibold text-gray-900">{branches.reduce((sum, b) => sum + b.employees, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Branch Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Branch</th>
                <th className="px-4 py-2 text-left">Manager</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-right">Sales (₱)</th>
                <th className="px-4 py-2 text-right">Inventory</th>
                <th className="px-4 py-2 text-right">Employees</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{branch.name}</p>
                      <p className="text-sm text-gray-500">{branch.address}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{branch.manager}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(branch.status)}`}>
                      {branch.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">₱{branch.sales.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{branch.inventory}</td>
                  <td className="px-4 py-3 text-right">{branch.employees}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTransfers = () => (
    <div className="space-y-6">
      {/* Transfer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Transfers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {transfers.filter(t => t.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed This Month</p>
              <p className="text-2xl font-semibold text-gray-900">
                {transfers.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items Transferred</p>
              <p className="text-2xl font-semibold text-gray-900">
                {transfers.reduce((sum, t) => sum + t.quantity, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Inter-Branch Transfers</h3>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            New Transfer
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Transfer ID</th>
                <th className="px-4 py-2 text-left">From Branch</th>
                <th className="px-4 py-2 text-left">To Branch</th>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-right">Quantity</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{transfer.id}</td>
                  <td className="px-4 py-3">{getBranchName(transfer.fromBranch)}</td>
                  <td className="px-4 py-3">{getBranchName(transfer.toBranch)}</td>
                  <td className="px-4 py-3">{transfer.productName}</td>
                  <td className="px-4 py-3 text-right">{transfer.quantity}</td>
                  <td className="px-4 py-3">{new Date(transfer.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                      {transfer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        View
                      </button>
                      {transfer.status === 'pending' && (
                        <>
                          <button className="text-green-600 hover:text-green-800 text-sm">
                            Approve
                          </button>
                          <button className="text-red-600 hover:text-red-800 text-sm">
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderConsolidatedReports = () => (
    <div className="space-y-6">
      {/* Report Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Branches</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Sales Report</option>
              <option>Inventory Report</option>
              <option>Employee Report</option>
              <option>Financial Report</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4 flex space-x-4">
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Generate Report
          </button>
          <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
            Export Excel
          </button>
          <button className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
            Export PDF
          </button>
        </div>
      </div>

      {/* Sample Consolidated Report */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Consolidated Sales Report</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Branch</th>
                <th className="px-4 py-2 text-right">Sales (₱)</th>
                <th className="px-4 py-2 text-right">Transactions</th>
                <th className="px-4 py-2 text-right">Avg. Transaction</th>
                <th className="px-4 py-2 text-right">Growth (%)</th>
              </tr>
            </thead>
            <tbody>
              {branches.filter(b => selectedBranch === 'all' || b.id === selectedBranch).map((branch) => (
                <tr key={branch.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{branch.name}</td>
                  <td className="px-4 py-3 text-right">₱{branch.sales.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{(branch.sales / 1000).toFixed(0)}</td>
                  <td className="px-4 py-3 text-right">₱{Math.round(branch.sales / (branch.sales / 1000)).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600">+12.5%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Multi-Branch Management</h1>
        <p className="text-gray-600">Manage multiple business locations and inter-branch operations</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedTab === 'overview'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedTab('transfers')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedTab === 'transfers'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inter-Branch Transfers
          </button>
          <button
            onClick={() => setSelectedTab('reports')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedTab === 'reports'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Consolidated Reports
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-50 rounded-lg p-6">
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'transfers' && renderTransfers()}
        {selectedTab === 'reports' && renderConsolidatedReports()}
      </div>
    </div>
  );
};

export default BranchManagement; 