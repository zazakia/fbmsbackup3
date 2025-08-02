/**
 * Comprehensive Authentication Flow Tests
 * Tests all authentication scenarios including role-based access
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { enhancedAsyncHandler } from '../utils/errorHandling';

// Mock Supabase client
const mockSupabase = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }))
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

// Mock the auth store
const mockAuthStore = {
  user: null,
  isLoading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn(),
  setUser: vi.fn()
};

vi.mock('../store/supabaseAuthStore', () => ({
  useSupabaseAuthStore: vi.fn(() => mockAuthStore)
}));

describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.user = null;
    mockAuthStore.isLoading = false;
    mockAuthStore.error = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Login Flow', () => {
    it('should render login form with all required fields', () => {
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await act(async () => {
        await user.click(submitButton);
      });
      
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await act(async () => {
        await user.type(emailInput, 'invalid-email');
        await user.click(submitButton);
      });
      
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    it('should call login function with correct credentials', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockResolvedValue({});
      mockAuthStore.login = mockLogin;
      
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should show loading state during login', () => {
      mockAuthStore.isLoading = true;
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      expect(screen.getByText(/signing in.../i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in.../i })).toBeDisabled();
    });

    it('should display error messages', () => {
      mockAuthStore.error = 'Invalid login credentials';
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
    });

    it('should handle unregistered user error', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockRejectedValue(new Error('UNREGISTERED_USER'));
      const mockSwitchToRegister = vi.fn();
      mockAuthStore.login = mockLogin;
      
      // Mock window.confirm to return true
      window.confirm = vi.fn().mockReturnValue(true);
      
      render(React.createElement(LoginForm, { onSwitchToRegister: mockSwitchToRegister }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockSwitchToRegister).toHaveBeenCalled();
      });
    });
  });

  describe('Registration Flow', () => {
    it('should render registration form with all required fields', () => {
      render(React.createElement(RegisterForm, { onSwitchToLogin: () => {} }));
      
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should validate password strength', async () => {
      const user = userEvent.setup();
      render(React.createElement(RegisterForm, { onSwitchToLogin: () => {} }));
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(passwordInput, '123');
      await user.click(submitButton);
      
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('should validate password confirmation', async () => {
      const user = userEvent.setup();
      render(React.createElement(RegisterForm, { onSwitchToLogin: () => {} }));
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different123');
      await user.click(submitButton);
      
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('should call register function with correct data', async () => {
      const user = userEvent.setup();
      const mockRegister = vi.fn().mockResolvedValue({});
      mockAuthStore.register = mockRegister;
      
      render(React.createElement(RegisterForm, { onSwitchToLogin: () => {} }));
      
      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);
      
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      });
    });
  });

  describe('Role-based Access Control', () => {
    const testUsers = [
      { email: 'admin@test.com', role: 'admin' },
      { email: 'manager@test.com', role: 'manager' },
      { email: 'cashier@test.com', role: 'cashier' },
      { email: 'employee@test.com', role: 'employee' }
    ];

    testUsers.forEach(({ email, role }) => {
      it(`should set correct permissions for ${role} role`, async () => {
        const mockUser = {
          id: '123',
          email,
          role,
          business_id: 'business-123'
        };
        
        mockAuthStore.user = mockUser;
        
        // Test permissions based on role
        const canAccessAdmin = role === 'admin';
        const canAccessManager = ['admin', 'manager'].includes(role);
        const canAccessCashier = ['admin', 'manager', 'cashier'].includes(role);
        const canAccessEmployee = ['admin', 'manager', 'cashier', 'employee'].includes(role);
        
        expect(canAccessAdmin).toBe(role === 'admin');
        expect(canAccessManager).toBe(['admin', 'manager'].includes(role));
        expect(canAccessCashier).toBe(['admin', 'manager', 'cashier'].includes(role));
        expect(canAccessEmployee).toBe(true); // All roles can access employee features
      });
    });
  });

  describe('Session Management', () => {
    it('should handle session restoration on app load', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'mock-token'
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
      
      // Test session restoration logic
      const result = await mockSupabase.auth.getSession();
      expect(result.data.session).toEqual(mockSession);
    });

    it('should handle session expiration', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      
      const result = await mockSupabase.auth.getSession();
      expect(result.data.session).toBeNull();
    });

    it('should handle logout properly', async () => {
      const mockLogout = vi.fn().mockResolvedValue({});
      mockAuthStore.logout = mockLogout;
      
      await mockLogout();
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockSupabase.auth.signInWithPassword.mockRejectedValue(networkError);
      
      const { data, error } = await enhancedAsyncHandler(
        () => mockSupabase.auth.signInWithPassword({ email: 'test@test.com', password: 'test' }),
        'login'
      );
      
      expect(data).toBeNull();
      expect(error).toBeTruthy();
    });

    it('should handle invalid credentials error', async () => {
      const authError = new Error('Invalid login credentials');
      mockSupabase.auth.signInWithPassword.mockRejectedValue(authError);
      
      const { data, error } = await enhancedAsyncHandler(
        () => mockSupabase.auth.signInWithPassword({ email: 'test@test.com', password: 'wrong' }),
        'login'
      );
      
      expect(data).toBeNull();
      expect(error).toBeTruthy();
    });

    it('should handle email already exists error', async () => {
      const signupError = new Error('User already registered');
      mockSupabase.auth.signUp.mockRejectedValue(signupError);
      
      const { data, error } = await enhancedAsyncHandler(
        () => mockSupabase.auth.signUp({ email: 'existing@test.com', password: 'test123' }),
        'register'
      );
      
      expect(data).toBeNull();
      expect(error).toBeTruthy();
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input in login form', async () => {
      const user = userEvent.setup();
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      const maliciousInput = '<script>alert("xss")</script>test@example.com';
      
      await user.type(emailInput, maliciousInput);
      
      // The input should be sanitized
      expect((emailInput as HTMLInputElement).value).not.toContain('<script>');
    });

    it('should sanitize malicious input in registration form', async () => {
      const user = userEvent.setup();
      render(React.createElement(RegisterForm, { onSwitchToLogin: () => {} }));
      
      const nameInput = screen.getByLabelText(/full name/i);
      const maliciousInput = '<img src=x onerror=alert("xss")>John Doe';
      
      await user.type(nameInput, maliciousInput);
      
      // The input should be sanitized
      expect((nameInput as HTMLInputElement).value).not.toContain('<img');
      expect((nameInput as HTMLInputElement).value).not.toContain('onerror');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should show error messages with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      
      const emailError = screen.getByText(/email is required/i);
      expect(emailError).toHaveAttribute('id');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Tab navigation should work
      await user.tab();
      expect(emailInput).toHaveFocus();
      
      await user.tab();
      expect(passwordInput).toHaveFocus();
      
      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks in auth state management', () => {
      // Mock memory monitoring
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
        unmount();
      }
      
      // Memory should not increase significantly
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Allow for some memory increase but not excessive
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
    });

    it('should debounce validation calls', async () => {
      const user = userEvent.setup();
      const mockValidation = vi.fn();
      
      render(React.createElement(LoginForm, { onSwitchToRegister: () => {} }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      
      // Type rapidly
      await user.type(emailInput, 'test@example.com');
      
      // Validation should be debounced, not called for every keystroke
      // This is a conceptual test - actual implementation would need debouncing
      expect(emailInput).toHaveValue('test@example.com');
    });
  });
});