import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Building2, 
  Check, 
  Calculator,
  Printer,
  Receipt,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { PaymentMethod, CartItem, Customer } from '../../types/business';
import { formatCurrency, formatReceiptNumber } from '../../utils/formatters';

interface EnhancedPaymentModalProps {
  total: number;
  onPayment: (paymentMethod: PaymentMethod, cashReceived?: number, splitPayments?: SplitPayment[]) => void;
  onClose: () => void;
  customer?: Customer | null;
  items: CartItem[];
  discount: number;
  tax: number;
}

interface SplitPayment {
  method: PaymentMethod;
  amount: number;
}

const EnhancedPaymentModal: React.FC<EnhancedPaymentModalProps> = ({
  total,
  onPayment,
  onClose,
  customer,
  items,
  discount,
  tax
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [currentSplitMethod, setCurrentSplitMethod] = useState<PaymentMethod>('cash');
  const [currentSplitAmount, setCurrentSplitAmount] = useState<string>('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('0');
  const [calculatorDisplay, setCalculatorDisplay] = useState('0');
  const [calculatorOperation, setCalculatorOperation] = useState<string | null>(null);
  const [calculatorPrevValue, setCalculatorPrevValue] = useState<string | null>(null);
  
  const cashInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const paymentMethods: Array<{
    id: PaymentMethod;
    name: string;
    icon: React.ReactNode;
    description: string;
    color: string;
  }> = [
    {
      id: 'cash',
      name: 'Cash',
      icon: <Banknote className="h-5 w-5" />,
      description: 'Physical cash payment',
      color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
    },
    {
      id: 'gcash',
      name: 'GCash',
      icon: <Smartphone className="h-5 w-5" />,
      description: 'Digital wallet payment',
      color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      icon: <Smartphone className="h-5 w-5" />,
      description: 'Digital wallet payment',
      color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
    },
    {
      id: 'credit_card',
      name: 'Credit Card',
      icon: <CreditCard className="h-5 w-5" />,
      description: 'Credit/Debit card payment',
      color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: <Building2 className="h-5 w-5" />,
      description: 'Direct bank transfer',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
    },
    {
      id: 'check',
      name: 'Check',
      icon: <Check className="h-5 w-5" />,
      description: 'Bank check payment',
      color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
    }
  ];

  useEffect(() => {
    // Focus on cash input when modal opens
    if (selectedMethod === 'cash' && cashInputRef.current) {
      cashInputRef.current.focus();
    }
  }, [selectedMethod]);

  useEffect(() => {
    // Handle keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key) {
        case '1':
          setSelectedMethod('cash');
          break;
        case '2':
          setSelectedMethod('gcash');
          break;
        case '3':
          setSelectedMethod('paymaya');
          break;
        case '4':
          setSelectedMethod('credit_card');
          break;
        case '5':
          setSelectedMethod('bank_transfer');
          break;
        case '6':
          setSelectedMethod('check');
          break;
        case 'Enter':
          if (!isSplitPayment && (selectedMethod !== 'cash' || parseFloat(cashReceived) >= total)) {
            handlePayment();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedMethod, cashReceived, total, isSplitPayment]);

  const suggestedAmounts = [
    Math.ceil(total / 100) * 100, // Round up to nearest 100
    Math.ceil(total / 500) * 500, // Round up to nearest 500
    Math.ceil(total / 1000) * 1000, // Round up to nearest 1000
  ].filter((amount, index, arr) => arr.indexOf(amount) === index && amount > total);

  const change = parseFloat(cashReceived) - total;
  const isValidCashAmount = selectedMethod !== 'cash' || parseFloat(cashReceived) >= total;

  const handlePayment = () => {
    if (isSplitPayment) {
      const totalSplitAmount = splitPayments.reduce((sum, payment) => sum + payment.amount, 0);
      if (Math.abs(totalSplitAmount - total) < 0.01) {
        onPayment('cash', undefined, splitPayments); // Use 'cash' as primary method for split payments
      }
    } else {
      const cashAmount = selectedMethod === 'cash' ? parseFloat(cashReceived) : undefined;
      onPayment(selectedMethod, cashAmount);
    }
  };

  const handleAddSplitPayment = () => {
    if (currentSplitAmount && parseFloat(currentSplitAmount) > 0) {
      const amount = parseFloat(currentSplitAmount);
      const remainingAmount = total - splitPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      if (amount <= remainingAmount) {
        setSplitPayments(prev => [...prev, {
          method: currentSplitMethod,
          amount: amount
        }]);
        setCurrentSplitAmount('');
      }
    }
  };

  const handleRemoveSplitPayment = (index: number) => {
    setSplitPayments(prev => prev.filter((_, i) => i !== index));
  };

  const remainingSplitAmount = total - splitPayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculator functions
  const handleCalculatorNumber = (num: string) => {
    if (calculatorDisplay === '0') {
      setCalculatorDisplay(num);
    } else {
      setCalculatorDisplay(calculatorDisplay + num);
    }
  };

  const handleCalculatorOperation = (op: string) => {
    setCalculatorPrevValue(calculatorDisplay);
    setCalculatorOperation(op);
    setCalculatorDisplay('0');
  };

  const handleCalculatorEquals = () => {
    if (calculatorPrevValue && calculatorOperation) {
      const prev = parseFloat(calculatorPrevValue);
      const current = parseFloat(calculatorDisplay);
      let result = 0;

      switch (calculatorOperation) {
        case '+':
          result = prev + current;
          break;
        case '-':
          result = prev - current;
          break;
        case '*':
          result = prev * current;
          break;
        case '/':
          result = prev / current;
          break;
      }

      setCalculatorDisplay(result.toString());
      setCalculatorValue(result.toString());
      setCalculatorPrevValue(null);
      setCalculatorOperation(null);
    }
  };

  const handleCalculatorClear = () => {
    setCalculatorDisplay('0');
    setCalculatorValue('0');
    setCalculatorPrevValue(null);
    setCalculatorOperation(null);
  };

  const handleUseCalculatorValue = () => {
    setCashReceived(calculatorDisplay);
    setShowCalculator(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Process Payment
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left Column - Payment Methods */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Select Payment Method</h3>
              
              {/* Split Payment Toggle */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSplitPayment}
                    onChange={(e) => setIsSplitPayment(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Split Payment</span>
                </label>
              </div>

              {!isSplitPayment ? (
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method, index) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedMethod === method.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : method.color
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        {method.icon}
                        <span className="ml-2 font-medium">{method.name}</span>
                        <span className="ml-auto text-xs bg-gray-200 dark:bg-dark-600 px-2 py-1 rounded">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{method.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Add Split Payment */}
                  <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Add Payment Method</h4>
                    <div className="flex space-x-2 mb-3">
                      <select
                        value={currentSplitMethod}
                        onChange={(e) => setCurrentSplitMethod(e.target.value as PaymentMethod)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                      >
                        {paymentMethods.map(method => (
                          <option key={method.id} value={method.id}>{method.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={currentSplitAmount}
                        onChange={(e) => setCurrentSplitAmount(e.target.value)}
                        placeholder="Amount"
                        step="0.01"
                        max={remainingSplitAmount}
                        className="w-32 px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                      />
                      <button
                        onClick={handleAddSplitPayment}
                        disabled={!currentSplitAmount || parseFloat(currentSplitAmount) <= 0 || parseFloat(currentSplitAmount) > remainingSplitAmount}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Remaining: ₱{remainingSplitAmount.toFixed(2)}
                    </p>
                  </div>

                  {/* Split Payments List */}
                  {splitPayments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Payment Methods</h4>
                      {splitPayments.map((payment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                          <div className="flex items-center">
                            {paymentMethods.find(m => m.id === payment.method)?.icon}
                            <span className="ml-2 font-medium">
                              {paymentMethods.find(m => m.id === payment.method)?.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">₱{payment.amount.toFixed(2)}</span>
                            <button
                              onClick={() => handleRemoveSplitPayment(index)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cash Input */}
            {(selectedMethod === 'cash' && !isSplitPayment) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cash Received
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      ref={cashInputRef}
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      step="0.01"
                      min={total}
                      placeholder={total.toFixed(2)}
                      className="w-full pl-10 pr-4 py-3 text-lg border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {parseFloat(cashReceived) >= total && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center justify-between text-green-800 dark:text-green-200">
                        <span className="font-medium">Change:</span>
                        <span className="text-xl font-bold">₱{change.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {parseFloat(cashReceived) > 0 && parseFloat(cashReceived) < total && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center text-red-800 dark:text-red-200">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span>Insufficient amount. Need ₱{(total - parseFloat(cashReceived)).toFixed(2)} more.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Amount Buttons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quick Amounts
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setCashReceived(total.toFixed(2))}
                      className="px-3 py-2 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Exact
                    </button>
                    {suggestedAmounts.slice(0, 2).map(amount => (
                      <button
                        key={amount}
                        onClick={() => setCashReceived(amount.toString())}
                        className="px-3 py-2 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg text-sm font-medium transition-colors"
                      >
                        ₱{amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculator Toggle */}
                <button
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="flex items-center px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {showCalculator ? 'Hide Calculator' : 'Show Calculator'}
                </button>

                {/* Calculator */}
                {showCalculator && (
                  <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                    <div className="mb-3">
                      <div className="bg-white dark:bg-dark-800 p-3 rounded border text-right text-xl font-mono">
                        {calculatorDisplay}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {['C', '/', '*', '←'].map(btn => (
                        <button
                          key={btn}
                          onClick={() => {
                            if (btn === 'C') handleCalculatorClear();
                            else if (btn === '←') setCalculatorDisplay(calculatorDisplay.slice(0, -1) || '0');
                            else handleCalculatorOperation(btn);
                          }}
                          className="p-2 bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500 rounded text-sm font-medium"
                        >
                          {btn}
                        </button>
                      ))}
                      {['7', '8', '9', '+', '4', '5', '6', '-', '1', '2', '3', '=', '0', '.'].map(btn => (
                        <button
                          key={btn}
                          onClick={() => {
                            if (btn === '=' || btn === '+' || btn === '-') {
                              if (btn === '=') handleCalculatorEquals();
                              else handleCalculatorOperation(btn);
                            } else {
                              handleCalculatorNumber(btn);
                            }
                          }}
                          className={`p-2 rounded text-sm font-medium ${
                            btn === '=' 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 col-span-2' 
                              : 'bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500'
                          }`}
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleUseCalculatorValue}
                      className="w-full mt-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Use This Amount
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Order Summary</h3>
              
              {/* Customer Info */}
              {customer && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                        {customer.firstName[0]}{customer.lastName[0]}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">{customer.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {items.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-dark-700">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{item.product.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.quantity} × ₱{item.product.price.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      ₱{item.total.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal:</span>
                  <span>₱{(total + discount - tax).toFixed(2)}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount:</span>
                    <span>-₱{discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax (12%):</span>
                  <span>₱{tax.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-dark-700">
                  <span>Total:</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handlePayment}
                disabled={!isSplitPayment ? !isValidCashAmount : Math.abs(remainingSplitAmount) > 0.01}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <Check className="h-5 w-5 mr-2" />
                Complete Payment (Enter)
              </button>
              
              <button
                onClick={onClose}
                className="w-full border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Cancel (Esc)
              </button>
            </div>

            {/* Keyboard Shortcuts Help */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong>Keyboard Shortcuts:</strong></p>
              <p>1-6: Select payment method</p>
              <p>Enter: Complete payment</p>
              <p>Esc: Cancel</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPaymentModal;