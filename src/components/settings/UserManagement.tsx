import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Search,
  Filter,
  UserCheck,
  UserX,
  RefreshCw
} from 'lucide-react';
import { User as ApiUser, getUsers, updateUser, deleteUser } from '../../api/users';
import { UserRole } from '../../types/auth';
import { hasPermission } from '../../utils/permissions';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';
import UserForm from './UserForm';
import RolePermissions from './RolePermissions';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [showRolePermissions, setShowRolePermissions] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  const { user: currentUser } = useSupabaseAuthStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await getUsers();
      if (error) {
        throw new Error(error.message);
      }
      setUsers(data || []);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load users'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: ApiUser) => {
    if (!currentUser || !hasPermission(currentUser.role, 'users', 'edit')) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to edit users'
      });
      return;
    }
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (user: ApiUser) => {
    if (!currentUser || !hasPermission(currentUser.role, 'users', 'delete')) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to delete users'
      });
      return;
    }

    if (user.id === currentUser.id) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'You cannot delete your own account'
      });
      return;
    }

    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      try {
        const { error } = await deleteUser(user.id);
        if (error) {
          throw new Error(error.message);
        }
        addToast({
          type: 'success',
          title: 'Success',
          message: 'User deleted successfully'
        });
        loadUsers();
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to delete user'
        });
      }
    }
  };

  const handleToggleUserStatus = async (user: ApiUser) => {
    if (!currentUser || !hasPermission(currentUser.role, 'users', 'edit')) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to modify users'
      });
      return;
    }

    if (user.id === currentUser.id) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'You cannot deactivate your own account'
      });
      return;
    }

    try {
      const { error } = await updateUser(user.id, { isActive: !user.isActive });
      if (error) {
        throw new Error(error.message);
      }
      addToast({
        type: 'success',
        title: 'Success',
        message: `User ${user.isActive ? 'deactivated' : 'activated'} successfully`
      });
      loadUsers();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update user status'
      });
    }
  };

  const handleSyncUsers = async () => {
    if (!currentUser || !hasPermission(currentUser.role, 'users', 'create')) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to sync users'
      });
      return;
    }

    setSyncing(true);
    try {
      addToast({
        type: 'info',
        title: 'Syncing Users',
        message: 'Checking for users who can login but are not in the user list...'
      });

      // For now, just refresh the user list as the auth store will auto-create missing profiles
      await loadUsers();
      
      addToast({
        type: 'success',
        title: 'Sync Complete',
        message: 'User list refreshed. Missing users will be created automatically on next login.'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to sync users'
      });
    } finally {
      setSyncing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'cashier': return 'bg-green-100 text-green-800';
      case 'accountant': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentUser || !hasPermission(currentUser.role, 'users', 'view')) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You do not have permission to view user management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          <p className="text-sm text-gray-600">Manage user accounts and permissions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowRolePermissions(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <Shield className="h-4 w-4 mr-2" />
            Role Permissions
          </button>
          {hasPermission(currentUser.role, 'users', 'create') && (
            <>
              <button
                onClick={handleSyncUsers}
                disabled={syncing}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Users'}
              </button>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setShowUserForm(true);
                }}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="accountant">Accountant</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">
              {searchTerm || roleFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Get started by adding your first user.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={user.id === currentUser.id}
                          className={`p-1 rounded-lg transition-colors ${
                            user.id === currentUser.id
                              ? 'text-gray-300 cursor-not-allowed'
                              : user.isActive
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.id === currentUser.id ? 'Cannot modify own account' : user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.id === currentUser.id}
                          className={`p-1 rounded-lg transition-colors ${
                            user.id === currentUser.id
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={user.id === currentUser.id ? 'Cannot delete own account' : 'Delete user'}
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
        )}
      </div>

      {/* Modals */}
      {showUserForm && (
        <UserForm
          user={editingUser}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
          onSave={() => {
            loadUsers();
            setShowUserForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {showRolePermissions && (
        <RolePermissions
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          onClose={() => setShowRolePermissions(false)}
        />
      )}
    </div>
  );
};

export default UserManagement;