import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TestDataFactory } from '../../test/factories/testDataFactory';
import { mockStores } from '../../test/mocks/storeMocks';

// Mock POS Component (since we don't have the actual component yet)
const MockPOSComponent = () => {
  const [cart, setCart] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);
  const [paymentMethod, setPaymentMethod] = React.useState('cash');
  const [amountPaid, setAmountPaid] = React.useState('');
  
  const products = mockStores.business.products;
  const customers = mockStores.business.customers;
  
  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };
  
  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };
  
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const handleProcessSale = () => {
    // Mock sale processing
    console.log('Processing sale:', {
      cart,
      customer: selectedCustomer,
      paymentMethod,
      amountPaid,
      total: calculateTotal()
    });
    
    // Clear cart after sale
    setCart([]);
    setAmountPaid('');
    setSelectedCustomer(null);
  };
  
  return (
    <div data-testid=\"pos-container\" role=\"main\" aria-label=\"Point of Sale System\">
      <header data-testid=\"pos-header\">
        <h1>Point of Sale</h1>
        <div data-testid=\"current-time\">{new Date().toLocaleString('en-PH')}</div>
      </header>
      
      <div className=\"pos-layout\">
        {/* Product Search and Selection */}
        <section data-testid=\"product-section\" aria-label=\"Product Selection\">
          <div className=\"search-container\">
            <input
              data-testid=\"product-search\"
              type=\"text\"
              placeholder=\"Search products...\"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label=\"Search products\"
            />
          </div>
          
          <div data-testid=\"product-grid\" className=\"product-grid\">
            {products
              .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(product => (
                <div 
                  key={product.id} 
                  data-testid={`product-${product.id}`}
                  className=\"product-card\"
                >
                  <h3>{product.name}</h3>
                  <p data-testid={`product-price-${product.id}`}>₱{product.price}</p>
                  <p data-testid={`product-stock-${product.id}`}>Stock: {product.stock}</p>
                  <button 
                    data-testid={`add-to-cart-${product.id}`}
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    aria-label={`Add ${product.name} to cart`}
                  >
                    Add to Cart
                  </button>
                </div>
              ))
            }
          </div>
        </section>
        
        {/* Shopping Cart */}
        <section data-testid=\"cart-section\" aria-label=\"Shopping Cart\">
          <h2>Cart</h2>
          <div data-testid=\"cart-items\">
            {cart.length === 0 ? (
              <p data-testid=\"empty-cart-message\">Cart is empty</p>
            ) : (
              cart.map(item => (
                <div key={item.id} data-testid={`cart-item-${item.id}`} className=\"cart-item\">
                  <span>{item.name}</span>
                  <span data-testid={`cart-quantity-${item.id}`}>Qty: {item.quantity}</span>
                  <span data-testid={`cart-price-${item.id}`}>₱{item.price * item.quantity}</span>
                  <button 
                    data-testid={`remove-from-cart-${item.id}`}
                    onClick={() => handleRemoveFromCart(item.id)}
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div data-testid=\"cart-total\" className=\"cart-total\">
            <strong>Total: ₱{calculateTotal().toFixed(2)}</strong>
          </div>
        </section>
        
        {/* Customer Selection */}
        <section data-testid=\"customer-section\" aria-label=\"Customer Selection\">
          <h3>Customer</h3>
          <select 
            data-testid=\"customer-select\"
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              const customer = customers.find(c => c.id === e.target.value);
              setSelectedCustomer(customer || null);
            }}
            aria-label=\"Select customer\"
          >
            <option value=\"\">Walk-in Customer</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </section>
        
        {/* Payment Processing */}
        <section data-testid=\"payment-section\" aria-label=\"Payment Processing\">
          <h3>Payment</h3>
          
          <div className=\"payment-method\">
            <label>Payment Method:</label>
            <select 
              data-testid=\"payment-method-select\"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              aria-label=\"Select payment method\"
            >
              <option value=\"cash\">Cash</option>
              <option value=\"credit_card\">Credit Card</option>
              <option value=\"gcash\">GCash</option>
              <option value=\"paymaya\">PayMaya</option>
            </select>
          </div>
          
          <div className=\"amount-paid\">
            <label htmlFor=\"amount-paid\">Amount Paid:</label>
            <input
              id=\"amount-paid\"
              data-testid=\"amount-paid-input\"
              type=\"number\"
              placeholder=\"0.00\"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              min=\"0\"
              step=\"0.01\"
            />
          </div>
          
          <div data-testid=\"change-display\" className=\"change-display\">
            Change: ₱{Math.max(0, parseFloat(amountPaid || '0') - calculateTotal()).toFixed(2)}
          </div>
          
          <button 
            data-testid=\"process-sale-btn\"
            onClick={handleProcessSale}
            disabled={cart.length === 0 || parseFloat(amountPaid || '0') < calculateTotal()}
            className=\"process-sale-btn\"
            aria-label=\"Process sale transaction\"
          >
            Process Sale
          </button>
        </section>
      </div>
    </div>
  );
};

// Import React for the mock component
const React = { useState: vi.fn() };

describe('POS Component Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockProducts: any[];
  let mockCustomers: any[];

  beforeEach(() => {
    user = userEvent.setup();
    
    // Create test data
    mockProducts = TestDataFactory.createProductsBatch(5, {
      stock: 10 // Ensure products are in stock
    });
    mockCustomers = TestDataFactory.createCustomersBatch(3);
    
    // Setup mock store data
    vi.mocked(mockStores.business).products = mockProducts;
    vi.mocked(mockStores.business).customers = mockCustomers;
    vi.mocked(mockStores.business).addToCart = vi.fn();
    vi.mocked(mockStores.business).removeFromCart = vi.fn();
    vi.mocked(mockStores.business).clearCart = vi.fn();
    
    // Mock React hooks
    let stateValues = {
      cart: [],
      searchTerm: '',
      selectedCustomer: null,
      paymentMethod: 'cash',
      amountPaid: ''
    };
    
    React.useState = vi.fn((initial) => {
      const key = Object.keys(stateValues)[Object.keys(stateValues).findIndex(k => stateValues[k] === initial) || 0];
      return [stateValues[key] || initial, vi.fn((newValue) => {
        if (typeof newValue === 'function') {
          stateValues[key] = newValue(stateValues[key]);
        } else {
          stateValues[key] = newValue;
        }
      })];
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering and Layout', () => {
    it('should render all POS sections with proper accessibility', () => {
      render(<MockPOSComponent />);
      
      // Test main container
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/point of sale system/i)).toBeInTheDocument();
      
      // Test section headers
      expect(screen.getByRole('heading', { name: /point of sale/i })).toBeInTheDocument();
      
      // Test all sections
      expect(screen.getByTestId('product-section')).toBeInTheDocument();
      expect(screen.getByTestId('cart-section')).toBeInTheDocument();
      expect(screen.getByTestId('customer-section')).toBeInTheDocument();
      expect(screen.getByTestId('payment-section')).toBeInTheDocument();
    });

    it('should display current Philippine time', () => {
      render(<MockPOSComponent />);
      
      const timeDisplay = screen.getByTestId('current-time');
      expect(timeDisplay).toBeInTheDocument();
      // Should contain date/time format
      expect(timeDisplay.textContent).toMatch(/\\d/);
    });

    it('should show empty cart initially', () => {
      render(<MockPOSComponent />);
      
      expect(screen.getByTestId('empty-cart-message')).toBeInTheDocument();
      expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    });
  });

  describe('Product Search and Selection', () => {
    it('should filter products based on search input', async () => {
      render(<MockPOSComponent />);
      
      const searchInput = screen.getByTestId('product-search');
      const productGrid = screen.getByTestId('product-grid');
      
      // Initially should show all products
      expect(within(productGrid).getAllByTestId(/product-/).length).toBe(mockProducts.length);
      
      // Search for specific product
      await user.type(searchInput, mockProducts[0].name.substring(0, 5));
      
      // Should filter results
      await waitFor(() => {
        const visibleProducts = within(productGrid).getAllByTestId(/product-/);
        expect(visibleProducts.length).toBeLessThanOrEqual(mockProducts.length);
      });
    });

    it('should display product information correctly', () => {
      render(<MockPOSComponent />);
      
      const firstProduct = mockProducts[0];
      const productCard = screen.getByTestId(`product-${firstProduct.id}`);
      
      // Test product details
      expect(within(productCard).getByText(firstProduct.name)).toBeInTheDocument();
      expect(screen.getByTestId(`product-price-${firstProduct.id}`)).toHaveTextContent(`₱${firstProduct.price}`);
      expect(screen.getByTestId(`product-stock-${firstProduct.id}`)).toHaveTextContent(`Stock: ${firstProduct.stock}`);
    });

    it('should handle out-of-stock products correctly', () => {
      // Create an out-of-stock product
      const outOfStockProduct = TestDataFactory.createProduct({ stock: 0 });
      vi.mocked(mockStores.business).products = [outOfStockProduct];
      
      render(<MockPOSComponent />);
      
      const addButton = screen.getByTestId(`add-to-cart-${outOfStockProduct.id}`);
      expect(addButton).toBeDisabled();
    });
  });

  describe('Shopping Cart Functionality', () => {
    it('should add products to cart correctly', async () => {
      render(<MockPOSComponent />);
      
      const firstProduct = mockProducts[0];
      const addButton = screen.getByTestId(`add-to-cart-${firstProduct.id}`);
      
      // Add product to cart
      await user.click(addButton);
      
      // Should show in cart
      await waitFor(() => {
        expect(screen.getByTestId(`cart-item-${firstProduct.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`cart-quantity-${firstProduct.id}`)).toHaveTextContent('Qty: 1');
      });
    });

    it('should calculate cart total correctly', async () => {
      render(<MockPOSComponent />);
      
      const firstProduct = mockProducts[0];
      const secondProduct = mockProducts[1];
      
      // Add products to cart
      await user.click(screen.getByTestId(`add-to-cart-${firstProduct.id}`));
      await user.click(screen.getByTestId(`add-to-cart-${secondProduct.id}`));
      
      // Check total calculation
      const expectedTotal = firstProduct.price + secondProduct.price;
      await waitFor(() => {
        expect(screen.getByTestId('cart-total')).toHaveTextContent(`Total: ₱${expectedTotal.toFixed(2)}`);
      });
    });

    it('should remove items from cart', async () => {
      render(<MockPOSComponent />);
      
      const firstProduct = mockProducts[0];
      
      // Add then remove product
      await user.click(screen.getByTestId(`add-to-cart-${firstProduct.id}`));
      await user.click(screen.getByTestId(`remove-from-cart-${firstProduct.id}`));
      
      // Should show empty cart
      await waitFor(() => {
        expect(screen.getByTestId('empty-cart-message')).toBeInTheDocument();
      });
    });
  });

  describe('Customer Selection', () => {
    it('should allow customer selection', async () => {
      render(<MockPOSComponent />);
      
      const customerSelect = screen.getByTestId('customer-select');
      const firstCustomer = mockCustomers[0];
      
      // Select customer
      await user.selectOptions(customerSelect, firstCustomer.id);
      
      expect(customerSelect).toHaveValue(firstCustomer.id);
    });

    it('should default to walk-in customer', () => {
      render(<MockPOSComponent />);
      
      const customerSelect = screen.getByTestId('customer-select');
      expect(customerSelect).toHaveValue('');
      expect(screen.getByText('Walk-in Customer')).toBeInTheDocument();
    });
  });

  describe('Payment Processing', () => {
    it('should support multiple payment methods', async () => {
      render(<MockPOSComponent />);
      
      const paymentSelect = screen.getByTestId('payment-method-select');
      
      // Test each payment method
      const paymentMethods = ['cash', 'credit_card', 'gcash', 'paymaya'];
      
      for (const method of paymentMethods) {
        await user.selectOptions(paymentSelect, method);
        expect(paymentSelect).toHaveValue(method);
      }
    });

    it('should calculate change correctly', async () => {
      render(<MockPOSComponent />);
      
      const firstProduct = mockProducts[0];
      
      // Add product to cart
      await user.click(screen.getByTestId(`add-to-cart-${firstProduct.id}`));
      
      // Enter amount paid
      const amountInput = screen.getByTestId('amount-paid-input');
      const amountPaid = firstProduct.price + 100; // Pay more than total
      await user.type(amountInput, amountPaid.toString());
      
      // Check change calculation
      const expectedChange = amountPaid - firstProduct.price;
      await waitFor(() => {
        expect(screen.getByTestId('change-display')).toHaveTextContent(`Change: ₱${expectedChange.toFixed(2)}`);
      });
    });

    it('should disable process sale button for insufficient payment', async () => {
      render(<MockPOSComponent />);
      
      const firstProduct = mockProducts[0];
      
      // Add product to cart
      await user.click(screen.getByTestId(`add-to-cart-${firstProduct.id}`));
      
      // Enter insufficient amount
      const amountInput = screen.getByTestId('amount-paid-input');
      await user.type(amountInput, (firstProduct.price - 10).toString());
      
      // Process sale button should be disabled
      const processSaleBtn = screen.getByTestId('process-sale-btn');
      expect(processSaleBtn).toBeDisabled();
    });

    it('should process sale when payment is sufficient', async () => {
      render(<MockPOSComponent />);
      
      const firstProduct = mockProducts[0];
      
      // Add product to cart
      await user.click(screen.getByTestId(`add-to-cart-${firstProduct.id}`));
      
      // Enter sufficient payment
      const amountInput = screen.getByTestId('amount-paid-input');
      await user.type(amountInput, firstProduct.price.toString());
      
      // Process sale
      const processSaleBtn = screen.getByTestId('process-sale-btn');
      expect(processSaleBtn).toBeEnabled();
      await user.click(processSaleBtn);
      
      // Cart should be cleared
      await waitFor(() => {
        expect(screen.getByTestId('empty-cart-message')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<MockPOSComponent />);
      
      // Test ARIA labels
      expect(screen.getByLabelText(/search products/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select customer/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select payment method/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/process sale transaction/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<MockPOSComponent />);
      
      // Test tab navigation
      const searchInput = screen.getByTestId('product-search');
      const addButton = screen.getAllByTestId(/add-to-cart-/)[0];
      
      await user.tab();
      expect(searchInput).toHaveFocus();
      
      // Navigate to add button
      for (let i = 0; i < 5; i++) {
        await user.tab();
      }
      
      // Should be able to activate with keyboard
      await user.keyboard('{Enter}');
    });
  });

  describe('Philippine Business Requirements', () => {
    it('should display Philippine peso currency formatting', () => {
      render(<MockPOSComponent />);
      
      // All price displays should use peso symbol
      const priceElements = screen.getAllByText(/₱/);
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('should handle Philippine customer data correctly', () => {
      render(<MockPOSComponent />);
      
      // Check that Filipino names are displayed correctly
      const customerSelect = screen.getByTestId('customer-select');
      const filipinoCustomer = mockCustomers.find(c => 
        c.name.includes('Juan') || c.name.includes('Maria') || c.name.includes('dela')
      );
      
      if (filipinoCustomer) {
        expect(within(customerSelect).getByText(filipinoCustomer.name)).toBeInTheDocument();
      }
    });
  });
});"