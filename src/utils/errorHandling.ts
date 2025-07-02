// Comprehensive error handling utilities for FBMS

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  context?: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLog {
  error: AppError;
  severity: ErrorSeverity;
  userAgent?: string;
  url?: string;
  userId?: string;
}

// Error codes for different types of errors
export const ERROR_CODES = {
  // Database errors
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  DB_RECORD_NOT_FOUND: 'DB_RECORD_NOT_FOUND',
  
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  
  // Business logic errors
  BUSINESS_INSUFFICIENT_STOCK: 'BUSINESS_INSUFFICIENT_STOCK',
  BUSINESS_DUPLICATE_RECORD: 'BUSINESS_DUPLICATE_RECORD',
  BUSINESS_INVALID_OPERATION: 'BUSINESS_INVALID_OPERATION',
  BUSINESS_CONSTRAINT_VIOLATION: 'BUSINESS_CONSTRAINT_VIOLATION',
  
  // API errors
  API_NETWORK_ERROR: 'API_NETWORK_ERROR',
  API_TIMEOUT: 'API_TIMEOUT',
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  API_SERVER_ERROR: 'API_SERVER_ERROR',
  
  // File handling errors
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  FILE_TYPE_INVALID: 'FILE_TYPE_INVALID',
  
  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// User-friendly error messages
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.DB_CONNECTION_FAILED]: 'Unable to connect to the database. Please try again later.',
  [ERROR_CODES.DB_QUERY_FAILED]: 'Database operation failed. Please try again.',
  [ERROR_CODES.DB_CONSTRAINT_VIOLATION]: 'This operation violates business rules.',
  [ERROR_CODES.DB_RECORD_NOT_FOUND]: 'The requested record was not found.',
  
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
  [ERROR_CODES.AUTH_USER_NOT_FOUND]: 'User account not found.',
  
  [ERROR_CODES.VALIDATION_FAILED]: 'Please check your input and try again.',
  [ERROR_CODES.VALIDATION_REQUIRED_FIELD]: 'This field is required.',
  [ERROR_CODES.VALIDATION_INVALID_FORMAT]: 'Please enter a valid format.',
  [ERROR_CODES.VALIDATION_OUT_OF_RANGE]: 'Value is out of acceptable range.',
  
  [ERROR_CODES.BUSINESS_INSUFFICIENT_STOCK]: 'Insufficient stock for this operation.',
  [ERROR_CODES.BUSINESS_DUPLICATE_RECORD]: 'A record with this information already exists.',
  [ERROR_CODES.BUSINESS_INVALID_OPERATION]: 'This operation is not allowed.',
  [ERROR_CODES.BUSINESS_CONSTRAINT_VIOLATION]: 'This action violates business constraints.',
  
  [ERROR_CODES.API_NETWORK_ERROR]: 'Network error. Please check your connection.',
  [ERROR_CODES.API_TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_CODES.API_RATE_LIMIT]: 'Too many requests. Please wait and try again.',
  [ERROR_CODES.API_SERVER_ERROR]: 'Server error. Please try again later.',
  
  [ERROR_CODES.FILE_UPLOAD_FAILED]: 'File upload failed. Please try again.',
  [ERROR_CODES.FILE_SIZE_EXCEEDED]: 'File size is too large.',
  [ERROR_CODES.FILE_TYPE_INVALID]: 'Invalid file type.',
  
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
};

// Create a standardized error
export const createError = (
  code: keyof typeof ERROR_CODES,
  message?: string,
  details?: any,
  context?: string
): AppError => {
  return {
    code,
    message: message || ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    details,
    timestamp: new Date(),
    context
  };
};

// Handle Supabase errors
export const handleSupabaseError = (error: any, context?: string): AppError => {
  if (!error) {
    return createError(ERROR_CODES.UNKNOWN_ERROR, undefined, undefined, context);
  }

  // Handle different types of Supabase errors
  if (error.message) {
    if (error.message.includes('unique constraint')) {
      return createError(ERROR_CODES.BUSINESS_DUPLICATE_RECORD, 'This record already exists.', error, context);
    }
    
    if (error.message.includes('foreign key constraint')) {
      return createError(ERROR_CODES.BUSINESS_CONSTRAINT_VIOLATION, 'Cannot perform this operation due to related records.', error, context);
    }
    
    if (error.message.includes('not found')) {
      return createError(ERROR_CODES.DB_RECORD_NOT_FOUND, 'Record not found.', error, context);
    }
    
    if (error.message.includes('Invalid login credentials')) {
      return createError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, undefined, error, context);
    }
    
    if (error.message.includes('JWT expired')) {
      return createError(ERROR_CODES.AUTH_TOKEN_EXPIRED, undefined, error, context);
    }
    
    if (error.message.includes('permission')) {
      return createError(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, undefined, error, context);
    }
  }

  // Default to database query failed
  return createError(ERROR_CODES.DB_QUERY_FAILED, error.message, error, context);
};

