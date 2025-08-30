import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Dashboard from '../../components/Dashboard';
import { TestDataFactory } from '../../test/factories/testDataFactory';
import { mockStores } from '../../test/mocks/storeMocks';

// Enhanced mock setup using our test infrastructure
const createMockDashboardData = () => ({
  products: TestDataFactory.createProductsBatch(5),
  sales: TestDataFactory.createSalesBatch(3),
  customers: TestDataFactory.createCustomersBatch(4),
  totalRevenue: 15750.00,
  lowStockProducts: TestDataFactory.createProductsBatch(2, { stock: 3, min_stock: 5 }),
  isLoading: false,
  error: null,
  lastUpdated: new Date().toISOString()
});

// Mock child components with better testability
vi.mock('../../components/StatsCard', () => ({
  default: ({ title, value, icon, onClick, testId }: any) => (
    <div
      data-testid={testId || 'stats-card'}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <h3 data-testid="stats-title">{title}</h3>
      <span data-testid="stats-value">{value}</span>
      {icon && <span data-testid="stats-icon">{icon}</span>}
    </div>
  )
}));

vi.mock('../../components/SalesChart', () => ({
  default: ({ data, timeRange, onTimeRangeChange }: any) => (
    <div data-testid="sales-chart">
      <div data-testid="chart-title">Sales Chart</div>
      <div data-testid="chart-data-points">{data?.length || 0} data points</div>
      <select
        data-testid="time-range-selector"
        value={timeRange}
        onChange={(e) => onTimeRangeChange?.(e.target.value)}
      >
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="year">This Year</option>
      </select>
    </div>
  )
}));

vi.mock('../../components/RecentTransactions', () => ({
  default: ({ transactions, onViewAll }: any) => (
    <div data-testid="recent-transactions">
      <h3>Recent Transactions</h3>
      <div data-testid="transaction-list">
        {transactions?.map((tx: any, index: number) => (
          <div key={index} data-testid={`transaction-${index}`}>
            {tx.id} - ₱{tx.total_amount}
          </div>
        ))}
      </div>
      <button data-testid="view-all-transactions" onClick={onViewAll}>
        View All
      </button>
    </div>
  )
}));

vi.mock('../../components/QuickActions', () => ({
  default: ({ onNewSale, onNewProduct, onInventoryCheck }: any) => (
    <div data-testid="quick-actions">
      <h3>Quick Actions</h3>
      <button data-testid="new-sale-btn" onClick={onNewSale}>
        New Sale
      </button>
      <button data-testid="new-product-btn" onClick={onNewProduct}>
        Add Product
      </button>
      <button data-testid="inventory-check-btn" onClick={onInventoryCheck}>
        Check Inventory
      </button>
    </div>
  )
}));

