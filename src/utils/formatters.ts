// Formatting utilities for FBMS

export const formatCurrency = (amount: number | undefined | null, currency: string = 'PHP'): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₱0.00';
  }
  
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol'
  }).format(amount);
};

export const formatNumber = (num: number | undefined | null, decimals: number = 2): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Safe date parsing function
export const parseDate = (date: Date | string | null | undefined): Date | null => {
  if (!date) return null;
  try {
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  } catch (error) {
    console.warn('Invalid date value:', date, error);
    return null;
  }
};

export const formatDate = (date: Date | string | null | undefined, format: 'short' | 'long' | 'time' = 'short'): string => {
  const dateObj = parseDate(date);
  if (!dateObj) {
    return 'Invalid Date';
  }
  try {
    switch (format) {
      case 'long':
        return dateObj.toLocaleDateString('en-PH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'time':
        return dateObj.toLocaleTimeString('en-PH', {
          hour: '2-digit',
          minute: '2-digit'
        });
      default:
        return dateObj.toLocaleDateString('en-PH');
    }
  } catch (error) {
    console.warn('Error formatting date:', date, error);
    return 'Invalid Date';
  }
};

export const formatPhoneNumber = (phone: string): string => {
  // Format Philippine phone numbers
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return `+63 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  } else if (cleaned.length === 10 && cleaned.startsWith('9')) {
    return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  return phone;
};

export const formatTIN = (tin: string): string => {
  const cleaned = tin.replace(/\D/g, '');
  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  return tin;
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const formatBusinessHours = (openTime: string, closeTime: string): string => {
  return `${openTime} - ${closeTime}`;
};

export const formatInvoiceNumber = (prefix: string = 'INV', number: number): string => {
  const paddedNumber = number.toString().padStart(6, '0');
  return `${prefix}-${paddedNumber}`;
};

export const formatReceiptNumber = (prefix: string = 'RCP', timestamp: number): string => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp');
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const time = timestamp.toString().slice(-6);
    return `${prefix}-${year}${month}${day}-${time}`;
  } catch (error) {
    console.warn('Error formatting receipt number:', timestamp, error);
    return `${prefix}-${Date.now()}`;
  }
};