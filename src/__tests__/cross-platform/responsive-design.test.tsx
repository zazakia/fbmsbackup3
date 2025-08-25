import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { TestEnvironment } from '../utils/TestEnvironment';
import Dashboard from '../../components/Dashboard';

// Mock viewport dimensions
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

// Device presets
const DEVICE_PRESETS = {
  mobile: {
    iPhone_SE: { width: 375, height: 667, userAgent: 'iPhone SE' },
    iPhone_12: { width: 390, height: 844, userAgent: 'iPhone 12' },
    iPhone_14_Pro: { width: 393, height: 852, userAgent: 'iPhone 14 Pro' },
    Galaxy_S21: { width: 384, height: 854, userAgent: 'Samsung Galaxy S21' },
    Pixel_5: { width: 393, height: 851, userAgent: 'Google Pixel 5' }
  },
  tablet: {
    iPad: { width: 768, height: 1024, userAgent: 'iPad' },
    iPad_Pro: { width: 1024, height: 1366, userAgent: 'iPad Pro' },
    Galaxy_Tab: { width: 800, height: 1280, userAgent: 'Samsung Galaxy Tab' },
    Surface: { width: 912, height: 1368, userAgent: 'Microsoft Surface' }
  },
  desktop: {
    Small_Desktop: { width: 1366, height: 768, userAgent: 'Desktop Chrome' },
    Standard_Desktop: { width: 1920, height: 1080, userAgent: 'Desktop Chrome' },
    Large_Desktop: { width: 2560, height: 1440, userAgent: 'Desktop Chrome' },
    Ultrawide: { width: 3440, height: 1440, userAgent: 'Desktop Chrome' }
  }
};

// Mock components for testing
vi.mock('../../components/StatsCard', () => ({
  default: ({ title, value }: any) => (
    <div data-testid="stats-card" className="stats-card">
      <h3>{title}</h3>
      <span data-testid="stats-value">{value}</span>
    </div>
  )
}));

vi.mock('../../components/SalesChart', () => ({
  default: () => <div data-testid="sales-chart" className="chart-container">Sales Chart</div>
}));

