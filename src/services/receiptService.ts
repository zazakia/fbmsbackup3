import { Sale, Customer } from '../types/business';

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  tin: string;
  birAccreditation: string;
  logo?: string;
}

export interface ReceiptData {
  id: string;
  receiptNumber: string;
  businessInfo: BusinessInfo;
  sale: Sale;
  customer?: Customer;
  qrCode?: string;
  digitalSignature?: string;
}

export interface ReceiptDeliveryOptions {
  email?: string;
  phone?: string;
  printReceipt?: boolean;
  generateQR?: boolean;
}

class ReceiptService {
  private businessInfo: BusinessInfo = {
    name: 'Filipino Business Management System',
    address: '123 Business Street, Makati City, Metro Manila 1200',
    phone: '+63 2 8123 4567',
    email: 'info@fbms.ph',
    tin: '123-456-789-000',
    birAccreditation: 'FP012345678901234567890'
  };

  // Generate BIR-compliant receipt number
  generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}${day}-${sequence}`;
  }

  // Generate digital signature for receipt
  generateDigitalSignature(receiptData: ReceiptData): string {
    const data = JSON.stringify({
      receiptNumber: receiptData.receiptNumber,
      total: receiptData.sale.total,
      timestamp: receiptData.sale.createdAt,
      tin: this.businessInfo.tin
    });
    
    // In a real implementation, this would use proper cryptographic signing
    return btoa(data).slice(0, 64);
  }

  // Generate QR code data for receipt verification
  generateQRCodeData(receiptData: ReceiptData): string {
    return JSON.stringify({
      receiptNumber: receiptData.receiptNumber,
      total: receiptData.sale.total,
      timestamp: receiptData.sale.createdAt?.toISOString(),
      businessTIN: this.businessInfo.tin,
      verificationUrl: `${window.location.origin}/verify-receipt/${receiptData.id}`
    });
  }

  // Create receipt data from sale
  createReceiptData(sale: Sale, customer?: Customer): ReceiptData {
    const receiptData: ReceiptData = {
      id: `receipt-${Date.now()}`,
      receiptNumber: this.generateReceiptNumber(),
      businessInfo: this.businessInfo,
      sale,
      customer
    };

    receiptData.digitalSignature = this.generateDigitalSignature(receiptData);
    receiptData.qrCode = this.generateQRCodeData(receiptData);

    return receiptData;
  }

  // Generate receipt text for printing
  generateReceiptText(receiptData: ReceiptData): string {
    const { businessInfo, sale, customer, receiptNumber } = receiptData;
    
    const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;
    const formatDate = (date: Date) => date.toLocaleDateString('en-PH');
    const formatTime = (date: Date) => date.toLocaleTimeString('en-PH');

    return `
═══════════════════════════════════════
            OFFICIAL RECEIPT
═══════════════════════════════════════

${businessInfo.name}
${businessInfo.address}
Tel: ${businessInfo.phone}
Email: ${businessInfo.email}
TIN: ${businessInfo.tin}
BIR Accreditation: ${businessInfo.birAccreditation}

═══════════════════════════════════════

Receipt No: ${receiptNumber}
Invoice No: ${sale.invoiceNumber || 'N/A'}
Date: ${formatDate(sale.createdAt || new Date())}
Time: ${formatTime(sale.createdAt || new Date())}
Cashier: ${sale.cashierId}

${customer ? `Customer: ${customer.firstName} ${customer.lastName}` : 'Walk-in Customer'}
${customer?.email ? `Email: ${customer.email}` : ''}
${customer?.phone ? `Phone: ${customer.phone}` : ''}

───────────────────────────────────────
ITEMS PURCHASED
───────────────────────────────────────

${sale.items.map(item => 
  `${item.productName}\n  SKU: ${item.sku}\n  ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.total)}`
).join('\n\n')}

───────────────────────────────────────

Subtotal:        ${formatCurrency(sale.subtotal)}
${sale.discount > 0 ? `Discount:        ${formatCurrency(sale.discount)}\n` : ''}VAT (12%):       ${formatCurrency(sale.tax)}
TOTAL:           ${formatCurrency(sale.total)}

Payment Method:  ${sale.paymentMethod.toUpperCase()}
${sale.cashReceived ? `Cash Received:   ${formatCurrency(sale.cashReceived)}\n` : ''}${sale.change ? `Change:          ${formatCurrency(sale.change)}\n` : ''}
Status:          ${sale.status.toUpperCase()}

═══════════════════════════════════════

Thank you for your business!
Please keep this receipt for your records.

This receipt is BIR-compliant and serves as
proof of purchase for warranty claims.

For questions or concerns, contact us at:
${businessInfo.email}
${businessInfo.phone}

═══════════════════════════════════════

Digital Signature: ${receiptData.digitalSignature?.slice(0, 16)}...
Generated: ${formatDate(new Date())} ${formatTime(new Date())}