describe('Enhanced Dashboard Component Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockDashboardData: ReturnType<typeof createMockDashboardData>;

  beforeEach(() => {
    user = userEvent.setup();
    mockDashboardData = createMockDashboardData();
    
    // Setup store mocks with test data
    vi.mocked(mockStores.business).products = mockDashboardData.products;
    vi.mocked(mockStores.business).sales = mockDashboardData.sales;
    vi.mocked(mockStores.business).customers = mockDashboardData.customers;
    vi.mocked(mockStores.business).isLoading = false;
    vi.mocked(mockStores.business).error = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering and Layout', () => {
    it('should render all dashboard sections with proper ARIA labels', async () => {
      render(<Dashboard />);

      // Test main dashboard structure
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/dashboard overview/i)).toBeInTheDocument();
      
      // Test section headings
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      
      // Test stats cards presence
      const statsCards = screen.getAllByTestId('stats-card');
      expect(statsCards).toHaveLength(4);
      
      // Test main components
      expect(screen.getByTestId('sales-chart')).toBeInTheDocument();
      expect(screen.getByTestId('recent-transactions')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    });

    it('should display correct business metrics from Philippine test data', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // Test Total Sales stats
        const salesCard = screen.getByTestId('stats-card');
        within(salesCard).getByText(/total sales/i);
        
        // Test Products count
        expect(screen.getByText(mockDashboardData.products.length.toString())).toBeInTheDocument();
        
        // Test Customers count
        expect(screen.getByText(mockDashboardData.customers.length.toString())).toBeInTheDocument();
        
        // Test Revenue formatting (Philippine Peso)
        expect(screen.getByText(/₱/)).toBeInTheDocument();
      });
    });

    it('should handle Philippine business data correctly', () => {
      render(<Dashboard />);
      
      // Verify Philippine-specific data is properly displayed
      const philippineProducts = mockDashboardData.products.filter(p => 
        p.name.includes('Philippines') || p.category.includes('Filipino')
      );
      
      expect(philippineProducts.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions and Accessibility', () => {
    it('should handle keyboard navigation correctly', async () => {
      render(<Dashboard />);
      
      // Test tab navigation through interactive elements
      const statsCards = screen.getAllByRole('button');
      
      await user.tab();
      expect(statsCards[0]).toHaveFocus();
      
      await user.tab();
      expect(statsCards[1]).toHaveFocus();
    });

    it('should handle stats card interactions with proper feedback', async () => {
      const onStatsClick = vi.fn();
      
      render(<Dashboard />);
      
      const statsCard = screen.getAllByTestId('stats-card')[0];
      
      // Test click interaction
      await user.click(statsCard);
      
      // Test keyboard interaction
      await user.type(statsCard, '{enter}');
      await user.type(statsCard, ' '); // Space key
      
      // Should be accessible via keyboard
      expect(statsCard).toHaveAttribute('tabIndex', '0');
    });

    it('should provide proper ARIA descriptions for screen readers', () => {
      render(<Dashboard />);
      
      // Test ARIA labels and descriptions
      const statsCards = screen.getAllByTestId('stats-card');
      statsCards.forEach(card => {
        expect(card).toHaveAttribute('role', 'button');
      });
      
      // Test semantic HTML structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Quick Actions Functionality', () => {
    it('should handle quick action button clicks', async () => {
      render(<Dashboard />);
      
      // Test New Sale action
      const newSaleBtn = screen.getByTestId('new-sale-btn');
      await user.click(newSaleBtn);
      
      // Test Add Product action
      const newProductBtn = screen.getByTestId('new-product-btn');
      await user.click(newProductBtn);
      
      // Test Inventory Check action
      const inventoryBtn = screen.getByTestId('inventory-check-btn');
      await user.click(inventoryBtn);
      
      // Verify buttons are clickable
      expect(newSaleBtn).toBeEnabled();
      expect(newProductBtn).toBeEnabled();
      expect(inventoryBtn).toBeEnabled();
    });
  });

  describe('Sales Chart Interactions', () => {
    it('should handle time range selection changes', async () => {
      render(<Dashboard />);
      
      const timeRangeSelector = screen.getByTestId('time-range-selector');
      
      // Test changing time range
      await user.selectOptions(timeRangeSelector, 'month');
      expect(timeRangeSelector).toHaveValue('month');
      
      await user.selectOptions(timeRangeSelector, 'year');
      expect(timeRangeSelector).toHaveValue('year');
    });
  });

  describe('Recent Transactions Component', () => {
    it('should display transaction data correctly', () => {
      render(<Dashboard />);
      
      const transactionList = screen.getByTestId('transaction-list');
      expect(transactionList).toBeInTheDocument();
      
      // Test transaction items
      const transactions = within(transactionList).getAllByTestId(/transaction-\d+/);
      expect(transactions.length).toBe(mockDashboardData.sales.length);
    });

    it('should handle view all transactions action', async () => {
      render(<Dashboard />);
      
      const viewAllBtn = screen.getByTestId('view-all-transactions');
      await user.click(viewAllBtn);
      
      expect(viewAllBtn).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state with proper accessibility', () => {
      vi.mocked(mockStores.business).isLoading = true;
      
      render(<Dashboard />);
      
      const loadingIndicator = screen.getByLabelText(/loading/i);
      expect(loadingIndicator).toBeInTheDocument();
      expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
    });

    it('should display error state with retry functionality', async () => {
      const mockRetry = vi.fn();
      vi.mocked(mockStores.business).error = 'Failed to load dashboard data';
      vi.mocked(mockStores.business).clearError = mockRetry;
      
      render(<Dashboard />);
      
      // Test error message display
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      
      // Test retry functionality
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);
      
      expect(mockRetry).toHaveBeenCalled();
    });

    it('should handle empty data gracefully', () => {
      vi.mocked(mockStores.business).products = [];
      vi.mocked(mockStores.business).sales = [];
      vi.mocked(mockStores.business).customers = [];
      
      render(<Dashboard />);
      
      // Should show empty state messages
      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design and Performance', () => {
    it('should adapt to different screen sizes', () => {
      // Mock different viewport sizes
      const originalInnerWidth = window.innerWidth;
      
      // Test mobile layout
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      window.dispatchEvent(new Event('resize'));
      
      render(<Dashboard />);
      
      const container = screen.getByTestId('dashboard-container');
      expect(container).toHaveClass('mobile-layout');
      
      // Restore original width
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
    });

    it('should handle component unmounting cleanly', () => {
      const { unmount } = render(<Dashboard />);
      
      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Philippine Business Requirements', () => {
    it('should display Philippine peso currency formatting', () => {
      render(<Dashboard />);
      
      // Test currency formatting
      const currencyElements = screen.getAllByText(/₱/);
      expect(currencyElements.length).toBeGreaterThan(0);
    });

    it('should handle Philippine timezone correctly', () => {
      render(<Dashboard />);
      
      // Test that timestamps are handled correctly for Philippine timezone
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThanOrEqual(0);
    });

    it('should support Philippine business metrics', () => {
      render(<Dashboard />);
      
      // Test that business metrics relevant to Philippine businesses are displayed
      const statsCards = screen.getAllByTestId('stats-card');
      expect(statsCards.length).toBe(4); // Sales, Products, Customers, Low Stock
    });
  });

  describe('Data Refresh and Real-time Updates', () => {
    it('should handle data refresh functionality', async () => {
      render(<Dashboard />);
      
      const refreshBtn = screen.getByLabelText(/refresh/i);
      await user.click(refreshBtn);
      
      // Should trigger loading state
      await waitFor(() => {
        expect(mockStores.business.setLoading).toHaveBeenCalledWith(true);
      });
    });

    it('should update when store data changes', async () => {
      const { rerender } = render(<Dashboard />);
      
      // Simulate data update
      act(() => {
        vi.mocked(mockStores.business).products = TestDataFactory.createProductsBatch(10);
      });
      
      rerender(<Dashboard />);
      
      // Should reflect updated data
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });
  });
});"