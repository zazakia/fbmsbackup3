import { StockValidationError } from '../utils/stockValidation';

// Error types for better error handling
export type ValidationError = {
  code: 'VALIDATION_ERROR';
  message: string;
  errors: StockValidationError[];
};

export type DatabaseError = {
  code: 'DATABASE_ERROR';
  message: string;
  details?: string;
  operation?: string;
};

export type NetworkError = {
  code: 'NETWORK_ERROR';
  message: string;
  retryCount?: number;
};

export type BusinessError = {
  code: 'BUSINESS_ERROR';
  message: string;
  context?: string;
};

export type SystemError = ValidationError | DatabaseError | NetworkError | BusinessError;

export class ErrorHandlingService {
  // Format stock validation errors into user-friendly messages
  static formatValidationError(errors: StockValidationError[]): ValidationError {
    const messages = errors.map(error => {
      switch (error.code) {
        case 'INSUFFICIENT_STOCK':
          return `Insufficient stock for "${error.productName}". Available: ${error.availableStock}, Requested: ${error.requestedQuantity}`;
        case 'NEGATIVE_STOCK':
          return `Operation would result in negative stock for "${error.productName}"`;
        case 'INVALID_QUANTITY':
          return `Invalid quantity for "${error.productName}": ${error.requestedQuantity}`;
        case 'PRODUCT_NOT_FOUND':
          return `Product not found: ${error.productName}`;
        case 'MOVEMENT_TYPE_MISMATCH':
          return `Invalid movement type for "${error.productName}"`;
        case 'CONCURRENT_MODIFICATION':
          return `Stock level changed for "${error.productName}" while in cart. Please refresh.`;
        default:
          return error.message;
      }
    });

    return {
      code: 'VALIDATION_ERROR',
      message: messages.join('. '),
      errors
    };
  }

  // Format database errors
  static formatDatabaseError(error: any, operation?: string): DatabaseError {
    return {
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
      details: error?.message || error?.toString(),
      operation
    };
  }

  // Format network errors
  static formatNetworkError(error: any, retryCount?: number): NetworkError {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network operation failed',
      retryCount
    };
  }

  // Format business logic errors
  static formatBusinessError(message: string, context?: string): BusinessError {
    return {
      code: 'BUSINESS_ERROR',
      message,
      context
    };
  }

  // Log errors with appropriate severity and details
  static logError(error: SystemError, severity: 'low' | 'medium' | 'high' = 'medium'): void {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      severity,
      ...error
    };

    switch (severity) {
      case 'high':
        console.error(JSON.stringify(logMessage, null, 2));
        break;
      case 'medium':
        console.warn(JSON.stringify(logMessage, null, 2));
        break;
      case 'low':
        console.info(JSON.stringify(logMessage, null, 2));
        break;
    }
  }

  // Determine error severity based on error type and details
  static determineErrorSeverity(error: SystemError): 'low' | 'medium' | 'high' {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        // High severity if multiple products affected
        return error.errors.length > 1 ? 'high' : 'medium';
      
      case 'DATABASE_ERROR':
        // High severity for all database errors
        return 'high';
      
      case 'NETWORK_ERROR':
        // High severity if multiple retries failed
        return error.retryCount && error.retryCount > 2 ? 'high' : 'medium';
      
      case 'BUSINESS_ERROR':
        // Medium severity by default for business errors
        return 'medium';
      
      default:
        return 'medium';
    }
  }

  // Get suggested actions based on error type
  static getSuggestedActions(error: SystemError): string[] {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return error.errors.flatMap(err => err.suggestions || []);
      
      case 'DATABASE_ERROR':
        return [
          'Try the operation again',
          'Contact system administrator if the issue persists',
          'Check database connectivity'
        ];
      
      case 'NETWORK_ERROR':
        return [
          'Check your internet connection',
          'Try the operation again',
          'Contact support if the issue persists'
        ];
      
      case 'BUSINESS_ERROR':
        return [
          'Review the business rules',
          'Contact your supervisor for assistance'
        ];
      
      default:
        return ['Try the operation again later'];
    }
  }

  // Handle error with automatic logging and suggested actions
  static handleError(error: SystemError): {
    message: string;
    severity: 'low' | 'medium' | 'high';
    suggestions: string[];
  } {
    const severity = this.determineErrorSeverity(error);
    const suggestions = this.getSuggestedActions(error);
    
    // Log error
    this.logError(error, severity);

    return {
      message: error.message,
      severity,
      suggestions
    };
  }
}