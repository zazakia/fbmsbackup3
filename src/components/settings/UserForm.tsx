import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Building } from 'lucide-react';
import { User as ApiUser, createUser, updateUser } from '../../api/users';
import { UserRole } from '../../types/auth';
import { useToastStore } from '../../store/toastStore';
import { supabaseAnon } from '../../utils/supabase';

interface UserFormProps {
  user?: ApiUser | null;
  onClose: () => void;
  onSave: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'cashier' as UserRole,
    department: '',
    isActive: true,
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { addToast } = useToastStore();
  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        department: user.department || '',
        isActive: user.isActive,
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        // Update existing user
        const updateData: Partial<ApiUser> = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          department: formData.department || undefined,
          isActive: formData.isActive
        };

        const { error } = await updateUser(user!.id, updateData);
        if (error) {
          throw new Error(error.message);
        }

        // Update password if provided
        if (formData.password) {
          try {
            const { error: passwordError } = await supabaseAnon.auth.admin.updateUserById(
              user!.id,
              { password: formData.password }
            );
            if (passwordError) {
              console.warn('Failed to update password:', passwordError.message);
              addToast({
                type: 'warning',
                title: 'Partial Success',
                message: 'User updated but password change requires admin privileges'
              });
            }
          } catch (adminError) {
            console.warn('Admin operation not available:', adminError);
            addToast({
              type: 'warning',
              title: 'Partial Success',
              message: 'User updated but password change requires admin access'
            });
          }
        }

        addToast({
          type: 'success',
          title: 'Success',
          message: 'User updated successfully'
        });
      } else {
        // Create new user in auth
        const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName
            }
          }
        });

        if (authError) {
          throw new Error(authError.message);
        }

        // Create user profile in our users table
        if (authData.user) {
          try {
            const { error: profileError } = await createUser({
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
              role: formData.role,
              department: formData.department || undefined,
              isActive: formData.isActive
            });

            if (profileError) {
              console.warn('Failed to create user profile:', profileError.message);
              addToast({
                type: 'warning',
                title: 'Partial Success',
                message: 'User created in auth but profile creation failed'
              });
            }
          } catch (profileError) {
            console.warn('User profile creation failed:', profileError);
            addToast({
              type: 'warning',
              title: 'Partial Success',
              message: 'User created in auth but profile sync failed'
            });
          }
        }

        addToast({
          type: 'success',
          title: 'Success',
          message: 'User created successfully'
        });
      }

      onSave();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save user'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {isEditing ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
                disabled={loading}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter first name"
                disabled={loading}
              />
            </div>
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter last name"
                disabled={loading}
              />
            </div>
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                disabled={loading}
              >
                <option value="cashier">Cashier</option>
                <option value="accountant">Accountant</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter department (optional)"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={isEditing ? 'Enter new password' : 'Enter password'}
              disabled={loading}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          {(!isEditing || formData.password) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm password"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              User is active
            </label>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;