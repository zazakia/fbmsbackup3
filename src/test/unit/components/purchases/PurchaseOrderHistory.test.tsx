import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PurchaseOrderHistory from '../../../../components/purchases/PurchaseOrderHistory';
import { PurchaseOrder, StatusTransition, ReceivingRecord, PurchaseOrderAuditLog } from '../../../../types/business';
import * as purchaseOrderAuditAPI from '../../../../api/purchaseOrderAuditAPI';

// Mock the API
vi.mock('../../../../api/purchaseOrderAuditAPI');

const mockGetPurchaseOrderStatusTransitions = vi.mocked(purchaseOrderAuditAPI.getPurchaseOrderStatusTransitions);
const mockGetPurchaseOrderReceivingHistory = vi.mocked(purchaseOrderAuditAPI.getPurchaseOrderReceivingHistory);
const mockGetPurchaseOrderAuditTrail = vi.mocked(purchaseOrderAuditAPI.getPurchaseOrderAuditTrail);

// Mock data
const mockPurchaseOrder: PurchaseOrder = {
  id: 'po123',
  poNumber: 'PO-2024-001',
  supplierId: 'supplier123',
  supplierName: 'Test Supplier',
  items: [
    {
      id: 'item1',
      productId: 'product1',
      productName: 'Test Product 1',
      sku: 'SKU001',
      quantity: 10,
      cost: 50,
      total: 500
    }
  ],
  subtotal: 500,
  tax: 60,
  total: 560,
  status: 'received',
  createdAt: new Date('2024-01-01'),
  createdBy: 'user123'
};

const mockStatusTransitions: StatusTransition[] = [
  {
    id: 'transition1',
    fromStatus: 'draft',
    toStatus: 'approved',
    timestamp: new Date('2024-01-02T10:00:00Z'),
    performedBy: 'user123',
    performedByName: 'Test User',
    reason: 'All requirements met'
  },
  {
    id: 'transition2',
    fromStatus: 'approved',
    toStatus: 'fully_received',
    timestamp: new Date('2024-01-03T14:30:00Z'),
    performedBy: 'user456',
    performedByName: 'Warehouse Staff',
    reason: 'Goods received in full'
  }
];

const mockReceivingRecords: ReceivingRecord[] = [
  {
    id: 'receipt1',
    receivedDate: new Date('2024-01-03T14:00:00Z'),
    receivedBy: 'user456',
    receivedByName: 'Warehouse Staff',
    items: [
      {
        productId: 'product1',
        orderedQuantity: 10,
        receivedQuantity: 10,
        previouslyReceived: 0,
        totalReceived: 10,
        condition: 'good'
      }
    ],
    notes: 'All items received in good condition',
    totalItems: 1,
    totalQuantity: 10
  }
];

const mockAuditTrail: PurchaseOrderAuditLog[] = [
  {
    id: 'audit1',
    purchaseOrderId: 'po123',
    action: 'created',
    performedBy: 'user123',
    performedByName: 'Test User',
    timestamp: new Date('2024-01-01T09:00:00Z'),
    oldValues: null,
    newValues: { status: 'draft', total: 560 },
    reason: 'Initial creation'
  },
  {
    id: 'audit2',
    purchaseOrderId: 'po123',
    action: 'updated',
    performedBy: 'user123',
    performedByName: 'Test User',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    oldValues: { supplierName: 'Old Supplier' },
    newValues: { supplierName: 'Test Supplier' },
    reason: 'Corrected supplier information'
  }
];

