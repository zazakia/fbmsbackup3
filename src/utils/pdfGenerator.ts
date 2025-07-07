import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface BIRFormData {
  // Common fields for all BIR forms
  businessName: string;
  businessAddress: string;
  tin: string;
  rdoCode: string;
  taxPeriod: string;
  
  // Form 2550M specific fields
  grossSales?: number;
  exemptSales?: number;
  zeroRatedSales?: number;
  taxableSales?: number;
  outputTax?: number;
  inputTax?: number;
  netVAT?: number;
  
  // Form 2307 specific fields (Withholding Tax)
  payeeName?: string;
  payeeAddress?: string;
  payeeTIN?: string;
  incomePayment?: number;
  taxWithheld?: number;
  
  // Form 1701Q specific fields (Quarterly Income Tax)
  grossIncome?: number;
  deductions?: number;
  netIncome?: number;
  incomeTax?: number;
  creditsPayments?: number;
  taxDue?: number;
}

/**
 * BIR Form 2550M (Monthly VAT Declaration) Generator
 */
export class BIRForm2550MGenerator {
  private doc: jsPDF;
  
  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
  }
  
  generate(data: BIRFormData): jsPDF {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    
    // Header
    this.doc.text('MONTHLY VALUE-ADDED TAX DECLARATION', 105, 20, { align: 'center' });
    this.doc.text('BIR Form No. 2550M', 105, 28, { align: 'center' });
    
    // Business Information
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    this.doc.text('Business Name:', 20, 45);
    this.doc.text(data.businessName, 60, 45);
    
    this.doc.text('Business Address:', 20, 52);
    this.doc.text(data.businessAddress, 60, 52);
    
    this.doc.text('TIN:', 20, 59);
    this.doc.text(data.tin, 60, 59);
    
    this.doc.text('RDO Code:', 120, 59);
    this.doc.text(data.rdoCode, 150, 59);
    
    this.doc.text('Tax Period:', 20, 66);
    this.doc.text(data.taxPeriod, 60, 66);
    
    // VAT Computation Table
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('VAT COMPUTATION', 20, 80);
    
    // Table headers
    this.doc.rect(20, 85, 170, 10);
    this.doc.text('Description', 25, 92);
    this.doc.text('Amount', 160, 92);
    
    // Table rows
    const rows = [
      ['Gross Sales/Receipts', data.grossSales?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Less: Exempt Sales', data.exemptSales?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Less: Zero-rated Sales', data.zeroRatedSales?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Taxable Sales', data.taxableSales?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Output Tax (12%)', data.outputTax?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Less: Input Tax', data.inputTax?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Net VAT Payable', data.netVAT?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00']
    ];
    
    this.doc.setFont('helvetica', 'normal');
    let yPosition = 100;
    
    rows.forEach((row, index) => {
      this.doc.rect(20, yPosition - 5, 170, 10);
      this.doc.text(row[0], 25, yPosition + 2);
      this.doc.text(row[1], 185, yPosition + 2, { align: 'right' });
      yPosition += 10;
    });
    
    // Footer
    this.doc.setFontSize(8);
    this.doc.text(`Generated on: ${new Date().toLocaleDateString('en-PH')}`, 20, 280);
    this.doc.text('This is a system-generated form. Please review before submission to BIR.', 20, 285);
    
    return this.doc;
  }
}

/**
 * BIR Form 2307 (Certificate of Creditable Tax Withheld at Source) Generator
 */
