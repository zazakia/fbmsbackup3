import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '../LoginForm';
import { useSupabaseAuthStore } from '../../../store/supabaseAuthStore'; // UPDATED

// Mock the supabase auth store
vi.mock('../../../store/supabaseAuthStore', () => ({ // UPDATED
  useSupabaseAuthStore: vi.fn() // UPDATED
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
    // Update the mock return value for useSupabaseAuthStore
    (useSupabaseAuthStore as any).mockReturnValue(mockSupabaseAuthStore); // UPDATED
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
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
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
    const errorStore = { ...mockSupabaseAuthStore, error: 'Invalid credentials', login: vi.fn(() => Promise.reject(new Error('Invalid credentials'))) }; // UPDATED
    (useSupabaseAuthStore as any).mockReturnValue(errorStore); // UPDATED
    
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows loading state during login', () => {
    const loadingStore = { ...mockSupabaseAuthStore, isLoading: true }; // UPDATED
    (useSupabaseAuthStore as any).mockReturnValue(loadingStore); // UPDATED
    
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
    const errorStore = { ...mockSupabaseAuthStore, error: 'Some error' }; // UPDATED
    (useSupabaseAuthStore as any).mockReturnValue(errorStore); // UPDATED
    
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(mockSupabaseAuthStore.clearError).toHaveBeenCalled(); // UPDATED
  });
});