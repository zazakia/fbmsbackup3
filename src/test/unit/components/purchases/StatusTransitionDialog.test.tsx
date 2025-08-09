import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import StatusTransitionDialog from '../../../../components/purchases/StatusTransitionDialog';
import { PurchaseOrder, EnhancedPurchaseOrderStatus } from '../../../../types/business';
import { useSupabaseAuthStore } from '../../../../store/supabaseAuthStore';
import { PurchaseOrderStateMachine, TransitionContext } from '../../../../services/purchaseOrderStateMachine';
import * as purchaseOrderPermissions from '../../../../utils/purchaseOrderPermissions';

// Mock the dependencies
vi.mock('../../../../store/supabaseAuthStore');
vi.mock('../../../../services/purchaseOrderStateMachine');
vi.mock('../../../../utils/purchaseOrderPermissions');

const mockUseSupabaseAuthStore = vi.mocked(useSupabaseAuthStore);
const mockPurchaseOrderStateMachine = vi.mocked(PurchaseOrderStateMachine);
const mockCanPerformPurchaseOrderAction = vi.mocked(purchaseOrderPermissions.canPerformPurchaseOrderAction);

// Mock data
const mockUser = {
  id: 'user123',
  email: 'test@example.com'
};

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
  status: 'draft',
  createdAt: new Date('2024-01-01'),
  createdBy: 'user123'
};

const mockStateMachine = {
  canTransition: vi.fn(),
  getValidTransitions: vi.fn(),
  validateTransition: vi.fn()
};

