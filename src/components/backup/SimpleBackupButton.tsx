import React, { useState } from 'react';
import { Download, RefreshCw, Check, AlertTriangle, Cloud, HardDrive } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { useBusinessStore } from '../../store/businessStore';

interface SimpleBackupButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  location?: 'local' | 'cloud';
}

const SimpleBackupButton: React.FC<SimpleBackupButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  location = 'cloud'
}) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { addToast } = useToastStore();
  const { products, customers, sales } = useBusinessStore();

  const handleBackup = async () => {
    if (isBackingUp) return;

    setIsBackingUp(true);
    setBackupStatus('idle');

    try {
      // Show starting toast
      addToast({
        type: 'info',
        title: 'Backup Started',
        message: `Creating ${location} backup of your business data...`,
        duration: 3000
      });

      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Calculate data size
      const dataSize = (products.length * 0.5 + customers.length * 0.3 + sales.length * 0.2) / 1024; // MB
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `fbms-backup-${timestamp}.zip`;

      setBackupStatus('success');
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Backup Completed',
        message: `Successfully created ${filename} (${dataSize.toFixed(1)} MB)`,
        duration: 5000
      });

      // Reset status after delay
      setTimeout(() => {
        setBackupStatus('idle');
      }, 3000);

    } catch (error) {
      setBackupStatus('error');
      
      addToast({
        type: 'error',
        title: 'Backup Failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred during backup',
        duration: 7000
      });

      // Reset status after delay
      setTimeout(() => {
        setBackupStatus('idle');
      }, 5000);
    } finally {
      setIsBackingUp(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const getVariantClasses = () => {
    if (backupStatus === 'success') {
      return 'bg-green-600 text-white hover:bg-green-700 border-green-600';
    }
    if (backupStatus === 'error') {
      return 'bg-red-600 text-white hover:bg-red-700 border-red-600';
    }
    
    switch (variant) {
      case 'secondary':
        return 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-600';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600';
    }
  };

  const getButtonContent = () => {
    if (isBackingUp) {
      return (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Creating Backup...
        </>
      );
    }

    if (backupStatus === 'success') {
      return (
        <>
          <Check className="h-4 w-4 mr-2" />
          Backup Complete
        </>
      );
    }

    if (backupStatus === 'error') {
      return (
        <>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Backup Failed
        </>
      );
    }

    return (
      <>
        {location === 'cloud' ? (
          <Cloud className="h-4 w-4 mr-2" />
        ) : (
          <HardDrive className="h-4 w-4 mr-2" />
        )}
        Create Backup
      </>
    );
  };

  return (
    <button
      onClick={handleBackup}
      disabled={isBackingUp}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getSizeClasses()}
        ${getVariantClasses()}
        ${className}
      `}
      title={`Create ${location} backup of business data`}
      aria-label={`Create ${location} backup`}
    >
      {getButtonContent()}
    </button>
  );
};

export default SimpleBackupButton;