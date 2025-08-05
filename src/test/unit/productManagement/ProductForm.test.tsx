import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductForm from '../../../components/inventory/ProductForm';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { useBusinessStore } from '../../../store/businessStore';

// Mock the business store
vi.mock('../../../store/businessStore');

describe('ProductForm Component', () => {
  const mockOnClose = vi.fn();
  const mockAddProduct = vi.fn();
  const mockUpdateProduct = vi.fn();
  const mockGetProduct = vi.fn();
  
  const mockStoreState = {
    products: [],
    categories: [],
    addProduct: mockAddProduct,
    updateProduct: mockUpdateProduct,
    getProduct: mockGetProduct
  };

  beforeEach(async () => {
    await setupTestEnvironment({
      mockDatabase: true,
      loadTestData: true,
      testDataScale: 'small'
    });

    // Reset all mocks
    vi.clearAllMocks();
    mockOnClose.mockClear();
    mockAddProduct.mockClear();
    mockUpdateProduct.mockClear();
    mockGetProduct.mockClear();

    // Setup mock store
    (useBusinessStore as any).mockReturnValue(mockStoreState);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Form Rendering', () => {
    it('should render add product form correctly', () => {
      render(<ProductForm onClose={mockOnClose} />);
      
      expect(screen.getByText('Add New Product')).toBeInTheDocument();
      expect(screen.getByLabelText(/Product Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/SKU/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cost Price/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Selling Price/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Current Stock/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Minimum Stock/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Product/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    });

    it('should render edit product form correctly', () => {
      const testProduct = TestDataFactory.createProduct({
        id: 'test-product-1',
        name: 'Test Product',
        sku: 'TEST-001'
      });
      
      mockGetProduct.mockReturnValue(testProduct);
      
      render(<ProductForm productId="test-product-1" onClose={mockOnClose} />);
      
      expect(screen.getByText('Edit Product')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update Product/ })).toBeInTheDocument();
    });

    it('should populate form fields when editing existing product', () => {
      const testProduct = TestDataFactory.createProduct({
        id: 'test-product-1',
        name: 'Test Product',
        sku: 'TEST-001',
        description: 'Test Description',
        price: 100,
        cost: 60,
        stock: 50,
        minStock: 10,
        unit: 'piece'
      });
      
      mockGetProduct.mockReturnValue(testProduct);
      
      render(<ProductForm productId="test-product-1" onClose={mockOnClose} />);
      
      expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('TEST-001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('60')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Product name is required')).toBeInTheDocument();
        expect(screen.getByText('SKU is required')).toBeInTheDocument();
        expect(screen.getByText('Category is required')).toBeInTheDocument();
        expect(screen.getByText('Valid price is required')).toBeInTheDocument();
        expect(screen.getByText('Valid cost is required')).toBeInTheDocument();
        expect(screen.getByText('Valid stock quantity is required')).toBeInTheDocument();
        expect(screen.getByText('Valid minimum stock is required')).toBeInTheDocument();
      });
      
      expect(mockAddProduct).not.toHaveBeenCalled();
    });

    it('should validate price is greater than zero', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const priceInput = screen.getByLabelText(/Selling Price/);
      await user.type(priceInput, '0');
      
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Valid price is required')).toBeInTheDocument();
      });
    });

    it('should validate cost is greater than zero', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const costInput = screen.getByLabelText(/Cost Price/);
      await user.type(costInput, '-10');
      
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Valid cost is required')).toBeInTheDocument();
      });
    });

    it('should validate stock is not negative', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const stockInput = screen.getByLabelText(/Current Stock/);
      await user.type(stockInput, '-5');
      
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Valid stock quantity is required')).toBeInTheDocument();
      });
    });

    it('should validate minimum stock is not negative', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const minStockInput = screen.getByLabelText(/Minimum Stock/);
      await user.type(minStockInput, '-1');
      
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Valid minimum stock is required')).toBeInTheDocument();
      });
    });

    it('should validate SKU uniqueness for new products', async () => {
      const user = userEvent.setup();
      const existingProducts = [
        TestDataFactory.createProduct({ sku: 'EXISTING-SKU' })
      ];
      
      mockStoreState.products = existingProducts;
      
      render(<ProductForm onClose={mockOnClose} />);
      
      const skuInput = screen.getByLabelText(/SKU/);
      await user.type(skuInput, 'EXISTING-SKU');
      
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('SKU already exists')).toBeInTheDocument();
      });
    });

    it('should allow same SKU when editing existing product', async () => {
      const user = userEvent.setup();
      const testProduct = TestDataFactory.createProduct({
        id: 'test-product-1',
        sku: 'TEST-SKU'
      });
      
      mockStoreState.products = [testProduct];
      mockGetProduct.mockReturnValue(testProduct);
      
      render(<ProductForm productId="test-product-1" onClose={mockOnClose} />);
      
      // Fill required fields
      await user.type(screen.getByLabelText(/Product Name/), 'Updated Product');
      await user.selectOptions(screen.getByLabelText(/Category/), 'category-1');
      await user.type(screen.getByLabelText(/Cost Price/), '50');
      await user.type(screen.getByLabelText(/Selling Price/), '100');
      await user.type(screen.getByLabelText(/Current Stock/), '20');
      await user.type(screen.getByLabelText(/Minimum Stock/), '5');
      
      const submitButton = screen.getByRole('button', { name: /Update Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('SKU already exists')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call addProduct with correct data for new product', async () => {
      const user = userEvent.setup();
      const categories = [TestDataFactory.createCategory({ id: 'cat-1', name: 'Electronics' })];
      mockStoreState.categories = categories;
      
      render(<ProductForm onClose={mockOnClose} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/Product Name/), 'New Product');
      await user.type(screen.getByLabelText(/Description/), 'Product description');
      await user.type(screen.getByLabelText(/SKU/), 'NEW-001');
      await user.type(screen.getByLabelText(/Barcode/), '1234567890');
      await user.selectOptions(screen.getByLabelText(/Category/), 'cat-1');
      await user.selectOptions(screen.getByLabelText(/Unit/), 'pack');
      await user.type(screen.getByLabelText(/Cost Price/), '60');
      await user.type(screen.getByLabelText(/Selling Price/), '100');
      await user.type(screen.getByLabelText(/Current Stock/), '50');
      await user.type(screen.getByLabelText(/Minimum Stock/), '10');
      
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAddProduct).toHaveBeenCalledWith({
          name: 'New Product',
          description: 'Product description',
          sku: 'NEW-001',
          barcode: '1234567890',
          category: 'cat-1',
          categoryId: 'cat-1',
          price: 100,
          cost: 60,
          stock: 50,
          minStock: 10,
          unit: 'pack',
          isActive: true,
          tags: [],
          images: []
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should call updateProduct with correct data for existing product', async () => {
      const user = userEvent.setup();
      const testProduct = TestDataFactory.createProduct({
        id: 'test-product-1',
        name: 'Original Product',
        sku: 'ORIG-001'
      });
      
      mockGetProduct.mockReturnValue(testProduct);
      
      render(<ProductForm productId="test-product-1" onClose={mockOnClose} />);
      
      // Update name
      const nameInput = screen.getByLabelText(/Product Name/);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Product');
      
      const submitButton = screen.getByRole('button', { name: /Update Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUpdateProduct).toHaveBeenCalledWith('test-product-1', expect.objectContaining({
          name: 'Updated Product'
        }));
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle optional fields correctly', async () => {
      const user = userEvent.setup();
      const categories = [TestDataFactory.createCategory({ id: 'cat-1', name: 'Electronics' })];
      mockStoreState.categories = categories;
      
      render(<ProductForm onClose={mockOnClose} />);
      
      // Fill only required fields
      await user.type(screen.getByLabelText(/Product Name/), 'Minimal Product');
      await user.type(screen.getByLabelText(/SKU/), 'MIN-001');
      await user.selectOptions(screen.getByLabelText(/Category/), 'cat-1');
      await user.type(screen.getByLabelText(/Cost Price/), '30');
      await user.type(screen.getByLabelText(/Selling Price/), '50');
      await user.type(screen.getByLabelText(/Current Stock/), '25');
      await user.type(screen.getByLabelText(/Minimum Stock/), '5');
      
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockAddProduct).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Minimal Product',
          description: undefined,
          barcode: undefined
        }));
      });
    });
  });

  describe('Profit Margin Calculation', () => {
    it('should display profit margin when both cost and price are entered', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const costInput = screen.getByLabelText(/Cost Price/);
      const priceInput = screen.getByLabelText(/Selling Price/);
      
      await user.type(costInput, '60');
      await user.type(priceInput, '100');
      
      await waitFor(() => {
        expect(screen.getByText(/Profit Margin:/)).toBeInTheDocument();
        expect(screen.getByText(/₱40.00/)).toBeInTheDocument();
        expect(screen.getByText(/66.7%/)).toBeInTheDocument();
      });
    });

    it('should update profit margin when values change', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const costInput = screen.getByLabelText(/Cost Price/);
      const priceInput = screen.getByLabelText(/Selling Price/);
      
      await user.type(costInput, '50');
      await user.type(priceInput, '75');
      
      await waitFor(() => {
        expect(screen.getByText(/₱25.00/)).toBeInTheDocument();
        expect(screen.getByText(/50.0%/)).toBeInTheDocument();
      });
      
      // Update price
      await user.clear(priceInput);
      await user.type(priceInput, '100');
      
      await waitFor(() => {
        expect(screen.getByText(/₱50.00/)).toBeInTheDocument();
        expect(screen.getByText(/100.0%/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Product name is required')).toBeInTheDocument();
      });
      
      // Start typing in name field
      const nameInput = screen.getByLabelText(/Product Name/);
      await user.type(nameInput, 'T');
      
      await waitFor(() => {
        expect(screen.queryByText('Product name is required')).not.toBeInTheDocument();
      });
    });

    it('should handle missing product when editing', () => {
      mockGetProduct.mockReturnValue(undefined);
      
      render(<ProductForm productId="non-existent" onClose={mockOnClose} />);
      
      // Form should still render but with empty fields
      expect(screen.getByText('Edit Product')).toBeInTheDocument();
      expect(screen.getByLabelText(/Product Name/)).toHaveValue('');
    });
  });

  describe('User Interactions', () => {
    it('should close form when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close form when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should prevent form submission on Enter key in input fields', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const nameInput = screen.getByLabelText(/Product Name/);
      await user.type(nameInput, 'Test Product{enter}');
      
      // Form should not be submitted (no validation errors should appear)
      expect(screen.queryByText('SKU is required')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ProductForm onClose={mockOnClose} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/Product Name/)).toHaveAttribute('required');
      expect(screen.getByLabelText(/SKU/)).toHaveAttribute('required');
      expect(screen.getByLabelText(/Category/)).toHaveAttribute('required');
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      render(<ProductForm onClose={mockOnClose} />);
      
      const submitButton = screen.getByRole('button', { name: /Add Product/ });
      await user.click(submitButton);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/Product Name/);
        const errorMessage = screen.getByText('Product name is required');
        
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });
});