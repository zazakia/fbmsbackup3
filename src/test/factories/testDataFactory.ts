import { 
  Product, 
  Category, 
  Sale, 
  SaleItem, 
  PurchaseOrder, 
  PurchaseOrderItem,
  PartialReceiptItem,
  EnhancedPurchaseOrder,
  StatusTransition,
  ReceivingRecord,
  ValidationError,
  StockMovement, 
  InventoryLocation, 
  StockTransfer,
  StockAlert,
  Customer,
  Supplier,
  Employee,
  PayrollEntry,
  User,
  PurchaseOrderAuditLog,
  PurchaseOrderAuditAction
} from '../../types/business';

import { vi } from 'vitest';

// Counter for unique IDs
let idCounter = 0;

export class TestDataFactory {
  static resetIdCounter() {
    idCounter = 0;
  }

  static getNextId(prefix: string = 'test'): string {
    return `${prefix}-${++idCounter}`;
  }

  // Philippine-specific data generators
  static generatePhilippineData() {
    const cities = [
      'Manila', 'Quezon City', 'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 
      'Mandaluyong', 'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay',
      'Pasig', 'San Juan', 'Taguig', 'Valenzuela', 'Cebu City', 'Davao City',
      'Iloilo City', 'Cagayan de Oro', 'General Santos', 'Zamboanga City'
    ];

    const provinces = [
      'Metro Manila', 'Cebu', 'Davao del Sur', 'Iloilo', 'Misamis Oriental',
      'South Cotabato', 'Zamboanga del Sur', 'Laguna', 'Cavite', 'Bulacan'
    ];

    const barangays = [
      'Poblacion', 'San Antonio', 'San Jose', 'Santa Maria', 'San Juan',
      'San Pedro', 'San Miguel', 'Santo Niño', 'Maligaya', 'Bagong Bayan'
    ];

    const firstNames = [
      'Juan', 'Maria', 'Jose', 'Ana', 'Antonio', 'Rosa', 'Manuel', 'Carmen',
      'Francisco', 'Luz', 'Ricardo', 'Elena', 'Carlos', 'Josefa', 'Ramon',
      'Teresa', 'Pedro', 'Esperanza', 'Angel', 'Remedios', 'Miguel', 'Corazon'
    ];

    const lastNames = [
      'dela Cruz', 'Garcia', 'Reyes', 'Ramos', 'Mendoza', 'Santos', 'Gonzalez',
      'Rodriguez', 'Hernandez', 'Perez', 'Martinez', 'Lopez', 'Gomez', 'Torres',
      'Ramirez', 'Flores', 'Rivera', 'Morales', 'Jimenez', 'Vargas', 'Castro'
    ];

    return {
      randomCity: () => cities[Math.floor(Math.random() * cities.length)],
      randomProvince: () => provinces[Math.floor(Math.random() * provinces.length)],
      randomBarangay: () => barangays[Math.floor(Math.random() * barangays.length)],
      randomFirstName: () => firstNames[Math.floor(Math.random() * firstNames.length)],
      randomLastName: () => lastNames[Math.floor(Math.random() * lastNames.length)],
      randomPhoneNumber: () => `+639${Math.floor(Math.random() * 900000000 + 100000000)}`,
      randomTIN: () => `${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-000`
    };
  }

  // Product data factory
  static createProduct(overrides: any = {}) {
    const ph = this.generatePhilippineData();
    const categories = ['Electronics', 'Groceries', 'Clothing', 'Hardware', 'Books', 'Health & Beauty'];
    const productNames = [
      'Samsung Galaxy Phone', 'Lucky Me Noodles', 'Barong Tagalog', 'Hammer',
      'Filipino Recipe Book', 'Pond\'s Facial Wash', 'San Miguel Beer',
      'Jollibee Burger', 'Nike Shoes', 'Bayong Bag'
    ];
    
    return {
      id: this.getNextId('prod'),
      name: productNames[Math.floor(Math.random() * productNames.length)],
      description: 'High quality product made in the Philippines',
      sku: `SKU-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      barcode: `${Math.floor(Math.random() * 9000000000000 + 1000000000000)}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      price: Math.floor(Math.random() * 5000 + 50), // PHP 50-5000
      cost: Math.floor(Math.random() * 2500 + 25), // PHP 25-2500
      stock: Math.floor(Math.random() * 100 + 1),
      min_stock: Math.floor(Math.random() * 10 + 1),
      unit: 'piece',
      is_active: true,
      location: 'main-warehouse',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  // Customer data factory
  static createCustomer(overrides: any = {}) {
    const ph = this.generatePhilippineData();
    const firstName = ph.randomFirstName();
    const lastName = ph.randomLastName();
    const city = ph.randomCity();
    const province = ph.randomProvince();
    const barangay = ph.randomBarangay();
    
    return {
      id: this.getNextId('cust'),
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(' ', '')}@email.com`,
      phone: ph.randomPhoneNumber(),
      address: `${Math.floor(Math.random() * 999 + 1)} ${barangay}, ${city}, ${province}`,
      tin: ph.randomTIN(),
      loyalty_points: Math.floor(Math.random() * 1000),
      customer_type: 'regular',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  // Sale data factory with BIR compliance
  static createSale(overrides: any = {}) {
    const vatRate = 0.12; // Philippine VAT rate
    const subtotal = Math.floor(Math.random() * 5000 + 100);
    const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
    const total = subtotal + vatAmount;
    
    return {
      id: this.getNextId('sale'),
      customer_id: this.getNextId('cust'),
      subtotal: subtotal,
      tax_amount: vatAmount,
      discount_amount: 0,
      total_amount: total,
      payment_method: ['cash', 'credit_card', 'gcash', 'paymaya'][Math.floor(Math.random() * 4)],
      status: 'completed',
      receipt_number: `OR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
      bir_receipt_number: `BIR-${Math.floor(Math.random() * 9000000 + 1000000)}`,
      cashier_id: this.getNextId('user'),
      transaction_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      ...overrides
    };
  }

  // Purchase Order data factory
  static createPurchaseOrder(overrides: any = {}) {
    return {
      id: this.getNextId('po'),
      supplier_id: this.getNextId('supplier'),
      po_number: `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: ['pending', 'approved', 'delivered', 'cancelled'][Math.floor(Math.random() * 4)],
      subtotal: Math.floor(Math.random() * 50000 + 1000),
      tax_amount: 0,
      total_amount: Math.floor(Math.random() * 50000 + 1000),
      notes: 'Standard purchase order for inventory replenishment',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  // Supplier data factory
  static createSupplier(overrides: any = {}) {
    const ph = this.generatePhilippineData();
    const companyNames = [
      'Manila Trading Co.', 'Cebu Suppliers Inc.', 'Davao Wholesale',
      'Philippine General Merchandise', 'Metro Manila Distributors',
      'Luzon Supply Chain', 'Visayas Trading Corp.', 'Mindanao Imports'
    ];
    
    return {
      id: this.getNextId('supplier'),
      name: companyNames[Math.floor(Math.random() * companyNames.length)],
      contact_person: `${ph.randomFirstName()} ${ph.randomLastName()}`,
      email: `orders@${companyNames[0].toLowerCase().replace(/[^a-z]/g, '')}.com.ph`,
      phone: ph.randomPhoneNumber(),
      address: `${Math.floor(Math.random() * 999 + 1)} Business District, ${ph.randomCity()}, ${ph.randomProvince()}`,
      tin: ph.randomTIN(),
      payment_terms: ['COD', 'Net 30', 'Net 15', '2/10 Net 30'][Math.floor(Math.random() * 4)],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  // User data factory
  static createUser(overrides: any = {}) {
    const ph = this.generatePhilippineData();
    const roles = ['admin', 'manager', 'cashier', 'inventory_clerk'];
    const firstName = ph.randomFirstName();
    const lastName = ph.randomLastName();
    
    return {
      id: this.getNextId('user'),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(' ', '')}@company.com`,
      name: `${firstName} ${lastName}`,
      role: roles[Math.floor(Math.random() * roles.length)],
      permissions: ['read', 'write'],
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  // Business Account data factory (for accounting)
  static createAccount(overrides: any = {}) {
    const accounts = [
      { code: '1000', name: 'Cash on Hand', type: 'asset' },
      { code: '1010', name: 'Cash in Bank', type: 'asset' },
      { code: '1200', name: 'Accounts Receivable', type: 'asset' },
      { code: '1300', name: 'Inventory', type: 'asset' },
      { code: '2000', name: 'Accounts Payable', type: 'liability' },
      { code: '2100', name: 'Accrued Expenses', type: 'liability' },
      { code: '3000', name: 'Owner\'s Equity', type: 'equity' },
      { code: '4000', name: 'Sales Revenue', type: 'revenue' },
      { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
      { code: '6000', name: 'Operating Expenses', type: 'expense' }
    ];
    
    const account = accounts[Math.floor(Math.random() * accounts.length)];
    
    return {
      id: this.getNextId('acc'),
      code: account.code,
      name: account.name,
      type: account.type,
      balance: Math.floor(Math.random() * 100000),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...account,
      ...overrides
    };
  }

  // BIR-compliant receipt data
  static createBIRReceipt(overrides: any = {}) {
    return {
      id: this.getNextId('receipt'),
      receipt_number: `OR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
      bir_permit_number: `FP-${Math.floor(Math.random() * 900000 + 100000)}-${new Date().getFullYear()}`,
      tin: '123-456-789-000',
      business_name: 'Sample Filipino Business Management System',
      business_address: 'Manila, Philippines',
      sale_id: this.getNextId('sale'),
      subtotal: Math.floor(Math.random() * 5000 + 100),
      vat_amount: 0,
      total_amount: 0,
      vat_exempt: false,
      senior_citizen_discount: false,
      pwd_discount: false,
      created_at: new Date().toISOString(),
      ...overrides
    };
  }

  // Batch data generators
  static createProductsBatch(count: number = 10, overrides: any = {}) {
    return Array.from({ length: count }, () => this.createProduct(overrides));
  }

  static createCustomersBatch(count: number = 10, overrides: any = {}) {
    return Array.from({ length: count }, () => this.createCustomer(overrides));
  }

  static createSalesBatch(count: number = 10, overrides: any = {}) {
    return Array.from({ length: count }, () => this.createSale(overrides));
  }

  static createUsersBatch(count: number = 5, overrides: any = {}) {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  // Complete business scenario generator
  static createBusinessScenario() {
    const products = this.createProductsBatch(20);
    const customers = this.createCustomersBatch(15);
    const suppliers = Array.from({ length: 5 }, () => this.createSupplier());
    const users = this.createUsersBatch(5);
    const accounts = Array.from({ length: 10 }, () => this.createAccount());
    const purchaseOrders = Array.from({ length: 8 }, () => this.createPurchaseOrder());
    const sales = this.createSalesBatch(25);
    
    return {
      products,
      customers,
      suppliers,
      users,
      accounts,
      purchaseOrders,
      sales,
      totalValue: sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    };
  }
}
