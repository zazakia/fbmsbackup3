export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: string;
  categoryId: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  reorderQuantity?: number;
  unit: string;
  isActive: boolean;
  expiryDate?: Date;
  manufacturingDate?: Date;
  batchNumber?: string;
  soldQuantity?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  supplier?: string;
  location?: string;
  tags: string[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  creditLimit: number;
  currentBalance: number;
  totalPurchases: number;
  isActive: boolean;
  customerType: CustomerType;
  taxId?: string;
  businessName?: string;
  birthday?: Date;
  notes?: string;
  tags: string[];
  preferredPaymentMethod?: PaymentMethod;
  discountPercentage: number;
  loyaltyPoints: number;
  createdAt: Date;
  updatedAt: Date;
  lastPurchase?: Date;
  lastContact?: Date;
}

export type CustomerType = 'individual' | 'business' | 'vip' | 'wholesale';

export interface CustomerContact {
  id: string;
  customerId: string;
  type: ContactType;
  subject: string;
  content: string;
  followUpDate?: Date;
  status: ContactStatus;
  createdBy: string;
  createdAt: Date;
}

export type ContactType = 'email' | 'phone' | 'meeting' | 'note' | 'complaint' | 'inquiry';
export type ContactStatus = 'pending' | 'completed' | 'cancelled';

export interface CustomerTransaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceNumber?: string;
  createdAt: Date;
}

export type TransactionType = 'sale' | 'payment' | 'refund' | 'credit' | 'debit' | 'adjustment';

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  cashierId: string;
  notes?: string;
  createdAt: Date;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'gcash' | 'paymaya' | 'bank_transfer' | 'check' | 'credit_card';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';
export type SaleStatus = 'draft' | 'completed' | 'cancelled' | 'refunded';

export interface CartItem {
  product: Product;
  quantity: number;
  total: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: PurchaseOrderStatus;
  expectedDate?: Date;
  receivedDate?: Date;
  createdBy?: string; // Optional to handle cases where user is not authenticated
  createdAt: Date;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  cost: number;
  total: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  birClassification?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  date: Date;
  vendor?: string;
  paymentMethod?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  notes?: string;
  isRecurring?: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  createdBy?: string;
  createdAt: Date;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'partial' | 'cancelled';

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  date: Date;
  reference?: string;
  description?: string;
  lines: JournalEntryLine[];
  createdBy: string;
  createdAt: Date;
}

// Payroll System Types
export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  birthDate: Date;
  hireDate: Date;
  position: string;
  department: string;
  employmentType: 'Regular' | 'Contractual' | 'Probationary' | 'Part-time';
  status: 'Active' | 'Inactive' | 'Terminated' | 'On Leave';
  
  // Salary Information
  basicSalary: number;
  allowances: Allowance[];
  
  // Government IDs
  sssNumber?: string;
  philhealthNumber?: string;
  pagibigNumber?: string;
  tinNumber?: string;
  
  // Bank Information
  bankName?: string;
  bankAccountNumber?: string;
  
  // Emergency Contact
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Allowance {
  id: string;
  name: string;
  amount: number;
  type: 'Fixed' | 'Percentage';
  isTaxable: boolean;
  description?: string;
}

export interface PayrollPeriod {
  id: string;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
  status: 'Open' | 'Processing' | 'Completed' | 'Closed';
  createdAt: Date;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  periodId: string;
  
  // Basic Pay
  basicSalary: number;
  allowances: number;
  grossPay: number;
  
  // Deductions
  sssContribution: number;
  philhealthContribution: number;
  pagibigContribution: number;
  withholdingTax: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Net Pay
  netPay: number;
  
  // Overtime
  overtimeHours: number;
  overtimeRate: number;
  overtimePay: number;
  
  // Leave
  leaveDays: number;
  leavePay: number;
  
  // 13th Month
  thirteenthMonthPay: number;
  
  // Status
  status: 'Draft' | 'Approved' | 'Paid';
  paymentDate?: Date;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Check';
  
  // Notes
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  leaveType: 'Vacation' | 'Sick' | 'Maternity' | 'Paternity' | 'Bereavement' | 'Other';
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  createdAt: Date;
}

export interface TimeRecord {
  id: string;
  employeeId: string;
  date: Date;
  timeIn: Date;
  timeOut?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  totalHours: number;
  overtimeHours: number;
  status: 'Present' | 'Absent' | 'Late' | 'Half-day' | 'Leave';
  notes?: string;
  createdAt: Date;
}

export interface PayrollSettings {
  id: string;
  
  // SSS Rates (2024)
  sssEmployeeRate: number; // 4.5%
  sssEmployerRate: number; // 9.5%
  sssMaxContribution: number; // 1,800
  
  // PhilHealth Rates (2024)
  philhealthEmployeeRate: number; // 2%
  philhealthEmployerRate: number; // 2%
  philhealthMinContribution: number; // 400
  philhealthMaxContribution: number; // 1,600
  
  // Pag-IBIG Rates (2024)
  pagibigEmployeeRate: number; // 2%
  pagibigEmployerRate: number; // 2%
  pagibigMaxContribution: number; // 100
  
  // Overtime Rates
  regularOvertimeRate: number; // 1.25
  holidayOvertimeRate: number; // 2.0
  nightDifferentialRate: number; // 1.1
  
