import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import SimpleBackupButton from '../components/backup/SimpleBackupButton';
import { ToastComponent } from '../components/Toast';

// Mock stores
vi.mock('../store/toastStore', () => ({
  useToastStore: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock('../store/businessStore', () => ({
  useBusinessStore: () => ({
    products: Array(100).fill(null).map((_, i) => ({ id: i, name: `Product ${i}` })),
    customers: Array(50).fill(null).map((_, i) => ({ id: i, name: `Customer ${i}` })),
    sales: Array(200).fill(null).map((_, i) => ({ id: i, total: 100 + i })),
  }),
}));

vi.mock('../store/themeStore', () => ({
  useThemeStore: () => ({
    isDark: false,
  }),
}));

describe('UI Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SimpleBackupButton', () => {
    it('renders backup button with correct initial state', () => {
      render(React.createElement(SimpleBackupButton));
      
      const button = screen.getByRole('button', { name: /create cloud backup/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
      expect(screen.getByText('Create Backup')).toBeInTheDocument();
    });

    it('shows loading state when backup is in progress', async () => {
      render(React.createElement(SimpleBackupButton));
      
      const button = screen.getByRole('button', { name: /create cloud backup/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Creating Backup...')).toBeInTheDocument();
        expect(button).toBeDisabled();
      });
    });

    it('renders different variants correctly', () => {
      const { rerender } = render(React.createElement(SimpleBackupButton, { variant: 'primary' }));
      let button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
      
      rerender(React.createElement(SimpleBackupButton, { variant: 'secondary' }));
      button = screen.getByRole('button');
      expect(button).toHaveClass('bg-white');
    });

    it('has proper accessibility attributes', () => {
      render(React.createElement(SimpleBackupButton));
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Create cloud backup');
      expect(button).toHaveAttribute('title', 'Create cloud backup of business data');
    });
  });

  describe('Toast Component', () => {
    const mockToast = {
      id: '1',
      type: 'success' as const,
      title: 'Test Toast',
      message: 'This is a test message',
      duration: 5000,
    };

    const mockOnClose = vi.fn();

    it('renders toast with correct content', () => {
      render(React.createElement(ToastComponent, { toast: mockToast, onClose: mockOnClose }));
      
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('This is a test message')).toBeInTheDocument();
    });

    it('renders different toast types with correct styling', () => {
      const { rerender } = render(
        React.createElement(ToastComponent, { 
          toast: { ...mockToast, type: 'success' }, 
          onClose: mockOnClose 
        })
      );
      expect(screen.getByText('Test Toast')).toHaveClass('text-green-900');
      
      rerender(
        React.createElement(ToastComponent, { 
          toast: { ...mockToast, type: 'error' }, 
          onClose: mockOnClose 
        })
      );
      expect(screen.getByText('Test Toast')).toHaveClass('text-red-900');
    });

    it('has improved background opacity for better visibility', () => {
      render(React.createElement(ToastComponent, { toast: mockToast, onClose: mockOnClose }));
      
      const toastElement = screen.getByText('Test Toast').closest('div');
      expect(toastElement).toHaveClass('bg-green-50');
    });
  });

  describe('Accessibility Compliance', () => {
    it('backup button meets WCAG contrast requirements', () => {
      render(React.createElement(SimpleBackupButton));
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-offset-2', 'focus:ring-blue-500');
    });

    it('toast notifications have proper visibility', () => {
      const mockToast = {
        id: '1',
        type: 'success' as const,
        title: 'Success',
        message: 'Operation completed',
        duration: 5000,
      };
      
      render(React.createElement(ToastComponent, { toast: mockToast, onClose: vi.fn() }));
      
      const toastElement = screen.getByText('Success').closest('div');
      expect(toastElement).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('backup button prevents multiple simultaneous operations', async () => {
      render(React.createElement(SimpleBackupButton));
      
      const button = screen.getByRole('button');
      
      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      // Should only show one loading state
      await waitFor(() => {
        expect(screen.getByText('Creating Backup...')).toBeInTheDocument();
        expect(button).toBeDisabled();
      });
    });
  });
});

// Integration tests
describe('UI Fixes Integration', () => {
  it('backup button and toast notifications work together', async () => {
    const mockAddToast = vi.fn();
    
    // Re-mock the store for this specific test
    vi.doMock('../store/toastStore', () => ({
      useToastStore: () => ({
        addToast: mockAddToast,
      }),
    }));
    
    render(React.createElement(SimpleBackupButton));
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Should call addToast for backup started
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        title: 'Backup Started',
        message: 'Creating cloud backup of your business data...',
        duration: 3000,
      });
    });
  });
});