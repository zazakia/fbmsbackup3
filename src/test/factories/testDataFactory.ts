import { 
  Product, 
  Category, 
  Sale, 
  SaleItem, 
  PurchaseOrder, 
  PurchaseOrderItem,
  StockMovement, 
  InventoryLocation, 
  StockTransfer,
  StockAlert,
  Customer,
  Supplier,
  Employee,
  PayrollEntry
} from '../../types/business';

export interface InventoryTestData {
  products: Product[];
  categories: Category[];
  locations: InventoryLocation[];
  stockMovements: StockMovement[];
  transfers: StockTransfer[];
  alerts: StockAlert[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchaseOrders: PurchaseOrder[];
}

export class TestDataFactory {
  private static idCounter = 1;

  private static generateId(): string {
    return `test-${this.idCounter++}-${Date.now()}`;
  }

  private static generateSKU(): string {
    return `SKU-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }

  private static generateInvoiceNumber(): string {
    return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  private static generatePONumber(): string {
    return `PO-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  static createCategory(overrides: Partial<Category> = {}): Category {
    const categories = [
      'Electronics', 'Clothing', 'Food & Beverages', 'Home & Garden', 
      'Health & Beauty', 'Sports & Outdoors', 'Books & Media', 'Toys & Games'
    ];
    
    return {
      id: this.generateId(),
      name: categories[Math.floor(Math.random() * categories.length)],
      description: 'Test category description',
      isActive: true,
      createdAt: new Date(),
      ...overrides
    };
  }

  static createProduct(overrides: Partial<Product> = {}): Product {
    const productNames = [
      'Samsung Galaxy Phone', 'Apple iPhone', 'Nike Running Shoes', 'Adidas T-Shirt',
      'Coca Cola 1L', 'Pepsi 500ml', 'Laptop Computer', 'Wireless Mouse',
      'Coffee Beans 250g', 'Green Tea Bags', 'Vitamin C Tablets', 'Face Mask'
    ];

    const units = ['pcs', 'kg', 'liter', 'box', 'pack', 'bottle'];
    const categories = ['electronics', 'clothing', 'food', 'health'];
    
    const basePrice = Math.floor(Math.random() * 10000) + 100;
    const baseCost = Math.floor(basePrice * 0.6);
    const baseStock = Math.floor(Math.random() * 1000) + 10;

    return {
      id: this.generateId(),
      name: productNames[Math.floor(Math.random() * productNames.length)],
      description: 'Test product description',
      sku: this.generateSKU(),
      barcode: Math.random().toString().substr(2, 12),
      category: categories[Math.floor(Math.random() * categories.length)],
      categoryId: this.generateId(),
      price: basePrice,
      cost: baseCost,
      stock: baseStock,
      minStock: Math.floor(baseStock * 0.2),
      reorderQuantity: Math.floor(baseStock * 0.5),
      unit: units[Math.floor(Math.random() * units.length)],
      isActive: true,
      expiryDate: Math.random() > 0.7 ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined,
      manufacturingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      batchNumber: `BATCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      soldQuantity: Math.floor(Math.random() * 100),
      weight: Math.random() * 10,
      dimensions: {
        length: Math.random() * 100,
        width: Math.random() * 100,
        height: Math.random() * 100
      },
      supplier: 'Test Supplier',
      location: 'Main Warehouse',
      tags: ['test', 'inventory'],
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createInventoryLocation(overrides: Partial<InventoryLocation> = {}): InventoryLocation {
    const locationNames = [
      'Main Warehouse', 'Store Front', 'Back Storage', 'Display Area',
      'Cold Storage', 'Dry Storage', 'Electronics Section', 'Clothing Section'
    ];

    const locationTypes: Array<'warehouse' | 'store' | 'display' | 'storage'> = 
      ['warehouse', 'store', 'display', 'storage'];

    return {
      id: this.generateId(),
      name: locationNames[Math.floor(Math.random() * locationNames.length)],
      description: 'Test location description',
      type: locationTypes[Math.floor(Math.random() * locationTypes.length)],
      address: '123 Test Street, Test City, Philippines',
      isActive: true,
      createdAt: new Date(),
      ...overrides
    };
  }

  static createStockMovement(overrides: Partial<StockMovement> = {}): StockMovement {
    const movementTypes: Array<'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'return'> = 
      ['stock_in', 'stock_out', 'adjustment', 'transfer', 'return'];

    const reasons = [
      'Purchase receipt', 'Sale transaction', 'Stock adjustment', 
      'Location transfer', 'Customer return', 'Damaged goods',
      'Expired products', 'Physical count adjustment'
    ];

    return {
      id: this.generateId(),
      productId: this.generateId(),
      type: movementTypes[Math.floor(Math.random() * movementTypes.length)],
      quantity: Math.floor(Math.random() * 100) + 1,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      performedBy: 'test-user',
      batchNumber: `BATCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      cost: Math.floor(Math.random() * 1000) + 10,
      referenceId: this.generateId(),
      notes: 'Test stock movement',
      createdAt: new Date(),
      ...overrides
    };
  }

  static createStockTransfer(overrides: Partial<StockTransfer> = {}): StockTransfer {
    const statuses: Array<'pending' | 'in_transit' | 'received' | 'cancelled'> = 
      ['pending', 'in_transit', 'received', 'cancelled'];

    return {
      id: this.generateId(),
      fromLocationId: this.generateId(),
      toLocationId: this.generateId(),
      items: [
        {
          productId: this.generateId(),
          quantity: Math.floor(Math.random() * 50) + 1,
          batchNumber: `BATCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        }
      ],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      transferDate: new Date(),
      receivedDate: Math.random() > 0.5 ? new Date() : undefined,
      transferredBy: 'test-user',
      receivedBy: Math.random() > 0.5 ? 'test-receiver' : undefined,
      notes: 'Test stock transfer',
      createdAt: new Date(),
      ...overrides
    };
  }

  static createStockAlert(overrides: Partial<StockAlert> = {}): StockAlert {
    const alertTypes: Array<'low_stock' | 'out_of_stock' | 'expiring' | 'expired'> = 
      ['low_stock', 'out_of_stock', 'expiring', 'expired'];

    const severities: Array<'low' | 'medium' | 'high' | 'critical'> = 
      ['low', 'medium', 'high', 'critical'];

    const productName = 'Test Product';
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    
    const messages = {
      low_stock: `${productName} is running low (below minimum stock level)`,
      out_of_stock: `${productName} is out of stock`,
      expiring: `${productName} is expiring soon`,
      expired: `${productName} has expired`
    };

    return {
      id: this.generateId(),
      type: alertType,
      productId: this.generateId(),
      productName,
      message: messages[alertType],
      severity: severities[Math.floor(Math.random() * severities.length)],
      isRead: Math.random() > 0.5,
      createdAt: new Date(),
      ...overrides
    };
  }

  static createCustomer(overrides: Partial<Customer> = {}): Customer {
    const firstNames = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Carmen', 'Luis', 'Rosa'];
    const lastNames = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Gonzales', 'Garcia', 'Torres', 'Flores'];
    const customerTypes: Array<'individual' | 'business' | 'vip' | 'wholesale'> = 
      ['individual', 'business', 'vip', 'wholesale'];

    return {
      id: this.generateId(),
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      email: `test${Math.random().toString(36).substr(2, 5)}@example.com`,
      phone: `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
      address: '123 Test Street',
      city: 'Manila',
      province: 'Metro Manila',
      zipCode: '1000',
      creditLimit: Math.floor(Math.random() * 100000),
      currentBalance: Math.floor(Math.random() * 50000),
      totalPurchases: Math.floor(Math.random() * 200000),
      isActive: true,
      customerType: customerTypes[Math.floor(Math.random() * customerTypes.length)],
      taxId: `TIN-${Math.random().toString().substr(2, 9)}`,
      businessName: Math.random() > 0.5 ? 'Test Business Corp' : undefined,
      birthday: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      notes: 'Test customer notes',
      tags: ['test', 'customer'],
      preferredPaymentMethod: 'cash',
      discountPercentage: Math.floor(Math.random() * 20),
      loyaltyPoints: Math.floor(Math.random() * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastPurchase: new Date(),
      lastContact: new Date(),
      ...overrides
    };
  }

  static createSupplier(overrides: Partial<Supplier> = {}): Supplier {
    const supplierNames = [
      'ABC Trading Corp', 'XYZ Supplies Inc', 'Global Import Export',
      'Local Distributor Co', 'Premium Goods Ltd', 'Quality Products Inc'
    ];

    return {
      id: this.generateId(),
      name: supplierNames[Math.floor(Math.random() * supplierNames.length)],
      contactPerson: 'Test Contact Person',
      email: `supplier${Math.random().toString(36).substr(2, 5)}@example.com`,
      phone: `02${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      address: '456 Supplier Street',
      city: 'Quezon City',
      province: 'Metro Manila',
      zipCode: '1100',
      isActive: true,
      createdAt: new Date(),
      ...overrides
    };
  }

  static createSale(overrides: Partial<Sale> = {}): Sale {
    const paymentMethods: Array<'cash' | 'gcash' | 'paymaya' | 'bank_transfer' | 'check' | 'credit_card'> = 
      ['cash', 'gcash', 'paymaya', 'bank_transfer', 'check', 'credit_card'];

    const paymentStatuses: Array<'pending' | 'paid' | 'partial' | 'refunded'> = 
      ['pending', 'paid', 'partial', 'refunded'];

    const saleStatuses: Array<'draft' | 'completed' | 'cancelled' | 'refunded'> = 
      ['draft', 'completed', 'cancelled', 'refunded'];

    const items = this.createSaleItems(Math.floor(Math.random() * 5) + 1);
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.12; // 12% VAT
    const discount = Math.floor(Math.random() * subtotal * 0.1);
    const total = subtotal + tax - discount;

    return {
      id: this.generateId(),
      invoiceNumber: this.generateInvoiceNumber(),
      customerId: Math.random() > 0.3 ? this.generateId() : undefined,
      customerName: Math.random() > 0.3 ? 'Test Customer' : undefined,
      items,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
      status: saleStatuses[Math.floor(Math.random() * saleStatuses.length)],
      cashierId: 'test-cashier',
      notes: 'Test sale transaction',
      createdAt: new Date(),
      ...overrides
    };
  }

  static createSaleItems(count: number = 3): SaleItem[] {
    const items: SaleItem[] = [];
    for (let i = 0; i < count; i++) {
      const quantity = Math.floor(Math.random() * 10) + 1;
      const price = Math.floor(Math.random() * 1000) + 50;
      items.push({
        id: this.generateId(),
        productId: this.generateId(),
        productName: `Test Product ${i + 1}`,
        sku: this.generateSKU(),
        quantity,
        price,
        total: quantity * price
      });
    }
    return items;
  }

  static createPurchaseOrder(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
    const statuses: Array<'draft' | 'sent' | 'received' | 'partial' | 'cancelled'> = 
      ['draft', 'sent', 'received', 'partial', 'cancelled'];

    const items = this.createPurchaseOrderItems(Math.floor(Math.random() * 5) + 1);
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.12; // 12% VAT
    const total = subtotal + tax;

    return {
      id: this.generateId(),
      poNumber: this.generatePONumber(),
      supplierId: this.generateId(),
      supplierName: 'Test Supplier',
      items,
      subtotal,
      tax,
      total,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      receivedDate: Math.random() > 0.5 ? new Date() : undefined,
      createdBy: 'test-user',
      createdAt: new Date(),
      ...overrides
    };
  }

  static createPurchaseOrderItems(count: number = 3): PurchaseOrderItem[] {
    const items: PurchaseOrderItem[] = [];
    for (let i = 0; i < count; i++) {
      const quantity = Math.floor(Math.random() * 100) + 10;
      const cost = Math.floor(Math.random() * 500) + 25;
      items.push({
        id: this.generateId(),
        productId: this.generateId(),
        productName: `Test Product ${i + 1}`,
        sku: this.generateSKU(),
        quantity,
        cost,
        total: quantity * cost
      });
    }
    return items;
  }

  static createBulkProducts(count: number): Product[] {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      products.push(this.createProduct({ name: `Bulk Product ${i + 1}` }));
    }
    return products;
  }

  static createRealisticInventoryData(): InventoryTestData {
    const categories = Array.from({ length: 8 }, () => this.createCategory());
    const locations = Array.from({ length: 5 }, () => this.createInventoryLocation());
    const products = Array.from({ length: 50 }, (_, i) => 
      this.createProduct({ 
        categoryId: categories[i % categories.length].id,
        category: categories[i % categories.length].name
      })
    );
    const stockMovements = Array.from({ length: 100 }, (_, i) => 
      this.createStockMovement({ 
        productId: products[i % products.length].id 
      })
    );
    const transfers = Array.from({ length: 20 }, () => this.createStockTransfer());
    const alerts = Array.from({ length: 15 }, (_, i) => 
      this.createStockAlert({ 
        productId: products[i % products.length].id,
        productName: products[i % products.length].name
      })
    );
    const customers = Array.from({ length: 30 }, () => this.createCustomer());
    const suppliers = Array.from({ length: 10 }, () => this.createSupplier());
    const sales = Array.from({ length: 25 }, () => this.createSale());
    const purchaseOrders = Array.from({ length: 15 }, (_, i) => 
      this.createPurchaseOrder({ 
        supplierId: suppliers[i % suppliers.length].id,
        supplierName: suppliers[i % suppliers.length].name
      })
    );

    return {
      products,
      categories,
      locations,
      stockMovements,
      transfers,
      alerts,
      customers,
      suppliers,
      sales,
      purchaseOrders
    };
  }

  // Performance test data generators
  static createLargeDataset(scale: 'small' | 'medium' | 'large' = 'medium'): InventoryTestData {
    const scales = {
      small: { products: 100, movements: 500, sales: 100 },
      medium: { products: 1000, movements: 5000, sales: 1000 },
      large: { products: 10000, movements: 50000, sales: 10000 }
    };

    const config = scales[scale];
    const categories = Array.from({ length: 20 }, () => this.createCategory());
    const locations = Array.from({ length: 10 }, () => this.createInventoryLocation());
    const products = Array.from({ length: config.products }, (_, i) => 
      this.createProduct({ 
        categoryId: categories[i % categories.length].id,
        category: categories[i % categories.length].name
      })
    );
    const stockMovements = Array.from({ length: config.movements }, (_, i) => 
      this.createStockMovement({ 
        productId: products[i % products.length].id 
      })
    );
    const sales = Array.from({ length: config.sales }, () => this.createSale());

    return {
      products,
      categories,
      locations,
      stockMovements,
      transfers: [],
      alerts: [],
      customers: [],
      suppliers: [],
      sales,
      purchaseOrders: []
    };
  }

  // Reset counter for consistent test runs
  static resetIdCounter(): void {
    this.idCounter = 1;
  }
}