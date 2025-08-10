/**
 * Cross-Platform Compatibility Tests for Module Loading System
 * Tests desktop Sidebar, mobile BottomNavigation, touch interfaces, and consistent behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import { ModuleLoadingManager } from '../services/ModuleLoadingManager';
import type { UserRole } from '../types/moduleLoading';

// Mock services
const mockModuleLoadingManager = {
  loadModule: vi.fn(),
  unloadModule: vi.fn(),
  isLoading: vi.fn(),
  getLoadedModules: vi.fn(),
  hasAccess: vi.fn()
};

vi.mock('../services/ModuleLoadingManager', () => ({
  ModuleLoadingManager: vi.fn(() => mockModuleLoadingManager)
}));

// Mock store
const mockBusinessStore = {
  user: {
    id: 'user-123',
    role: 'manager' as UserRole,
    permissions: ['dashboard', 'expenses', 'operations', 'accounting']
  }
};

vi.mock('../store/businessStore', () => ({
  useBusinessStore: vi.fn(() => mockBusinessStore)
}));

// Mock responsive utilities
const mockUseResponsive = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  screenWidth: 1024,
  screenHeight: 768
};

vi.mock('../utils/responsive', () => ({
  useResponsive: () => mockUseResponsive
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

// Touch event simulation utilities
class TouchEventSimulator {
  static createTouchEvent(type: string, touches: Array<{ clientX: number; clientY: number; identifier: number }>) {
    const touchList = touches.map(touch => ({
      ...touch,
      target: document.body,
      pageX: touch.clientX,
      pageY: touch.clientY,
      screenX: touch.clientX,
      screenY: touch.clientY,
      radiusX: 10,
      radiusY: 10,
      rotationAngle: 0,
      force: 1
    }));

    return new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: touchList,
      targetTouches: touchList,
      changedTouches: touchList
    } as any);
  }

  static simulateSwipe(element: Element, direction: 'left' | 'right' | 'up' | 'down', distance: number = 100) {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    let endX = startX;
    let endY = startY;

    switch (direction) {
      case 'left':
        endX = startX - distance;
        break;
      case 'right':
        endX = startX + distance;
        break;
      case 'up':
        endY = startY - distance;
        break;
      case 'down':
        endY = startY + distance;
        break;
    }

    fireEvent(element, this.createTouchEvent('touchstart', [{ clientX: startX, clientY: startY, identifier: 0 }]));
    fireEvent(element, this.createTouchEvent('touchmove', [{ clientX: endX, clientY: endY, identifier: 0 }]));
    fireEvent(element, this.createTouchEvent('touchend', [{ clientX: endX, clientY: endY, identifier: 0 }]));
  }

  static simulateTap(element: Element, options: { x?: number; y?: number } = {}) {
    const rect = element.getBoundingClientRect();
    const x = options.x ?? rect.left + rect.width / 2;
    const y = options.y ?? rect.top + rect.height / 2;

    fireEvent(element, this.createTouchEvent('touchstart', [{ clientX: x, clientY: y, identifier: 0 }]));
    fireEvent(element, this.createTouchEvent('touchend', [{ clientX: x, clientY: y, identifier: 0 }]));
  }

  static simulatePinch(element: Element, scale: number) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const initialDistance = 100;
    const finalDistance = initialDistance * scale;

    // Start with two fingers
    fireEvent(element, this.createTouchEvent('touchstart', [
      { clientX: centerX - initialDistance / 2, clientY: centerY, identifier: 0 },
      { clientX: centerX + initialDistance / 2, clientY: centerY, identifier: 1 }
    ]));

    // Move fingers apart or together
    fireEvent(element, this.createTouchEvent('touchmove', [
      { clientX: centerX - finalDistance / 2, clientY: centerY, identifier: 0 },
      { clientX: centerX + finalDistance / 2, clientY: centerY, identifier: 1 }
    ]));

    // End touch
    fireEvent(element, this.createTouchEvent('touchend', [
      { clientX: centerX - finalDistance / 2, clientY: centerY, identifier: 0 },
      { clientX: centerX + finalDistance / 2, clientY: centerY, identifier: 1 }
    ]));
  }
}

describe('Cross-Platform Compatibility Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock behaviors
    mockModuleLoadingManager.loadModule.mockResolvedValue({ default: () => 'Mock Component' });
    mockModuleLoadingManager.isLoading.mockReturnValue(false);
    mockModuleLoadingManager.hasAccess.mockReturnValue(true);
    
    // Reset viewport
    mockUseResponsive.isMobile = false;
    mockUseResponsive.isTablet = false;
    mockUseResponsive.isDesktop = true;
    mockUseResponsive.screenWidth = 1024;
    mockUseResponsive.screenHeight = 768;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Desktop Sidebar Component Integration', () => {
    beforeEach(() => {
      // Set desktop viewport
      mockUseResponsive.isDesktop = true;
      mockUseResponsive.isMobile = false;
      mockUseResponsive.screenWidth = 1024;
    });

    it('should render desktop sidebar correctly', () => {
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument();
    });

    it('should handle module loading on desktop sidebar click', async () => {
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
    });

    it('should show loading states in desktop sidebar', async () => {
      mockModuleLoadingManager.isLoading.mockReturnValue(true);

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      expect(expensesButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should support keyboard navigation in desktop sidebar', async () => {
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      
      // Tab to button
      await user.tab();
      expect(document.activeElement).toBe(expensesButton);

      // Activate with Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });
    });

    it('should handle hover states on desktop', async () => {
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      
      await user.hover(expensesButton);
      expect(expensesButton).toHaveClass('hover:bg-blue-600');
    });

    it('should show tooltips on desktop hover', async () => {
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      
      await user.hover(expensesButton);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip', { name: /expense tracking/i })).toBeInTheDocument();
      });
    });
  });

  describe('Mobile BottomNavigation Component Compatibility', () => {
    beforeEach(() => {
      // Set mobile viewport
      mockUseResponsive.isMobile = true;
      mockUseResponsive.isDesktop = false;
      mockUseResponsive.screenWidth = 375;
      mockUseResponsive.screenHeight = 667;
    });

    it('should render mobile bottom navigation correctly', () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    });

    it('should handle module loading on mobile navigation tap', async () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });
    });

    it('should show active states in mobile navigation', () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
      fireEvent.click(dashboardButton);

      expect(dashboardButton).toHaveClass('active');
      expect(dashboardButton).toHaveAttribute('aria-current', 'page');
    });

    it('should handle swipe gestures in mobile navigation', () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const navigation = screen.getByTestId('mobile-bottom-nav');
      
      // Simulate swipe left to reveal more options
      TouchEventSimulator.simulateSwipe(navigation, 'left');
      
      // Check if additional navigation items become visible
      expect(screen.getByRole('button', { name: /more/i })).toBeVisible();
    });

    it('should adapt to safe area on iOS devices', () => {
      // Mock iOS safe area
      Object.defineProperty(document.documentElement.style, 'paddingBottom', {
        value: 'env(safe-area-inset-bottom)',
        configurable: true
      });

      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const navigation = screen.getByTestId('mobile-bottom-nav');
      expect(navigation).toHaveStyle({
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))'
      });
    });
  });

  describe('Touch Interface Responsiveness', () => {
    beforeEach(() => {
      mockUseResponsive.isMobile = true;
      mockUseResponsive.isDesktop = false;
    });

    it('should handle single tap correctly', async () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      
      TouchEventSimulator.simulateTap(expensesButton);
      
      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });
    });

    it('should prevent double tap from triggering multiple loads', async () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      
      // Rapid double tap
      TouchEventSimulator.simulateTap(expensesButton);
      TouchEventSimulator.simulateTap(expensesButton);
      
      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle touch feedback correctly', async () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      
      // Touch start should show pressed state
      fireEvent(expensesButton, TouchEventSimulator.createTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]));
      
      expect(expensesButton).toHaveClass('touch-pressed');
      
      // Touch end should remove pressed state
      fireEvent(expensesButton, TouchEventSimulator.createTouchEvent('touchend', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]));
      
      expect(expensesButton).not.toHaveClass('touch-pressed');
    });

    it('should handle touch target size requirements (44px minimum)', () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        const minWidth = parseInt(styles.minWidth);
        
        expect(minHeight).toBeGreaterThanOrEqual(44);
        expect(minWidth).toBeGreaterThanOrEqual(44);
      });
    });

    it('should handle long press for context menus', async () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      
      // Simulate long press (touch start, wait, touch end)
      fireEvent(expensesButton, TouchEventSimulator.createTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]));
      
      // Wait for long press threshold (500ms)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });
      
      fireEvent(expensesButton, TouchEventSimulator.createTouchEvent('touchend', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]));
      
      // Should show context menu
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation Support', () => {
    it('should support Tab navigation through all interactive elements', async () => {
      render(
        <BrowserRouter>
          <div>
            <Sidebar />
            <main id="main-content" />
          </div>
        </BrowserRouter>
      );

      const interactiveElements = screen.getAllByRole('button');
      
      // Tab through all elements
      for (const element of interactiveElements) {
        await user.tab();
        expect(document.activeElement).toBe(element);
      }
    });

    it('should support Enter and Space key activation', async () => {
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      
      // Focus the button
      expensesButton.focus();
      
      // Test Enter key
      await user.keyboard('{Enter}');
      expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      
      // Reset mock
      mockModuleLoadingManager.loadModule.mockClear();
      
      // Test Space key
      await user.keyboard(' ');
      expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
    });

    it('should support arrow key navigation in mobile bottom nav', async () => {
      mockUseResponsive.isMobile = true;
      
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const buttons = screen.getAllByRole('button');
      const firstButton = buttons[0];
      
      firstButton.focus();
      
      // Arrow right should move to next button
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(buttons[1]);
      
      // Arrow left should move back
      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toBe(firstButton);
    });

    it('should trap focus within modal dialogs', async () => {
      render(
        <BrowserRouter>
          <div>
            <Sidebar />
            <div role="dialog" aria-modal="true">
              <button>Dialog Button 1</button>
              <button>Dialog Button 2</button>
            </div>
          </div>
        </BrowserRouter>
      );

      const dialogButtons = screen.getAllByText(/Dialog Button/);
      const firstDialogButton = dialogButtons[0];
      const lastDialogButton = dialogButtons[1];
      
      firstDialogButton.focus();
      
      // Tab should cycle within dialog
      await user.tab();
      expect(document.activeElement).toBe(lastDialogButton);
      
      await user.tab();
      expect(document.activeElement).toBe(firstDialogButton);
    });

    it('should support Escape key to close modals and menus', async () => {
      render(
        <BrowserRouter>
          <div>
            <Sidebar />
            <div role="menu" data-testid="context-menu">
              <button>Menu Item 1</button>
            </div>
          </div>
        </BrowserRouter>
      );

      const menu = screen.getByTestId('context-menu');
      expect(menu).toBeVisible();
      
      await user.keyboard('{Escape}');
      
      expect(menu).not.toBeVisible();
    });
  });

  describe('Consistent Behavior Across Device Types', () => {
    it('should maintain module state when switching between desktop and mobile', async () => {
      // Start on desktop
      mockUseResponsive.isDesktop = true;
      mockUseResponsive.isMobile = false;
      
      const { rerender } = render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      // Load a module
      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });

      // Switch to mobile
      mockUseResponsive.isDesktop = false;
      mockUseResponsive.isMobile = true;
      
      rerender(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      // Module should remain loaded
      expect(mockModuleLoadingManager.unloadModule).not.toHaveBeenCalled();
    });

    it('should show consistent loading states across platforms', async () => {
      mockModuleLoadingManager.isLoading.mockReturnValue(true);

      // Desktop
      const { rerender } = render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const desktopExpensesButton = screen.getByRole('button', { name: /expenses/i });
      expect(desktopExpensesButton).toHaveAttribute('aria-busy', 'true');

      // Switch to mobile
      mockUseResponsive.isDesktop = false;
      mockUseResponsive.isMobile = true;
      
      rerender(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      const mobileExpensesButton = screen.getByRole('button', { name: /expenses/i });
      expect(mobileExpensesButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should handle orientation changes gracefully', async () => {
      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      // Simulate orientation change
      act(() => {
        mockUseResponsive.screenWidth = 667;
        mockUseResponsive.screenHeight = 375;
        window.dispatchEvent(new Event('orientationchange'));
      });

      // Navigation should still be functional
      const expensesButton = screen.getByRole('button', { name: /expenses/i });
      fireEvent.click(expensesButton);

      await waitFor(() => {
        expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
      });
    });

    it('should maintain accessibility across all platforms', () => {
      const testAccessibility = (component: React.ReactElement) => {
        render(component);
        
        // Check ARIA labels
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toHaveAttribute('aria-label');
        });

        // Check keyboard accessibility
        const firstButton = buttons[0];
        expect(firstButton).toHaveAttribute('tabindex');
      };

      // Test desktop
      testAccessibility(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      // Test mobile
      mockUseResponsive.isMobile = true;
      testAccessibility(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );
    });

    it('should provide consistent error handling across platforms', async () => {
      mockModuleLoadingManager.loadModule.mockRejectedValue(new Error('Network error'));

      const testErrorHandling = async (component: React.ReactElement) => {
        render(component);
        
        const expensesButton = screen.getByRole('button', { name: /expenses/i });
        fireEvent.click(expensesButton);

        await waitFor(() => {
          expect(screen.getByText(/error.*occurred/i)).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
        });
      };

      // Test desktop error handling
      await testErrorHandling(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      // Test mobile error handling
      mockUseResponsive.isMobile = true;
      await testErrorHandling(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );
    });

    it('should handle network changes consistently', async () => {
      const testNetworkHandling = async (component: React.ReactElement) => {
        render(component);

        // Simulate going offline
        act(() => {
          Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
          window.dispatchEvent(new Event('offline'));
        });

        await waitFor(() => {
          expect(screen.getByText(/offline/i)).toBeInTheDocument();
        });

        // Simulate coming back online
        act(() => {
          Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
          window.dispatchEvent(new Event('online'));
        });

        await waitFor(() => {
          expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
        });
      };

      // Test desktop
      await testNetworkHandling(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      // Test mobile
      mockUseResponsive.isMobile = true;
      await testNetworkHandling(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );
    });
  });

  describe('Performance Across Platforms', () => {
    it('should maintain 60fps during animations on all platforms', async () => {
      const fps: number[] = [];
      let frameCount = 0;
      let startTime = performance.now();

      const measureFps = () => {
        frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        
        if (elapsed >= 1000) {
          fps.push((frameCount * 1000) / elapsed);
          frameCount = 0;
          startTime = currentTime;
        }

        if (fps.length < 3) {
          requestAnimationFrame(measureFps);
        }
      };

      render(
        <BrowserRouter>
          <BottomNavigation />
        </BrowserRouter>
      );

      // Trigger animation by switching navigation items rapidly
      const buttons = screen.getAllByRole('button');
      
      requestAnimationFrame(measureFps);
      
      for (const button of buttons) {
        fireEvent.click(button);
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      await waitFor(() => {
        expect(fps.length).toBeGreaterThan(0);
      });

      // Should maintain at least 45fps (allowing some tolerance)
      const averageFps = fps.reduce((sum, f) => sum + f, 0) / fps.length;
      expect(averageFps).toBeGreaterThan(45);
    });

    it('should load modules within performance budgets on all platforms', async () => {
      const performanceBudgets = {
        desktop: 3000,
        mobile: 5000
      };

      const testPerformance = async (platform: 'desktop' | 'mobile') => {
        if (platform === 'mobile') {
          mockUseResponsive.isMobile = true;
          mockUseResponsive.isDesktop = false;
        } else {
          mockUseResponsive.isMobile = false;
          mockUseResponsive.isDesktop = true;
        }

        const component = platform === 'mobile' ? <BottomNavigation /> : <Sidebar />;
        
        render(
          <BrowserRouter>
            {component}
          </BrowserRouter>
        );

        const startTime = performance.now();
        
        const expensesButton = screen.getByRole('button', { name: /expenses/i });
        fireEvent.click(expensesButton);

        await waitFor(() => {
          expect(mockModuleLoadingManager.loadModule).toHaveBeenCalled();
        });

        const loadTime = performance.now() - startTime;
        expect(loadTime).toBeLessThan(performanceBudgets[platform]);
      };

      await testPerformance('desktop');
      await testPerformance('mobile');
    });
  });
});