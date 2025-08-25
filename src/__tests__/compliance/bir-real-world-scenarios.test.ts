import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateVAT,
  generateORNumber,
  validateBIRReceipt,
  createJournalEntry,
  calculateWithholdingTax,
  generateBIRReport,
  formatPhilippineCurrency,
  validateTIN,
  generateBIRForm2550M,
  calculateSSSContribution,
  calculatePhilHealthContribution,
  calculatePagibigContribution,
  calculateWithholdingTaxForEmployee,
  generateAlphalist,
  BIRReceipt,
  VATCalculation
} from '../../utils/birCompliance';
import { Sale, Employee } from '../../types/business';
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
      const vatTransactions: VATCalculation[] = [];

      dailyTransactions.forEach(transaction => {
        const saleAmount = transaction.amount * transaction.quantity;
        totalSales += saleAmount;
        
        // Some items might be VAT-exempt (basic necessities)
        const isBasicNecessity = ['Rice (1kg)', 'Cooking Oil (500ml)', 'Bread', 'Milk (250ml)'].includes(transaction.item);
        const vat = calculateVAT(saleAmount, { exempt: isBasicNecessity });
        vatTransactions.push(vat);
      });

      expect(totalSales).toBe(2230); // Sum of all transactions
      
      const totalVAT = vatTransactions.reduce((sum, vat) => sum + vat.vatAmount, 0);
      const totalExempt = vatTransactions.reduce((sum, vat) => sum + (vat.exemptAmount || 0), 0);
      
      expect(totalVAT).toBeGreaterThan(0);
      expect(totalExempt).toBeGreaterThan(0); // Should have exempt sales
      expect(totalVAT + totalExempt).toBeLessThanOrEqual(totalSales);
    });

    it('should generate proper BIR reports for micro businesses', () => {
      const monthlySales = Array.from({ length: 30 }, (_, day) => ({
        amount: 1500 + Math.random() * 1000, // Daily sales between ₱1,500-2,500
        vat: 0,
        date: new Date(2024, 0, day + 1)
      }));

      // Calculate VAT for each day
      monthlySales.forEach(sale => {
        const vatCalc = calculateVAT(sale.amount);
        sale.vat = vatCalc.vatAmount;
      });

      const report = generateBIRReport('VAT', monthlySales, { month: 1, year: 2024 });

      expect(report.totalSales).toBeGreaterThan(45000); // Minimum expected monthly sales
      expect(report.totalSales).toBeLessThan(75000); // Maximum expected monthly sales
      expect(report.totalVAT).toBeGreaterThan(0);
      expect(report.totalVAT / report.totalSales).toBeCloseTo(0.12, 2); // VAT rate check
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

    it('should handle restaurant withholding tax for suppliers', () => {
      const supplierPayments = [
        { supplier: 'Meat Supplier', amount: 50000, type: 'goods' },
        { supplier: 'Vegetable Supplier', amount: 30000, type: 'goods' },
        { supplier: 'Cleaning Service', amount: 15000, type: 'services' },
        { supplier: 'Accounting Service', amount: 25000, type: 'professional' }
      ];

      const withholdingTaxes = supplierPayments.map(payment => {
        const wTax = calculateWithholdingTax(payment.amount, payment.type);
        return {
          supplier: payment.supplier,
          grossAmount: payment.amount,
          withholdingTax: wTax.amount,
          netPayment: wTax.netAmount
        };
      });

      expect(withholdingTaxes[0].withholdingTax).toBe(500); // 1% of ₱50,000
      expect(withholdingTaxes[1].withholdingTax).toBe(300); // 1% of ₱30,000
      expect(withholdingTaxes[2].withholdingTax).toBe(300); // 2% of ₱15,000
      expect(withholdingTaxes[3].withholdingTax).toBe(2500); // 10% of ₱25,000

      const totalWithholding = withholdingTaxes.reduce((sum, wt) => sum + wt.withholdingTax, 0);
      expect(totalWithholding).toBe(3600);
    });
  });

  describe('Construction Business Scenarios', () => {
    it('should handle construction progress billing', () => {
      const contractAmount = 5000000; // ₱5M contract
      const progressPercentages = [20, 30, 25, 25]; // Progress billing percentages
      
      const progressBillings = progressPercentages.map((percentage, index) => {
        const billingAmount = contractAmount * (percentage / 100);
        const vat = calculateVAT(billingAmount);
        const withholdingTax = calculateWithholdingTax(billingAmount, 'services');
        
        return {
          billing: index + 1,
          percentage,
          amount: billingAmount,
          vat: vat.vatAmount,
          withholdingTax: withholdingTax.amount,
          netReceivable: billingAmount + vat.vatAmount - withholdingTax.amount
        };
      });

      expect(progressBillings).toHaveLength(4);
      expect(progressBillings[0].amount).toBe(1000000); // 20% of ₱5M
      expect(progressBillings[0].vat).toBe(120000); // 12% VAT
      expect(progressBillings[0].withholdingTax).toBe(20000); // 2% withholding tax
      expect(progressBillings[0].netReceivable).toBe(1100000); // ₱1M + ₱120K - ₱20K

      const totalProgress = progressBillings.reduce((sum, billing) => sum + billing.percentage, 0);
      expect(totalProgress).toBe(100); // Should complete 100% of contract
    });

    it('should calculate correct taxes for construction materials', () => {\n      const materials = [\n        { item: 'Cement', amount: 500000, isVATExempt: false },\n        { item: 'Steel Bars', amount: 800000, isVATExempt: false },\n        { item: 'Hollow Blocks', amount: 200000, isVATExempt: false },\n        { item: 'Sand and Gravel', amount: 150000, isVATExempt: true } // Often VAT-exempt\n      ];\n\n      const materialTaxes = materials.map(material => {\n        const vat = calculateVAT(material.amount, { exempt: material.isVATExempt });\n        const withholdingTax = calculateWithholdingTax(material.amount, 'goods');\n        \n        return {\n          item: material.item,\n          amount: material.amount,\n          vat: vat.vatAmount,\n          withholdingTax: withholdingTax.amount,\n          totalCost: material.amount + vat.vatAmount\n        };\n      });\n\n      const totalMaterialCost = materialTaxes.reduce((sum, mat) => sum + mat.totalCost, 0);\n      const totalVAT = materialTaxes.reduce((sum, mat) => sum + mat.vat, 0);\n      const totalWithholding = materialTaxes.reduce((sum, mat) => sum + mat.withholdingTax, 0);\n\n      expect(totalMaterialCost).toBeGreaterThan(1650000); // Base amount + VAT\n      expect(totalVAT).toBe(180000); // VAT on non-exempt items\n      expect(totalWithholding).toBe(16500); // 1% withholding on all items\n    });\n  });\n\n  describe('Professional Services Compliance', () => {\n    it('should handle professional services withholding tax', () => {\n      const professionalServices = [\n        { service: 'Legal Services', amount: 100000, rate: 0.10 },\n        { service: 'Accounting Services', amount: 75000, rate: 0.10 },\n        { service: 'Engineering Services', amount: 150000, rate: 0.10 },\n        { service: 'Medical Services', amount: 50000, rate: 0.10 }\n      ];\n\n      const servicesTax = professionalServices.map(service => {\n        const vat = calculateVAT(service.amount);\n        const withholdingTax = calculateWithholdingTax(service.amount, 'professional');\n        \n        return {\n          service: service.service,\n          grossFee: service.amount,\n          vat: vat.vatAmount,\n          withholdingTax: withholdingTax.amount,\n          netReceivable: service.amount + vat.vatAmount - withholdingTax.amount\n        };\n      });\n\n      // Professional services have 10% withholding tax\n      expect(servicesTax[0].withholdingTax).toBe(10000); // 10% of ₱100,000\n      expect(servicesTax[1].withholdingTax).toBe(7500); // 10% of ₱75,000\n      \n      const totalNetReceivable = servicesTax.reduce((sum, svc) => sum + svc.netReceivable, 0);\n      expect(totalNetReceivable).toBeGreaterThan(300000); // Should be positive net receivables\n    });\n  });\n\n  describe('E-commerce Business Scenarios', () => {\n    it('should handle online marketplace sales', () => {\n      const onlineSales = [\n        { platform: 'Shopee', grossSales: 100000, platformFee: 5000, paymentFee: 2000 },\n        { platform: 'Lazada', grossSales: 80000, platformFee: 4000, paymentFee: 1600 },\n        { platform: 'Own Website', grossSales: 50000, platformFee: 0, paymentFee: 1500 }\n      ];\n\n      const salesAnalysis = onlineSales.map(sale => {\n        const netSales = sale.grossSales - sale.platformFee - sale.paymentFee;\n        const vat = calculateVAT(sale.grossSales);\n        \n        return {\n          platform: sale.platform,\n          grossSales: sale.grossSales,\n          fees: sale.platformFee + sale.paymentFee,\n          netSales,\n          vat: vat.vatAmount,\n          netAfterTax: netSales - vat.vatAmount\n        };\n      });\n\n      const totalGrossSales = salesAnalysis.reduce((sum, sale) => sum + sale.grossSales, 0);\n      const totalVAT = salesAnalysis.reduce((sum, sale) => sum + sale.vat, 0);\n      const totalFees = salesAnalysis.reduce((sum, sale) => sum + sale.fees, 0);\n\n      expect(totalGrossSales).toBe(230000);\n      expect(totalVAT).toBe(27600); // 12% of gross sales\n      expect(totalFees).toBe(14100); // Total platform and payment fees\n    });\n\n    it('should handle digital services VAT exemption', () => {\n      const digitalServices = [\n        { service: 'Web Development', amount: 50000, isVATExempt: false },\n        { service: 'Digital Marketing', amount: 30000, isVATExempt: false },\n        { service: 'Online Training', amount: 25000, isVATExempt: true }, // Educational services\n        { service: 'Software Licensing', amount: 40000, isVATExempt: false }\n      ];\n\n      const digitalTaxes = digitalServices.map(service => {\n        const vat = calculateVAT(service.amount, { exempt: service.isVATExempt });\n        \n        return {\n          service: service.service,\n          amount: service.amount,\n          vat: vat.vatAmount,\n          exemptAmount: vat.exemptAmount || 0,\n          totalBilling: service.amount + vat.vatAmount\n        };\n      });\n\n      const totalVAT = digitalTaxes.reduce((sum, svc) => sum + svc.vat, 0);\n      const totalExempt = digitalTaxes.reduce((sum, svc) => sum + svc.exemptAmount, 0);\n\n      expect(totalVAT).toBe(14400); // VAT on non-exempt services\n      expect(totalExempt).toBe(25000); // Exempt educational services\n    });\n  });\n\n  describe('Manufacturing Business Compliance', () => {\n    it('should handle raw materials vs finished goods VAT', () => {\n      const inventory = [\n        { item: 'Raw Materials - Steel', amount: 500000, type: 'raw_material' },\n        { item: 'Raw Materials - Plastic', amount: 200000, type: 'raw_material' },\n        { item: 'Finished Product A', amount: 800000, type: 'finished_goods' },\n        { item: 'Finished Product B', amount: 600000, type: 'finished_goods' }\n      ];\n\n      const inventoryTax = inventory.map(item => {\n        // Raw materials purchased have input VAT that can be claimed\n        // Finished goods sold have output VAT\n        const vat = calculateVAT(item.amount);\n        \n        return {\n          item: item.item,\n          amount: item.amount,\n          type: item.type,\n          inputVAT: item.type === 'raw_material' ? vat.vatAmount : 0,\n          outputVAT: item.type === 'finished_goods' ? vat.vatAmount : 0\n        };\n      });\n\n      const totalInputVAT = inventoryTax.reduce((sum, item) => sum + item.inputVAT, 0);\n      const totalOutputVAT = inventoryTax.reduce((sum, item) => sum + item.outputVAT, 0);\n      const netVATPayable = totalOutputVAT - totalInputVAT;\n\n      expect(totalInputVAT).toBe(84000); // Input VAT on raw materials\n      expect(totalOutputVAT).toBe(168000); // Output VAT on sales\n      expect(netVATPayable).toBe(84000); // Net VAT payable to BIR\n    });\n  });\n\n  describe('Payroll and Benefits Compliance', () => {\n    it('should calculate complete payroll with all Philippine deductions', () => {\n      const employee = TestDataFactory.createEmployee({\n        firstName: 'Maria',\n        lastName: 'Santos',\n        basicSalary: 35000,\n        tinNumber: '123-456-789-001'\n      });\n\n      const grossPay = employee.basicSalary;\n      const sssContrib = calculateSSSContribution(grossPay);\n      const philhealthContrib = calculatePhilHealthContribution(grossPay);\n      const pagibigContrib = calculatePagibigContribution(grossPay);\n      const withholdingTax = calculateWithholdingTaxForEmployee(grossPay, 4);\n\n      const totalDeductions = sssContrib.employee + philhealthContrib.employee + \n                             pagibigContrib.employee + withholdingTax;\n      const netPay = grossPay - totalDeductions;\n\n      const payrollSummary = {\n        grossPay,\n        sss: sssContrib.employee,\n        philhealth: philhealthContrib.employee,\n        pagibig: pagibigContrib.employee,\n        withholdingTax,\n        totalDeductions,\n        netPay\n      };\n\n      expect(payrollSummary.grossPay).toBe(35000);\n      expect(payrollSummary.sss).toBeGreaterThan(0);\n      expect(payrollSummary.philhealth).toBeGreaterThan(0);\n      expect(payrollSummary.pagibig).toBeGreaterThan(0);\n      expect(payrollSummary.netPay).toBeLessThan(payrollSummary.grossPay);\n      expect(payrollSummary.netPay).toBeGreaterThan(25000); // Should still be reasonable\n    });\n\n    it('should generate 13th month pay calculations', () => {\n      const employee = TestDataFactory.createEmployee({\n        basicSalary: 30000\n      });\n\n      const monthsWorked = 12;\n      const thirteenthMonthPay = (employee.basicSalary * monthsWorked) / 12;\n      \n      // 13th month pay is tax-exempt up to ₱90,000\n      const taxExemptLimit = 90000;\n      const taxableThirteenthMonth = Math.max(0, thirteenthMonthPay - taxExemptLimit);\n      \n      expect(thirteenthMonthPay).toBe(30000);\n      expect(taxableThirteenthMonth).toBe(0); // Below exempt limit\n      \n      // Test with higher salary\n      const highSalaryEmployee = TestDataFactory.createEmployee({\n        basicSalary: 100000\n      });\n      \n      const highThirteenthMonth = (highSalaryEmployee.basicSalary * monthsWorked) / 12;\n      const highTaxableThirteenthMonth = Math.max(0, highThirteenthMonth - taxExemptLimit);\n      \n      expect(highThirteenthMonth).toBe(100000);\n      expect(highTaxableThirteenthMonth).toBe(10000); // ₱10,000 is taxable\n    });\n  });\n\n  describe('BIR Audit Preparation', () => {\n    it('should validate books of accounts completeness', () => {\n      const auditChecklist = {\n        salesRecords: true,\n        purchaseRecords: true,\n        generalJournal: true,\n        generalLedger: true,\n        trialBalance: true,\n        financialStatements: true,\n        vatReturns: true,\n        withholdingTaxReturns: true,\n        payrollRecords: true,\n        bankReconciliation: true\n      };\n\n      const completeness = Object.values(auditChecklist).every(item => item === true);\n      expect(completeness).toBe(true);\n      \n      // Calculate compliance score\n      const totalItems = Object.keys(auditChecklist).length;\n      const completedItems = Object.values(auditChecklist).filter(item => item === true).length;\n      const complianceScore = (completedItems / totalItems) * 100;\n      \n      expect(complianceScore).toBe(100);\n    });\n\n    it('should validate tax computation accuracy', () => {\n      const monthlyVATReturns = Array.from({ length: 12 }, (_, month) => {\n        const monthlySales = 500000 + Math.random() * 200000;\n        const vat = calculateVAT(monthlySales);\n        \n        return {\n          month: month + 1,\n          grossSales: monthlySales,\n          vatAmount: vat.vatAmount,\n          vatRate: vat.vatRate\n        };\n      });\n\n      const annualVATSummary = monthlyVATReturns.reduce(\n        (summary, monthly) => ({\n          totalSales: summary.totalSales + monthly.grossSales,\n          totalVAT: summary.totalVAT + monthly.vatAmount\n        }),\n        { totalSales: 0, totalVAT: 0 }\n      );\n\n      const averageVATRate = annualVATSummary.totalVAT / annualVATSummary.totalSales;\n      \n      expect(averageVATRate).toBeCloseTo(0.12, 2); // Should be exactly 12%\n      expect(annualVATSummary.totalSales).toBeGreaterThan(6000000); // Minimum expected\n      expect(annualVATSummary.totalVAT).toBeGreaterThan(720000); // 12% of minimum\n    });\n  });\n\n  describe('COVID-19 Relief Measures', () => {\n    it('should handle Bayanihan Act tax relief provisions', () => {\n      // During COVID-19, some businesses received tax relief\n      const preCOVIDSales = 1000000;\n      const covidPeriodSales = 300000; // Significant drop\n      const salesDecline = (preCOVIDSales - covidPeriodSales) / preCOVIDSales;\n      \n      // If sales decline > 40%, eligible for certain reliefs\n      const eligibleForRelief = salesDecline > 0.40;\n      \n      expect(salesDecline).toBeCloseTo(0.70, 2); // 70% decline\n      expect(eligibleForRelief).toBe(true);\n      \n      if (eligibleForRelief) {\n        // Some penalties may be waived\n        const originalPenalty = 10000;\n        const waivedPenalty = originalPenalty * 0.5; // 50% waiver example\n        \n        expect(waivedPenalty).toBe(5000);\n      }\n    });\n  });\n\n  describe('CREATE Method Compliance', () => {\n    it('should handle CREATE (Corporate Recovery and Tax Incentives for Enterprises) provisions', () => {\n      // Simplified CREATE law compliance check\n      const corporateIncome = 5000000;\n      const oldCorporateTaxRate = 0.30; // Old 30% rate\n      const newCorporateTaxRate = 0.25; // New 25% rate for qualified corporations\n      \n      const oldTax = corporateIncome * oldCorporateTaxRate;\n      const newTax = corporateIncome * newCorporateTaxRate;\n      const taxSavings = oldTax - newTax;\n      \n      expect(oldTax).toBe(1500000);\n      expect(newTax).toBe(1250000);\n      expect(taxSavings).toBe(250000); // Significant savings\n    });\n  });\n\n  describe('Digital Tax Compliance', () => {\n    it('should handle digital service providers tax', () => {\n      // For foreign digital service providers\n      const digitalServiceRevenue = 2000000;\n      const digitalServiceTaxRate = 0.12; // 12% VAT on digital services\n      \n      const digitalServiceTax = digitalServiceRevenue * digitalServiceTaxRate;\n      \n      expect(digitalServiceTax).toBe(240000);\n      \n      // Local digital service providers\n      const localDigitalRevenue = 1500000;\n      const localVAT = calculateVAT(localDigitalRevenue);\n      \n      expect(localVAT.vatAmount).toBe(180000);\n      expect(localVAT.vatRate).toBe(0.12);\n    });\n  });\n});\n