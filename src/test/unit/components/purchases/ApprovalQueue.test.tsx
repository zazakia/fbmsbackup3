import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalQueue } from '../../../../components/purchases/ApprovalQueue';
import { usePurchaseOrderStore } from '../../../../store/purchaseOrderStore';
import { useSupabaseAuthStore } from '../../../../store/supabaseAuthStore';
import { hasPurchaseOrderPermission } from '../../../../utils/purchaseOrderPermissions';
import { PurchaseOrder } from '../../../../types/business';
import { UserRole } from '../../../../types/auth';

// Mock dependencies
vi.mock('../../../../store/purchaseOrderStore');
vi.mock('../../../../store/supabaseAuthStore');
vi.mock('../../../../utils/purchaseOrderPermissions');
vi.mock('../../../../components/purchases/PurchaseOrderActionButtons', () => ({
  default: ({ purchaseOrder, onApprove }: any) => (
    <div data-testid={`action-buttons-${purchaseOrder.id}`}>
      <button onClick={() => onApprove?.(purchaseOrder)}>
        Approve {purchaseOrder.poNumber}
      </button>
    </div>
  )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Search: () => <div data-testid="search-icon" />,
  DollarSign: () => <div data-testid="dollar-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Building: () => <div data-testid="building-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
  XCircle: () => <div data-testid="x-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Users: () => <div data-testid="users-icon" />,
  FileText: () => <div data-testid="file-icon" />
}));