describe('Cross-Platform Responsive Design Tests', () => {
  beforeEach(async () => {
    await TestEnvironment.setup({
      mockDatabase: true,
      loadTestData: true,
      testDataScale: 'small'
    });
  });

  afterEach(async () => {
    await TestEnvironment.cleanup();
  });

  describe('Mobile Device Testing', () => {
    Object.entries(DEVICE_PRESETS.mobile).forEach(([deviceName, device]) => {
      describe(`${deviceName} (${device.width}x${device.height})`, () => {
        beforeEach(() => {
          mockViewport(device.width, device.height);
          
          // Mock user agent
          Object.defineProperty(navigator, 'userAgent', {
            writable: true,
            value: device.userAgent
          });
        });

        it('should render mobile-optimized layout', async () => {
          render(<Dashboard />);

          await waitFor(() => {
            const dashboard = screen.getByTestId('dashboard-container');
            expect(dashboard).toHaveClass('mobile-layout');
          });

          // Check mobile navigation
          expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
          
          // Stats cards should stack vertically on mobile
          const statsCards = screen.getAllByTestId('stats-card');
          expect(statsCards.length).toBeGreaterThan(0);
          
          // Should have single column layout
          const statsContainer = screen.getByTestId('stats-container');
          expect(statsContainer).toHaveClass('flex-col');
        });

        it('should have touch-friendly interface elements', async () => {
          render(<Dashboard />);

          await waitFor(() => {
            // Buttons should be at least 44px for touch targets
            const buttons = screen.getAllByRole('button');
            buttons.forEach(button => {
              const styles = window.getComputedStyle(button);
              const minHeight = parseInt(styles.minHeight) || parseInt(styles.height);
              expect(minHeight).toBeGreaterThanOrEqual(44);
            });
          });
        });

        it('should handle touch gestures', async () => {
          const user = userEvent.setup();
          render(<Dashboard />);

          await waitFor(() => {
            const chart = screen.getByTestId('sales-chart');
            expect(chart).toBeInTheDocument();
          });

          // Test touch events
          const chart = screen.getByTestId('sales-chart');
          
          // Simulate touch start
          fireEvent.touchStart(chart, {
            touches: [{ clientX: 100, clientY: 100 }]
          });

          // Simulate swipe gesture
          fireEvent.touchMove(chart, {
            touches: [{ clientX: 200, clientY: 100 }]
          });

          fireEvent.touchEnd(chart);

          // Should not throw errors
          expect(chart).toBeInTheDocument();
        });

        it('should optimize text readability on small screens', async () => {
          render(<Dashboard />);

          await waitFor(() => {
            const textElements = screen.getAllByText(/./);
            textElements.forEach(element => {
              const styles = window.getComputedStyle(element);
              const fontSize = parseInt(styles.fontSize);
              
              // Minimum font size for mobile readability
              if (fontSize > 0) {
                expect(fontSize).toBeGreaterThanOrEqual(14);
              }
            });
          });
        });

        it('should handle keyboard input on mobile devices', async () => {
          const user = userEvent.setup();
          render(<Dashboard />);

          // Find search input if available
          const searchInput = screen.queryByRole('searchbox');
          if (searchInput) {
            await user.type(searchInput, 'test search');
            expect(searchInput).toHaveValue('test search');

            // Test mobile keyboard behavior
            fireEvent.focus(searchInput);
            expect(document.activeElement).toBe(searchInput);
          }
        });
      });
    });

    it('should handle orientation changes', async () => {
      // Start in portrait
      mockViewport(375, 667);
      const { rerender } = render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toHaveClass('mobile-layout');
      });

      // Switch to landscape
      mockViewport(667, 375);
      rerender(<Dashboard />);

      await waitFor(() => {
        const dashboard = screen.getByTestId('dashboard-container');
        expect(dashboard).toHaveClass('mobile-landscape');
      });
    });

    it('should adapt to different mobile screen densities', async () => {
      const densities = [1, 1.5, 2, 3]; // 1x, 1.5x, 2x, 3x pixel densities

      densities.forEach(density => {
        Object.defineProperty(window, 'devicePixelRatio', {
          writable: true,
          configurable: true,
          value: density,
        });

        render(<Dashboard />);

        // Images should adapt to pixel density
        const images = screen.getAllByRole('img');
        images.forEach(img => {
          // Should have appropriate resolution for pixel density
          expect(img).toBeInTheDocument();
        });
      });
    });
  });

  describe('Tablet Device Testing', () => {
    Object.entries(DEVICE_PRESETS.tablet).forEach(([deviceName, device]) => {
      describe(`${deviceName} (${device.width}x${device.height})`, () => {
        beforeEach(() => {
          mockViewport(device.width, device.height);
        });

        it('should render tablet-optimized layout', async () => {
          render(<Dashboard />);

          await waitFor(() => {
            const dashboard = screen.getByTestId('dashboard-container');
            expect(dashboard).toHaveClass('tablet-layout');
          });

          // Should have medium-width layout
          const statsContainer = screen.getByTestId('stats-container');
          expect(statsContainer).toHaveClass('grid-cols-2');
        });

        it('should support both touch and mouse interactions', async () => {
          const user = userEvent.setup();
          render(<Dashboard />);

          await waitFor(() => {
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
          });

          const firstButton = screen.getAllByRole('button')[0];

          // Test mouse hover
          await user.hover(firstButton);
          expect(firstButton).toHaveClass('hover:bg-gray-50');

          // Test touch interaction
          fireEvent.touchStart(firstButton);
          fireEvent.touchEnd(firstButton);
          
          expect(firstButton).toBeInTheDocument();
        });

        it('should optimize layout for tablet dimensions', async () => {
          render(<Dashboard />);

          await waitFor(() => {
            // Should have appropriate spacing for tablet
            const statsCards = screen.getAllByTestId('stats-card');
            statsCards.forEach(card => {
              const styles = window.getComputedStyle(card);
              const padding = parseInt(styles.padding);
              expect(padding).toBeGreaterThanOrEqual(16); // More padding than mobile
            });
          });
        });
      });
    });
  });

  describe('Desktop Device Testing', () => {
    Object.entries(DEVICE_PRESETS.desktop).forEach(([deviceName, device]) => {
      describe(`${deviceName} (${device.width}x${device.height})`, () => {
        beforeEach(() => {
          mockViewport(device.width, device.height);
        });

        it('should render full desktop layout', async () => {
          render(<Dashboard />);

          await waitFor(() => {
            const dashboard = screen.getByTestId('dashboard-container');
            expect(dashboard).toHaveClass('desktop-layout');
          });

          // Should have multi-column layout
          const statsContainer = screen.getByTestId('stats-container');
          expect(statsContainer).toHaveClass('grid-cols-4');
        });

        it('should support keyboard navigation', async () => {
          const user = userEvent.setup();
          render(<Dashboard />);

          await waitFor(() => {
            const focusableElements = screen.getAllByRole('button');
            expect(focusableElements.length).toBeGreaterThan(0);
          });

          // Test tab navigation
          await user.tab();
          expect(document.activeElement).toBe(screen.getAllByRole('button')[0]);

          await user.tab();
          expect(document.activeElement).toBe(screen.getAllByRole('button')[1]);
        });

        it('should display detailed information on larger screens', async () => {
          render(<Dashboard />);

          await waitFor(() => {
            // Desktop should show more detailed stats
            const statsValues = screen.getAllByTestId('stats-value');
            statsValues.forEach(value => {
              // Should have detailed formatting on desktop
              expect(value.textContent).toBeTruthy();
            });
          });

          // Should show additional UI elements
          expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
          expect(screen.getByTestId('detailed-chart')).toBeInTheDocument();
        });
      });
    });

    it('should handle ultra-wide displays', async () => {
      mockViewport(3440, 1440);
      render(<Dashboard />);

      await waitFor(() => {
        const dashboard = screen.getByTestId('dashboard-container');
        expect(dashboard).toHaveClass('ultrawide-layout');
      });

      // Should utilize extra width effectively
      const mainContent = screen.getByTestId('main-content');
      expect(mainContent).toHaveClass('max-w-7xl'); // Reasonable max width
    });
  });

  describe('Browser Compatibility', () => {
    const browsers = [
      { name: 'Chrome', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      { name: 'Firefox', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0' },
      { name: 'Safari', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15' },
      { name: 'Edge', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59' }
    ];

    browsers.forEach(browser => {
      it(`should work correctly on ${browser.name}`, async () => {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: browser.userAgent
        });

        render(<Dashboard />);

        await waitFor(() => {
          // Basic functionality should work across browsers
          expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
          expect(screen.getAllByTestId('stats-card').length).toBeGreaterThan(0);
        });

        // Browser-specific feature detection
        if (browser.name === 'Safari') {
          // Safari-specific checks
          expect(CSS.supports('display', 'grid')).toBe(true);
        }
      });
    });
  });

  describe('Accessibility Across Devices', () => {
    it('should maintain accessibility on mobile devices', async () => {
      mockViewport(375, 667);
      render(<Dashboard />);

      await waitFor(() => {
        // Check ARIA labels
        const dashboard = screen.getByRole('main');
        expect(dashboard).toHaveAttribute('aria-label', 'Dashboard');

        // Check heading hierarchy
        const mainHeading = screen.getByRole('heading', { level: 1 });
        expect(mainHeading).toBeInTheDocument();

        // Check focus management
        const focusableElements = screen.getAllByRole('button');
        focusableElements.forEach(element => {
          expect(element).toHaveAttribute('tabindex');
        });
      });
    });

    it('should support screen readers across devices', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // Check for screen reader content
        const srOnlyElements = document.querySelectorAll('.sr-only');
        expect(srOnlyElements.length).toBeGreaterThan(0);

        // Check ARIA live regions
        const liveRegions = document.querySelectorAll('[aria-live]');
        expect(liveRegions.length).toBeGreaterThan(0);
      });
    });

    it('should support high contrast mode', async () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<Dashboard />);

      await waitFor(() => {
        const dashboard = screen.getByTestId('dashboard-container');
        expect(dashboard).toHaveClass('high-contrast');
      });
    });
  });

  describe('Performance Across Devices', () => {
    it('should load quickly on mobile networks', async () => {
      // Mock slow 3G connection
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: {
          effectiveType: '3g',
          downlink: 0.7,
          rtt: 150
        }
      });

      const startTime = performance.now();
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
      });
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds on 3G
    });

    it('should optimize rendering for different device capabilities', async () => {
      const deviceCapabilities = [
        { memory: 2, cores: 2 }, // Low-end device
        { memory: 4, cores: 4 }, // Mid-range device
        { memory: 8, cores: 8 }  // High-end device
      ];

      deviceCapabilities.forEach(device => {
        Object.defineProperty(navigator, 'deviceMemory', {
          writable: true,
          value: device.memory
        });

        Object.defineProperty(navigator, 'hardwareConcurrency', {
          writable: true,
          value: device.cores
        });

        const startTime = performance.now();
        render(<Dashboard />);
        const endTime = performance.now();

        // Lower-spec devices should still render within reasonable time
        const maxRenderTime = device.memory < 4 ? 2000 : 1000;
        expect(endTime - startTime).toBeLessThan(maxRenderTime);
      });
    });
  });

  describe('Progressive Enhancement', () => {
    it('should work without JavaScript', async () => {
      // Mock no-JS environment
      const originalJS = window.JavaScript;
      delete (window as any).JavaScript;

      render(<Dashboard />);

      // Basic HTML structure should be present
      expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();

      // Restore JavaScript
      (window as any).JavaScript = originalJS;
    });

    it('should enhance functionality when JavaScript is available', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // Interactive elements should be enhanced
        const interactiveElements = screen.getAllByRole('button');
        interactiveElements.forEach(element => {
          expect(element).not.toBeDisabled();
        });

        // Charts should be interactive
        const chart = screen.getByTestId('sales-chart');
        expect(chart).toHaveClass('interactive-chart');
      });
    });

    it('should gracefully degrade on older browsers', async () => {
      // Mock older browser without modern features
      delete (window as any).fetch;
      delete (window as any).Promise;

      // Should still render basic content
      render(<Dashboard />);

      expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
  });
});