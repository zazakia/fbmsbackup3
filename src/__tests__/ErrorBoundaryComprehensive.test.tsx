/**
 * Comprehensive Unit Tests for ErrorBoundary
 * Tests all error types, recovery paths, and fallback mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { ModuleLoadingError } from '../components/errors/ModuleLoadingError';
import { PermissionDeniedError } from '../components/errors/PermissionDeniedError';
import { NetworkErrorUI } from '../components/errors/NetworkErrorUI';
import type { ModuleLoadingError as ModuleLoadingErrorType, UserRole } from '../types/moduleLoading';

// Mock services
const mockRetryManager = {
  executeWithRetry: vi.fn(),
  shouldRetry: vi.fn(),
  getRetryStats: vi.fn(),
  resetStats: vi.fn()
};

const mockLoggingService = {
  logError: vi.fn(),
  logRecoveryAttempt: vi.fn(),
  logFallbackUsed: vi.fn()
};

const mockFallbackService = {
  getSuggestions: vi.fn(),
  getFallbackComponent: vi.fn()
};

vi.mock('../services/RetryManager', () => ({
  RetryManager: vi.fn(() => mockRetryManager)
}));

vi.mock('../services/ModuleLoggingService', () => ({
  ModuleLoggingService: vi.fn(() => mockLoggingService)
}));

vi.mock('../services/FallbackSuggestionService', () => ({
  FallbackSuggestionService: vi.fn(() => mockFallbackService)
}));

// Mock components for testing
const ThrowingComponent = ({ errorType }: { errorType: string }) => {
  switch (errorType) {
    case 'chunk':
      throw new Error('Loading chunk 0 failed');
    case 'network':
      const networkError = new Error('Failed to fetch');
      networkError.name = 'TypeError';
      throw networkError;
    case 'timeout':
      const timeoutError = new Error('Loading timeout');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    case 'permission':
      const permissionError = new Error('Permission denied') as any;
      permissionError.type = 'permission_denied';
      permissionError.userRole = 'employee';
      throw permissionError;
    case 'module':
      const moduleError = new Error('Unexpected token');
      moduleError.name = 'SyntaxError';
      throw moduleError;
    default:
      throw new Error('Generic error');
  }
};

const WorkingComponent = () => <div data-testid="working-component">Component loaded successfully</div>;

const mockUser = {
  id: 'user-123',
  role: 'manager' as UserRole,
  permissions: ['dashboard', 'expenses']
};

describe('ModuleErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock behaviors
    mockRetryManager.shouldRetry.mockReturnValue(true);
    mockRetryManager.getRetryStats.mockReturnValue({
      totalAttempts: 0,
      successfulRetries: 0,
      failedAttempts: 0
    });
    
    mockFallbackService.getSuggestions.mockReturnValue([
      { id: 'dashboard', name: 'Dashboard', reason: 'Always available' }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.clearAllTimers();
  });

  describe('Error Detection and Classification', () => {
    it('should catch and classify chunk loading errors', () => {
      const mockOnError = vi.fn();

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          onError={mockOnError}
        >
          <ThrowingComponent errorType="chunk" />
        </ModuleErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chunk_load_error',
          retryable: true
        }),
        expect.any(Object)
      );

      expect(screen.getByText(/loading.*failed/i)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    it('should catch and classify network errors', () => {
      const mockOnError = vi.fn();

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          onError={mockOnError}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network_error',
          retryable: true
        }),
        expect.any(Object)
      );

      expect(screen.getByText(/network.*error/i)).toBeInTheDocument();
    });

    it('should catch and classify timeout errors', () => {
      const mockOnError = vi.fn();

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          onError={mockOnError}
        >
          <ThrowingComponent errorType="timeout" />
        </ModuleErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timeout',
          retryable: true
        }),
        expect.any(Object)
      );

      expect(screen.getByText(/timeout/i)).toBeInTheDocument();
    });

    it('should catch and classify permission errors', () => {
      const mockOnError = vi.fn();

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          onError={mockOnError}
        >
          <ThrowingComponent errorType="permission" />
        </ModuleErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'permission_denied',
          retryable: false,
          userRole: 'employee'
        }),
        expect.any(Object)
      );

      expect(screen.getByText(/access.*denied/i)).toBeInTheDocument();
      expect(screen.queryByText(/try again/i)).not.toBeInTheDocument();
    });

    it('should catch and classify module compilation errors', () => {
      const mockOnError = vi.fn();

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          onError={mockOnError}
        >
          <ThrowingComponent errorType="module" />
        </ModuleErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module_error',
          retryable: false
        }),
        expect.any(Object)
      );

      expect(screen.getByText(/module.*error/i)).toBeInTheDocument();
      expect(screen.queryByText(/try again/i)).not.toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button for retryable errors', () => {
      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should not show retry button for non-retryable errors', () => {
      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
        >
          <ThrowingComponent errorType="permission" />
        </ModuleErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should attempt retry when retry button is clicked', async () => {
      const mockOnRetry = vi.fn();
      
      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          onRetry={mockOnRetry}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledWith('test-module');
    });

    it('should show loading state during retry', async () => {
      const mockOnRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          onRetry={mockOnRetry}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(screen.getByText(/retrying/i)).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
    });

    it('should disable retry button after max attempts', () => {
      mockRetryManager.getRetryStats.mockReturnValue({
        totalAttempts: 3,
        successfulRetries: 0,
        failedAttempts: 3
      });
      mockRetryManager.shouldRetry.mockReturnValue(false);

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          maxRetries={3}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeDisabled();
      expect(screen.getByText(/maximum.*attempts.*reached/i)).toBeInTheDocument();
    });
  });

  describe('Fallback Suggestions', () => {
    it('should show fallback suggestions for failed modules', () => {
      mockFallbackService.getSuggestions.mockReturnValue([
        { id: 'dashboard', name: 'Dashboard', reason: 'Always available' },
        { id: 'accounting', name: 'Accounting', reason: 'Similar functionality' }
      ]);

      render(
        <ModuleErrorBoundary
          moduleId="expenses"
          moduleName="Expense Tracking"
          user={mockUser}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      expect(screen.getByText(/alternative.*options/i)).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Accounting')).toBeInTheDocument();
    });

    it('should handle fallback navigation', () => {
      const mockOnNavigate = vi.fn();
      mockFallbackService.getSuggestions.mockReturnValue([
        { id: 'dashboard', name: 'Dashboard', reason: 'Always available' }
      ]);

      render(
        <ModuleErrorBoundary
          moduleId="expenses"
          moduleName="Expense Tracking"
          user={mockUser}
          onNavigate={mockOnNavigate}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
      fireEvent.click(dashboardButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
    });

    it('should always show "Go to Dashboard" fallback option', () => {
      mockFallbackService.getSuggestions.mockReturnValue([]);

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Reset', () => {
    it('should recover when child component stops throwing', async () => {
      const RecoverableComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Network error');
        }
        return <div data-testid="recovered-component">Component recovered</div>;
      };

      const { rerender } = render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
        >
          <RecoverableComponent shouldThrow={true} />
        </ModuleErrorBoundary>
      );

      expect(screen.getByText(/network.*error/i)).toBeInTheDocument();

      // Component stops throwing
      rerender(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
        >
          <RecoverableComponent shouldThrow={false} />
        </ModuleErrorBoundary>
      );

      expect(screen.getByTestId('recovered-component')).toBeInTheDocument();
    });

    it('should reset error state when resetKeys change', async () => {
      const { rerender } = render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          resetKeys={['key1']}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      expect(screen.getByText(/network.*error/i)).toBeInTheDocument();

      // Change reset key to trigger reset
      rerender(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          resetKeys={['key2']}
        >
          <WorkingComponent />
        </ModuleErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    it('should track recovery attempts', async () => {
      const mockOnRecover = vi.fn();

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          onRecover={mockOnRecover}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(mockLoggingService.logRecoveryAttempt).toHaveBeenCalledWith(
        'test-module',
        expect.objectContaining({
          type: 'manual_retry'
        })
      );
    });
  });

  describe('User Role-Specific Error Handling', () => {
    it('should show admin-specific error details for admin users', () => {
      const adminUser = { ...mockUser, role: 'admin' as UserRole };

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={adminUser}
        >
          <ThrowingComponent errorType="module" />
        </ModuleErrorBoundary>
      );

      expect(screen.getByText(/technical details/i)).toBeInTheDocument();
      expect(screen.getByText(/module.*error/i)).toBeInTheDocument();
    });

    it('should show simplified errors for non-admin users', () => {
      const employeeUser = { ...mockUser, role: 'employee' as UserRole };

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={employeeUser}
        >
          <ThrowingComponent errorType="module" />
        </ModuleErrorBoundary>
      );

      expect(screen.queryByText(/technical details/i)).not.toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should show appropriate contact information based on user role', () => {
      const employeeUser = { ...mockUser, role: 'employee' as UserRole };

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={employeeUser}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      expect(screen.getByText(/contact.*administrator/i)).toBeInTheDocument();
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log all errors with context', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          moduleId: 'test-module',
          type: 'network_error',
          userRole: 'manager',
          timestamp: expect.any(Number)
        }),
        expect.any(Object)
      );

      consoleError.mockRestore();
    });

    it('should log fallback usage', () => {
      mockFallbackService.getSuggestions.mockReturnValue([
        { id: 'dashboard', name: 'Dashboard', reason: 'Always available' }
      ]);

      render(
        <ModuleErrorBoundary
          moduleId="expenses"
          moduleName="Expense Tracking"
          user={mockUser}
          onNavigate={vi.fn()}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
      fireEvent.click(dashboardButton);

      expect(mockLoggingService.logFallbackUsed).toHaveBeenCalledWith(
        'expenses',
        'dashboard',
        expect.any(String)
      );
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByLabelText(/error.*occurred/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);

      fireEvent.keyDown(retryButton, { key: 'Enter' });
      // Should trigger retry (tested elsewhere)
    });

    it('should show loading spinner during retry operations', async () => {
      const slowRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
          onRetry={slowRetry}
        >
          <ThrowingComponent errorType="network" />
        </ModuleErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Integration with Suspense', () => {
    it('should work properly within Suspense boundary', () => {
      const LazyComponent = React.lazy(() => Promise.reject(new Error('Chunk load failed')));

      render(
        <ModuleErrorBoundary
          moduleId="test-module"
          moduleName="Test Module"
          user={mockUser}
        >
          <Suspense fallback={<div>Loading...</div>}>
            <LazyComponent />
          </Suspense>
        </ModuleErrorBoundary>
      );

      expect(screen.getByText(/loading.*failed/i)).toBeInTheDocument();
    });
  });
});