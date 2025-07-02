import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '../LoginForm';
import { useAuthStore } from '../../../store/authStore';

// Mock the auth store
vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn()
}));

const mockAuthStore = {
  login: vi.fn(),
  isLoading: false,
  error: null,
  clearError: vi.fn()
};

describe('LoginForm', () => {
  const mockOnSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue(mockAuthStore);
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
      expect(mockAuthStore.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('displays error message when login fails', () => {
    const errorStore = { ...mockAuthStore, error: 'Invalid credentials' };
    (useAuthStore as any).mockReturnValue(errorStore);
    
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows loading state during login', () => {
    const loadingStore = { ...mockAuthStore, isLoading: true };
    (useAuthStore as any).mockReturnValue(loadingStore);
    
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
    const errorStore = { ...mockAuthStore, error: 'Some error' };
    (useAuthStore as any).mockReturnValue(errorStore);
    
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(mockAuthStore.clearError).toHaveBeenCalled();
  });
});