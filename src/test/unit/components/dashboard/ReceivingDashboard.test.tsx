import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReceivingDashboard from '../../../../components/dashboard/ReceivingDashboard';
import { receivingDashboardService } from '../../../../services/receivingDashboardService';
import { EnhancedPurchaseOrder } from '../../../../types/business';

// Mock the service
vi.mock('../../../../services/receivingDashboardService', () => ({
  receivingDashboardService: {
    getReceivingQueue: vi.fn(),
    getReceivingMetrics: vi.fn(),
    getOverdueAlerts: vi.fn()
  }
}));

// Mock child components
vi.mock('../../../../components/dashboard/ReceivingQueue', () => ({
  default: vi.fn(({ orders, onRefresh }) => (
    <div data-testid="receiving-queue">
      <p>Receiving Queue: {orders.length} orders</p>
      <button onClick={onRefresh}>Refresh Queue</button>
    </div>
  ))
}));

vi.mock('../../../../components/dashboard/ReceivingMetrics', () => ({
  default: vi.fn(({ data, onRefresh }) => (
    <div data-testid="receiving-metrics">
      <p>Metrics: {data ? 'loaded' : 'no data'}</p>
      <button onClick={onRefresh}>Refresh Metrics</button>
    </div>
  ))
}));

vi.mock('../../../../components/dashboard/OverdueAlerts', () => ({
  default: vi.fn(({ alerts, onRefresh }) => (
    <div data-testid="overdue-alerts">
      <p>Alerts: {alerts.length} items</p>
      <button onClick={onRefresh}>Refresh Alerts</button>
    </div>
  ))
}));

vi.mock('../../../../components/dashboard/ReceivingReports', () => ({
  default: vi.fn(({ onRefresh }) => (
    <div data-testid="receiving-reports">
      <p>Reports Component</p>
      <button onClick={onRefresh}>Refresh Reports</button>
    </div>
  ))
}));

