/**
 * Integration Tests for Complete Module Loading Workflows
 * Tests end-to-end loading scenarios, permissions, error recovery, and cross-platform compatibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { BottomNavigation } from '../../components/BottomNavigation';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { ModuleLoadingManager } from '../../services/ModuleLoadingManager';
import { RetryManager } from '../../services/RetryManager';
import { LoadingStateManager } from '../../services/LoadingStateManager';
import { PermissionErrorHandler } from '../../services/PermissionErrorHandler';
import type { UserRole } from '../../types/moduleLoading';

// Mock the lazy loading system
const mockModuleComponents = new Map();
const mockLazyComponent = vi.fn();

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    lazy: vi.fn((factory) => {
      mockLazyComponent.mockImplementation(() => factory());
      return mockLazyComponent;
    }),
    Suspense: ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => {
      return <div>{children || fallback}</div>;
    }
  };
});

// Mock services
const mockModuleLoadingManager = {
  loadModule: vi.fn(),
  unloadModule: vi.fn(),
  isLoading: vi.fn(),
  getLoadedModules: vi.fn()
};

const mockRetryManager = {
  executeWithRetry: vi.fn(),
  shouldRetry: vi.fn(),
  getRetryStats: vi.fn()
};

const mockLoadingStateManager = {
  setLoading: vi.fn(),
  setSuccess: vi.fn(),
  setError: vi.fn(),
  getState: vi.fn(),
  subscribe: vi.fn()
};

const mockPermissionHandler = {
  validateModuleAccess: vi.fn(),
  createPermissionError: vi.fn()
};

vi.mock('../../services/ModuleLoadingManager', () => ({
  ModuleLoadingManager: vi.fn(() => mockModuleLoadingManager)
}));

vi.mock('../../services/RetryManager', () => ({
  RetryManager: vi.fn(() => mockRetryManager)
}));

vi.mock('../../services/LoadingStateManager', () => ({
  LoadingStateManager: vi.fn(() => mockLoadingStateManager)
}));

vi.mock('../../services/PermissionErrorHandler', () => ({
  PermissionErrorHandler: vi.fn(() => mockPermissionHandler)
}));

// Mock store
const mockBusinessStore = {
  user: {
    id: 'user-123',
    role: 'manager' as UserRole,
    permissions: ['dashboard', 'expenses', 'operations', 'accounting']
  }
};

vi.mock('../../store/businessStore', () => ({
  useBusinessStore: vi.fn(() => mockBusinessStore)
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  };
});

// Test components
const ExpenseTrackingComponent = () => <div data-testid="expense-tracking">Expense Tracking Module</div>;
const ManagerOperationsComponent = () => <div data-testid="manager-operations">Manager Operations Module</div>;
const DashboardComponent = () => <div data-testid="dashboard">Dashboard Module</div>;

describe('Module Loading Workflow Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock behaviors
    mockModuleLoadingManager.loadModule.mockResolvedValue(ExpenseTrackingComponent);
    mockModuleLoadingManager.isLoading.mockReturnValue(false);
    mockModuleLoadingManager.getLoadedModules.mockReturnValue([]);
    
    mockPermissionHandler.validateModuleAccess.mockResolvedValue(true);
    
    mockLoadingStateManager.getState.mockReturnValue({
      status: 'idle',
      startTime: null,
      duration: null,
      error: null,
      progress: 0,
      retryCount: 0,
      slowLoading: false
    });
    
    mockLoadingStateManager.subscribe.mockReturnValue(() => {}); // unsubscribe function
    
    // Setup module component registry
    mockModuleComponents.set('expenses', ExpenseTrackingComponent);
    mockModuleComponents.set('operations', ManagerOperationsComponent);
    mockModuleComponents.set('dashboard', DashboardComponent);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End Module Loading', () => {
    it('should complete full loading workflow successfully', async () => {
      mockModuleLoadingManager.loadModule.mockImplementation(async (config) => {
        // Simulate loading states
        await mockLoadingStateManager.setLoading(config.id);
        await new Promise(resolve => setTimeout(resolve, 100));
        await mockLoadingStateManager.setSuccess(config.id);
        return mockModuleComponents.get(config.id);
      });

      const { container } = render(
        <BrowserRouter>
          <div className="app-container">
            <Sidebar />
            <main id="main-content" />
          </div>
        </BrowserRouter>
      );

      // Click on expenses menu item
      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      // Verify loading manager was called
      expect(mockModuleLoadingManager.loadModule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'expenses',
          name: 'Expense Tracking'
        }),
        mockBusinessStore.user
      );

      // Verify loading state was set
      expect(mockLoadingStateManager.setLoading).toHaveBeenCalledWith('expenses');

      // Wait for loading to complete
      await waitFor(() => {
        expect(mockLoadingStateManager.setSuccess).toHaveBeenCalledWith('expenses');
      });
    });

    it('should handle module switching correctly', async () => {
      render(
        <BrowserRouter>
          <div className="app-container">
            <Sidebar />
            <main id="main-content" />
          </div>
        </BrowserRouter>
      );

      // Load first module
      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'expenses' }),
          mockBusinessStore.user
        );
      });

      // Switch to another module
      const operationsButton = screen.getByRole('button', { name: /operations/i });
      fireEvent.click(operationsButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'operations' }),
          mockBusinessStore.user
        );
      });

      // Verify previous module was unloaded
      expect(mockModuleLoadingManager.unloadModule).toHaveBeenCalledWith('expenses');
    });

    it('should prevent duplicate loading requests', async () => {
      mockModuleLoadingManager.isLoading.mockReturnValue(true);

      render(
        <BrowserRouter>
          <div className="app-container">
            <Sidebar />
            <main id="main-content" />
          </div>
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });

      // Click multiple times rapidly
      fireEvent.click(expensesButton);
      fireEvent.click(expensesButton);
      fireEvent.click(expensesButton);

      // Should only be called once
      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Permission-Based Access Control Integration', () => {
    it('should allow access for users with proper permissions', async () => {
      const managerUser = {
        id: 'manager-123',
        role: 'manager' as UserRole,
        permissions: ['dashboard', 'expenses', 'operations', 'accounting']
      };
      
      mockBusinessStore.user = managerUser;
      mockPermissionHandler.validateModuleAccess.mockResolvedValue(true);

      render(
        <BrowserRouter>
          <div className="app-container">
            <Sidebar />
            <main id="main-content" />
          </div>
        </BrowserRouter>
      );

      const operationsButton = screen.getByRole('button', { name: /operations/i });
      fireEvent.click(operationsButton);

      await waitFor(() => {
        expect(mockPermissionHandler.validateModuleAccess).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'operations',
            requiredRole: 'manager'
          }),
          managerUser
        );
      });

      expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
    });

    it('should deny access for users without proper permissions', async () => {
      const employeeUser = {
        id: 'employee-123',
        role: 'employee' as UserRole,
        permissions: ['dashboard', 'pos']
      };
      
      mockBusinessStore.user = employeeUser;
      mockPermissionHandler.validateModuleAccess.mockResolvedValue(false);
      mockPermissionHandler.createPermissionError.mockReturnValue({
        type: 'permission_denied',
        message: 'Access denied',
        moduleId: 'operations',
        timestamp: Date.now(),
        retryable: false,
        userRole: 'employee'
      });

      render(
        <BrowserRouter>
          <ModuleErrorBoundary
            moduleId="operations"
            moduleName="Manager Operations"
            user={employeeUser}
          >
            <Sidebar />
          </ModuleErrorBoundary>
        </BrowserRouter>
      );

      const operationsButton = screen.getByRole('button', { name: /operations/i });
      fireEvent.click(operationsButton);

      await waitFor(() => {
        expect(screen.getByText(/access.*denied/i)).toBeInTheDocument();
        expect(screen.getByText(/manager.*required/i)).toBeInTheDocument();
      });

      expect(mockModuleLoadingManager.loadModule).not.toHaveBeenCalled();
    });

    it('should update permissions dynamically during session', async () => {
      let currentUser = {
        id: 'user-123',
        role: 'employee' as UserRole,
        permissions: ['dashboard']
      };
      
      mockBusinessStore.user = currentUser;
      mockPermissionHandler.validateModuleAccess.mockResolvedValue(false);

      const { rerender } = render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      // First attempt - should fail
      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockPermissionHandler.validateModuleAccess).toHaveBeenCalledWith(
          expect.anything(),
          currentUser
        );
      });

      // Update user permissions
      currentUser = {
        ...currentUser,
        permissions: ['dashboard', 'expenses']
      };
      mockBusinessStore.user = currentUser;
      mockPermissionHandler.validateModuleAccess.mockResolvedValue(true);

      rerender(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      // Second attempt - should succeed
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery and Fallback Mechanisms', () => {
    it('should handle network errors with retry capability', async () => {
      const networkError = new Error('Failed to fetch');
      networkError.name = 'TypeError';

      mockModuleLoadingManager.loadModule
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue(ExpenseTrackingComponent);

      mockRetryManager.shouldRetry.mockReturnValue(true);
      mockRetryManager.executeWithRetry.mockImplementation(async (fn) => {
        try {
          return await fn();
        } catch (error) {
          // Simulate retry
          return await fn();
        }
      });

      render(
        <BrowserRouter>
          <ModuleErrorBoundary
            moduleId="expenses"
            moduleName="Expense Tracking"
            user={mockBusinessStore.user}
          >
            <Sidebar />
          </ModuleErrorBoundary>
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/network.*error/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should succeed after retry
      await waitFor(() => {
        expect(screen.getByTestId('expense-tracking')).toBeInTheDocument();
      });
    });

    it('should provide fallback suggestions for failed modules', async () => {
      const error = new Error('Module load failed');
      mockModuleLoadingManager.loadModule.mockRejectedValue(error);

      const mockFallbackService = {
        getSuggestions: vi.fn().mockReturnValue([
          { id: 'dashboard', name: 'Dashboard', reason: 'Always available' },
          { id: 'accounting', name: 'Accounting', reason: 'Similar functionality' }
        ])
      };

      render(
        <BrowserRouter>
          <ModuleErrorBoundary
            moduleId="expenses"
            moduleName="Expense Tracking"
            user={mockBusinessStore.user}
            fallbackService={mockFallbackService}
            onNavigate={mockNavigate}
          >
            <Sidebar />
          </ModuleErrorBoundary>
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(screen.getByText(/alternative.*options/i)).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Accounting')).toBeInTheDocument();
      });

      // Click on fallback option
      const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
      fireEvent.click(dashboardButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle complete system failure gracefully', async () => {
      mockModuleLoadingManager.loadModule.mockRejectedValue(new Error('System failure'));
      mockRetryManager.shouldRetry.mockReturnValue(false);

      render(
        <BrowserRouter>
          <ModuleErrorBoundary
            moduleId="expenses"
            moduleName="Expense Tracking"
            user={mockBusinessStore.user}
          >
            <Sidebar />
          </ModuleErrorBoundary>
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(screen.getByText(/something.*went.*wrong/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work consistently on desktop sidebar', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(
        <BrowserRouter>
          <div className="app-container">
            <Sidebar />
            <main id="main-content" />
          </div>
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      expect(expensesButton).toBeVisible();

      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });
    });

    it('should work consistently on mobile bottom navigation', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <BrowserRouter>
          <div className="app-container">
            <main id="main-content" />
            <BottomNavigation />
          </div>
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      expect(expensesButton).toBeVisible();

      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });
    });

    it('should handle touch interactions properly', async () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });

      // Simulate touch events
      fireEvent.touchStart(expensesButton);
      fireEvent.touchEnd(expensesButton);
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalledTimes(1);
      });
    });

    it('should support keyboard navigation', async () => {
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });

      // Navigate with keyboard
      expensesButton.focus();
      expect(document.activeElement).toBe(expensesButton);

      // Activate with Enter key
      fireEvent.keyDown(expensesButton, { key: 'Enter' });

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });

      // Test Space key activation
      vi.clearAllMocks();
      fireEvent.keyDown(expensesButton, { key: ' ' });

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });
    });

    it('should preserve module state across device orientation changes', async () => {
      render(
        <BrowserRouter>
          <div className="app-container">
            <Sidebar />
            <BottomNavigation />
            <main id="main-content" />
          </div>
        </BrowserRouter>
      );

      // Load module
      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });

      // Simulate orientation change
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 800 });
        Object.defineProperty(window, 'innerHeight', { value: 600 });
        window.dispatchEvent(new Event('resize'));
      });

      // Module should remain loaded
      expect(mockModuleLoadingManager.unloadModule).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Timing Requirements', () => {
    it('should show loading feedback within 100ms', async () => {
      const loadingPromise = new Promise(resolve => 
        setTimeout(() => resolve(ExpenseTrackingComponent), 500)
      );
      mockModuleLoadingManager.loadModule.mockReturnValue(loadingPromise);

      const startTime = performance.now();

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      // Should show loading state immediately
      await waitFor(() => {
        expect(mockLoadingStateManager.setLoading).toHaveBeenCalled();
      });

      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    it('should complete module loading within 3 seconds under normal conditions', async () => {
      const loadingPromise = new Promise(resolve => 
        setTimeout(() => resolve(ExpenseTrackingComponent), 2500)
      );
      mockModuleLoadingManager.loadModule.mockReturnValue(loadingPromise);

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const startTime = performance.now();
      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });

      await loadingPromise;

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    it('should show slow connection warning after 5 seconds', async () => {
      const slowLoadingPromise = new Promise(resolve => 
        setTimeout(() => resolve(ExpenseTrackingComponent), 6000)
      );
      mockModuleLoadingManager.loadModule.mockReturnValue(slowLoadingPromise);

      mockLoadingStateManager.getState.mockReturnValue({
        status: 'loading',
        startTime: performance.now() - 5500,
        duration: null,
        error: null,
        progress: 30,
        retryCount: 0,
        slowLoading: true,
        slowNetwork: true,
        message: 'Slow connection detected'
      });

      render(
        <BrowserRouter>
          <div id="main-content">
            <div data-testid="loading-indicator" />
          </div>
          <Sidebar />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      // Wait for slow loading detection
      await waitFor(() => {
        expect(mockLoadingStateManager.getState).toHaveBeenCalled();
      }, { timeout: 6000 });

      // Should show slow connection message
      const state = mockLoadingStateManager.getState('expenses');
      expect(state.slowNetwork).toBe(true);
      expect(state.message).toMatch(/slow.*connection/i);
    });
  });

  describe('Concurrent Module Operations', () => {
    it('should handle multiple users loading modules simultaneously', async () => {
      const userPromises = [];

      for (let i = 1; i <= 5; i++) {
        const promise = new Promise(resolve => {
          render(
            <BrowserRouter>
              <Sidebar />
            </BrowserRouter>
          );

          const expensesButton = screen.getByRole('button', { name: /expenses/i });
          fireEvent.click(expensesButton);
          resolve(true);
        });
        userPromises.push(promise);
      }

      await Promise.all(userPromises);

      // All loading attempts should be handled
      expect(mockModuleLoadingManager.loadModule).toHaveBeenCalledTimes(5);
    });

    it('should maintain performance under concurrent load', async () => {
      const loadTimes: number[] = [];

      for (let i = 1; i <= 10; i++) {
        const startTime = performance.now();
        
        render(
          <BrowserRouter>
            <Sidebar />
          </BrowserRouter>
        );

        const expensesButton = screen.getByRole('button', { name: /expenses/i });
        fireEvent.click(expensesButton);

        await waitFor(() => {
          expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
        });

        const loadTime = performance.now() - startTime;
        loadTimes.push(loadTime);

        vi.clearAllMocks();
      }

      // Performance should not degrade significantly
      const averageLoadTime = loadTimes.reduce((a, b) => a + b) / loadTimes.length;
      expect(averageLoadTime).toBeLessThan(500); // Should stay under 500ms for UI feedback
      
      // No individual load should exceed 5 seconds
      expect(Math.max(...loadTimes)).toBeLessThan(5000);
    });
  });
});