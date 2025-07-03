import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Mail,
  MessageSquare,
  Download,
  Share,
  QrCode,
  Eye,
  Send,
  Copy,
  Check,
  X,
  Smartphone,
  Printer,
  FileText,
  Clock,
  User,
  Calendar,
  DollarSign,
  Tag,
  Building2,
  Phone,
  Globe,
  Shield
} from 'lucide-react';
import { formatCurrency, formatDate, formatReceiptNumber } from '../../utils/formatters';
import { CartItem, Customer, PaymentMethod } from '../../types/business';

interface ElectronicReceipt {
  id: string;
  receiptNumber: string;
  transactionId: string;
  businessInfo: BusinessInfo;
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashier: string;
  timestamp: Date;
  deliveryMethod: 'email' | 'sms' | 'qr' | 'print';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  deliveryDetails?: {
    email?: string;
    phone?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    error?: string;
  };
  qrCode?: string;
  digitalSignature?: string;
}

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  tin: string;
  birAccreditation: string;
  logo?: string;
}

interface ElectronicReceiptsProps {
  receipt: ElectronicReceipt;
  onClose: () => void;
  onSend: (method: 'email' | 'sms' | 'qr', contact?: string) => Promise<void>;
}

const ElectronicReceipts: React.FC<ElectronicReceiptsProps> = ({
  receipt,
  onClose,
  onSend
}) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms' | 'qr'>('email');
  const [contactInfo, setContactInfo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const generateQRCode = () => {
    // In a real implementation, this would generate an actual QR code
    // For demo purposes, we'll return a placeholder data URL
    const qrData = JSON.stringify({
      receiptNumber: receipt.receiptNumber,
      total: receipt.total,
      timestamp: receipt.timestamp.toISOString(),
      businessTIN: receipt.businessInfo.tin
    });
    
    return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTBweCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkUtUmVjZWlwdDwvdGV4dD4KICA8dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSI4cHgiIGZpbGw9IiM2Mzc0OGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj4ke3JlY2VpcHQucmVjZWlwdE51bWJlcn08L3RleHQ+CiAgPHRleHQgeD0iNTAlIiB5PSI2NSUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iOHB4IiBmaWxsPSIjNjM3NDhkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+JHtmb3JtYXRDdXJyZW5jeShyZWNlaXB0LnRvdGFsKX08L3RleHQ+Cjwvc3ZnPgo=`;
  };

  const handleSendReceipt = async () => {
    if (!contactInfo.trim() && deliveryMethod !== 'qr') {
      return;
    }

    setIsSending(true);
    try {
      await onSend(deliveryMethod, contactInfo);
      if (deliveryMethod === 'qr') {
        setShowQRCode(true);
      }
    } catch (error) {
      console.error('Failed to send receipt:', error);
    } finally {
      setIsSending(false);
    }
  };

  const copyReceiptUrl = () => {
    const receiptUrl = `${window.location.origin}/receipt/${receipt.id}`;
    navigator.clipboard.writeText(receiptUrl);
  };

  const downloadReceipt = () => {
    // In a real implementation, this would generate and download a PDF
    const element = document.createElement('a');
    const fileContent = generateReceiptText();
    const file = new Blob([fileContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `receipt-${receipt.receiptNumber}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generateReceiptText = () => {
    return `
═══════════════════════════════════════
               E-RECEIPT
═══════════════════════════════════════

${receipt.businessInfo.name}
${receipt.businessInfo.address}
Tel: ${receipt.businessInfo.phone}
Email: ${receipt.businessInfo.email}
TIN: ${receipt.businessInfo.tin}
BIR Accreditation: ${receipt.businessInfo.birAccreditation}

═══════════════════════════════════════

Receipt No: ${receipt.receiptNumber}
Date: ${formatDate(receipt.timestamp)}
Time: ${receipt.timestamp.toLocaleTimeString()}
Cashier: ${receipt.cashier}

${receipt.customer ? `Customer: ${receipt.customer.name}` : 'Walk-in Customer'}

───────────────────────────────────────
ITEMS
───────────────────────────────────────

${receipt.items.map(item => 
  `${item.name}\n  ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.quantity)}`
).join('\n\n')}

───────────────────────────────────────

Subtotal:        ${formatCurrency(receipt.subtotal)}
${receipt.discount > 0 ? `Discount:        ${formatCurrency(receipt.discount)}\n` : ''}VAT (12%):       ${formatCurrency(receipt.tax)}
TOTAL:           ${formatCurrency(receipt.total)}

Payment Method:  ${receipt.paymentMethod.toUpperCase()}

═══════════════════════════════════════

Thank you for your business!

This is an electronically generated receipt.
For questions, contact us at:
${receipt.businessInfo.email}
${receipt.businessInfo.phone}

═══════════════════════════════════════
    `.trim();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Electronic Receipt</h2>
              <p className="text-sm text-gray-600">{receipt.receiptNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 p-6">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('send')}
                className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 ${
                  activeTab === 'send'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Send
              </button>
            </div>

            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Receipt Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Number:</span>
                      <span className="font-mono">{receipt.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{formatDate(receipt.timestamp)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold">{formatCurrency(receipt.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment:</span>
                      <span className="capitalize">{receipt.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={downloadReceipt}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Receipt</span>
                    </button>
                    <button
                      onClick={copyReceiptUrl}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                </div>

                {receipt.status && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Delivery Status</h3>
                    <div className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                      receipt.status === 'delivered' ? 'bg-green-50 text-green-700' :
                      receipt.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                      receipt.status === 'failed' ? 'bg-red-50 text-red-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                      {receipt.status === 'delivered' && <Check className="h-4 w-4" />}
                      {receipt.status === 'sent' && <Clock className="h-4 w-4" />}
                      {receipt.status === 'failed' && <X className="h-4 w-4" />}
                      {receipt.status === 'pending' && <Clock className="h-4 w-4" />}
                      <span className="text-sm font-medium capitalize">{receipt.status}</span>
                    </div>
                    {receipt.deliveryDetails?.sentAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Sent: {formatDate(receipt.deliveryDetails.sentAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'send' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Delivery Method</h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="delivery"
                        value="email"
                        checked={deliveryMethod === 'email'}
                        onChange={(e) => setDeliveryMethod(e.target.value as 'email')}
                        className="text-blue-600"
                      />
                      <Mail className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Email</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="delivery"
                        value="sms"
                        checked={deliveryMethod === 'sms'}
                        onChange={(e) => setDeliveryMethod(e.target.value as 'sms')}
                        className="text-blue-600"
                      />
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">SMS</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="delivery"
                        value="qr"
                        checked={deliveryMethod === 'qr'}
                        onChange={(e) => setDeliveryMethod(e.target.value as 'qr')}
                        className="text-blue-600"
                      />
                      <QrCode className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">QR Code</span>
                    </label>
                  </div>
                </div>

                {deliveryMethod !== 'qr' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {deliveryMethod === 'email' ? 'Email Address' : 'Phone Number'}
                    </label>
                    <input
                      type={deliveryMethod === 'email' ? 'email' : 'tel'}
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder={deliveryMethod === 'email' ? 'customer@example.com' : '+63 9XX XXX XXXX'}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <button
                  onClick={handleSendReceipt}
                  disabled={isSending || (deliveryMethod !== 'qr' && !contactInfo.trim())}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>
                        {deliveryMethod === 'email' ? 'Send Email' : 
                         deliveryMethod === 'sms' ? 'Send SMS' : 
                         'Generate QR Code'}
                      </span>
                    </>
                  )}
                </button>

                {showQRCode && deliveryMethod === 'qr' && (
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-sm font-medium text-gray-900 mb-3">QR Code Generated</p>
                    <img
                      src={generateQRCode()}
                      alt="Receipt QR Code"
                      className="w-32 h-32 mx-auto border"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Scan to view receipt online
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Receipt Preview */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-md mx-auto bg-white border border-gray-200 p-6 font-mono text-sm">
              {/* Business Header */}
              <div className="text-center mb-6">
                <h2 className="font-bold text-lg mb-2">{receipt.businessInfo.name}</h2>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>{receipt.businessInfo.address}</p>
                  <p>Tel: {receipt.businessInfo.phone}</p>
                  <p>Email: {receipt.businessInfo.email}</p>
                  <p>TIN: {receipt.businessInfo.tin}</p>
                  <p>BIR Accreditation: {receipt.businessInfo.birAccreditation}</p>
                </div>
              </div>

              <div className="border-t border-b border-gray-300 py-4 mb-4">
                <div className="text-center font-bold mb-2">ELECTRONIC RECEIPT</div>
                <div className="flex justify-between text-xs">
                  <span>Receipt No:</span>
                  <span>{receipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Date:</span>
                  <span>{formatDate(receipt.timestamp)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Time:</span>
                  <span>{receipt.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Cashier:</span>
                  <span>{receipt.cashier}</span>
                </div>
                {receipt.customer && (
                  <div className="flex justify-between text-xs">
                    <span>Customer:</span>
                    <span>{receipt.customer.name}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="mb-4">
                <div className="font-semibold mb-2">ITEMS</div>
                {receipt.items.map((item, index) => (
                  <div key={index} className="mb-2">
                    <div className="flex justify-between">
                      <span className="text-xs">{item.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>{item.quantity} x {formatCurrency(item.price)}</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-300 pt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="flex justify-between text-xs mb-1">
                    <span>Discount:</span>
                    <span>-{formatCurrency(receipt.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs mb-1">
                  <span>VAT (12%):</span>
                  <span>{formatCurrency(receipt.tax)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-300 pt-2">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(receipt.total)}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="mt-4 pt-4 border-t border-gray-300">
                <div className="flex justify-between text-xs">
                  <span>Payment Method:</span>
                  <span className="uppercase">{receipt.paymentMethod}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs mt-6 pt-4 border-t border-gray-300">
                <p className="mb-2">Thank you for your business!</p>
                <p className="text-gray-500">This is an electronically generated receipt.</p>
                <p className="text-gray-500 mt-2">
                  For questions, contact us at:<br />
                  {receipt.businessInfo.email}<br />
                  {receipt.businessInfo.phone}
                </p>
              </div>

              {/* Digital Signature */}
              <div className="text-center text-xs mt-4 pt-4 border-t border-gray-300">
                <div className="flex items-center justify-center space-x-1 text-gray-500">
                  <Shield className="h-3 w-3" />
                  <span>Digitally signed and verified</span>
                </div>
                {receipt.digitalSignature && (
                  <p className="font-mono text-xs text-gray-400 mt-1 break-all">
                    {receipt.digitalSignature.slice(0, 32)}...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sample usage component
const ElectronicReceiptDemo: React.FC = () => {
  const [showReceipt, setShowReceipt] = useState(false);

  const sampleReceipt: ElectronicReceipt = {
    id: 'er-001',
    receiptNumber: 'ER-2024-001234',
    transactionId: 'txn-20241205-001',
    businessInfo: {
      name: 'Sample Business Store',
      address: '123 Business Street, Makati City, Metro Manila',
      phone: '+63 2 8123 4567',
      email: 'info@samplebusiness.ph',
      tin: '123-456-789-000',
      birAccreditation: 'FP012345678901234567890'
    },
    customer: {
      id: 'cust-001',
      name: 'Juan dela Cruz',
      email: 'juan@example.com',
      phone: '+63 917 123 4567',
      address: '456 Customer Ave, Quezon City',
      totalSpent: 15000,
      totalOrders: 8,
      loyaltyPoints: 250,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    items: [
      {
        productId: '1',
        name: 'Premium Rice 25kg',
        price: 1500,
        quantity: 2,
        sku: 'RICE-25KG'
      },
      {
        productId: '2',
        name: 'Cooking Oil 1L',
        price: 150,
        quantity: 1,
        sku: 'OIL-1L'
      }
    ],
    subtotal: 3150,
    tax: 378,
    discount: 0,
    total: 3528,
    paymentMethod: 'gcash',
    cashier: 'Maria Santos',
    timestamp: new Date(),
    deliveryMethod: 'email',
    status: 'pending'
  };

  const handleSendReceipt = async (method: 'email' | 'sms' | 'qr', contact?: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`Sending receipt via ${method} to ${contact}`);
  };

  return (
    <div className="p-6">
      <button
        onClick={() => setShowReceipt(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Show Electronic Receipt
      </button>

      {showReceipt && (
        <ElectronicReceipts
          receipt={sampleReceipt}
          onClose={() => setShowReceipt(false)}
          onSend={handleSendReceipt}
        />
      )}
    </div>
  );
};

export default ElectronicReceipts;
export { ElectronicReceiptDemo };