import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateVAT,
  generateORNumber,
  validateBIRReceipt,
  createJournalEntry,
  calculateWithholdingTax,
  generateBIRReport,
  formatPhilippineCurrency,
  validateTIN
} from '../../utils/birCompliance';
import { Sale, BIRReceipt, JournalEntry } from '../../types/business';

describe('Philippine BIR Compliance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('VAT Calculations', () => {
    it('should calculate 12% VAT correctly for regular transactions', () => {
      const amount = 1000;
      const vat = calculateVAT(amount);

      expect(vat.vatableAmount).toBe(1000);
      expect(vat.vatAmount).toBe(120);
      expect(vat.totalAmount).toBe(1120);
      expect(vat.vatRate).toBe(0.12);
    });

    it('should handle VAT-inclusive amounts', () => {
      const vatInclusiveAmount = 1120;
      const vat = calculateVAT(vatInclusiveAmount, { inclusive: true });

      expect(vat.vatableAmount).toBe(1000);
      expect(vat.vatAmount).toBe(120);
      expect(vat.totalAmount).toBe(1120);
    });

    it('should handle VAT-exempt transactions', () => {
      const amount = 1000;
      const vat = calculateVAT(amount, { exempt: true });

      expect(vat.vatableAmount).toBe(0);
      expect(vat.vatAmount).toBe(0);
      expect(vat.totalAmount).toBe(1000);
      expect(vat.exemptAmount).toBe(1000);
    });

    it('should handle zero-rated transactions', () => {
      const amount = 1000;
      const vat = calculateVAT(amount, { zeroRated: true });

      expect(vat.vatableAmount).toBe(1000);
      expect(vat.vatAmount).toBe(0);
      expect(vat.totalAmount).toBe(1000);
      expect(vat.zeroRatedAmount).toBe(1000);
    });

    it('should validate VAT calculation precision', () => {
      const testAmounts = [
        { amount: 1234.56, expectedVAT: 148.15 },
        { amount: 999.99, expectedVAT: 120.00 },
        { amount: 0.01, expectedVAT: 0.00 }
      ];

      testAmounts.forEach(({ amount, expectedVAT }) => {
        const vat = calculateVAT(amount);
        expect(vat.vatAmount).toBe(expectedVAT);
      });
    });
  });

  describe('Official Receipt Numbering', () => {
    it('should generate sequential OR numbers', () => {
      const or1 = generateORNumber();
      const or2 = generateORNumber();

      expect(parseInt(or2) - parseInt(or1)).toBe(1);
      expect(or1).toMatch(/^\d{10}$/); // 10-digit format
      expect(or2).toMatch(/^\d{10}$/);
    });

    it('should maintain series integrity', () => {
      const orNumbers = Array.from({ length: 100 }, () => generateORNumber());
      const uniqueNumbers = new Set(orNumbers);

      expect(uniqueNumbers.size).toBe(100); // All numbers should be unique
      expect(orNumbers.every(or => or.match(/^\d{10}$/))).toBe(true);
    });

    it('should handle OR number series rollover', () => {
      // Mock reaching maximum number
      vi.mocked(require('../../utils/birCompliance')).mockImplementation(() => ({
        generateORNumber: vi.fn()
          .mockReturnValueOnce('9999999999')
          .mockReturnValueOnce('0000000001')
      }));

      const lastOR = generateORNumber();
      const firstOR = generateORNumber();

      expect(lastOR).toBe('9999999999');
      expect(firstOR).toBe('0000000001');
    });
  });

  describe('BIR Receipt Validation', () => {
    const createValidReceipt = (): BIRReceipt => ({
      orNumber: '1234567890',
      tin: '123-456-789-001',
      businessName: 'Test Business Inc.',
      businessAddress: 'Test Address, Manila',
      date: new Date(),
      items: [
        {
          description: 'Test Product',
          quantity: 2,
          unitPrice: 100,
          amount: 200
        }
      ],
      vatableAmount: 200,
      vatAmount: 24,
      totalAmount: 224,
      customerName: 'Juan Dela Cruz',
      customerTIN: '987-654-321-001'
    });

    it('should validate complete BIR receipt format', () => {
      const receipt = createValidReceipt();
      const validation = validateBIRReceipt(receipt);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const incompleteReceipt = createValidReceipt();
      delete incompleteReceipt.tin;
      delete incompleteReceipt.orNumber;

      const validation = validateBIRReceipt(incompleteReceipt);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('TIN is required');
      expect(validation.errors).toContain('OR Number is required');
    });

    it('should validate TIN format', () => {
      const receiptWithInvalidTIN = createValidReceipt();
      receiptWithInvalidTIN.tin = 'invalid-tin';

      const validation = validateBIRReceipt(receiptWithInvalidTIN);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid TIN format');
    });

    it('should validate VAT calculations in receipt', () => {
      const receiptWithWrongVAT = createValidReceipt();
      receiptWithWrongVAT.vatAmount = 100; // Wrong VAT amount

      const validation = validateBIRReceipt(receiptWithWrongVAT);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('VAT calculation mismatch');
    });
  });

  describe('Journal Entry Generation', () => {
    it('should create proper double-entry for sales', () => {
      const sale: Sale = {
        id: 'sale-1',
        customerId: 'customer-1',
        items: [
          { productId: '1', productName: 'Product 1', quantity: 1, price: 1000, total: 1000 }
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        paymentMethod: 'cash',
        status: 'completed',
        createdAt: new Date(),
        createdBy: 'user-1'
      };

      const journalEntry = createJournalEntry(sale);

      expect(journalEntry.entries).toHaveLength(3);
      
      // Cash debit
      const cashEntry = journalEntry.entries.find(e => e.account === 'Cash');
      expect(cashEntry?.debit).toBe(1120);
      expect(cashEntry?.credit).toBe(0);

      // Sales credit
      const salesEntry = journalEntry.entries.find(e => e.account === 'Sales Revenue');
      expect(salesEntry?.debit).toBe(0);
      expect(salesEntry?.credit).toBe(1000);

      // VAT payable credit
      const vatEntry = journalEntry.entries.find(e => e.account === 'VAT Payable');
      expect(vatEntry?.debit).toBe(0);
      expect(vatEntry?.credit).toBe(120);

      // Verify balancing
      const totalDebits = journalEntry.entries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredits = journalEntry.entries.reduce((sum, e) => sum + e.credit, 0);
      expect(totalDebits).toBe(totalCredits);
    });

    it('should handle different payment methods', () => {
      const cardSale: Sale = {
        id: 'sale-2',
        customerId: 'customer-1',
        items: [{ productId: '1', productName: 'Product 1', quantity: 1, price: 100, total: 100 }],
        subtotal: 100,
        tax: 12,
        total: 112,
        paymentMethod: 'card',
        status: 'completed',
        createdAt: new Date(),
        createdBy: 'user-1'
      };

      const journalEntry = createJournalEntry(cardSale);

      const cardEntry = journalEntry.entries.find(e => e.account === 'Card Receivables');
      expect(cardEntry?.debit).toBe(112);
    });
  });

  describe('Withholding Tax Calculations', () => {
    it('should calculate 1% withholding tax for goods', () => {
      const amount = 10000;
      const withholdingTax = calculateWithholdingTax(amount, 'goods');

      expect(withholdingTax.rate).toBe(0.01);
      expect(withholdingTax.amount).toBe(100);
      expect(withholdingTax.netAmount).toBe(9900);
    });

    it('should calculate 2% withholding tax for services', () => {
      const amount = 10000;
      const withholdingTax = calculateWithholdingTax(amount, 'services');

      expect(withholdingTax.rate).toBe(0.02);
      expect(withholdingTax.amount).toBe(200);
      expect(withholdingTax.netAmount).toBe(9800);
    });

    it('should handle professional services (10%)', () => {
      const amount = 10000;
      const withholdingTax = calculateWithholdingTax(amount, 'professional');

      expect(withholdingTax.rate).toBe(0.10);
      expect(withholdingTax.amount).toBe(1000);
      expect(withholdingTax.netAmount).toBe(9000);
    });

    it('should apply minimum threshold rules', () => {
      const smallAmount = 500; // Below minimum threshold
      const withholdingTax = calculateWithholdingTax(smallAmount, 'goods');

      expect(withholdingTax.amount).toBe(0); // No withholding for small amounts
      expect(withholdingTax.netAmount).toBe(500);
    });
  });

  describe('BIR Report Generation', () => {
    it('should generate monthly VAT report', () => {
      const salesData = [
        { amount: 1000, vat: 120, date: new Date('2024-01-15') },
        { amount: 2000, vat: 240, date: new Date('2024-01-20') },
        { amount: 1500, vat: 180, date: new Date('2024-01-25') }
      ];

      const report = generateBIRReport('VAT', salesData, {
        month: 1,
        year: 2024
      });

      expect(report.totalSales).toBe(4500);
      expect(report.totalVAT).toBe(540);
      expect(report.period).toEqual({ month: 1, year: 2024 });
      expect(report.reportType).toBe('VAT');
    });

    it('should generate quarterly income tax report', () => {
      const incomeData = [
        { revenue: 100000, expenses: 60000, quarter: 1, year: 2024 },
        { revenue: 120000, expenses: 70000, quarter: 1, year: 2024 },
        { revenue: 110000, expenses: 65000, quarter: 1, year: 2024 }
      ];

      const report = generateBIRReport('INCOME_TAX', incomeData, {
        quarter: 1,
        year: 2024
      });

      expect(report.totalRevenue).toBe(330000);
      expect(report.totalExpenses).toBe(195000);
      expect(report.taxableIncome).toBe(135000);
      expect(report.incomeTax).toBeGreaterThan(0);
    });
  });

  describe('Philippine Currency Formatting', () => {
    it('should format amounts in Philippine peso', () => {
      expect(formatPhilippineCurrency(1234.56)).toBe('₱1,234.56');
      expect(formatPhilippineCurrency(1000000)).toBe('₱1,000,000.00');
      expect(formatPhilippineCurrency(0.01)).toBe('₱0.01');
    });

    it('should handle negative amounts', () => {
      expect(formatPhilippineCurrency(-1234.56)).toBe('-₱1,234.56');
    });

    it('should handle zero amounts', () => {
      expect(formatPhilippineCurrency(0)).toBe('₱0.00');
    });
  });

  describe('TIN Validation', () => {
    it('should validate correct TIN format', () => {
      const validTINs = [
        '123-456-789-001',
        '987-654-321-000',
        '111-222-333-001'
      ];

      validTINs.forEach(tin => {
        expect(validateTIN(tin)).toBe(true);
      });
    });

    it('should reject invalid TIN formats', () => {
      const invalidTINs = [
        '123-456-789', // Missing branch code
        '123-456-789-1001', // Invalid branch code
        '12-456-789-001', // Wrong format
        'ABC-456-789-001', // Non-numeric
        '123-456-789-ABC' // Non-numeric branch
      ];

      invalidTINs.forEach(tin => {
        expect(validateTIN(tin)).toBe(false);
      });
    });
  });

  describe('Compliance Edge Cases', () => {
    it('should handle leap year calculations', () => {
      const leapYearDate = new Date('2024-02-29');
      const receipt = {
        orNumber: '1234567890',
        date: leapYearDate,
        // ... other required fields
      };

      expect(() => validateBIRReceipt(receipt)).not.toThrow();
    });

    it('should handle maximum transaction amounts', () => {
      const largeAmount = 999999999.99;
      const vat = calculateVAT(largeAmount);

      expect(vat.vatAmount).toBe(119999999.999);
      expect(vat.totalAmount).toBe(1119999999.989);
    });

    it('should handle micro-transactions', () => {
      const microAmount = 0.01;
      const vat = calculateVAT(microAmount);

      expect(vat.vatAmount).toBe(0.00); // Rounded to nearest centavo
      expect(vat.totalAmount).toBe(0.01);
    });
  });

  describe('Performance Tests', () => {
    it('should process large batches of transactions efficiently', () => {
      const transactions = Array.from({ length: 10000 }, (_, i) => ({
        amount: Math.random() * 10000,
        id: `txn-${i}`
      }));

      const startTime = performance.now();
      
      const results = transactions.map(txn => calculateVAT(txn.amount));
      
      const endTime = performance.now();

      expect(results).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should generate reports for large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        amount: Math.random() * 1000,
        vat: Math.random() * 120,
        date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
      }));

      const startTime = performance.now();
      const report = generateBIRReport('VAT', largeDataset, { month: 1, year: 2024 });
      const endTime = performance.now();

      expect(report.totalSales).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});