import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import POS from './POS';
import { useBusinessStore } from '../../store/businessStore';

// Mock the business store
vi.mock('../../store/businessStore', () => ({
  useBusinessStore: vi.fn()
}));

// Mock the formatCurrency utility
vi.mock('../../utils/formatters', () => ({
  formatCurrency: vi.fn((amount) => amount.toFixed(2))
}));

const mockProducts = [
  {
    id: '1',
    name: 'Test Product 1',
    price: 10.00,
    stock: 100,
    category: 'Test Category',
    unit: 'piece',
    sku: 'TEST001',
    cost: 5.00,
    categoryId: 'cat1',
    minStock: 10,
    isActive: true,
    tags: [],
    images: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Test Product 2',
    price: 15.00,
    stock: 50,
    category: 'Test Category',
    unit: 'piece',
    sku: 'TEST002',
    cost: 8.00,
    categoryId: 'cat1',
    minStock: 5,
    isActive: true,
    tags: [],
    images: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockCategories = [
  {
    id: 'cat1',
    name: 'Test Category',
    isActive: true,
    createdAt: new Date()
  }
];

const mockStore = {
  products: mockProducts,
  categories: mockCategories,
  createSale: vi.fn(),
  fetchProducts: vi.fn()
};

describe('POS Component', () => {
  beforeEach(() => {
    vi.mocked(useBusinessStore).mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders POS interface correctly', () => {
    const onBack = vi.fn();
    render(<POS onBack={onBack} />);

    // Check if main elements are present
    expect(screen.getByText('POS')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Test Category')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search product')).toBeInTheDocument();
  });

  it('displays products correctly', () => {
    const onBack = vi.fn();
    render(<POS onBack={onBack} />);

    // Check if products are displayed
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    expect(screen.getByText('₱ 10.00')).toBeInTheDocument();
    expect(screen.getByText('₱ 15.00')).toBeInTheDocument();
  });

  it('can add products to cart', () => {
    const onBack = vi.fn();
    render(<POS onBack={onBack} />);

    // Click on a product to add it to cart
    const product1 = screen.getByText('Test Product 1');
    fireEvent.click(product1);

    // Check if the cart counter updates
    expect(screen.getByText('1')).toBeInTheDocument(); // Cart item count
  });

  it('can navigate to receipt screen', () => {
    const onBack = vi.fn();
    render(<POS onBack={onBack} />);

    // Add a product to cart first
    const product1 = screen.getByText('Test Product 1');
    fireEvent.click(product1);

    // Click on the review button to go to receipt screen
    const reviewButton = screen.getByText('REVIEW');
    fireEvent.click(reviewButton);

    // Check if we're now on the receipt screen
    expect(screen.getByText('FBMS Business')).toBeInTheDocument();
    expect(screen.getByText('Receipt No.')).toBeInTheDocument();
  });

  it('can filter products by category', () => {
    const onBack = vi.fn();
    render(<POS onBack={onBack} />);

    // Click on a category
    const categoryButton = screen.getByText('Test Category');
    fireEvent.click(categoryButton);

    // Products should still be visible since they belong to this category
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
  });

  it('can search products', () => {
    const onBack = vi.fn();
    render(<POS onBack={onBack} />);

    // Search for a specific product
    const searchInput = screen.getByPlaceholderText('Search product');
    fireEvent.change(searchInput, { target: { value: 'Product 1' } });

    // Check if only matching product is shown
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<POS onBack={onBack} />);

    // Click the ArrowLeft icon element directly
    const arrowIcon = document.querySelector('.lucide-arrow-left');
    expect(arrowIcon).toBeInTheDocument();
    
    if (arrowIcon) {
      fireEvent.click(arrowIcon);
      expect(onBack).toHaveBeenCalledTimes(1);
    }
  });

  it('calculates total amount correctly', () => {
    const onBack = vi.fn();
    render(<POS onBack={onBack} />);

    // Add products to cart
    const product1 = screen.getByText('Test Product 1');
    const product2 = screen.getByText('Test Product 2');
    
    fireEvent.click(product1); // $10
    fireEvent.click(product2); // $15

    // Check if total is calculated correctly in the review section
    // Total should be $25.00
    expect(screen.getByText('25.00')).toBeInTheDocument();
  });
});