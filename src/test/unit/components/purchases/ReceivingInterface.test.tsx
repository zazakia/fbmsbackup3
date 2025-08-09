import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ReceivingInterface from '../../../../components/purchases/ReceivingInterface';
import { PurchaseOrder, ReceivingRecord } from '../../../../types/business';
import { useSupabaseAuthStore } from '../../../../store/supabaseAuthStore';
import { ReceivingService } from '../../../../services/receivingService';

// Mock the dependencies
vi.mock('../../../../store/supabaseAuthStore');
vi.mock('../../../../services/receivingService');

const mockUseSupabaseAuthStore = vi.mocked(useSupabaseAuthStore);
const mockReceivingService = vi.mocked(ReceivingService);

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
    },
    {
      id: 'item2',
      productId: 'product2',
      productName: 'Test Product 2',
      sku: 'SKU002',
      quantity: 5,
      cost: 100,
      total: 500
    }
  ],
  subtotal: 1000,
  tax: 120,
  total: 1120,
  status: 'sent',
  createdAt: new Date('2024-01-01'),
  createdBy: 'user123'
};

const mockExistingReceipts: ReceivingRecord[] = [
  {
    id: 'receipt1',
    receivedDate: new Date('2024-01-02'),
    receivedBy: 'user123',
    receivedByName: 'Test User',
    items: [
      {
        productId: 'product1',
        orderedQuantity: 10,
        receivedQuantity: 5,
        previouslyReceived: 0,
        totalReceived: 5,
        condition: 'good'
      }
    ],
    notes: 'Partial receipt',
    totalItems: 1,
    totalQuantity: 5
  }
];

const mockReceivingServiceInstance = {
  processReceipt: vi.fn(),
};

