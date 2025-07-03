import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  QrCode,
  Check,
  X,
  Clock,
  AlertTriangle,
  Copy,
  RefreshCw,
  CreditCard,
  MessageSquare,
  Shield,
  Zap,
  Link
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface PayMayaPaymentProps {
  amount: number;
  orderId: string;
  onSuccess: (transactionId: string) => void;
  onCancel: () => void;
  customerEmail?: string;
}

interface PayMayaTransaction {
  id: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'expired';
  qrCode: string;
  checkoutUrl: string;
  referenceNumber: string;
  expiresAt: Date;
}

const PayMayaIntegration: React.FC<PayMayaPaymentProps> = ({
  amount,
  orderId,
  onSuccess,
  onCancel,
  customerEmail
}) => {
  const [transaction, setTransaction] = useState<PayMayaTransaction | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [isGenerating, setIsGenerating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'checkout' | 'manual'>('qr');
  const [manualReference, setManualReference] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    generatePaymentRequest();
  }, []);

  useEffect(() => {
    if (transaction && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTransaction(prev => prev ? { ...prev, status: 'expired' } : null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [transaction, timeLeft]);

  const generatePaymentRequest = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate API call to PayMaya
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const newTransaction: PayMayaTransaction = {
        id: `PAYMAYA-${Date.now()}`,
        amount,
        status: 'pending',
        qrCode: generateQRCode(amount, orderId),
        checkoutUrl: `https://payments.maya.ph/checkout/${Date.now()}`,
        referenceNumber: `PM${Date.now().toString().slice(-8)}`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      };
      
      setTransaction(newTransaction);
      setTimeLeft(600);
    } catch (error) {
      console.error('Failed to generate PayMaya payment request:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateQRCode = (amount: number, orderId: string): string => {
    // In a real implementation, this would generate an actual QR code
    // For demo purposes, we'll return a placeholder data URL
    return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDBkNGFhIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTJweCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QYXlNYXlhIFFSPC90ZXh0PgogIDx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEwcHgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+JHtmb3JtYXRDdXJyZW5jeShhbW91bnQpfTwvdGV4dD4KPC9zdmc+Cg==`;
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const copyReferenceNumber = () => {
    if (transaction) {
      navigator.clipboard.writeText(transaction.referenceNumber);
    }
  };

  const openCheckoutUrl = () => {
    if (transaction?.checkoutUrl) {
      window.open(transaction.checkoutUrl, '_blank');
    }
  };

  const verifyManualPayment = async () => {
    if (!manualReference.trim()) return;
    
    setVerifying(true);
    
    try {
      // Simulate API call to verify payment
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Simulate successful verification (85% success rate for demo)
      if (Math.random() > 0.15) {
        setTransaction(prev => prev ? { ...prev, status: 'success' } : null);
        setTimeout(() => onSuccess(manualReference), 1000);
      } else {
        throw new Error('Payment not found');
      }
    } catch (error) {
      alert('Payment verification failed. Please check the reference number.');
    } finally {
      setVerifying(false);
    }
  };

  const pollPaymentStatus = async () => {
    if (!transaction) return;
    
    try {
      // Simulate API call to check payment status
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate payment completion (25% chance for demo)
      if (Math.random() > 0.75) {
        setTransaction(prev => prev ? { ...prev, status: 'success' } : null);
        setTimeout(() => onSuccess(transaction.id), 1000);
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
    }
  };

  // Auto-poll payment status
  useEffect(() => {
    if (transaction?.status === 'pending') {
      const interval = setInterval(pollPaymentStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [transaction?.status]);

  if (isGenerating) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900">Setting up PayMaya Payment</h3>
            <p className="text-gray-600 mt-2">Please wait while we prepare your payment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Payment Setup Failed</h3>
            <p className="text-gray-600 mt-2">Unable to generate PayMaya payment request.</p>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={generatePaymentRequest}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                Retry
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">PayMaya Payment</h2>
              <p className="text-sm text-gray-600">{formatCurrency(amount)}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {transaction.status === 'pending' && (
            <>
              {/* Timer */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-2 text-orange-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setPaymentMethod('qr')}
                  className={`flex-1 py-2 px-3 text-xs font-medium border-b-2 ${
                    paymentMethod === 'qr'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <QrCode className="h-4 w-4 inline mr-1" />
                  QR Code
                </button>
                <button
                  onClick={() => setPaymentMethod('checkout')}
                  className={`flex-1 py-2 px-3 text-xs font-medium border-b-2 ${
                    paymentMethod === 'checkout'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Link className="h-4 w-4 inline mr-1" />
                  Web Checkout
                </button>
                <button
                  onClick={() => setPaymentMethod('manual')}
                  className={`flex-1 py-2 px-3 text-xs font-medium border-b-2 ${
                    paymentMethod === 'manual'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Manual
                </button>
              </div>

              {/* QR Code Method */}
              {paymentMethod === 'qr' && (
                <div className="text-center">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-4 inline-block">
                    <img
                      src={transaction.qrCode}
                      alt="PayMaya QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <span>Reference:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                        {transaction.referenceNumber}
                      </code>
                      <button
                        onClick={copyReferenceNumber}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium mb-1">How to pay with PayMaya:</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Open your PayMaya app or Maya app</li>
                          <li>Tap "Scan to Pay" and scan the QR code</li>
                          <li>Review the payment details</li>
                          <li>Enter your PIN or use biometric to confirm</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={pollPaymentStatus}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Check Payment Status</span>
                  </button>
                </div>
              )}

              {/* Web Checkout Method */}
              {paymentMethod === 'checkout' && (
                <div className="text-center">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 mb-6">
                    <CreditCard className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">PayMaya Web Checkout</h3>
                    <p className="text-sm opacity-90">
                      Complete your payment securely through PayMaya's web checkout
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-2">Payment Details:</p>
                      <div className="space-y-1 text-left">
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-medium">{formatCurrency(amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reference:</span>
                          <span className="font-mono text-xs">{transaction.referenceNumber}</span>
                        </div>
                        {customerEmail && (
                          <div className="flex justify-between">
                            <span>Email:</span>
                            <span className="text-xs">{customerEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={openCheckoutUrl}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
                    >
                      <Link className="h-4 w-4" />
                      <span>Open PayMaya Checkout</span>
                    </button>
                    
                    <button
                      onClick={pollPaymentStatus}
                      className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 flex items-center justify-center space-x-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Check Payment Status</span>
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> After completing payment on the PayMaya website, 
                      click "Check Payment Status" to verify your transaction.
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Verification Method */}
              {paymentMethod === 'manual' && (
                <div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <Smartphone className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <p className="font-medium mb-1">Send money via Maya/PayMaya:</p>
                        <div className="space-y-1 text-xs">
                          <p><strong>Amount:</strong> {formatCurrency(amount)}</p>
                          <p><strong>Account Name:</strong> Your Business Name</p>
                          <p><strong>Maya Number:</strong> 09XX-XXX-XXXX</p>
                          <p><strong>Reference:</strong> {transaction.referenceNumber}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PayMaya/Maya Reference Number
                      </label>
                      <input
                        type="text"
                        value={manualReference}
                        onChange={(e) => setManualReference(e.target.value)}
                        placeholder="Enter PayMaya reference number"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the reference number from your Maya/PayMaya transaction receipt
                      </p>
                    </div>

                    <button
                      onClick={verifyManualPayment}
                      disabled={!manualReference.trim() || verifying}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {verifying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Verify Payment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {transaction.status === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-4">Your PayMaya payment has been processed.</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  Transaction ID: <code className="font-mono">{transaction.id}</code>
                </p>
              </div>
            </div>
          )}

          {transaction.status === 'expired' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Expired</h3>
              <p className="text-gray-600 mb-4">This payment request has expired.</p>
              <div className="flex space-x-3">
                <button
                  onClick={generatePaymentRequest}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                >
                  Generate New Payment
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {transaction.status === 'failed' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Failed</h3>
              <p className="text-gray-600 mb-4">There was an issue processing your payment.</p>
              <div className="flex space-x-3">
                <button
                  onClick={generatePaymentRequest}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                >
                  Try Again
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayMayaIntegration;