import React, { useState } from 'react';
import { CreditCard, Smartphone, Building, DollarSign, X, Check } from 'lucide-react';
import { PaymentMethod } from '../../types/business';

interface PaymentModalProps {
  total: number;
  onPayment: (paymentMethod: PaymentMethod, cashReceived?: number) => void | Promise<void>;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ total, onPayment, onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMethods = [
    { id: 'cash' as PaymentMethod, name: 'Cash', icon: DollarSign, color: 'bg-green-500' },
    { id: 'gcash' as PaymentMethod, name: 'GCash', icon: Smartphone, color: 'bg-blue-500' },
    { id: 'paymaya' as PaymentMethod, name: 'PayMaya', icon: Smartphone, color: 'bg-purple-500' },
    { id: 'bank_transfer' as PaymentMethod, name: 'Bank Transfer', icon: Building, color: 'bg-indigo-500' },
    { id: 'credit_card' as PaymentMethod, name: 'Credit Card', icon: CreditCard, color: 'bg-orange-500' },
  ];

  const cashAmount = parseFloat(cashReceived) || 0;
  const change = cashAmount - total;

  const handlePayment = async () => {
    if (selectedMethod === 'cash' && cashAmount < total) {
      return;
    }

    setIsProcessing(true);
    
    try {
      // Handle both sync and async payment functions
      const result = selectedMethod === 'cash' 
        ? onPayment(selectedMethod, cashAmount)
        : onPayment(selectedMethod);
      
      if (result instanceof Promise) {
        await result;
      }
      setIsProcessing(false);
    } catch (error) {
      console.error('Payment processing error:', error);
      setIsProcessing(false);
      // Could add error handling UI here
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Process Payment</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">₱{total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Select Payment Method</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-8 h-8 ${method.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{method.name}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cash Payment Details */}
          {selectedMethod === 'cash' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Received
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {cashAmount > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span>₱{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cash Received:</span>
                    <span>₱{cashAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>Change:</span>
                    <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ₱{change.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Digital Payment Info */}
          {selectedMethod !== 'cash' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Please ensure the customer has completed the {paymentMethods.find(m => m.id === selectedMethod)?.name} payment 
                before proceeding.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={
                isProcessing || 
                (selectedMethod === 'cash' && (cashAmount < total || !cashReceived))
              }
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  Complete Sale
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;