describe('ReceivingInterface', () => {
  const mockOnReceiptComplete = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mock
    mockUseSupabaseAuthStore.mockReturnValue({
      user: mockUser,
      userRole: 'manager',
      isAuthenticated: true
    } as any);

    // Setup service mock
    mockReceivingService.mockImplementation(() => mockReceivingServiceInstance as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    purchaseOrder: mockPurchaseOrder,
    onReceiptComplete: mockOnReceiptComplete,
    onClose: mockOnClose,
    existingReceipts: []
  };

  describe('Component Rendering', () => {
    it('renders the receiving interface correctly', () => {
      render(<ReceivingInterface {...defaultProps} />);

      expect(screen.getByText('Receive Purchase Order Items')).toBeInTheDocument();
      expect(screen.getByText('PO #PO-2024-001 - Test Supplier')).toBeInTheDocument();
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    });

    it('displays purchase order information', () => {
      render(<ReceivingInterface {...defaultProps} />);

      expect(screen.getByText('PO #PO-2024-001 - Test Supplier')).toBeInTheDocument();
      expect(screen.getByText('SKU: SKU001')).toBeInTheDocument();
      expect(screen.getByText('SKU: SKU002')).toBeInTheDocument();
    });

    it('shows action buttons', () => {
      render(<ReceivingInterface {...defaultProps} />);

      expect(screen.getByText('Receive All Remaining')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
      expect(screen.getByText('Process Receipt')).toBeInTheDocument();
    });
  });

  describe('Previously Received Calculation', () => {
    it('calculates previously received quantities correctly', () => {
      render(<ReceivingInterface {...defaultProps} existingReceipts={mockExistingReceipts} />);

      // Product 1 should show 5 previously received
      const product1Row = screen.getByText('Test Product 1').closest('tr');
      expect(product1Row).toHaveTextContent('5'); // Previously received column
      expect(product1Row).toHaveTextContent('Max: 5 remaining');

      // Product 2 should show 0 previously received
      const product2Row = screen.getByText('Test Product 2').closest('tr');
      expect(product2Row).toHaveTextContent('0'); // Previously received column
      expect(product2Row).toHaveTextContent('Max: 5 remaining');
    });

    it('updates total received correctly when receiving items', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} existingReceipts={mockExistingReceipts} />);

      const product1Input = screen.getAllByDisplayValue('0')[0]; // First input for Product 1
      await user.clear(product1Input);
      await user.type(product1Input, '3');

      const product1Row = screen.getByText('Test Product 1').closest('tr');
      expect(product1Row).toHaveTextContent('8 / 10'); // 5 previously + 3 now = 8/10
    });
  });

  describe('Item Quantity Management', () => {
    it('allows changing received quantities', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      const firstInput = screen.getAllByDisplayValue('0')[0];
      await user.clear(firstInput);
      await user.type(firstInput, '5');

      expect(firstInput).toHaveValue(5);
    });

    it('uses plus/minus buttons to adjust quantities', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      const plusButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg') && btn.getAttribute('class')?.includes('p-1')
      );
      
      // Click plus button for first item
      await user.click(plusButtons[1]); // Second button should be the plus for first item
      
      const firstInput = screen.getAllByDisplayValue('1')[0];
      expect(firstInput).toHaveValue(1);
    });

    it('prevents receiving more than ordered quantity', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      const firstInput = screen.getAllByDisplayValue('0')[0];
      await user.clear(firstInput);
      await user.type(firstInput, '15'); // More than the 10 ordered

      await waitFor(() => {
        const errorText = screen.getByText('Cannot receive more than ordered quantity (10)');
        expect(errorText).toBeInTheDocument();
      });
    });

    it('prevents negative quantities', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      const firstInput = screen.getAllByDisplayValue('0')[0];
      await user.clear(firstInput);
      await user.type(firstInput, '-5');

      await waitFor(() => {
        const errorText = screen.getByText('Received quantity cannot be negative');
        expect(errorText).toBeInTheDocument();
      });
    });
  });

  describe('Condition Selection', () => {
    it('allows selecting item conditions', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      const conditionSelects = screen.getAllByDisplayValue('Good');
      await user.selectOptions(conditionSelects[0], 'damaged');

      expect(conditionSelects[0]).toHaveValue('damaged');
    });

    it('shows all condition options', () => {
      render(<ReceivingInterface {...defaultProps} />);

      const conditionSelects = screen.getAllByDisplayValue('Good');
      fireEvent.click(conditionSelects[0]);

      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Damaged')).toBeInTheDocument();
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });
  });

  describe('Bulk Actions', () => {
    it('receives all remaining items when "Receive All Remaining" is clicked', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} existingReceipts={mockExistingReceipts} />);

      await user.click(screen.getByText('Receive All Remaining'));

      // Product 1 should have 5 remaining (10 - 5 previously received)
      const product1Inputs = screen.getAllByDisplayValue('5');
      expect(product1Inputs.length).toBeGreaterThan(0);

      // Product 2 should have 5 remaining (all 5)
      const product2Inputs = screen.getAllByDisplayValue('5');
      expect(product2Inputs.length).toBeGreaterThan(0);
    });

    it('clears all quantities when "Clear All" is clicked', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      // First set some quantities
      const firstInput = screen.getAllByDisplayValue('0')[0];
      await user.clear(firstInput);
      await user.type(firstInput, '5');

      // Then clear all
      await user.click(screen.getByText('Clear All'));

      const allInputs = screen.getAllByDisplayValue('0');
      expect(allInputs.length).toBeGreaterThanOrEqual(2); // At least 2 product inputs should be 0
    });
  });

  describe('Notes Functionality', () => {
    it('allows adding notes', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      const notesTextarea = screen.getByPlaceholderText(/Add any notes about the received items/);
      await user.type(notesTextarea, 'Items arrived in good condition');

      expect(notesTextarea).toHaveValue('Items arrived in good condition');
    });
  });

  describe('Process Receipt', () => {
    it('shows validation errors when no items are selected for receipt', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      await user.click(screen.getByText('Process Receipt'));

      await waitFor(() => {
        expect(screen.getByText('At least one item must have a received quantity greater than 0')).toBeInTheDocument();
      });
    });

    it('disables process button when no modifications are made', () => {
      render(<ReceivingInterface {...defaultProps} />);

      const processButton = screen.getByText('Process Receipt');
      expect(processButton).toBeDisabled();
    });

    it('enables process button when items are modified', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      const firstInput = screen.getAllByDisplayValue('0')[0];
      await user.clear(firstInput);
      await user.type(firstInput, '5');

      const processButton = screen.getByText('Process Receipt');
      expect(processButton).not.toBeDisabled();
    });

    it('shows confirmation dialog when processing receipt', async () => {
      const user = userEvent.setup();
      render(<ReceivingInterface {...defaultProps} />);

      // Set some quantities
      const firstInput = screen.getAllByDisplayValue('0')[0];
      await user.clear(firstInput);
      await user.type(firstInput, '5');

      await user.click(screen.getByText('Process Receipt'));

      await waitFor(() => {
        expect(screen.getByText('Confirm Receipt Processing')).toBeInTheDocument();
        expect(screen.getByText(/You are about to process the receipt of 1 items/)).toBeInTheDocument();
      });
    });

    it('calls processReceipt service when confirmed', async () => {
      const user = userEvent.setup();
      mockReceivingServiceInstance.processReceipt.mockResolvedValue({
        success: true,
        receivingRecord: {
          id: 'receipt123',
          receivedDate: new Date(),
          receivedBy: 'user123',
          items: [],
          totalItems: 1,
          totalQuantity: 5
        }
      });

      render(<ReceivingInterface {...defaultProps} />);

      // Set some quantities
      const firstInput = screen.getAllByDisplayValue('0')[0];
      await user.clear(firstInput);
      await user.type(firstInput, '5');

      await user.click(screen.getByText('Process Receipt'));
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Receipt Processing')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Confirm Receipt'));

      await waitFor(() => {
        expect(mockReceivingServiceInstance.processReceipt).toHaveBeenCalledWith(
          'po123',
          expect.arrayContaining([
            expect.objectContaining({
              productId: 'product1',
              receivedQuantity: 5
            })
          ]),
          'user123',
          ''
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form inputs', () => {
      render(<ReceivingInterface {...defaultProps} />);

      expect(screen.getByLabelText(/Receiving Notes/)).toBeInTheDocument();
    });

    it('provides proper button labels', () => {
      render(<ReceivingInterface {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Receive All Remaining/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clear All/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Process Receipt/ })).toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('shows current user information', () => {
      render(<ReceivingInterface {...defaultProps} />);

      expect(screen.getByText('Receiving as: test@example.com')).toBeInTheDocument();
    });

    it('handles missing user information', () => {
      mockUseSupabaseAuthStore.mockReturnValue({
        user: null,
        userRole: null,
        isAuthenticated: false
      } as any);

      render(<ReceivingInterface {...defaultProps} />);

      expect(screen.getByText('Receiving as: Unknown User')).toBeInTheDocument();
    });
  });
});