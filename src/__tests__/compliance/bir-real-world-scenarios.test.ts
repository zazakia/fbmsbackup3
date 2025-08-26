import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateVAT, formatPhilippineCurrency, validateTIN } from '../../utils/birCompliance';
import { TestDataFactory } from '../factories/testDataFactory';

describe('Philippine BIR Real-World Compliance Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sari-Sari Store Operations', () => {
    it('should handle typical sari-sari store daily transactions', () => {
      // Simulate a day's worth of small transactions typical in sari-sari stores
      const dailyTransactions = [
        { item: 'Rice (1kg)', amount: 65, quantity: 5 },
        { item: 'Cooking Oil (500ml)', amount: 45, quantity: 3 },
        { item: 'Instant Noodles', amount: 15, quantity: 20 },
        { item: 'Soft Drinks', amount: 25, quantity: 8 },
        { item: 'Cigarettes (pack)', amount: 150, quantity: 4 },
        { item: 'Load Cards', amount: 100, quantity: 10 },
        { item: 'Bread', amount: 30, quantity: 6 },
        { item: 'Milk (250ml)', amount: 35, quantity: 4 }
      ];

      let totalSales = 0;
      let totalVAT = 0;
      let totalExempt = 0;

      dailyTransactions.forEach(transaction => {
        const saleAmount = transaction.amount * transaction.quantity;
        totalSales += saleAmount;
        
        // Some items might be VAT-exempt (basic necessities)
        const isBasicNecessity = ['Rice (1kg)', 'Cooking Oil (500ml)', 'Bread', 'Milk (250ml)'].includes(transaction.item);
        
        if (isBasicNecessity) {
          totalExempt += saleAmount;
        } else {
          const vat = calculateVAT(saleAmount);
          totalVAT += vat.vatAmount;
        }
      });

      expect(totalSales).toBe(2230); // Sum of all transactions
      expect(totalVAT).toBeGreaterThan(0);
      expect(totalExempt).toBeGreaterThan(0); // Should have exempt sales
      expect(totalVAT + totalExempt).toBeLessThanOrEqual(totalSales);
    });

    it('should generate proper BIR reports for micro businesses', () => {
      const dailySales = 2000; // Average daily sales
      const workingDays = 26; // Working days per month
      const monthlySales = dailySales * workingDays;

      const vat = calculateVAT(monthlySales);

      expect(monthlySales).toBe(52000);
      expect(vat.vatAmount).toBe(6240); // 12% VAT
      expect(vat.totalAmount).toBe(58240);
      expect(vat.vatRate).toBe(0.12);
    });
  });

  describe('Restaurant Business Compliance', () => {
    it('should handle restaurant sales with service charges', () => {
      const restaurantSale = {
        foodAmount: 1000,
        serviceCharge: 100, // 10% service charge
        gratuity: 50 // Optional tip
      };

      // Service charge is subject to VAT
      const foodVAT = calculateVAT(restaurantSale.foodAmount);
      const serviceChargeVAT = calculateVAT(restaurantSale.serviceCharge);
      
      const totalVatable = restaurantSale.foodAmount + restaurantSale.serviceCharge;
      const totalVAT = foodVAT.vatAmount + serviceChargeVAT.vatAmount;
      const totalBill = totalVatable + totalVAT + restaurantSale.gratuity;

      expect(totalVatable).toBe(1100);
      expect(totalVAT).toBe(132); // 12% of ₱1,100
      expect(totalBill).toBe(1282); // ₱1,100 + ₱132 + ₱50

      // Gratuity is not subject to VAT
      const gratuityVAT = calculateVAT(restaurantSale.gratuity, { exempt: true });
      expect(gratuityVAT.vatAmount).toBe(0);
      expect(gratuityVAT.exemptAmount).toBe(50);
    });
  });

  describe('E-commerce Business Scenarios', () => {
    it('should handle online marketplace sales', () => {
      const onlineSales = [
        { platform: 'Shopee', grossSales: 100000, platformFee: 5000, paymentFee: 2000 },
        { platform: 'Lazada', grossSales: 80000, platformFee: 4000, paymentFee: 1600 },
        { platform: 'Own Website', grossSales: 50000, platformFee: 0, paymentFee: 1500 }
      ];

      const salesAnalysis = onlineSales.map(sale => {
        const netSales = sale.grossSales - sale.platformFee - sale.paymentFee;
        const vat = calculateVAT(sale.grossSales);
        
        return {
          platform: sale.platform,
          grossSales: sale.grossSales,
          fees: sale.platformFee + sale.paymentFee,
          netSales,
          vat: vat.vatAmount,
          netAfterTax: netSales - vat.vatAmount
        };
      });

      const totalGrossSales = salesAnalysis.reduce((sum, sale) => sum + sale.grossSales, 0);
      const totalVAT = salesAnalysis.reduce((sum, sale) => sum + sale.vat, 0);
      const totalFees = salesAnalysis.reduce((sum, sale) => sum + sale.fees, 0);

      expect(totalGrossSales).toBe(230000);
      expect(totalVAT).toBe(27600); // 12% of gross sales
      expect(totalFees).toBe(14100); // Total platform and payment fees
    });

    it('should handle digital services VAT exemption', () => {
      const digitalServices = [
        { service: 'Web Development', amount: 50000, isVATExempt: false },
        { service: 'Digital Marketing', amount: 30000, isVATExempt: false },
        { service: 'Online Training', amount: 25000, isVATExempt: true }, // Educational services
        { service: 'Software Licensing', amount: 40000, isVATExempt: false }
      ];

      const digitalTaxes = digitalServices.map(service => {
        const vat = calculateVAT(service.amount, { exempt: service.isVATExempt });
        
        return {
          service: service.service,
          amount: service.amount,
          vat: vat.vatAmount,
          exemptAmount: vat.exemptAmount || 0,
          totalBilling: service.amount + vat.vatAmount
        };
      });

      const totalVAT = digitalTaxes.reduce((sum, svc) => sum + svc.vat, 0);
      const totalExempt = digitalTaxes.reduce((sum, svc) => sum + svc.exemptAmount, 0);

      expect(totalVAT).toBe(14400); // VAT on non-exempt services
      expect(totalExempt).toBe(25000); // Exempt educational services
    });
  });

  describe('Manufacturing Business Compliance', () => {
    it('should handle raw materials vs finished goods VAT', () => {
      const inventory = [
        { item: 'Raw Materials - Steel', amount: 500000, type: 'raw_material' },
        { item: 'Raw Materials - Plastic', amount: 200000, type: 'raw_material' },
        { item: 'Finished Product A', amount: 800000, type: 'finished_goods' },
        { item: 'Finished Product B', amount: 600000, type: 'finished_goods' }
      ];

      const inventoryTax = inventory.map(item => {
        // Raw materials purchased have input VAT that can be claimed
        // Finished goods sold have output VAT
        const vat = calculateVAT(item.amount);
        
        return {
          item: item.item,
          amount: item.amount,
          type: item.type,
          inputVAT: item.type === 'raw_material' ? vat.vatAmount : 0,
          outputVAT: item.type === 'finished_goods' ? vat.vatAmount : 0
        };
      });

      const totalInputVAT = inventoryTax.reduce((sum, item) => sum + item.inputVAT, 0);
      const totalOutputVAT = inventoryTax.reduce((sum, item) => sum + item.outputVAT, 0);
      const netVATPayable = totalOutputVAT - totalInputVAT;

      expect(totalInputVAT).toBe(84000); // Input VAT on raw materials
      expect(totalOutputVAT).toBe(168000); // Output VAT on sales
      expect(netVATPayable).toBe(84000); // Net VAT payable to BIR
    });
  });

  describe('Philippine Tax Calculations', () => {
    it('should format currency correctly', () => {
      expect(formatPhilippineCurrency(1234.56)).toBe('₱1,234.56');
      expect(formatPhilippineCurrency(1000000)).toBe('₱1,000,000.00');
      expect(formatPhilippineCurrency(0.01)).toBe('₱0.01');
    });

    it('should validate TIN format', () => {
      const validTINs = [
        '123-456-789-001',
        '987-654-321-000',
        '111-222-333-001'
      ];

      validTINs.forEach(tin => {
        expect(validateTIN(tin)).toBe(true);
      });

      const invalidTINs = [
        '123-456-789', // Missing branch code
        '123-456-789-1001', // Invalid branch code
        '12-456-789-001', // Wrong format
        'ABC-456-789-001' // Non-numeric
      ];

      invalidTINs.forEach(tin => {
        expect(validateTIN(tin)).toBe(false);
      });
    });
  });

  describe('COVID-19 Relief Measures', () => {
    it('should handle Bayanihan Act tax relief provisions', () => {
      // During COVID-19, some businesses received tax relief
      const preCOVIDSales = 1000000;
      const covidPeriodSales = 300000; // Significant drop
      const salesDecline = (preCOVIDSales - covidPeriodSales) / preCOVIDSales;
      
      // If sales decline > 40%, eligible for certain reliefs
      const eligibleForRelief = salesDecline > 0.40;
      
      expect(salesDecline).toBeCloseTo(0.70, 2); // 70% decline
      expect(eligibleForRelief).toBe(true);
      
      if (eligibleForRelief) {
        // Some penalties may be waived
        const originalPenalty = 10000;
        const waivedPenalty = originalPenalty * 0.5; // 50% waiver example
        
        expect(waivedPenalty).toBe(5000);
      }
    });
  });

  describe('CREATE Method Compliance', () => {
    it('should handle CREATE (Corporate Recovery and Tax Incentives for Enterprises) provisions', () => {
      // Simplified CREATE law compliance check
      const corporateIncome = 5000000;
      const oldCorporateTaxRate = 0.30; // Old 30% rate
      const newCorporateTaxRate = 0.25; // New 25% rate for qualified corporations
      
      const oldTax = corporateIncome * oldCorporateTaxRate;
      const newTax = corporateIncome * newCorporateTaxRate;
      const taxSavings = oldTax - newTax;
      
      expect(oldTax).toBe(1500000);
      expect(newTax).toBe(1250000);
      expect(taxSavings).toBe(250000); // Significant savings
    });
  });

  describe('Digital Tax Compliance', () => {
    it('should handle digital service providers tax', () => {
      // For foreign digital service providers
      const digitalServiceRevenue = 2000000;
      const digitalServiceTaxRate = 0.12; // 12% VAT on digital services
      
      const digitalServiceTax = digitalServiceRevenue * digitalServiceTaxRate;
      
      expect(digitalServiceTax).toBe(240000);
      
      // Local digital service providers
      const localDigitalRevenue = 1500000;
      const localVAT = calculateVAT(localDigitalRevenue);
      
      expect(localVAT.vatAmount).toBe(180000);
      expect(localVAT.vatRate).toBe(0.12);
    });
  });

  describe('Test Data Factory Integration', () => {
    it('should create realistic Philippine business employees', () => {
      const employee = TestDataFactory.createEmployee({
        firstName: 'Maria',
        lastName: 'Santos',
        basicSalary: 35000
      });

      expect(employee.firstName).toBe('Maria');
      expect(employee.lastName).toBe('Santos');
      expect(employee.basicSalary).toBe(35000);
      expect(employee.id).toContain('employee-');
      expect(employee.phone).toMatch(/^\+639/); // Philippine mobile format
    });

    it('should generate realistic sales data', () => {
      const sale = TestDataFactory.createSale({
        subtotal: 1000,
        tax: 120,
        total: 1120
      });

      expect(sale.subtotal).toBe(1000);
      expect(sale.tax).toBe(120);
      expect(sale.total).toBe(1120);
      expect(sale.id).toContain('sale-');
      expect(sale.invoiceNumber).toContain('INV-');
    });
  });
});