describe('StatusTransitionDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mock
    mockUseSupabaseAuthStore.mockReturnValue({
      user: mockUser,
      userRole: 'manager',
      isAuthenticated: true
    } as any);

    // Setup state machine mock
    mockPurchaseOrderStateMachine.mockImplementation(() => mockStateMachine as any);
    mockStateMachine.canTransition.mockReturnValue(true);

    // Setup permissions mock
    mockCanPerformPurchaseOrderAction.mockReturnValue({
      allowed: true,
      reason: null
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    purchaseOrder: mockPurchaseOrder,
    targetStatus: 'approved' as EnhancedPurchaseOrderStatus,
    isOpen: true,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel
  };

  describe('Component Rendering', () => {
    it('renders when open', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByText('Confirm Status Change')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<StatusTransitionDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Confirm Status Change')).not.toBeInTheDocument();
    });

    it('displays purchase order information', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('Test Supplier')).toBeInTheDocument();
      expect(screen.getByText('₱560')).toBeInTheDocument();
    });

    it('shows status transition visual', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('New Status')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  describe('Status-Specific Validations', () => {
    it('shows requirements for approval', () => {
      render(<StatusTransitionDialog {...defaultProps} targetStatus="approved" />);

      expect(screen.getByText(/Purchase order will be marked as approved/)).toBeInTheDocument();
    });

    it('shows warnings for cancellation', () => {
      render(<StatusTransitionDialog {...defaultProps} targetStatus="cancelled" />);

      expect(screen.getByText(/Cancelled purchase orders cannot be restored/)).toBeInTheDocument();
      expect(screen.getByText(/Provide a reason for cancellation/)).toBeInTheDocument();
    });

    it('shows warnings for receiving statuses', () => {
      render(<StatusTransitionDialog {...defaultProps} targetStatus="fully_received" />);

      expect(screen.getByText(/This action will trigger inventory updates/)).toBeInTheDocument();
      expect(screen.getByText(/Ensure all received items have been physically verified/)).toBeInTheDocument();
    });

    it('shows warnings for closing', () => {
      render(<StatusTransitionDialog {...defaultProps} targetStatus="closed" />);

      expect(screen.getByText(/Closed purchase orders are finalized/)).toBeInTheDocument();
      expect(screen.getByText(/Ensure all receiving and accounting processes are complete/)).toBeInTheDocument();
    });
  });

  describe('Validation Logic', () => {
    it('shows validation error when transition is not allowed by state machine', () => {
      mockStateMachine.canTransition.mockReturnValue(false);
      
      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByText(/Cannot transition from draft to approved/)).toBeInTheDocument();
      expect(screen.getByText('Cannot Proceed')).toBeInTheDocument();
    });

    it('shows validation error when user lacks permissions', () => {
      mockCanPerformPurchaseOrderAction.mockReturnValue({
        allowed: false,
        reason: 'Insufficient role privileges'
      });

      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByText('Insufficient role privileges')).toBeInTheDocument();
      expect(screen.getByText('Cannot Proceed')).toBeInTheDocument();
    });

    it('shows validation error when PO has no items (for approval)', () => {
      const poWithoutItems = { ...mockPurchaseOrder, items: [] };
      
      render(<StatusTransitionDialog {...defaultProps} purchaseOrder={poWithoutItems} targetStatus="approved" />);

      expect(screen.getByText('Cannot approve purchase order without items')).toBeInTheDocument();
    });

    it('shows validation error when PO has zero total (for approval)', () => {
      const poWithZeroTotal = { ...mockPurchaseOrder, total: 0 };
      
      render(<StatusTransitionDialog {...defaultProps} purchaseOrder={poWithZeroTotal} targetStatus="approved" />);

      expect(screen.getByText('Cannot approve purchase order with zero total')).toBeInTheDocument();
    });

    it('shows validation error when no supplier is selected (for approval)', () => {
      const poWithoutSupplier = { ...mockPurchaseOrder, supplierId: '' };
      
      render(<StatusTransitionDialog {...defaultProps} purchaseOrder={poWithoutSupplier} targetStatus="approved" />);

      expect(screen.getByText('Cannot approve purchase order without supplier')).toBeInTheDocument();
    });
  });

  describe('Reason Input', () => {
    it('shows reason input field', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByLabelText(/Reason for Status Change/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Explain why you are changing the status/)).toBeInTheDocument();
    });

    it('marks reason as required for certain statuses', () => {
      render(<StatusTransitionDialog {...defaultProps} targetStatus="cancelled" />);

      expect(screen.getByText('*')).toBeInTheDocument(); // Required indicator
    });

    it('allows typing in reason field', async () => {
      const user = userEvent.setup();
      render(<StatusTransitionDialog {...defaultProps} />);

      const reasonInput = screen.getByLabelText(/Reason for Status Change/);
      await user.type(reasonInput, 'All requirements have been met');

      expect(reasonInput).toHaveValue('All requirements have been met');
    });

    it('validates required reason for cancellation', async () => {
      const user = userEvent.setup();
      render(<StatusTransitionDialog {...defaultProps} targetStatus="cancelled" />);

      // Initially should show error for missing reason
      await waitFor(() => {
        expect(screen.getByText('Reason is required for this status change')).toBeInTheDocument();
      });

      // After typing reason, error should disappear
      const reasonInput = screen.getByLabelText(/Reason for Status Change/);
      await user.type(reasonInput, 'Order no longer needed');

      await waitFor(() => {
        expect(screen.queryByText('Reason is required for this status change')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Information', () => {
    it('displays current user information', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByText('Performing as: test@example.com')).toBeInTheDocument();
    });

    it('shows current date and time', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      const dateText = screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date pattern
      expect(dateText).toBeInTheDocument();
    });

    it('handles missing user gracefully', () => {
      mockUseSupabaseAuthStore.mockReturnValue({
        user: null,
        userRole: null,
        isAuthenticated: false
      } as any);

      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByText('Performing as: Unknown User')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('shows cancel and confirm buttons', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm Change' })).toBeInTheDocument();
    });

    it('disables confirm button when validation fails', () => {
      mockStateMachine.canTransition.mockReturnValue(false);
      
      render(<StatusTransitionDialog {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Change' });
      expect(confirmButton).toBeDisabled();
    });

    it('enables confirm button when validation passes', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Change' });
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe('Dialog Actions', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<StatusTransitionDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<StatusTransitionDialog {...defaultProps} />);

      const closeButton = screen.getByRole('button').closest('.p-2'); // X button
      if (closeButton) {
        await user.click(closeButton);
        expect(mockOnCancel).toHaveBeenCalled();
      }
    });

    it('calls onConfirm with proper context when confirmed', async () => {
      const user = userEvent.setup();
      render(<StatusTransitionDialog {...defaultProps} />);

      const reasonInput = screen.getByLabelText(/Reason for Status Change/);
      await user.type(reasonInput, 'Test reason');

      await user.click(screen.getByRole('button', { name: 'Confirm Change' }));

      expect(mockOnConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          performedBy: 'user123',
          reason: 'Test reason',
          metadata: expect.objectContaining({
            userRole: 'manager',
            fromStatus: 'draft',
            toStatus: 'approved'
          })
        })
      );
    });

    it('shows processing state when confirming', async () => {
      const user = userEvent.setup();
      let resolveConfirm: (value: void) => void;
      const confirmPromise = new Promise<void>(resolve => {
        resolveConfirm = resolve;
      });
      
      mockOnConfirm.mockReturnValue(confirmPromise);
      
      render(<StatusTransitionDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Confirm Change' }));

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      
      // Resolve the promise
      resolveConfirm!();
      
      await waitFor(() => {
        expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Display Names', () => {
    it('formats enhanced status names properly', () => {
      render(<StatusTransitionDialog {...defaultProps} targetStatus="pending_approval" />);

      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    });

    it('formats sent_to_supplier status properly', () => {
      render(<StatusTransitionDialog {...defaultProps} targetStatus="sent_to_supplier" />);

      expect(screen.getByText('Sent To Supplier')).toBeInTheDocument();
    });

    it('formats fully_received status properly', () => {
      render(<StatusTransitionDialog {...defaultProps} targetStatus="fully_received" />);

      expect(screen.getByText('Fully Received')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByLabelText(/Reason for Status Change/)).toBeInTheDocument();
    });

    it('shows required field indicators', () => {
      render(<StatusTransitionDialog {...defaultProps} targetStatus="cancelled" />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('provides proper button accessibility', () => {
      render(<StatusTransitionDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm Change' })).toBeInTheDocument();
    });
  });
});