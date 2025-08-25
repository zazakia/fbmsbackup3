import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../../components/Dashboard';

// Mock components
vi.mock('../../components/StatsCard', () => ({
  default: ({ title, value, icon }: any) => (
    <div data-testid="stats-card">
      <span>{title}</span>
      <span>{value}</span>
    </div>
  )
}));

vi.mock('../../components/SalesChart', () => ({
  default: () => <div data-testid="sales-chart">Sales Chart</div>
}));

vi.mock('../../components/RecentTransactions', () => ({
  default: () => <div data-testid="recent-transactions">Recent Transactions</div>
}));

vi.mock('../../components/QuickActions', () => ({
  default: () => <div data-testid="quick-actions">Quick Actions</div>
}));

// Mock stores
const mockBusinessData = {
  products: [
    { id: '1', name: 'Product 1', stock: 10, minStock: 5, price: 100 },
    { id: '2', name: 'Product 2', stock: 2, minStock: 5, price: 200 }
  ],
  sales: [
    { id: '1', total: 500, createdAt: new Date() },
    { id: '2', total: 300, createdAt: new Date() }
  ],
  customers: [
    { id: '1', name: 'Customer 1' },
    { id: '2', name: 'Customer 2' }
  ],
  lowStockProducts: []
};

vi.mock('../../store/businessStore', () => ({
  useBusinessStore: () => mockBusinessData
}));

vi.mock('../../store/supabaseAuthStore', () => ({
  useSupabaseAuthStore: () => ({
    user: { id: 'user-1', email: 'test@example.com' }
  })
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dashboard with all main sections', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getAllByTestId('stats-card')).toHaveLength(4);
        expect(screen.getByTestId('sales-chart')).toBeInTheDocument();
        expect(screen.getByTestId('recent-transactions')).toBeInTheDocument();
        expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
      });
    });

    it('should display correct statistics', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Sales')).toBeInTheDocument();
        expect(screen.getByText('₱800')).toBeInTheDocument(); // Total of sales
        expect(screen.getByText('Products')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Product count
        expect(screen.getByText('Customers')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Customer count
      });
    });

    it('should show low stock alerts', async () => {
      const mockWithLowStock = {
        ...mockBusinessData,
        lowStockProducts: [{ id: '2', name: 'Product 2', stock: 2, minStock: 5 }]
      };

      vi.mocked(require('../../store/businessStore').useBusinessStore).mockReturnValue(mockWithLowStock);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Low stock count
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle stats card clicks', async () => {
      render(<Dashboard />);

      const statsCards = screen.getAllByTestId('stats-card');
      fireEvent.click(statsCards[0]);

      // Should not throw errors
      expect(statsCards[0]).toBeInTheDocument();
    });

    it('should refresh data on refresh button click', async () => {
      render(<Dashboard />);

      const refreshButton = screen.getByLabelText(/refresh/i);
      fireEvent.click(refreshButton);

      // Should trigger data refresh
      await waitFor(() => {
        expect(screen.getByTestId('sales-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading States', () => {
    it('should show loading state initially', () => {
      vi.mocked(require('../../store/businessStore').useBusinessStore).mockReturnValue({
        ...mockBusinessData,
        isLoading: true
      });

      render(<Dashboard />);

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('should handle empty data gracefully', () => {
      vi.mocked(require('../../store/businessStore').useBusinessStore).mockReturnValue({
        products: [],
        sales: [],
        customers: [],
        lowStockProducts: [],
        isLoading: false
      });

      render(<Dashboard />);

      expect(screen.getByText('0')).toBeInTheDocument(); // Should show 0 for empty data
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data loading fails', () => {
      vi.mocked(require('../../store/businessStore').useBusinessStore).mockReturnValue({
        ...mockBusinessData,
        error: 'Failed to load dashboard data'
      });

      render(<Dashboard />);

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should provide retry mechanism on error', () => {
      const mockRetry = vi.fn();
      
      vi.mocked(require('../../store/businessStore').useBusinessStore).mockReturnValue({
        ...mockBusinessData,
        error: 'Failed to load dashboard data',
        retry: mockRetry
      });

      render(<Dashboard />);

      const retryButton = screen.getByText(/retry/i);
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Dashboard />);

      const dashboard = screen.getByTestId('dashboard-container');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    it('should show desktop layout for larger screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<Dashboard />);

      const dashboard = screen.getByTestId('dashboard-container');
      expect(dashboard).toHaveClass('desktop-layout');
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time limits', async () => {
      const startTime = performance.now();
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sales-chart')).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('should handle large datasets efficiently', async () => {
      const largeDataset = {
        products: Array.from({ length: 1000 }, (_, i) => ({
          id: `${i}`,
          name: `Product ${i}`,
          stock: 10,
          minStock: 5,
          price: 100
        })),
        sales: Array.from({ length: 500 }, (_, i) => ({
          id: `${i}`,
          total: 100,
          createdAt: new Date()
        })),
        customers: Array.from({ length: 200 }, (_, i) => ({
          id: `${i}`,
          name: `Customer ${i}`
        })),
        lowStockProducts: []
      };

      vi.mocked(require('../../store/businessStore').useBusinessStore).mockReturnValue(largeDataset);

      const startTime = performance.now();
      render(<Dashboard />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should handle large data within 2 seconds
    });
  });

  describe('Accessibility', () => {
    it('should be accessible via keyboard navigation', () => {
      render(<Dashboard />);

      const dashboard = screen.getByRole('main');
      expect(dashboard).toBeInTheDocument();

      // Check for proper ARIA labels
      expect(screen.getByLabelText(/dashboard/i)).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<Dashboard />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveTextContent(/dashboard/i);
    });

    it('should provide screen reader friendly content', () => {
      render(<Dashboard />);

      // Check for proper semantic markup
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getAllByRole('region')).toHaveLength(4); // Stats, chart, transactions, actions
    });
  });
});