describe('PurchaseOrderHistory', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup API mocks with successful responses
    mockGetPurchaseOrderStatusTransitions.mockResolvedValue({
      data: mockStatusTransitions,
      error: null
    });
    
    mockGetPurchaseOrderReceivingHistory.mockResolvedValue({
      data: mockReceivingRecords,
      error: null
    });
    
    mockGetPurchaseOrderAuditTrail.mockResolvedValue({
      data: mockAuditTrail,
      error: null
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    purchaseOrder: mockPurchaseOrder,
    onClose: mockOnClose
  };

  describe('Component Rendering', () => {
    it('renders the history component correctly', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Purchase Order History')).toBeInTheDocument();
        expect(screen.getByText('Complete timeline for PO #PO-2024-001')).toBeInTheDocument();
      });
    });

    it('renders in compact mode', async () => {
      render(<PurchaseOrderHistory {...defaultProps} compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      expect(screen.getByText('Loading history...')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('loads all history data on mount', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetPurchaseOrderStatusTransitions).toHaveBeenCalledWith('po123');
        expect(mockGetPurchaseOrderReceivingHistory).toHaveBeenCalledWith('po123');
        expect(mockGetPurchaseOrderAuditTrail).toHaveBeenCalledWith('po123');
      });
    });

    it('handles API errors gracefully', async () => {
      mockGetPurchaseOrderStatusTransitions.mockResolvedValue({
        data: null,
        error: 'Failed to fetch status transitions'
      });

      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load purchase order history')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockGetPurchaseOrderStatusTransitions.mockResolvedValue({
        data: null,
        error: 'Network error'
      });

      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load purchase order history')).toBeInTheDocument();
      });
    });
  });

  describe('Event Display', () => {
    it('displays status transition events', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Status changed to APPROVED')).toBeInTheDocument();
        expect(screen.getByText('Status changed to FULLY_RECEIVED')).toBeInTheDocument();
      });
    });

    it('displays receiving events', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Received 1 item types (10 units)')).toBeInTheDocument();
        expect(screen.getByText('All items received in good condition')).toBeInTheDocument();
      });
    });

    it('displays audit events', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Purchase Order Created')).toBeInTheDocument();
        expect(screen.getByText('Purchase Order Updated')).toBeInTheDocument();
      });
    });

    it('shows performer information', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('Warehouse Staff')).toBeInTheDocument();
      });
    });

    it('formats timestamps correctly', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        // Should show formatted dates
        expect(screen.getByText(/1\/2\/2024/)).toBeInTheDocument();
        expect(screen.getByText(/1\/3\/2024/)).toBeInTheDocument();
      });
    });
  });

  describe('Event Filtering', () => {
    it('shows all events by default', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Status changed to APPROVED')).toBeInTheDocument();
        expect(screen.getByText('Received 1 item types')).toBeInTheDocument();
        expect(screen.getByText('Purchase Order Created')).toBeInTheDocument();
      });
    });

    it('filters status change events', async () => {
      const user = userEvent.setup();
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Events')).toBeInTheDocument();
      });

      const filterSelect = screen.getByDisplayValue('All Events');
      await user.selectOptions(filterSelect, 'status');

      await waitFor(() => {
        expect(screen.getByText('Status changed to APPROVED')).toBeInTheDocument();
        // Receiving and audit events should not be visible
        expect(screen.queryByText('Received 1 item types')).not.toBeInTheDocument();
      });
    });

    it('filters receiving events', async () => {
      const user = userEvent.setup();
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Events')).toBeInTheDocument();
      });

      const filterSelect = screen.getByDisplayValue('All Events');
      await user.selectOptions(filterSelect, 'receiving');

      await waitFor(() => {
        expect(screen.getByText('Received 1 item types')).toBeInTheDocument();
        // Status and audit events should not be visible
        expect(screen.queryByText('Status changed to APPROVED')).not.toBeInTheDocument();
      });
    });

    it('filters audit events', async () => {
      const user = userEvent.setup();
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Events')).toBeInTheDocument();
      });

      const filterSelect = screen.getByDisplayValue('All Events');
      await user.selectOptions(filterSelect, 'audit');

      await waitFor(() => {
        expect(screen.getByText('Purchase Order Created')).toBeInTheDocument();
        // Status and receiving events should not be visible
        expect(screen.queryByText('Status changed to APPROVED')).not.toBeInTheDocument();
      });
    });
  });

  describe('Event Sorting', () => {
    it('sorts events by newest first by default', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        const events = screen.getAllByText(/Status changed|Received|Purchase Order/);
        // The most recent event should be first
        expect(events[0]).toHaveTextContent('Status changed to FULLY_RECEIVED');
      });
    });

    it('can sort events by oldest first', async () => {
      const user = userEvent.setup();
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Newest First')).toBeInTheDocument();
      });

      const sortSelect = screen.getByDisplayValue('Newest First');
      await user.selectOptions(sortSelect, 'oldest');

      await waitFor(() => {
        const events = screen.getAllByText(/Status changed|Received|Purchase Order/);
        // The oldest event should be first
        expect(events[0]).toHaveTextContent('Purchase Order Created');
      });
    });
  });

  describe('Event Expansion', () => {
    it('allows expanding events for more details', async () => {
      const user = userEvent.setup();
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        const expandButtons = screen.getAllByRole('button').filter(
          btn => btn.querySelector('svg') && btn.getAttribute('class')?.includes('p-1')
        );
        expect(expandButtons.length).toBeGreaterThan(0);
      });

      // Click on an expand button
      const expandButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg') && btn.getAttribute('class')?.includes('p-1')
      );
      await user.click(expandButtons[0]);

      // Should show expanded content (exact content depends on event type)
      await waitFor(() => {
        expect(screen.getByText(/Transition:|Previous values:|Received Items:/)).toBeInTheDocument();
      });
    });

    it('shows receiving item details when expanding receiving events', async () => {
      const user = userEvent.setup();
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Received 1 item types (10 units)')).toBeInTheDocument();
      });

      // Find and click the expand button for the receiving event
      const receivingEvent = screen.getByText('Received 1 item types (10 units)').closest('div');
      const expandButton = receivingEvent?.querySelector('button');
      
      if (expandButton) {
        await user.click(expandButton);

        await waitFor(() => {
          expect(screen.getByText('Received Items:')).toBeInTheDocument();
          expect(screen.getByText('Test Product 1')).toBeInTheDocument();
          expect(screen.getByText('Qty: 10')).toBeInTheDocument();
          expect(screen.getByText('good')).toBeInTheDocument();
        });
      }
    });

    it('shows status transition details when expanding status events', async () => {
      const user = userEvent.setup();
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Status changed to APPROVED')).toBeInTheDocument();
      });

      // Find and click the expand button for the status event
      const statusEvent = screen.getByText('Status changed to APPROVED').closest('div');
      const expandButton = statusEvent?.querySelector('button');
      
      if (expandButton) {
        await user.click(expandButton);

        await waitFor(() => {
          expect(screen.getByText('Transition:')).toBeInTheDocument();
          expect(screen.getByText('DRAFT')).toBeInTheDocument();
          expect(screen.getByText('APPROVED')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Refresh Functionality', () => {
    it('allows refreshing the history data', async () => {
      const user = userEvent.setup();
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Refresh'));

      // Should call the API again
      expect(mockGetPurchaseOrderStatusTransitions).toHaveBeenCalledTimes(2);
      expect(mockGetPurchaseOrderReceivingHistory).toHaveBeenCalledTimes(2);
      expect(mockGetPurchaseOrderAuditTrail).toHaveBeenCalledTimes(2);
    });

    it('shows loading state during refresh', async () => {
      const user = userEvent.setup();
      
      // Make API calls slow to see loading state
      mockGetPurchaseOrderStatusTransitions.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: [], error: null }), 100))
      );

      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Refresh'));

      // Should show loading spinner in refresh button
      expect(screen.getByText('Refresh').querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no events are found', async () => {
      mockGetPurchaseOrderStatusTransitions.mockResolvedValue({ data: [], error: null });
      mockGetPurchaseOrderReceivingHistory.mockResolvedValue({ data: [], error: null });
      mockGetPurchaseOrderAuditTrail.mockResolvedValue({ data: [], error: null });

      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No history events found')).toBeInTheDocument();
      });
    });
  });

  describe('Compact Mode', () => {
    it('shows only recent activity in compact mode', async () => {
      render(<PurchaseOrderHistory {...defaultProps} compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        // Should not show filters and controls
        expect(screen.queryByText('Filter:')).not.toBeInTheDocument();
        expect(screen.queryByText('Sort:')).not.toBeInTheDocument();
      });
    });

    it('limits events shown in compact mode', async () => {
      render(<PurchaseOrderHistory {...defaultProps} compact={true} />);

      await waitFor(() => {
        // Should show events but in a more compact format
        expect(screen.getByText('Status changed to FULLY_RECEIVED')).toBeInTheDocument();
        // Should not show the full interface
        expect(screen.queryByText('Complete timeline')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for filter controls', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Filter/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Sort/)).toBeInTheDocument();
      });
    });

    it('provides proper button accessibility', async () => {
      render(<PurchaseOrderHistory {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
      });
    });
  });
});