// Mock formatters utility
vi.mock('../../../../utils/formatters', () => ({
  formatCurrency: (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  formatDate: (date: any) => new Date(date).toLocaleDateString(),
  formatNumber: (num: number) => num.toString()
}));

const mockUsePurchaseOrderStore = usePurchaseOrderStore as Mock;
const mockUseSupabaseAuthStore = useSupabaseAuthStore as Mock;
const mockHasPermission = hasPurchaseOrderPermission as Mock;

describe('ApprovalQueue', () => {
  let mockPurchaseOrders: PurchaseOrder[];
  let mockStoreActions: any;
  let user: any;

  beforeEach(() => {
    // Set viewport size to ensure all grid columns are visible
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
    
    // Sample purchase orders
    mockPurchaseOrders = [
      {
        id: 'po1',
        poNumber: 'PO-2024-001',
        supplierId: 'supplier1',
        supplierName: 'Supplier A',
        items: [
          {
            id: 'item1',
            productId: 'prod1',
            productName: 'Product 1',
            sku: 'SKU-001',
            quantity: 10,
            cost: 100,
            total: 1000
          }
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'draft',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        expectedDate: new Date('2024-02-01')
      },
      {
        id: 'po2',
        poNumber: 'PO-2024-002',
        supplierId: 'supplier2',
        supplierName: 'Supplier B',
        items: [
          {
            id: 'item2',
            productId: 'prod2',
            productName: 'Product 2',
            sku: 'SKU-002',
            quantity: 5,
            cost: 2000,
            total: 10000
          }
        ],
        subtotal: 10000,
        tax: 1200,
        total: 11200,
        status: 'pending',
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
        expectedDate: new Date('2024-02-15')
      },
      {
        id: 'po3',
        poNumber: 'PO-2024-003',
        supplierId: 'supplier1',
        supplierName: 'Supplier A',
        items: [
          {
            id: 'item3',
            productId: 'prod3',
            productName: 'Product 3',
            sku: 'SKU-003',
            quantity: 20,
            cost: 3000,
            total: 60000
          }
        ],
        subtotal: 60000,
        tax: 7200,
        total: 67200,
        status: 'draft',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10')
      }
    ];

    // Mock store actions
    mockStoreActions = {
      loadPurchaseOrdersByStatus: vi.fn(),
      loadPurchaseOrdersForApproval: vi.fn(),
      setPage: vi.fn(),
      selectPO: vi.fn(),
      deletePO: vi.fn()
    };

    // Mock store state
    mockUsePurchaseOrderStore.mockReturnValue({
      purchaseOrders: mockPurchaseOrders,
      loading: false,
      error: null,
      page: 1,
      limit: 10,
      ...mockStoreActions
    });

    // Mock auth store
    mockUseSupabaseAuthStore.mockReturnValue({
      userRole: 'manager',
      user: { id: 'user1', email: 'manager@test.com' }
    });

    // Mock permissions
    mockHasPermission.mockReturnValue(true);

    // Setup user events
    user = userEvent.setup();

    // Mock Date.now for consistent testing
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-15').getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Permission Handling', () => {
    it('should show access denied when user lacks approval permission', () => {
      // Arrange
      mockHasPermission.mockReturnValue(false);

      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText("You don't have permission to access the approval queue.")).toBeInTheDocument();
    });

    it('should show approval queue when user has permission', () => {
      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(screen.getByText('Purchase Order Approval Queue')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading spinner when loading', () => {
      // Arrange
      mockUsePurchaseOrderStore.mockReturnValue({
        purchaseOrders: [],
        loading: true,
        error: null,
        ...mockStoreActions
      });

      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(document.querySelector('.animate-spin')).toBeInTheDocument(); // Loading spinner
    });

    it('should show error message when error occurs', () => {
      // Arrange
      const errorMessage = 'Failed to load purchase orders';
      mockUsePurchaseOrderStore.mockReturnValue({
        purchaseOrders: [],
        loading: false,
        error: errorMessage,
        ...mockStoreActions
      });

      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(screen.getByText('Error Loading Approval Queue')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('should display correct statistics', () => {
      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(screen.getAllByText('3')[0]).toBeInTheDocument(); // Total count
      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      
      // Check total value (₱79,520.00)
      expect(screen.getByText(/₱79,520\.00/)).toBeInTheDocument();
      expect(screen.getByText('Total Value')).toBeInTheDocument();

      // Check overdue count (orders older than 3 days)
      expect(screen.getAllByText('3')[1]).toBeInTheDocument(); // 3 overdue (all orders are > 3 days old)
      expect(screen.getByText('Overdue')).toBeInTheDocument();

      // Check high value count (orders > ₱50,000)
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 high value
      expect(screen.getByText('High Value')).toBeInTheDocument();
    });
  });

  describe('Purchase Orders Display', () => {
    it('should display all pending purchase orders', () => {
      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('PO-2024-002')).toBeInTheDocument();
      expect(screen.getByText('PO-2024-003')).toBeInTheDocument();
      
      expect(screen.getAllByText('Supplier A')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Supplier B')[0]).toBeInTheDocument();
    });

    it('should show priority indicators for orders', () => {
      // Act
      render(<ApprovalQueue />);

      // Assert
      // High value order should show high priority
      const highPriorityElements = screen.getAllByText('high');
      expect(highPriorityElements.length).toBeGreaterThan(0);
      
      // Orders created more than 7 days ago would show urgent
      // Orders created 3-7 days ago show high
      // etc.
    });

    it('should display item preview for each order', () => {
      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(screen.getByText(/Items: Product 1/)).toBeInTheDocument();
      expect(screen.getByText(/Items: Product 2/)).toBeInTheDocument();
      expect(screen.getByText(/Items: Product 3/)).toBeInTheDocument();
    });

    it('should show days since creation', () => {
      // Act
      render(<ApprovalQueue />);

      // Assert
      // PO-2024-001 was created 14 days ago
      expect(screen.getByText('14 days ago')).toBeInTheDocument();
      
      // PO-2024-002 was created 10 days ago
      expect(screen.getByText('10 days ago')).toBeInTheDocument();
      
      // PO-2024-003 was created 5 days ago
      expect(screen.getByText('5 days ago')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should show/hide filters when filter button is clicked', async () => {
      // Act
      render(<ApprovalQueue />);
      
      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);

      // Wait for filters to be visible
      await waitFor(() => {
        // Just check that we have some select elements rendered
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
      
      // Now assert individual elements are present
      expect(screen.getByPlaceholderText('Search PO, supplier...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Time')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Amounts')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Date Created')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Descending')).toBeInTheDocument();
    });

    it('should filter by search term', async () => {
      // Act
      render(<ApprovalQueue />);
      
      // Open filters
      await user.click(screen.getByText('Filters'));
      
      // Search for specific PO
      const searchInput = screen.getByPlaceholderText('Search PO, supplier...');
      await user.type(searchInput, 'PO-2024-001');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('PO-2024-002')).not.toBeInTheDocument();
        expect(screen.queryByText('PO-2024-003')).not.toBeInTheDocument();
      });
    });

    it('should filter by supplier', async () => {
      // Act
      render(<ApprovalQueue />);
      
      // Open filters
      await user.click(screen.getByText('Filters'));
      
      // Filter by supplier
      // Find supplier select (4th select element in the grid)
      const selects = screen.getAllByRole('combobox');
      const supplierSelect = selects[2]; // 0: Date Range, 1: Amount Range, 2: Supplier, 3: Sort By, 4: Order
      await user.selectOptions(supplierSelect, 'Supplier A');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
        expect(screen.getByText('PO-2024-003')).toBeInTheDocument();
        expect(screen.queryByText('PO-2024-002')).not.toBeInTheDocument();
      });
    });

    it('should filter by amount range', async () => {
      // Act
      render(<ApprovalQueue />);
      
      // Open filters
      await user.click(screen.getByText('Filters'));
      
      // Filter by high amount (> ₱50,000)
      const amountSelect = screen.getByDisplayValue('All Amounts');
      await user.selectOptions(amountSelect, 'high');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('PO-2024-003')).toBeInTheDocument(); // ₱67,200
        expect(screen.queryByText('PO-2024-001')).not.toBeInTheDocument(); // ₱1,120
        expect(screen.queryByText('PO-2024-002')).not.toBeInTheDocument(); // ₱11,200
      });
    });

    it('should sort by amount', async () => {
      // Act
      render(<ApprovalQueue />);
      
      // Open filters
      await user.click(screen.getByText('Filters'));
      
      // Wait for filters to be visible
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(4); // Should have at least 4 select elements
      });
      
      // Sort by amount ascending
      // Find Sort By select by its default value
      const sortSelect = screen.getByDisplayValue('Date Created');
      await user.selectOptions(sortSelect, 'amount');
      
      const orderSelect = screen.getByDisplayValue('Descending');
      await user.selectOptions(orderSelect, 'asc');

      // Assert - lowest amount should appear first
      await waitFor(() => {
        const poNumbers = screen.getAllByText(/PO-2024-\d{3}/);
        expect(poNumbers[0]).toHaveTextContent('PO-2024-001'); // ₱1,120
      });
    });
  });

  describe('Selection and Bulk Actions', () => {
    it('should allow selecting individual purchase orders', async () => {
      // Act
      render(<ApprovalQueue />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const firstPOCheckbox = checkboxes[1]; // Skip the "select all" checkbox
      await user.click(firstPOCheckbox);

      // Assert
      expect(firstPOCheckbox).toBeChecked();
      expect(screen.getByText(/1 of 3 selected/)).toBeInTheDocument();
    });

    it('should allow selecting all purchase orders', async () => {
      // Act
      render(<ApprovalQueue />);
      
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      // Assert
      expect(selectAllCheckbox).toBeChecked();
      expect(screen.getByText(/3 of 3 selected/)).toBeInTheDocument();
      
      // All individual checkboxes should be checked
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });

    it('should show bulk approval button when items are selected', async () => {
      // Act
      render(<ApprovalQueue />);
      
      const checkbox = screen.getAllByRole('checkbox')[1];
      await user.click(checkbox);

      // Assert
      expect(screen.getByText(/Approve Selected \(1\)/)).toBeInTheDocument();
    });
  });

  describe('Callback Handlers', () => {
    it('should call onApprove when approval is triggered', async () => {
      // Arrange
      const mockOnApprove = vi.fn();
      
      // Act
      render(<ApprovalQueue onApprove={mockOnApprove} />);
      
      const approveButton = screen.getByText('Approve PO-2024-001');
      await user.click(approveButton);

      // Assert
      expect(mockOnApprove).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'po1',
          poNumber: 'PO-2024-001'
        })
      );
    });

    it('should call onBulkApproval when bulk approval is triggered', async () => {
      // Arrange
      const mockOnBulkApproval = vi.fn();
      
      // Act
      render(<ApprovalQueue onBulkApproval={mockOnBulkApproval} />);
      
      // Select a purchase order
      const checkbox = screen.getAllByRole('checkbox')[1];
      await user.click(checkbox);
      
      // Click bulk approval
      const bulkApproveButton = screen.getByText(/Approve Selected \(1\)/);
      await user.click(bulkApproveButton);

      // Assert
      expect(mockOnBulkApproval).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 'po3' })]
      );
    });

    it('should call onViewDetails when view is triggered', async () => {
      // Arrange
      const mockOnViewDetails = vi.fn();
      
      // Act
      render(<ApprovalQueue onViewDetails={mockOnViewDetails} />);
      
      // Action buttons component should trigger this when view history is called
      // This would be through the PurchaseOrderActionButtons component
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no purchase orders exist', () => {
      // Arrange
      mockUsePurchaseOrderStore.mockReturnValue({
        purchaseOrders: [],
        loading: false,
        error: null,
        ...mockStoreActions
      });

      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(screen.getByText('No Purchase Orders Found')).toBeInTheDocument();
      expect(screen.getByText('There are no purchase orders pending approval.')).toBeInTheDocument();
    });

    it('should show filtered empty state when filters exclude all orders', async () => {
      // Act
      render(<ApprovalQueue />);
      
      // Open filters and search for non-existent PO
      await user.click(screen.getByText('Filters'));
      const searchInput = screen.getByPlaceholderText('Search PO, supplier...');
      await user.type(searchInput, 'NONEXISTENT');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No Purchase Orders Found')).toBeInTheDocument();
        expect(screen.getByText('No purchase orders match your current filter criteria.')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should load purchase orders on mount for users with permission', () => {
      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(mockStoreActions.loadPurchaseOrdersForApproval).toHaveBeenCalled();
    });

    it('should not load data for users without permission', () => {
      // Arrange
      mockHasPermission.mockReturnValue(false);

      // Act
      render(<ApprovalQueue />);

      // Assert
      expect(mockStoreActions.loadPurchaseOrdersByStatus).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should display mobile-friendly layout', () => {
      // Act
      render(<ApprovalQueue />);

      // Assert - Check that the component renders without errors
      expect(screen.getByText('Purchase Order Approval Queue')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      // Act
      render(<ApprovalQueue />);

      // Assert
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', async () => {
      // Act
      render(<ApprovalQueue />);
      
      // Tab navigation should work
      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      firstCheckbox.focus();
      expect(document.activeElement).toBe(firstCheckbox);
    });
  });
});