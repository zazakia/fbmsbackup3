import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Mail,
  MessageSquare,
  Download,
  Printer,
  QrCode,
  X,
  Check,
  Send,
  Copy,
  Eye,
  Shield,
  Clock
} from 'lucide-react';
import { Sale, Customer } from '../../types/business';
import { receiptService, ReceiptData } from '../../services/receiptService';
import { useToastStore } from '../../store/toastStore';

interface ReceiptModalProps {
  sale: Sale;
  customer?: Customer;
  onClose: () => void;
  onSendReceipt?: (method: 'email' | 'sms' | 'print', contact?: string) => Promise<void>;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  customer,
  onClose,
  onSendReceipt
}) => {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'send'>('preview');
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms' | 'print'>('email');
  const [contactInfo, setContactInfo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  
  const { addToast } = useToastStore();

  // Generate receipt data on component mount
  useEffect(() => {
    const receipt = receiptService.createReceiptData(sale, customer);
    setReceiptData(receipt);
    
    // Pre-fill contact info if customer is available
    if (customer) {
      if (customer.email) {
        setContactInfo(customer.email);
        setDeliveryMethod('email');
      } else if (customer.phone) {
        setContactInfo(customer.phone);
        setDeliveryMethod('sms');
      }
    }
  }, [sale, customer]);

  const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;
  const formatDate = (date: Date) => date.toLocaleDateString('en-PH');
  const formatTime = (date: Date) => date.toLocaleTimeString('en-PH');

  const handleSendReceipt = async () => {
    if (!receiptData) return;
    
    if (deliveryMethod !== 'print' && !contactInfo.trim()) {
      addToast({
        type: 'error',
        title: 'Missing Contact Info',
        message: `Please enter ${deliveryMethod === 'email' ? 'email address' : 'phone number'}`
      });
      return;
    }

    setIsSending(true);
    
    try {
      if (onSendReceipt) {
        await onSendReceipt(deliveryMethod, contactInfo);
      } else {
        // Use receipt service directly
        const options = {
          email: deliveryMethod === 'email' ? contactInfo : undefined,
          phone: deliveryMethod === 'sms' ? contactInfo : undefined,
          printReceipt: deliveryMethod === 'print'
        };
        
        const result = await receiptService.processReceiptDelivery(receiptData, options);
        
        if (result.success) {
          addToast({
            type: 'success',
            title: 'Receipt Sent',
            message: `Receipt sent successfully via ${deliveryMethod}`
          });
          
          if (deliveryMethod === 'print') {
            setQrCodeGenerated(true);
          }
        } else {
          throw new Error(result.errors.join(', '));
        }
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Send Failed',
        message: `Failed to send receipt: ${(error as Error).message}`
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!receiptData) return;
    
    const receiptText = receiptService.generateReceiptText(receiptData);
    const element = document.createElement('a');
    const file = new Blob([receiptText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `receipt-${receiptData.receiptNumber}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    addToast({
      type: 'success',
      title: 'Receipt Downloaded',
      message: 'Receipt has been downloaded as text file'
    });
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;
    receiptService.printReceipt(receiptData);
  };

  const copyReceiptLink = () => {
    if (!receiptData) return;
    
    const receiptUrl = `${window.location.origin}/receipt/${receiptData.id}`;
    navigator.clipboard.writeText(receiptUrl);
    
    addToast({
      type: 'success',
      title: 'Link Copied',
      message: 'Receipt link copied to clipboard'
    });
  };

  if (!receiptData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4">Generating receipt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Receipt className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Official Receipt</h2>
              <p className="text-sm text-gray-600">{receiptData.receiptNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Eye className="h-4 w-4 inline mr-2" />
                Preview
              </button>
              <button
                onClick={() => setActiveTab('send')}
                className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'send'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Send className="h-4 w-4 inline mr-2" />
                Send
              </button>
            </div>

            {activeTab === 'preview' && (
              <div className="space-y-6">
                {/* Receipt Details */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Receipt Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Receipt No:</span>
                      <span className="font-mono">{receiptData.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice No:</span>
                      <span className="font-mono">{sale.invoiceNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{formatDate(sale.createdAt || new Date())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span>{formatTime(sale.createdAt || new Date())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(sale.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment:</span>
                      <span className="capitalize">{sale.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="capitalize text-green-600">{sale.status}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                {customer && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-3">Customer</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span>{customer.firstName} {customer.lastName}</span>
                      </div>
                      {customer.email && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="text-xs">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleDownloadReceipt}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Receipt</span>
                    </button>
                    <button
                      onClick={handlePrintReceipt}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Receipt</span>
                    </button>
                    <button
                      onClick={copyReceiptLink}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                </div>

                {/* Digital Signature */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Security</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Shield className="h-4 w-4" />
                    <span>Digitally signed and verified</span>
                  </div>
                  {receiptData.digitalSignature && (
                    <p className="font-mono text-xs text-gray-400 mt-2 break-all">
                      {receiptData.digitalSignature.slice(0, 32)}...
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'send' && (
              <div className="space-y-6">
                {/* Delivery Method */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Delivery Method</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="delivery"
                        value="print"
                        checked={deliveryMethod === 'print'}
                        onChange={(e) => setDeliveryMethod(e.target.value as 'print')}
                        className="text-blue-600"
                      />
                      <Printer className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Print</span>
                    </label>
                  </div>
                </div>

                {/* Contact Info */}
                {deliveryMethod !== 'print' && (
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

                {/* Send Button */}
                <button
                  onClick={handleSendReceipt}
                  disabled={isSending || (deliveryMethod !== 'print' && !contactInfo.trim())}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      {deliveryMethod === 'email' && <Mail className="h-4 w-4" />}
                      {deliveryMethod === 'sms' && <MessageSquare className="h-4 w-4" />}
                      {deliveryMethod === 'print' && <Printer className="h-4 w-4" />}
                      <span>
                        {deliveryMethod === 'email' ? 'Send Email' : 
                         deliveryMethod === 'sms' ? 'Send SMS' : 
                         'Print Receipt'}
                      </span>
                    </>
                  )}
                </button>

                {/* QR Code for Print */}
                {qrCodeGenerated && deliveryMethod === 'print' && (
                  <div className="border rounded-lg p-4 text-center bg-gray-50">
                    <QrCode className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm font-medium text-gray-900 mb-2">Receipt Printed</p>
                    <p className="text-xs text-gray-500">
                      QR code included for online verification
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Receipt Preview */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
            <div className="max-w-md mx-auto bg-white border border-gray-200 p-6 font-mono text-sm shadow-lg">
              {/* Business Header */}
              <div className="text-center mb-6">
                <h2 className="font-bold text-lg mb-2">{receiptData.businessInfo.name}</h2>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>{receiptData.businessInfo.address}</p>
                  <p>Tel: {receiptData.businessInfo.phone}</p>
                  <p>Email: {receiptData.businessInfo.email}</p>
                  <p>TIN: {receiptData.businessInfo.tin}</p>
                  <p>BIR Accreditation: {receiptData.businessInfo.birAccreditation}</p>
                </div>
              </div>

              <div className="border-t border-b border-gray-300 py-4 mb-4">
                <div className="text-center font-bold mb-2">OFFICIAL RECEIPT</div>
                <div className="flex justify-between text-xs">
                  <span>Receipt No:</span>
                  <span>{receiptData.receiptNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Invoice No:</span>
                  <span>{sale.invoiceNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Date:</span>
                  <span>{formatDate(sale.createdAt || new Date())}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Time:</span>
                  <span>{formatTime(sale.createdAt || new Date())}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Cashier:</span>
                  <span>{sale.cashierId}</span>
                </div>
                {customer && (
                  <div className="flex justify-between text-xs">
                    <span>Customer:</span>
                    <span>{customer.firstName} {customer.lastName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="mb-4">
                <div className="font-semibold mb-2">ITEMS PURCHASED</div>
                {sale.items.map((item, index) => (
                  <div key={index} className="mb-2">
                    <div className="flex justify-between">
                      <span className="text-xs">{item.productName}</span>
                    </div>
                    <div className="text-xs text-gray-600">SKU: {item.sku}</div>
                    <div className="flex justify-between text-xs">
                      <span>{item.quantity} x {formatCurrency(item.price)}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-300 pt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-xs mb-1">
                    <span>Discount:</span>
                    <span>-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs mb-1">
                  <span>VAT (12%):</span>
                  <span>{formatCurrency(sale.tax)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-300 pt-2">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="mt-4 pt-4 border-t border-gray-300">
                <div className="flex justify-between text-xs">
                  <span>Payment Method:</span>
                  <span className="uppercase">{sale.paymentMethod}</span>
                </div>
                {sale.cashReceived && (
                  <div className="flex justify-between text-xs">
                    <span>Cash Received:</span>
                    <span>{formatCurrency(sale.cashReceived)}</span>
                  </div>
                )}
                {sale.change && (
                  <div className="flex justify-between text-xs">
                    <span>Change:</span>
                    <span>{formatCurrency(sale.change)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center text-xs mt-6 pt-4 border-t border-gray-300">
                <p className="mb-2 font-semibold">Thank you for your business!</p>
                <p className="text-gray-500">Please keep this receipt for your records.</p>
                <p className="text-gray-500 mt-2">
                  This receipt is BIR-compliant and serves as<br />
                  proof of purchase for warranty claims.
                </p>
                <p className="text-gray-500 mt-2">
                  For questions or concerns, contact us at:<br />
                  {receiptData.businessInfo.email}<br />
                  {receiptData.businessInfo.phone}
                </p>
              </div>

              {/* Digital Signature */}
              <div className="text-center text-xs mt-4 pt-4 border-t border-gray-300">
                <div className="flex items-center justify-center space-x-1 text-gray-500">
                  <Shield className="h-3 w-3" />
                  <span>Digitally signed and verified</span>
                </div>
                {receiptData.digitalSignature && (
                  <p className="font-mono text-xs text-gray-400 mt-1 break-all">
                    {receiptData.digitalSignature.slice(0, 32)}...
                  </p>
                )}
                <p className="text-gray-400 mt-2">
                  Generated: {formatDate(new Date())} {formatTime(new Date())}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;