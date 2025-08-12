import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReceivingModule } from './ReceivingModule';
import { useReceivingStore } from '../../store/receivingStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';

// Mock the stores
vi.mock('../../store/receivingStore');
vi.mock('../../store/supabaseAuthStore');

describe('ReceivingModule', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock the store state and actions
    (useReceivingStore as any).mockReturnValue({
      loading: false,
      error: null,
      products: [],
      receiveStock: vi.fn(),
      searchProducts: vi.fn(),
    });

    (useSupabaseAuthStore as any).mockReturnValue({
      user: { id: 'test-user-id' },
    });
  });

  it('should render the component correctly', () => {
    render(<ReceivingModule />);

    expect(screen.getByText('Receiving')).toBeInTheDocument();
    expect(screen.getByLabelText('Search Product')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Receive Items')).toBeInTheDocument();
  });

  it('should call searchProducts when the search input changes', async () => {
    const searchProducts = vi.fn();
    (useReceivingStore as any).mockReturnValueOnce({
      ...useReceivingStore(),
      searchProducts,
    });

    render(<ReceivingModule />);

    const searchInput = screen.getByLabelText('Search Product');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(searchProducts).toHaveBeenCalledWith('test');
    });
  });

  it('should call receiveStock when the form is submitted', async () => {
    const receiveStock = vi.fn();
    const products = [
      {
        id: 'prod-1',
        name: 'Product 1',
        stock: 10,
      },
    ];
    (useReceivingStore as any).mockReturnValueOnce({
      ...useReceivingStore(),
      products,
      receiveStock,
    });

    render(<ReceivingModule />);

    // Select a product
    const searchInput = screen.getByLabelText('Search Product');
    fireEvent.change(searchInput, { target: { value: 'prod' } });

    await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Product 1'));

    // Set the quantity
    const quantityInput = screen.getByLabelText('Quantity');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    // Submit the form
    const submitButton = screen.getByText('Receive Items');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(receiveStock).toHaveBeenCalledWith('prod-1', 5, 'test-user-id');
    });
  });
});
