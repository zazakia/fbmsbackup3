import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Filter,
  UserCheck,
  UserX,
  Crown,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';
import { supabase } from '../../utils/supabase';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'employee' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_sign_in_at?: string;
  full_name?: string;
  department?: string;
}

interface RolePermissions {
  [key: string]: string[];
}

const UserRoleManagement: React.FC = () => {
  const { user: currentUser } = useSupabaseAuthStore();
  const { addToast } = useToastStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const rolePermissions: RolePermissions = {
    admin: [
      'Full system access',
      'User management',
      'System settings',
      'Financial reports',
      'Data export/import',
      'Security settings'
    ],
    manager: [
      'Department management',
      'Employee oversight',
      'Reports access',
      'Inventory management',
      'Customer management',
      'Transaction approval'
    ],
    employee: [
      'Basic operations',
      'Customer service',
      'Inventory updates',
      'Sales processing',
      'Order management'
    ],
    viewer: [
      'Read-only access',
      'View reports',
      'View customer data',
      'View inventory'
    ]
  };

  const roleColors = {
    admin: 'bg-red-100 text-red-800 border-red-200',
    manager: 'bg-blue-100 text-blue-800 border-blue-200',
    employee: 'bg-green-100 text-green-800 border-green-200',
    viewer: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800'
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadUsers();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Try to select specific columns first to avoid missing column errors
      const { data, error } = await supabase
        .from('users')
        .select('id, email, created_at, role, status, full_name, department, last_sign_in_at')
        .order('created_at', { ascending: false });

      if (error) {
        // If specific columns fail, try with minimal columns and set defaults
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          const { data: basicData, error: basicError } = await supabase
            .from('users')
            .select('id, email, created_at')
            .order('created_at', { ascending: false });

          if (basicError) {
            console.error('Error loading users:', basicError);
            addToast({
              type: 'error',
              title: 'Database Error',
              message: 'Users table needs setup. Please run database setup first.'
            });
            return;
          }

          // Add default values for missing columns
          const usersWithDefaults = (basicData || []).map(user => ({
            ...user,
            role: 'viewer' as const,
            status: 'active' as const,
            full_name: '',
            department: '',
            last_sign_in_at: null
          }));

          setUsers(usersWithDefaults);
          addToast({
            type: 'warning',
            title: 'Limited Data',
            message: 'Some user columns are missing. Please run database setup to enable full functionality.'
          });
        } else {
          console.error('Error loading users:', error);
          addToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to load users'
          });
        }
        return;
      }

      // Fill in missing fields with defaults
      const usersWithDefaults = (data || []).map(user => ({
        ...user,
        role: user.role || 'viewer' as const,
        status: user.status || 'active' as const,
        full_name: user.full_name || '',
        department: user.department || '',
        last_sign_in_at: user.last_sign_in_at || null
      }));

      setUsers(usersWithDefaults);
    } catch (error) {
      console.error('Error in loadUsers:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load users'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string, newStatus?: string) => {
    if (userId === currentUser?.id && newRole !== 'admin') {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'You cannot remove your own admin privileges'
      });
      return;
    }

    try {
      const updateData: any = { role: newRole };
      if (newStatus) {
        updateData.status = newStatus;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to update user role'
        });
        return;
      }

      addToast({
        type: 'success',
        title: 'Success',
        message: 'User role updated successfully'
      });

      loadUsers();
      setEditingUser(null);
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update user role'
      });
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    if (userId === currentUser?.id) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'You cannot change your own status'
      });
      return;
    }

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updateUserRole(userId, users.find(u => u.id === userId)?.role || 'viewer', newStatus);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'manager': return <Shield className="h-4 w-4" />;
      case 'employee': return <Users className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Role Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage user roles and permissions</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Total Users: {users.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
          <option value="viewer">Viewer</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.full_name || user.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select
                        defaultValue={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{user.role}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {editingUser === user.id ? (
                        <>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingUser(user.id)}
                            disabled={user.id === currentUser?.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.status)}
                            disabled={user.id === currentUser?.id}
                            className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
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

      {/* Role Permissions Reference */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Role Permissions Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(rolePermissions).map(([role, permissions]) => (
            <div key={role} className="space-y-2">
              <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${roleColors[role]}`}>
                {getRoleIcon(role)}
                <span className="capitalize">{role}</span>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {permissions.map((permission, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <span>{permission}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserRoleManagement;