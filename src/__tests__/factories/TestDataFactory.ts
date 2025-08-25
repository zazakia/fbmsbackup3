import { faker } from '@faker-js/faker';
import {
  Product,
  Customer,
  Sale,
  SaleItem,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
  User,
  Account,
  JournalEntry,
  StockMovement,
  PayrollPeriod,
  Employee
} from '../../types/business';

export class TestDataFactory {
  private static sequenceCounters: Record<string, number> = {};

  private static getSequence(key: string): number {
    if (!this.sequenceCounters[key]) {
      this.sequenceCounters[key] = 0;
    }
    return ++this.sequenceCounters[key];
  }

  private static resetSequence(key?: string): void {
    if (key) {
      this.sequenceCounters[key] = 0;
    } else {
      this.sequenceCounters = {};
    }
  }

  // Product Factory
  static createProduct(overrides: Partial<Product> = {}): Product {
    const sequence = this.getSequence('product');
    
    return {
      id: `product-${sequence}`,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      sku: `SKU-${faker.string.alphanumeric(8).toUpperCase()}`,
      barcode: faker.string.numeric(13),
      category: faker.commerce.department(),
      price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
      cost: parseFloat(faker.commerce.price({ min: 5, max: 500 })),
      stock: faker.number.int({ min: 0, max: 200 }),
      minStock: faker.number.int({ min: 5, max: 20 }),
      unit: faker.helpers.arrayElement(['piece', 'kg', 'liter', 'meter', 'box']),
      isActive: faker.datatype.boolean(0.9), // 90% active
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  // Customer Factory
  static createCustomer(overrides: Partial<Customer> = {}): Customer {
    const sequence = this.getSequence('customer');
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      id: `customer-${sequence}`,
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number('+639#########'),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      province: faker.location.state(),
      zipCode: faker.location.zipCode(),
      isActive: faker.datatype.boolean(0.95),
      loyaltyPoints: faker.number.int({ min: 0, max: 1000 }),
      totalSpent: parseFloat(faker.commerce.price({ min: 0, max: 50000 })),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  // Sale Factory
  static createSale(overrides: Partial<Sale> = {}): Sale {
    const sequence = this.getSequence('sale');
    const items = overrides.items || [this.createSaleItem(), this.createSaleItem()];
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.12; // 12% VAT
    
    return {
      id: `sale-${sequence}`,
      customerId: `customer-${faker.number.int({ min: 1, max: 100 })}`,
      items,
      subtotal,
      tax,
      total: subtotal + tax,
      paymentMethod: faker.helpers.arrayElement(['cash', 'card', 'gcash', 'paymaya']),
      status: faker.helpers.arrayElement(['completed', 'pending', 'cancelled']),
      receiptNumber: `OR-${faker.string.numeric(10)}`,
      createdAt: faker.date.past(),
      createdBy: `user-${faker.number.int({ min: 1, max: 10 })}`,
      ...overrides
    };
  }

  // Sale Item Factory
  static createSaleItem(overrides: Partial<SaleItem> = {}): SaleItem {
    const quantity = faker.number.int({ min: 1, max: 10 });
    const price = parseFloat(faker.commerce.price({ min: 10, max: 500 }));
    
    return {
      productId: `product-${faker.number.int({ min: 1, max: 100 })}`,
      productName: faker.commerce.productName(),
      sku: `SKU-${faker.string.alphanumeric(8)}`,
      quantity,
      price,
      total: quantity * price,
      ...overrides
    };
  }

  // Purchase Order Factory
  static createPurchaseOrder(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
    const sequence = this.getSequence('purchaseOrder');
    const items = overrides.items || [this.createPurchaseOrderItem(), this.createPurchaseOrderItem()];
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.12;
    
    return {
      id: `po-${sequence}`,
      poNumber: `PO-${faker.date.recent().getFullYear()}-${sequence.toString().padStart(4, '0')}`,
      supplierId: `supplier-${faker.number.int({ min: 1, max: 20 })}`,
      supplierName: faker.company.name(),
      items,
      subtotal,
      tax,
      total: subtotal + tax,
      status: faker.helpers.arrayElement(['draft', 'sent', 'approved', 'partial', 'received', 'cancelled']),
      expectedDate: faker.date.future(),
      createdAt: faker.date.past(),
      createdBy: `user-${faker.number.int({ min: 1, max: 10 })}`,
      ...overrides
    };
  }

  // Purchase Order Item Factory
  static createPurchaseOrderItem(overrides: Partial<PurchaseOrderItem> = {}): PurchaseOrderItem {
    const quantity = faker.number.int({ min: 10, max: 100 });
    const cost = parseFloat(faker.commerce.price({ min: 5, max: 200 }));
    
    return {
      id: `poi-${this.getSequence('purchaseOrderItem')}`,
      productId: `product-${faker.number.int({ min: 1, max: 100 })}`,
      productName: faker.commerce.productName(),
      sku: `SKU-${faker.string.alphanumeric(8)}`,
      quantity,
      cost,
      total: quantity * cost,
      receivedQuantity: 0,
      ...overrides
    };
  }

  // Supplier Factory
  static createSupplier(overrides: Partial<Supplier> = {}): Supplier {
    const sequence = this.getSequence('supplier');
    
    return {
      id: `supplier-${sequence}`,
      name: faker.company.name(),
      contactPerson: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number('+639#########'),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      province: faker.location.state(),
      zipCode: faker.location.zipCode(),
      tin: this.generateTIN(),
      paymentTerms: faker.helpers.arrayElement(['COD', 'Net 15', 'Net 30', 'Net 45']),
      isActive: faker.datatype.boolean(0.9),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  // User Factory
  static createUser(overrides: Partial<User> = {}): User {
    const sequence = this.getSequence('user');
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      id: `user-${sequence}`,
      email: faker.internet.email({ firstName, lastName }),
      firstName,
      lastName,
      role: faker.helpers.arrayElement(['admin', 'manager', 'cashier', 'staff']),
      isActive: faker.datatype.boolean(0.95),
      permissions: this.generatePermissions(),
      lastLogin: faker.date.recent(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  // Account Factory (for accounting)
  static createAccount(overrides: Partial<Account> = {}): Account {
    const sequence = this.getSequence('account');
    
    return {
      id: `account-${sequence}`,
      code: `${faker.number.int({ min: 1000, max: 9999 })}`,
      name: faker.helpers.arrayElement([
        'Cash', 'Accounts Receivable', 'Inventory', 'Equipment',
        'Accounts Payable', 'Sales Revenue', 'Cost of Goods Sold', 'Operating Expenses'
      ]),
      type: faker.helpers.arrayElement(['asset', 'liability', 'equity', 'revenue', 'expense']),
      balance: parseFloat(faker.finance.amount({ min: 0, max: 100000 })),
      isActive: faker.datatype.boolean(0.9),
      createdAt: faker.date.past(),
      ...overrides
    };
  }

  // Journal Entry Factory
  static createJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
    const sequence = this.getSequence('journalEntry');
    
    return {
      id: `je-${sequence}`,
      entryNumber: `JE-${faker.date.recent().getFullYear()}-${sequence.toString().padStart(4, '0')}`,
      date: faker.date.recent(),
      description: faker.lorem.sentence(),
      referenceId: `ref-${faker.string.alphanumeric(8)}`,
      referenceType: faker.helpers.arrayElement(['sale', 'purchase', 'payment', 'adjustment']),
      entries: [
        {
          accountId: 'account-1',
          account: 'Cash',
          debit: 1000,
          credit: 0,
          description: 'Cash received'
        },
        {
          accountId: 'account-2',
          account: 'Sales Revenue',
          debit: 0,
          credit: 1000,
          description: 'Sales revenue'
        }
      ],
      totalDebit: 1000,
      totalCredit: 1000,
      createdBy: `user-${faker.number.int({ min: 1, max: 10 })}`,
      createdAt: faker.date.recent(),
      ...overrides
    };
  }

  // Stock Movement Factory
  static createStockMovement(overrides: Partial<StockMovement> = {}): StockMovement {
    const sequence = this.getSequence('stockMovement');
    
    return {
      id: `sm-${sequence}`,
      productId: `product-${faker.number.int({ min: 1, max: 100 })}`,
      movementType: faker.helpers.arrayElement(['add', 'subtract', 'set', 'adjust']),
      quantityDelta: faker.number.int({ min: -50, max: 100 }),
      referenceType: faker.helpers.arrayElement(['sale', 'purchase_order', 'adjustment', 'transfer']),
      referenceId: `ref-${faker.string.alphanumeric(8)}`,
      reason: faker.lorem.sentence(),
      performedBy: `user-${faker.number.int({ min: 1, max: 10 })}`,
      createdAt: faker.date.recent(),
      ...overrides
    };
  }

  // Employee Factory
  static createEmployee(overrides: Partial<Employee> = {}): Employee {
    const sequence = this.getSequence('employee');
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      id: `employee-${sequence}`,
      employeeId: `EMP-${sequence.toString().padStart(4, '0')}`,
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number('+639#########'),
      position: faker.person.jobTitle(),
      department: faker.helpers.arrayElement(['Sales', 'Accounting', 'Operations', 'Management']),
      hireDate: faker.date.past(),
      salary: parseFloat(faker.finance.amount({ min: 15000, max: 100000 })),
      isActive: faker.datatype.boolean(0.95),
      sss: faker.string.numeric(10),
      tin: this.generateTIN(),
      philHealth: faker.string.numeric(12),
      pagibig: faker.string.numeric(12),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  // Payroll Period Factory
  static createPayrollPeriod(overrides: Partial<PayrollPeriod> = {}): PayrollPeriod {
    const sequence = this.getSequence('payrollPeriod');
    const startDate = faker.date.past();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 15); // Bi-weekly period
    
    return {
      id: `pp-${sequence}`,
      startDate,
      endDate,
      payDate: new Date(endDate.getTime() + (3 * 24 * 60 * 60 * 1000)), // 3 days after end
      status: faker.helpers.arrayElement(['draft', 'calculated', 'approved', 'paid']),
      totalGrossPay: parseFloat(faker.finance.amount({ min: 50000, max: 500000 })),
      totalDeductions: parseFloat(faker.finance.amount({ min: 5000, max: 50000 })),
      totalNetPay: 0, // Will be calculated
      employeeCount: faker.number.int({ min: 5, max: 50 }),
      createdBy: `user-${faker.number.int({ min: 1, max: 10 })}`,
      createdAt: faker.date.recent(),
      ...overrides
    };
  }

  // Utility Methods
  private static generateTIN(): string {
    return `${faker.string.numeric(3)}-${faker.string.numeric(3)}-${faker.string.numeric(3)}-${faker.string.numeric(3)}`;
  }

  private static generatePermissions(): string[] {
    const allPermissions = [
      'read_products', 'create_products', 'update_products', 'delete_products',
      'read_sales', 'create_sales', 'update_sales', 'delete_sales',
      'read_purchases', 'create_purchases', 'update_purchases', 'delete_purchases',
      'read_customers', 'create_customers', 'update_customers', 'delete_customers',
      'read_reports', 'create_reports', 'admin_access'
    ];
    
    return faker.helpers.arrayElements(allPermissions, { min: 3, max: allPermissions.length });
  }

  // Bulk Data Creation
  static createBulkProducts(count: number, overrides: Partial<Product> = {}): Product[] {
    return Array.from({ length: count }, () => this.createProduct(overrides));
  }

  static createBulkCustomers(count: number, overrides: Partial<Customer> = {}): Customer[] {
    return Array.from({ length: count }, () => this.createCustomer(overrides));
  }

  static createBulkSales(count: number, overrides: Partial<Sale> = {}): Sale[] {
    return Array.from({ length: count }, () => this.createSale(overrides));
  }

  static createBulkPurchaseOrders(count: number, overrides: Partial<PurchaseOrder> = {}): PurchaseOrder[] {
    return Array.from({ length: count }, () => this.createPurchaseOrder(overrides));
  }

  // Realistic Dataset Creation
  static createRealisticInventoryData(scale: 'small' | 'medium' | 'large' = 'medium') {
    const scales = {
      small: { products: 50, customers: 20, sales: 100, purchaseOrders: 25 },
      medium: { products: 200, customers: 100, sales: 500, purchaseOrders: 100 },
      large: { products: 1000, customers: 500, sales: 2000, purchaseOrders: 400 }
    };

    const config = scales[scale];

    return {
      products: this.createBulkProducts(config.products),
      customers: this.createBulkCustomers(config.customers),
      sales: this.createBulkSales(config.sales),
      purchaseOrders: this.createBulkPurchaseOrders(config.purchaseOrders),
      suppliers: Array.from({ length: Math.ceil(config.purchaseOrders / 10) }, () => this.createSupplier()),
      users: Array.from({ length: 10 }, () => this.createUser()),
      accounts: Array.from({ length: 20 }, () => this.createAccount()),
      employees: Array.from({ length: 15 }, () => this.createEmployee())
    };
  }

  // Performance Test Data
  static createLargeDataset(size: 'medium' | 'large' | 'xlarge' = 'large') {
    const sizes = {
      medium: 1000,
      large: 5000,
      xlarge: 10000
    };

    const count = sizes[size];

    return {
      products: this.createBulkProducts(count),
      sales: this.createBulkSales(count * 2),
      customers: this.createBulkCustomers(Math.ceil(count / 5)),
      purchaseOrders: this.createBulkPurchaseOrders(Math.ceil(count / 10))
    };
  }

  // Clean up sequences
  static resetAllSequences(): void {
    this.resetSequence();
  }

  static resetSequenceFor(entity: string): void {
    this.resetSequence(entity);
  }

  // Specific test scenarios
  static createLowStockScenario(): Product[] {
    return Array.from({ length: 10 }, () => 
      this.createProduct({
        stock: faker.number.int({ min: 0, max: 3 }),
        minStock: faker.number.int({ min: 5, max: 10 })
      })
    );
  }

  static createOverdueOrdersScenario(): PurchaseOrder[] {
    return Array.from({ length: 5 }, () => 
      this.createPurchaseOrder({
        status: 'sent',
        expectedDate: faker.date.past({ days: 30 })
      })
    );
  }

  static createHighValueTransactionsScenario(): Sale[] {
    return Array.from({ length: 10 }, () => {
      const items = Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => 
        this.createSaleItem({
          price: parseFloat(faker.commerce.price({ min: 500, max: 2000 })),
          quantity: faker.number.int({ min: 1, max: 5 })
        })
      );
      return this.createSale({ items });
    });
  }
}