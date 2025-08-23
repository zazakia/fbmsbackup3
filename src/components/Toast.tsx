import React, { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastComponentProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent: React.FC<ToastComponentProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  }, [onClose, toast.id]);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);

    // Auto-close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.duration, handleClose]);

  const getIcon = () => {
    const iconClasses = "h-5 w-5";
    switch (toast.type) {
      case 'success':
        return <CheckCircle className={`${iconClasses} text-green-600 dark:text-green-400`} />;
      case 'error':
        return <AlertCircle className={`${iconClasses} text-red-600 dark:text-red-400`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClasses} text-yellow-600 dark:text-yellow-400`} />;
      case 'info':
        return <Info className={`${iconClasses} text-blue-600 dark:text-blue-400`} />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/90 border-green-200 dark:border-green-700 backdrop-blur-sm';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700 backdrop-blur-sm';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/90 border-yellow-200 dark:border-yellow-700 backdrop-blur-sm';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/90 border-blue-200 dark:border-blue-700 backdrop-blur-sm';
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-900 dark:text-green-100';
      case 'error':
        return 'text-red-900 dark:text-red-100';
      case 'warning':
        return 'text-yellow-900 dark:text-yellow-100';
      case 'info':
        return 'text-blue-900 dark:text-blue-100';
    }
  };

  const getActionButtonColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200';
      case 'error':
        return 'text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200';
      case 'info':
        return 'text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        min-w-80 max-w-md w-auto ${getBackgroundColor()} border rounded-lg shadow-lg pointer-events-auto
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className={`text-sm font-medium ${getTextColor()} break-words`}>
              {toast.title}
            </p>
            {toast.message && (
              <p className={`mt-1 text-sm ${getTextColor()} opacity-90 break-words`}>
                {toast.message}
              </p>
            )}
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className={`text-sm font-medium ${getActionButtonColor()} transition-colors underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current rounded`}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className={`rounded-md inline-flex ${getTextColor()} hover:opacity-75 transition-opacity`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col space-y-2">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

export { ToastComponent, ToastContainer };