describe('ReceivingDashboard', () => {
  const mockOrders: EnhancedPurchaseOrder[] = [
    {
      id: '1',
      poNumber: 'PO-001',
      supplierId: 'S1',
      supplierName: 'Test Supplier',
      items: [],
      subtotal: 1000,
      tax: 120,
      total: 1120,
      status: 'approved',
      createdAt: new Date(),
      statusHistory: [],
      receivingHistory: [],
      validationErrors: [],
      approvalHistory: [],
      totalReceived: 0,
      totalPending: 100,
      isPartiallyReceived: false,
      isFullyReceived: false,
      attachments: []
    }
  ];

  const mockMetrics = {
    averageReceivingTime: 2.4,
    receivingTimeChange: -5.2,
    onTimeDeliveryRate: 87.5,
    onTimeDeliveryChange: 3.1,
    totalOrdersReceived: 152,
    totalOrdersChange: 12.5,
    totalItemsReceived: 2847,
    totalItemsChange: 8.3,
    totalValueReceived: 2847500,
    totalValueChange: 15.7,
    accuracyRate: 94.2,
    accuracyChange: 2.1,
    damageRate: 1.8,
    damageRateChange: -0.3,
    avgOrdersPerDay: 5.1,
    avgOrdersPerDayChange: 15.7,
    staffProductivity: 8.5,
    staffProductivityChange: 6.2,
    dailyReceivingTrend: [],
    topSuppliers: [],
    recentIssues: []
  };

  const mockAlerts = [
    {
      id: '1',
      type: 'overdue_delivery' as const,
      orderId: '1',
      orderNumber: 'PO-001',
      supplierName: 'Test Supplier',
      severity: 'high' as const,
      title: 'Order Overdue',
      description: 'This order is 3 days overdue',
      daysOverdue: 3,
      expectedDate: new Date(),
      orderValue: 1120,
      actionRequired: 'Contact supplier',
      createdAt: new Date(),
      updatedAt: new Date(),
      isAcknowledged: false
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (receivingDashboardService.getReceivingQueue as any).mockResolvedValue(mockOrders);
    (receivingDashboardService.getReceivingMetrics as any).mockResolvedValue(mockMetrics);
    (receivingDashboardService.getOverdueAlerts as any).mockResolvedValue(mockAlerts);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the dashboard header correctly', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Receiving Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Manage purchase order receiving and track performance')).toBeInTheDocument();
      });
    });

    it('should render all navigation tabs', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Receiving Queue')).toBeInTheDocument();
        expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
        expect(screen.getByText('Overdue Alerts')).toBeInTheDocument();
        expect(screen.getByText('Reports')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<ReceivingDashboard />);
      
      expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
    });

    it('should display the refresh button', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should load dashboard data on mount', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledTimes(1);
        expect(receivingDashboardService.getReceivingMetrics).toHaveBeenCalledTimes(1);
        expect(receivingDashboardService.getOverdueAlerts).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle loading errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      (receivingDashboardService.getReceivingQueue as any).mockRejectedValue(new Error('API Error'));
      
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
      });
      
      consoleError.mockRestore();
    });

    it('should display retry button on error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      (receivingDashboardService.getReceivingQueue as any).mockRejectedValue(new Error('API Error'));
      
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        expect(retryButton).toBeInTheDocument();
      });
      
      consoleError.mockRestore();
    });
  });

  describe('Tab Navigation', () => {
    it('should show receiving queue by default', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('receiving-queue')).toBeInTheDocument();
        expect(screen.getByText('Receiving Queue: 1 orders')).toBeInTheDocument();
      });
    });

    it('should switch to metrics tab when clicked', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        const metricsTab = screen.getByText('Performance Metrics');
        fireEvent.click(metricsTab);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('receiving-metrics')).toBeInTheDocument();
        expect(screen.getByText('Metrics: loaded')).toBeInTheDocument();
      });
    });

    it('should switch to alerts tab when clicked', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        const alertsTab = screen.getByText('Overdue Alerts');
        fireEvent.click(alertsTab);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('overdue-alerts')).toBeInTheDocument();
        expect(screen.getByText('Alerts: 1 items')).toBeInTheDocument();
      });
    });

    it('should switch to reports tab when clicked', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        const reportsTab = screen.getByText('Reports');
        fireEvent.click(reportsTab);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('receiving-reports')).toBeInTheDocument();
        expect(screen.getByText('Reports Component')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Badges', () => {
    it('should show count badge on receiving queue tab', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        const badge = screen.getByText('1'); // 1 order in queue
        expect(badge).toBeInTheDocument();
      });
    });

    it('should show high priority alerts count in badge', async () => {
      const highPriorityAlerts = [
        { ...mockAlerts[0], severity: 'high' as const },
        { ...mockAlerts[0], severity: 'critical' as const, id: '2' }
      ];
      
      (receivingDashboardService.getOverdueAlerts as any).mockResolvedValue(highPriorityAlerts);
      
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        // Should show count of high and critical alerts
        const badges = screen.getAllByText('2');
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
      });
      
      await waitFor(() => {
        // Should be called twice: once on mount, once on refresh
        expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledTimes(2);
        expect(receivingDashboardService.getReceivingMetrics).toHaveBeenCalledTimes(2);
        expect(receivingDashboardService.getOverdueAlerts).toHaveBeenCalledTimes(2);
      });
    });

    it('should show spinning icon during refresh', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
        
        // Check if button is disabled during refresh
        expect(refreshButton.closest('button')).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should retry data loading when retry button is clicked', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // First call fails
      (receivingDashboardService.getReceivingQueue as any)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValue(mockOrders);
      
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('receiving-queue')).toBeInTheDocument();
      });
      
      consoleError.mockRestore();
    });
  });

  describe('Integration with Child Components', () => {
    it('should pass correct props to ReceivingQueue component', async () => {
      const ReceivingQueue = await import('../../../../components/dashboard/ReceivingQueue');
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        expect(ReceivingQueue.default).toHaveBeenCalledWith(
          expect.objectContaining({
            orders: mockOrders,
            onRefresh: expect.any(Function)
          }),
          expect.anything()
        );
      });
    });

    it('should pass correct props to ReceivingMetrics component', async () => {
      const ReceivingMetrics = await import('../../../../components/dashboard/ReceivingMetrics');
      render(<ReceivingDashboard />);
      
      // Switch to metrics tab
      await waitFor(() => {
        const metricsTab = screen.getByText('Performance Metrics');
        fireEvent.click(metricsTab);
      });
      
      await waitFor(() => {
        expect(ReceivingMetrics.default).toHaveBeenCalledWith(
          expect.objectContaining({
            data: mockMetrics,
            onRefresh: expect.any(Function)
          }),
          expect.anything()
        );
      });
    });

    it('should handle refresh calls from child components', async () => {
      render(<ReceivingDashboard />);
      
      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh Queue');
        fireEvent.click(refreshButton);
      });
      
      await waitFor(() => {
        expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledTimes(2);
      });
    });
  });
});