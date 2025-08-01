import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '../LoginForm';
import { useSupabaseAuthStore } from '../../../store/supabaseAuthStore';

// Mock the supabase auth store
vi.mock('../../../store/supabaseAuthStore', () => ({
  useSupabaseAuthStore: vi.fn()
}));

const mockSupabaseAuthStore = { // UPDATED name
  login: vi.fn(() => Promise.resolve()), // UPDATED to return a promise
  isLoading: false,
  error: null,
  clearError: vi.fn()
};

describe('LoginForm', () => {
  const mockOnSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSupabaseAuthStore as any).mockReturnValue(mockSupabaseAuthStore);
  });

  it('renders login form correctly', () => {
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('validates email field', async () => {
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('validates password field', async () => {
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    // Make sure loading is false for this test
    const testStore = { ...mockSupabaseAuthStore, isLoading: false };
    (useSupabaseAuthStore as any).mockReturnValue(testStore);
    
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    
    // Set invalid email but valid password to isolate email validation
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
    
    // Find the submit button more reliably
    const submitButton = screen.getByText('Sign In');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls login function with correct credentials', async () => {
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSupabaseAuthStore.login).toHaveBeenCalledWith({ // UPDATED
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('displays error message when login fails', () => {
    const errorStore = { ...mockSupabaseAuthStore, error: 'Invalid credentials', login: vi.fn(() => Promise.reject(new Error('Invalid credentials'))) };
    (useSupabaseAuthStore as any).mockReturnValue(errorStore);
    
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows loading state during login', () => {
    const loadingStore = { ...mockSupabaseAuthStore, isLoading: true };
    (useSupabaseAuthStore as any).mockReturnValue(loadingStore);
    
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    expect(screen.getByText('Signing In...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Signing In...' })).toBeDisabled();
  });

  it('calls onSwitchToRegister when register link is clicked', () => {
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const registerLink = screen.getByText('Sign up here');
    fireEvent.click(registerLink);
    
    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });

  it('clears errors when user starts typing', async () => {
    const errorStore = { ...mockSupabaseAuthStore, error: 'Some error' };
    (useSupabaseAuthStore as any).mockReturnValue(errorStore);
    
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(mockSupabaseAuthStore.clearError).toHaveBeenCalled();
  });
});