═══════════════════════════════════════
    `.trim();
  }

  // Generate HTML receipt for email
  generateReceiptHTML(receiptData: ReceiptData): string {
    const { businessInfo, sale, customer, receiptNumber } = receiptData;
    
    const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;
    const formatDate = (date: Date) => date.toLocaleDateString('en-PH');
    const formatTime = (date: Date) => date.toLocaleTimeString('en-PH');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt ${receiptNumber}</title>
    <style>
        body { font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        .business-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .business-info { font-size: 12px; line-height: 1.4; }
        .receipt-info { margin: 15px 0; }
        .items { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 0; }
        .item { margin-bottom: 10px; }
        .item-name { font-weight: bold; }
        .item-details { font-size: 12px; color: #666; }
        .totals { margin: 15px 0; }
        .total-line { display: flex; justify-content: space-between; margin: 5px 0; }
        .total-final { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
        .footer { text-align: center; font-size: 12px; margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; }
        .signature { font-size: 10px; color: #666; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="business-name">${businessInfo.name}</div>
        <div class="business-info">
            ${businessInfo.address}<br>
            Tel: ${businessInfo.phone}<br>
            Email: ${businessInfo.email}<br>
            TIN: ${businessInfo.tin}<br>
            BIR Accreditation: ${businessInfo.birAccreditation}
        </div>
    </div>

    <div class="receipt-info">
        <strong>OFFICIAL RECEIPT</strong><br><br>
        Receipt No: ${receiptNumber}<br>
        Invoice No: ${sale.invoiceNumber || 'N/A'}<br>
        Date: ${formatDate(sale.createdAt || new Date())}<br>
        Time: ${formatTime(sale.createdAt || new Date())}<br>
        Cashier: ${sale.cashierId}<br><br>
        ${customer ? `Customer: ${customer.firstName} ${customer.lastName}<br>` : 'Walk-in Customer<br>'}
        ${customer?.email ? `Email: ${customer.email}<br>` : ''}
        ${customer?.phone ? `Phone: ${customer.phone}<br>` : ''}
    </div>

    <div class="items">
        <strong>ITEMS PURCHASED</strong><br><br>
        ${sale.items.map(item => `
            <div class="item">
                <div class="item-name">${item.productName}</div>
                <div class="item-details">SKU: ${item.sku}</div>
                <div class="total-line">
                    <span>${item.quantity} x ${formatCurrency(item.price)}</span>
                    <span>${formatCurrency(item.total)}</span>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>${formatCurrency(sale.subtotal)}</span>
        </div>
        ${sale.discount > 0 ? `
        <div class="total-line">
            <span>Discount:</span>
            <span>${formatCurrency(sale.discount)}</span>
        </div>
        ` : ''}
        <div class="total-line">
            <span>VAT (12%):</span>
            <span>${formatCurrency(sale.tax)}</span>
        </div>
        <div class="total-line total-final">
            <span>TOTAL:</span>
            <span>${formatCurrency(sale.total)}</span>
        </div>
    </div>

    <div class="receipt-info">
        Payment Method: ${sale.paymentMethod.toUpperCase()}<br>
        ${sale.cashReceived ? `Cash Received: ${formatCurrency(sale.cashReceived)}<br>` : ''}
        ${sale.change ? `Change: ${formatCurrency(sale.change)}<br>` : ''}
        Status: ${sale.status.toUpperCase()}
    </div>

    <div class="footer">
        <strong>Thank you for your business!</strong><br>
        Please keep this receipt for your records.<br><br>
        This receipt is BIR-compliant and serves as<br>
        proof of purchase for warranty claims.<br><br>
        For questions or concerns, contact us at:<br>
        ${businessInfo.email}<br>
        ${businessInfo.phone}
    </div>

    <div class="signature">
        Digital Signature: ${receiptData.digitalSignature?.slice(0, 16)}...<br>
        Generated: ${formatDate(new Date())} ${formatTime(new Date())}
    </div>
</body>
</html>
    `.trim();
  }

  // Send receipt via email
  async sendReceiptByEmail(receiptData: ReceiptData, email: string): Promise<boolean> {
    try {
      const htmlContent = this.generateReceiptHTML(receiptData);
      
      // In a real implementation, this would use an email service like SendGrid, AWS SES, etc.
      console.log('Sending receipt via email to:', email);
      console.log('HTML Content:', htmlContent);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Failed to send receipt via email:', error);
      return false;
    }
  }

  // Send receipt via SMS
  async sendReceiptBySMS(receiptData: ReceiptData, phone: string): Promise<boolean> {
    try {
      const message = `Receipt ${receiptData.receiptNumber} - Total: ₱${receiptData.sale.total.toFixed(2)} - ${this.businessInfo.name}. View full receipt: ${window.location.origin}/receipt/${receiptData.id}`;
      
      // In a real implementation, this would use an SMS service like Twilio, Semaphore, etc.
      console.log('Sending receipt via SMS to:', phone);
      console.log('SMS Content:', message);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Failed to send receipt via SMS:', error);
      return false;
    }
  }

  // Print receipt
  printReceipt(receiptData: ReceiptData): void {
    const receiptText = this.generateReceiptText(receiptData);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${receiptData.receiptNumber}</title>
            <style>
              body { font-family: 'Courier New', monospace; white-space: pre-line; margin: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>${receiptText}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  // Process receipt delivery
  async processReceiptDelivery(
    receiptData: ReceiptData, 
    options: ReceiptDeliveryOptions
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let success = true;

    try {
      // Send via email if requested
      if (options.email) {
        const emailSent = await this.sendReceiptByEmail(receiptData, options.email);
        if (!emailSent) {
          errors.push('Failed to send receipt via email');
          success = false;
        }
      }

      // Send via SMS if requested
      if (options.phone) {
        const smsSent = await this.sendReceiptBySMS(receiptData, options.phone);
        if (!smsSent) {
          errors.push('Failed to send receipt via SMS');
          success = false;
        }
      }

      // Print receipt if requested
      if (options.printReceipt) {
        try {
          this.printReceipt(receiptData);
        } catch (error) {
          errors.push('Failed to print receipt');
          success = false;
        }
      }

      return { success, errors };
    } catch (error) {
      return { 
        success: false, 
        errors: ['Failed to process receipt delivery: ' + (error as Error).message] 
      };
    }
  }
}

export const receiptService = new ReceiptService();