// Handle network errors
export const handleNetworkError = (error: any, context?: string): AppError => {
  if (error.name === 'AbortError') {
    return createError(ERROR_CODES.API_TIMEOUT, 'Request was cancelled.', error, context);
  }
  
  if (!navigator.onLine) {
    return createError(ERROR_CODES.API_NETWORK_ERROR, 'No internet connection.', error, context);
  }
  
  if (error.code === 'NETWORK_ERROR') {
    return createError(ERROR_CODES.API_NETWORK_ERROR, undefined, error, context);
  }
  
  return createError(ERROR_CODES.API_SERVER_ERROR, error.message, error, context);
};

// Error severity classification
export const getErrorSeverity = (error: AppError): ErrorSeverity => {
  switch (error.code) {
    case ERROR_CODES.DB_CONNECTION_FAILED:
    case ERROR_CODES.AUTH_TOKEN_EXPIRED:
    case ERROR_CODES.API_SERVER_ERROR:
      return 'critical';
      
    case ERROR_CODES.DB_QUERY_FAILED:
    case ERROR_CODES.AUTH_INVALID_CREDENTIALS:
    case ERROR_CODES.API_NETWORK_ERROR:
      return 'high';
      
    case ERROR_CODES.VALIDATION_FAILED:
    case ERROR_CODES.BUSINESS_INSUFFICIENT_STOCK:
    case ERROR_CODES.FILE_UPLOAD_FAILED:
      return 'medium';
      
    default:
      return 'low';
  }
};

// Error logging utility
export const logError = (error: AppError, context?: any): void => {
  const errorLog: ErrorLog = {
    error,
    severity: getErrorSeverity(error),
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: context?.userId
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.group(`🚨 ${errorLog.severity.toUpperCase()} ERROR`);
    console.error('Error:', error);
    console.log('Context:', context);
    console.log('Full Log:', errorLog);
    console.groupEnd();
  }

  // In production, you would send this to your error tracking service
  // Example: Sentry, LogRocket, or custom logging endpoint
  if (import.meta.env.PROD) {
    // sendToErrorTrackingService(errorLog);
  }

  // Store critical errors in localStorage as backup
  if (errorLog.severity === 'critical') {
    try {
      const existingErrors = JSON.parse(localStorage.getItem('fbms_critical_errors') || '[]');
      existingErrors.push({
        ...errorLog,
        timestamp: errorLog.error.timestamp.toISOString()
      });
      
      // Keep only last 10 critical errors
      const limitedErrors = existingErrors.slice(-10);
      localStorage.setItem('fbms_critical_errors', JSON.stringify(limitedErrors));
    } catch (e) {
      console.warn('Failed to store critical error in localStorage:', e);
    }
  }
};

// Retry utility for failed operations
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
};

// Safe async operation wrapper
export const safeAsync = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: AppError | null }> => {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error 
      ? handleNetworkError(err, context)
      : createError(ERROR_CODES.UNKNOWN_ERROR, 'Unknown error occurred', err, context);
    
    logError(error, { context });
    return { data: null, error };
  }
};

// React hook for error boundary
export const useErrorHandler = () => {
  const handleError = (error: any, context?: string) => {
    const appError = error instanceof Error 
      ? createError(ERROR_CODES.UNKNOWN_ERROR, error.message, error, context)
      : createError(ERROR_CODES.UNKNOWN_ERROR, 'Unknown error', error, context);
    
    logError(appError, { context });
    return appError;
  };

  return { handleError };
};

// Validate and format error responses for UI
export const formatErrorForUI = (error: AppError): string => {
  // Return user-friendly message
  return error.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
};

// Check if error is recoverable
export const isRecoverableError = (error: AppError): boolean => {
  const recoverableErrors = [
    ERROR_CODES.API_NETWORK_ERROR,
    ERROR_CODES.API_TIMEOUT,
    ERROR_CODES.DB_QUERY_FAILED
  ];
  
  return recoverableErrors.includes(error.code as any);
};