export class BIRForm2307Generator {
  private doc: jsPDF;
  
  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
  }
  
  generate(data: BIRFormData): jsPDF {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    
    // Header
    this.doc.text('CERTIFICATE OF CREDITABLE TAX WITHHELD AT SOURCE', 105, 20, { align: 'center' });
    this.doc.text('BIR Form No. 2307', 105, 28, { align: 'center' });
    
    // Payor Information
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PAYOR INFORMATION', 20, 45);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Business Name:', 20, 55);
    this.doc.text(data.businessName, 60, 55);
    
    this.doc.text('Business Address:', 20, 62);
    this.doc.text(data.businessAddress, 60, 62);
    
    this.doc.text('TIN:', 20, 69);
    this.doc.text(data.tin, 60, 69);
    
    // Payee Information
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PAYEE INFORMATION', 20, 85);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Name:', 20, 95);
    this.doc.text(data.payeeName || '', 60, 95);
    
    this.doc.text('Address:', 20, 102);
    this.doc.text(data.payeeAddress || '', 60, 102);
    
    this.doc.text('TIN:', 20, 109);
    this.doc.text(data.payeeTIN || '', 60, 109);
    
    // Withholding Tax Details
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('WITHHOLDING TAX DETAILS', 20, 125);
    
    this.doc.rect(20, 130, 170, 10);
    this.doc.text('Description', 25, 137);
    this.doc.text('Amount', 160, 137);
    
    const rows = [
      ['Income Payment', data.incomePayment?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Tax Withheld', data.taxWithheld?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00']
    ];
    
    this.doc.setFont('helvetica', 'normal');
    let yPosition = 145;
    
    rows.forEach((row) => {
      this.doc.rect(20, yPosition - 5, 170, 10);
      this.doc.text(row[0], 25, yPosition + 2);
      this.doc.text(row[1], 185, yPosition + 2, { align: 'right' });
      yPosition += 10;
    });
    
    // Footer
    this.doc.setFontSize(8);
    this.doc.text(`Generated on: ${new Date().toLocaleDateString('en-PH')}`, 20, 280);
    this.doc.text('This is a system-generated form. Please review before submission to BIR.', 20, 285);
    
    return this.doc;
  }
}

/**
 * BIR Form 1701Q (Quarterly Income Tax Return) Generator
 */
export class BIRForm1701QGenerator {
  private doc: jsPDF;
  
  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
  }
  
  generate(data: BIRFormData): jsPDF {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    
    // Header
    this.doc.text('QUARTERLY INCOME TAX RETURN', 105, 20, { align: 'center' });
    this.doc.text('BIR Form No. 1701Q', 105, 28, { align: 'center' });
    
    // Business Information
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    this.doc.text('Business Name:', 20, 45);
    this.doc.text(data.businessName, 60, 45);
    
    this.doc.text('Business Address:', 20, 52);
    this.doc.text(data.businessAddress, 60, 52);
    
    this.doc.text('TIN:', 20, 59);
    this.doc.text(data.tin, 60, 59);
    
    this.doc.text('Tax Period:', 20, 66);
    this.doc.text(data.taxPeriod, 60, 66);
    
    // Income Tax Computation
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INCOME TAX COMPUTATION', 20, 80);
    
    this.doc.rect(20, 85, 170, 10);
    this.doc.text('Description', 25, 92);
    this.doc.text('Amount', 160, 92);
    
    const rows = [
      ['Gross Income', data.grossIncome?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Less: Deductions', data.deductions?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Net Income', data.netIncome?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Income Tax Due', data.incomeTax?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Less: Credits/Payments', data.creditsPayments?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00'],
      ['Tax Still Due', data.taxDue?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) || 'PHP 0.00']
    ];
    
    this.doc.setFont('helvetica', 'normal');
    let yPosition = 100;
    
    rows.forEach((row) => {
      this.doc.rect(20, yPosition - 5, 170, 10);
      this.doc.text(row[0], 25, yPosition + 2);
      this.doc.text(row[1], 185, yPosition + 2, { align: 'right' });
      yPosition += 10;
    });
    
    // Footer
    this.doc.setFontSize(8);
    this.doc.text(`Generated on: ${new Date().toLocaleDateString('en-PH')}`, 20, 280);
    this.doc.text('This is a system-generated form. Please review before submission to BIR.', 20, 285);
    
    return this.doc;
  }
}

/**
 * PDF Generator Factory
 */
export class BIRPDFGenerator {
  static generateForm2550M(data: BIRFormData): Promise<Blob> {
    return new Promise((resolve) => {
      const generator = new BIRForm2550MGenerator();
      const pdf = generator.generate(data);
      const blob = pdf.output('blob');
      resolve(blob);
    });
  }
  
  static generateForm2307(data: BIRFormData): Promise<Blob> {
    return new Promise((resolve) => {
      const generator = new BIRForm2307Generator();
      const pdf = generator.generate(data);
      const blob = pdf.output('blob');
      resolve(blob);
    });
  }
  
  static generateForm1701Q(data: BIRFormData): Promise<Blob> {
    return new Promise((resolve) => {
      const generator = new BIRForm1701QGenerator();
      const pdf = generator.generate(data);
      const blob = pdf.output('blob');
      resolve(blob);
    });
  }
  
  /**
   * Generate PDF from HTML element
   */
  static async generateFromHTML(element: HTMLElement, filename: string): Promise<Blob> {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    return pdf.output('blob');
  }
  
  /**
   * Download PDF file
   */
  static downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}