  // Leave Benefits
  vacationLeaveDays: number; // 15
  sickLeaveDays: number; // 15
  maternityLeaveDays: number; // 105
  paternityLeaveDays: number; // 7
  
  // 13th Month Pay
  thirteenthMonthPayMonth: number; // 12
  
  // Tax Settings
  withholdingTaxTable: WithholdingTaxBracket[];
  
  updatedAt: Date;
}

export interface WithholdingTaxBracket {
  id: string;
  minAmount: number;
  maxAmount?: number;
  baseTax: number;
  rate: number;
  description: string;
}

// Enhanced Inventory Management Types
export interface StockMovement {
  id: string;
  productId: string;
  type: 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  reason: string;
  performedBy: string;
  batchNumber?: string;
  cost?: number;
  referenceId?: string; // Reference to sale, purchase, etc.
  notes?: string;
  createdAt: Date;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  cost: number;
  manufacturingDate: Date;
  expiryDate?: Date;
  supplier?: string;
  receivedDate: Date;
  status: 'active' | 'expired' | 'recalled' | 'sold';
  notes?: string;
  createdAt: Date;
}

export interface StockAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiring' | 'expired';
  productId: string;
  productName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  createdAt: Date;
}

export interface InventoryLocation {
  id: string;
  name: string;
  description?: string;
  type: 'warehouse' | 'store' | 'display' | 'storage';
  address?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface StockTransfer {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  items: {
    productId: string;
    quantity: number;
    batchNumber?: string;
  }[];
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  transferDate: Date;
  receivedDate?: Date;
  transferredBy: string;
  receivedBy?: string;
  notes?: string;
  createdAt: Date;
}

// For Supabase stock_movements table (inventory ledger)
export interface StockMovementLedger {
  id: string;
  product_id: string;
  change: number;
  type: string;
  reference_id?: string;
  user_id?: string;
  reason?: string;
  resulting_stock: number;
  created_at: Date;
}

// Enhanced Product History Types
export interface ProductMovementHistory {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: ProductMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  totalValue?: number;
  reason: string;
  referenceNumber?: string;
  referenceType?: 'sale' | 'purchase' | 'adjustment' | 'transfer' | 'return' | 'manual';
  referenceId?: string;
  locationId?: string;
  locationName?: string;
  fromLocationId?: string;
  fromLocationName?: string;
  toLocationId?: string;
  toLocationName?: string;
  batchNumber?: string;
  expiryDate?: Date;
  performedBy: string;
  performedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  notes?: string;
  attachments?: string[];
  status: MovementStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export type ProductMovementType = 
  | 'stock_in'           // Receiving inventory
  | 'stock_out'          // Selling/issuing inventory
  | 'adjustment_in'      // Positive adjustment
  | 'adjustment_out'     // Negative adjustment
  | 'transfer_out'       // Transfer to another location
  | 'transfer_in'        // Receive from another location
  | 'return_in'          // Customer/supplier return
  | 'return_out'         // Return to supplier
  | 'damage_out'         // Damaged goods removal
  | 'expired_out'        // Expired goods removal
  | 'recount'            // Physical count adjustment
  | 'initial_stock';     // Initial stock entry

export type MovementStatus = 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected';

export interface TransferSlip {
  id: string;
  transferNumber: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  items: TransferSlipItem[];
  status: TransferStatus;
  requestedBy: string;
  requestedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  issuedBy?: string;
  issuedByName?: string;
  receivedBy?: string;
  receivedByName?: string;
  transferDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  issuedDate?: Date;
  receivedDate?: Date;
  vehicleInfo?: string;
  driverInfo?: string;
  notes?: string;
  attachments?: string[];
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TransferSlipItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  batchNumber?: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  issuedQuantity?: number;
  receivedQuantity?: number;
  unitCost: number;
  totalValue: number;
  condition?: 'good' | 'damaged' | 'expired';
  notes?: string;
  expiryDate?: Date;
  serialNumbers?: string[];
}

export type TransferStatus = 
  | 'draft'          // Being prepared
  | 'pending'        // Awaiting approval
  | 'approved'       // Approved for transfer
  | 'issued'         // Items issued from source
  | 'in_transit'     // In delivery
  | 'partially_received' // Some items received
  | 'received'       // All items received
  | 'completed'      // Transfer completed
  | 'cancelled'      // Transfer cancelled
  | 'rejected';      // Transfer rejected

export interface ProductHistoryFilter {
  productId?: string;
  productName?: string;
  movementType?: ProductMovementType;
  locationId?: string;
  fromDate?: Date;
  toDate?: Date;
  performedBy?: string;
  status?: MovementStatus;
  batchNumber?: string;
  referenceNumber?: string;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface ProductStockSummary {
  productId: string;
  productName: string;
  productSku: string;
  currentStock: number;
  totalStockIn: number;
  totalStockOut: number;
  totalAdjustments: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
  totalReturns: number;
  totalDamaged: number;
  lastMovementDate?: Date;
  lastMovementType?: ProductMovementType;
  averageCost: number;
  totalValue: number;
  movements: ProductMovementHistory[];
}

export interface LocationStockSummary {
  locationId: string;
  locationName: string;
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  pendingTransfersIn: number;
  pendingTransfersOut: number;
  lastUpdateDate?: Date;
  products: {
    productId: string;
    productName: string;
    quantity: number;
    value: number;
  }[];
}