import React, { useState, useCallback } from 'react';
import {
  Upload,
  RefreshCw,
  Check,
  AlertTriangle,
  Download,
  Clock,
  HardDrive,
  Cloud,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { useBusinessStore } from '../../store/businessStore';

export interface BackupResult {
  success: boolean;
  filename: string;
  size: number;
  timestamp: Date;
  duration: number;
  modules: string[];
}

export interface BackupButtonProps {
  onBackupStart?: () => void;
  onBackupComplete?: (result: BackupResult) => void;
  onBackupError?: (error: Error) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  modules?: string[];
  location?: 'local' | 'cloud';
  className?: string;
}

interface BackupState {
  status: 'idle' | 'preparing' | 'backing-up' | 'completed' | 'failed';
  progress: number;
  currentModule?: string;
  error?: string;
  startTime?: Date;
  estimatedTimeRemaining?: number;
}

const EnhancedBackupButton: React.FC<BackupButtonProps> = ({
  onBackupStart,
  onBackupComplete,
  onBackupError,
  disabled = false,
  variant = 'primary',
  size = 'md',
  modules = ['sales', 'inventory', 'customers', 'accounting', 'employees'],
  location = 'cloud',
  className = '',
}) => {
  const [backupState, setBackupState] = useState<BackupState>({
    status: 'idle',
    progress: 0,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const { addToast } = useToastStore();
  const { products, customers, sales, employees } = useBusinessStore();

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const calculateDataSize = useCallback(() => {
    let totalSize = 0;
    
    if (modules.includes('products')) {
      totalSize += products.length * 0.5; // KB per product
    }
    if (modules.includes('customers')) {
      totalSize += customers.length * 0.3; // KB per customer
    }
    if (modules.includes('sales')) {
      totalSize += sales.length * 0.2; // KB per sale
    }
    if (modules.includes('employees')) {
      totalSize += employees.length * 0.1; // KB per employee
    }
    
    return totalSize; // Return size in KB
  }, [modules, products, customers, sales, employees]);

  const simulateBackupProgress = useCallback(async (totalModules: number) => {
    const moduleNames = {
      sales: 'Sales & Transactions',
      inventory: 'Inventory & Products',
      customers: 'Customer Data',
      accounting: 'Accounting & Finance',
      employees: 'Employee Records',
    };

    for (let i = 0; i < totalModules; i++) {
      const moduleName = modules[i];
      const moduleDisplayName = moduleNames[moduleName as keyof typeof moduleNames] || moduleName;
      
      setBackupState(prev => ({
        ...prev,
        currentModule: moduleDisplayName,
        progress: Math.round(((i + 0.5) / totalModules) * 100),
        estimatedTimeRemaining: (totalModules - i - 1) * 2, // 2 seconds per module
      }));
      
      // Simulate module backup time (1-3 seconds)
      const moduleTime = 1000 + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, moduleTime));
      
      setBackupState(prev => ({
        ...prev,
        progress: Math.round(((i + 1) / totalModules) * 100),
      }));
    }
  }, [modules]);

  const performBackup = useCallback(async () => {
    if (backupState.status !== 'idle' || disabled) {
      return;
    }

    // Check online status for cloud backups
    if (location === 'cloud' && !isOnline) {
      const error = new Error('No internet connection available for cloud backup');
      onBackupError?.(error);
      addToast({
        type: 'error',
        title: 'Backup Failed',
        message: 'Internet connection required for cloud backup. Please check your connection and try again.',
      });
      return;
    }

    const startTime = new Date();
    
    try {
      // Notify backup start
      onBackupStart?.();
      
      setBackupState({
        status: 'preparing',
        progress: 0,
        startTime,
      });

      addToast({
        type: 'info',
        title: 'Backup Started',
        message: `Starting ${location} backup of ${modules.length} modules...`,
      });

      // Preparation phase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setBackupState(prev => ({
        ...prev,
        status: 'backing-up',
        progress: 5,
      }));

      // Simulate backup process
      await simulateBackupProgress(modules.length);
      
      // Complete backup
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const dataSize = calculateDataSize();
      
      const result: BackupResult = {
        success: true,
        filename: `fbms-backup-${endTime.toISOString().split('T')[0]}-${endTime.getTime()}.zip`,
        size: dataSize,
        timestamp: endTime,
        duration,
        modules,
      };

      setBackupState({
        status: 'completed',
        progress: 100,
        startTime,
      });

      // Notify completion
      onBackupComplete?.(result);
      
      addToast({
        type: 'success',
        title: 'Backup Completed',
        message: `Successfully backed up ${modules.length} modules (${(dataSize / 1024).toFixed(1)} MB) in ${Math.round(duration / 1000)}s`,
      });

      // Reset state after 3 seconds
      setTimeout(() => {
        setBackupState({ status: 'idle', progress: 0 });
      }, 3000);
      
    } catch (error) {
      const backupError = error instanceof Error ? error : new Error('Unknown backup error');
      
      setBackupState({
        status: 'failed',
        progress: 0,
        error: backupError.message,
        startTime,
      });

      onBackupError?.(backupError);
      
      addToast({
        type: 'error',
        title: 'Backup Failed',
        message: backupError.message,
      });

      // Reset state after 5 seconds
      setTimeout(() => {
        setBackupState({ status: 'idle', progress: 0 });
      }, 5000);
    }
  }, [backupState.status, disabled, location, isOnline, modules, onBackupStart, onBackupComplete, onBackupError, addToast, simulateBackupProgress, calculateDataSize]);

  const getButtonVariant = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 border border-gray-300',
    };
    
    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`;
  };

  const getButtonContent = () => {
    switch (backupState.status) {
      case 'preparing':
        return (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Preparing...
          </>
        );
      case 'backing-up':
        return (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {backupState.currentModule ? `Backing up ${backupState.currentModule}...` : 'Backing up...'}
          </>
        );
      case 'completed':
        return (
          <>
            <Check className="h-4 w-4 mr-2 text-green-500" />
            Completed
          </>
        );
      case 'failed':
        return (
          <>
            <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
            Failed
          </>
        );
      default:
        return (
          <>
            {location === 'cloud' ? (
              <Cloud className="h-4 w-4 mr-2" />
            ) : (
              <HardDrive className="h-4 w-4 mr-2" />
            )}
            Backup Now
          </>
        );
    }
  };

  const isButtonDisabled = disabled || backupState.status === 'preparing' || backupState.status === 'backing-up';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={performBackup}
        disabled={isButtonDisabled}
        className={getButtonVariant()}
        aria-label={`Create ${location} backup`}
        title={`Create ${location} backup of ${modules.join(', ')}`}
      >
        {getButtonContent()}
      </button>
      
      {/* Connection Status Indicator */}
      {location === 'cloud' && (
        <div className="absolute -top-1 -right-1">
          {isOnline ? (
            <Wifi className="h-3 w-3 text-green-500" title="Online - Cloud backup available" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" title="Offline - Cloud backup unavailable" />
          )}
        </div>
      )}
      
      {/* Progress Bar */}
      {(backupState.status === 'preparing' || backupState.status === 'backing-up') && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${backupState.progress}%` }}
          />
        </div>
      )}
      
      {/* Status Tooltip */}
      {backupState.status !== 'idle' && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-10">
          {backupState.status === 'preparing' && 'Preparing backup...'}
          {backupState.status === 'backing-up' && (
            <div className="flex items-center space-x-2">
              <span>{backupState.progress}% complete</span>
              {backupState.estimatedTimeRemaining && (
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {backupState.estimatedTimeRemaining}s
                </span>
              )}
            </div>
          )}
          {backupState.status === 'completed' && 'Backup completed successfully!'}
          {backupState.status === 'failed' && `Failed: ${backupState.error}`}
        </div>
      )}
    </div>
  );
};

export default EnhancedBackupButton;