// Comprehensive validation utilities for FBMS
import { sanitizeInput, sanitizeEmail, validatePassword } from './authSecurity';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  sanitize?: boolean;
}

export interface FormValidationOptions {
  sanitizeInputs?: boolean;
  strictMode?: boolean;
  fieldLabels?: Record<string, string>;
}

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (Philippine format)
export const validatePhilippinePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+63|0)[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

// Alias for validatePhilippinePhone
export const validatePhone = validatePhilippinePhone;

// TIN validation (Philippine format)
export const validateTIN = (tin: string): boolean => {
  const tinRegex = /^[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3}$/;
  return tinRegex.test(tin);
};

// SSS number validation
export const validateSSS = (sss: string): boolean => {
  const sssRegex = /^[0-9]{2}-[0-9]{7}-[0-9]{1}$/;
  return sssRegex.test(sss);
};

// PhilHealth number validation
export const validatePhilHealth = (philhealth: string): boolean => {
  const philhealthRegex = /^[0-9]{2}-[0-9]{9}-[0-9]{1}$/;
  return philhealthRegex.test(philhealth);
};

// Pag-IBIG number validation
export const validatePagIBIG = (pagibig: string): boolean => {
  const pagibigRegex = /^[0-9]{4}-[0-9]{4}-[0-9]{4}$/;
  return pagibigRegex.test(pagibig);
};

// Enhanced field validator with sanitization
export const validateField = (value: any, rules: ValidationRule, options?: FormValidationOptions): { error: string | null; sanitizedValue?: any } => {
  const { required, minLength, maxLength, pattern, custom, sanitize } = rules;
  let processedValue = value;

  // Sanitize input if requested
  if ((sanitize || options?.sanitizeInputs) && typeof value === 'string') {
    if (rules.field === 'email') {
      processedValue = sanitizeEmail(value);
    } else {
      processedValue = sanitizeInput(value);
    }
  }

  // Check if required
  if (required && (!processedValue || processedValue.toString().trim() === '')) {
    const fieldLabel = options?.fieldLabels?.[rules.field] || rules.field;
    return { error: `${fieldLabel} is required` };
  }

  // If not required and empty, skip other validations
  if (!processedValue || processedValue.toString().trim() === '') {
    return { error: null, sanitizedValue: processedValue };
  }

  const stringValue = processedValue.toString();

  // Check minimum length
  if (minLength && stringValue.length < minLength) {
    const fieldLabel = options?.fieldLabels?.[rules.field] || rules.field;
    return { error: `${fieldLabel} must be at least ${minLength} characters` };
  }

  // Check maximum length
  if (maxLength && stringValue.length > maxLength) {
    const fieldLabel = options?.fieldLabels?.[rules.field] || rules.field;
    return { error: `${fieldLabel} must not exceed ${maxLength} characters` };
  }

  // Check pattern
  if (pattern && !pattern.test(stringValue)) {
    const fieldLabel = options?.fieldLabels?.[rules.field] || rules.field;
    return { error: `${fieldLabel} format is invalid` };
  }

  // Custom validation
  if (custom) {
    const customError = custom(processedValue);
    if (customError) {
      return { error: customError };
    }
  }

  return { error: null, sanitizedValue: processedValue };
};

// Enhanced numeric validation
export const validateNumeric = (value: any, field: string, options?: { 
  min?: number; 
  max?: number; 
  integer?: boolean;
  precision?: number;
}): string | null => {
  if (value === null || value === undefined || value === '') {
    return null; // Let required validation handle empty values
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return `${field} must be a valid number`;
  }

  if (options?.integer && !Number.isInteger(numValue)) {
    return `${field} must be a whole number`;
  }

  if (options?.min !== undefined && numValue < options.min) {
    return `${field} must be at least ${options.min}`;
  }

  if (options?.max !== undefined && numValue > options.max) {
    return `${field} must not exceed ${options.max}`;
  }

  if (options?.precision !== undefined) {
    const decimalPlaces = (numValue.toString().split('.')[1] || '').length;
    if (decimalPlaces > options.precision) {
      return `${field} can have at most ${options.precision} decimal places`;
    }
  }

  return null;
};

// Date validation
export const validateDate = (value: any, field: string, options?: {
  minDate?: Date;
  maxDate?: Date;
  futureOnly?: boolean;
  pastOnly?: boolean;
}): string | null => {
  if (!value) {
    return null; // Let required validation handle empty values
  }

  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    return `${field} must be a valid date`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (options?.futureOnly && date <= today) {
    return `${field} must be a future date`;
  }

  if (options?.pastOnly && date > today) {
    return `${field} cannot be a future date`;
  }

  if (options?.minDate && date < options.minDate) {
    return `${field} must be after ${options.minDate.toLocaleDateString()}`;
  }

  if (options?.maxDate && date > options.maxDate) {
    return `${field} must be before ${options.maxDate.toLocaleDateString()}`;
  }

  return null;
};

// Enhanced object validation with sanitization
export const validateObject = (
  data: Record<string, any>, 
  rules: ValidationRule[], 
  options?: FormValidationOptions
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const sanitizedData: Record<string, any> = {};

  rules.forEach(rule => {
    const value = data[rule.field];
    const result = validateField(value, rule, options);
    
    if (result.error) {
      errors[rule.field] = result.error;
    }
    
    if (result.sanitizedValue !== undefined) {
      sanitizedData[rule.field] = result.sanitizedValue;
    }
  });

  // Add warnings for security concerns
  if (options?.strictMode) {
    for (const [field, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Check for potential XSS patterns
        if (/<script|javascript:|on\w+=/i.test(value)) {
          warnings[field] = 'Potentially unsafe content detected';
        }
        
        // Check for SQL injection patterns
        if (/(\b(union|select|insert|update|delete|drop|exec|sp_)\b|--|\/\*|\*\/)/i.test(value)) {
          warnings[field] = 'Potentially unsafe SQL patterns detected';
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
    sanitizedData: options?.sanitizeInputs ? sanitizedData : undefined
  };
};

// Authentication-specific validation
export const validateAuthData = (data: { email: string; password: string }): ValidationResult => {
  const errors: Record<string, string> = {};

  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Invalid email format';
  } else if (data.email.length > 320) {
    errors.email = 'Email is too long';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors.join(', ');
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Registration data validation
export const validateRegistrationData = (data: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role?: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // Basic auth validation
  const authValidation = validateAuthData(data);
  Object.assign(errors, authValidation.errors);

  // Confirm password
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // First name
  if (!data.firstName) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  } else if (data.firstName.length > 50) {
    errors.firstName = 'First name must not exceed 50 characters';
  } else if (!/^[a-zA-Z\s\u00C0-\u017F]+$/.test(data.firstName)) {
    errors.firstName = 'First name can only contain letters and spaces';
  }

  // Last name
  if (!data.lastName) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  } else if (data.lastName.length > 50) {
    errors.lastName = 'Last name must not exceed 50 characters';
  } else if (!/^[a-zA-Z\s\u00C0-\u017F]+$/.test(data.lastName)) {
    errors.lastName = 'Last name can only contain letters and spaces';
  }

  // Role validation (if provided)
  if (data.role) {
    const validRoles = ['admin', 'manager', 'cashier', 'accountant'];
    if (!validRoles.includes(data.role)) {
      errors.role = 'Invalid role selected';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Enhanced customer validation rules
export const customerValidationRules: ValidationRule[] = [
  {
    field: 'firstName',
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\u00C0-\u017F]+$/,
    sanitize: true
  },
  {
    field: 'lastName',
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\u00C0-\u017F]+$/,
    sanitize: true
  },
  {
    field: 'email',
    required: false,
    maxLength: 320,
    sanitize: true,
    custom: (value) => value && !validateEmail(value) ? 'Invalid email format' : null
  },
  {
    field: 'phone',
    required: false,
    maxLength: 20,
    sanitize: true,
    custom: (value) => value && !validatePhilippinePhone(value) ? 'Invalid Philippine phone number format' : null
  },
  {
    field: 'address',
    required: false,
    maxLength: 500,
    sanitize: true
  },
  {
    field: 'company',
    required: false,
    maxLength: 100,
    sanitize: true
  },
  {
    field: 'creditLimit',
    required: false,
    custom: (value) => validateNumeric(value, 'Credit limit', { min: 0, max: 999999.99, precision: 2 })
  }
];

// Enhanced product validation rules
export const productValidationRules: ValidationRule[] = [
  {
    field: 'name',
    required: true,
    minLength: 2,
    maxLength: 200,
    sanitize: true
  },
  {
    field: 'description',
    required: false,
    maxLength: 1000,
    sanitize: true
  },
  {
    field: 'sku',
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[A-Z0-9-_]+$/,
    custom: (value) => {
      if (value && typeof value === 'string') {
        return value.toUpperCase() === value ? null : 'SKU must be uppercase';
      }
      return null;
    }
  },
  {
    field: 'category',
    required: true,
    minLength: 2,
    maxLength: 100,
    sanitize: true
  },
  {
    field: 'unit',
    required: false,
    maxLength: 20,
    sanitize: true
  },
  {
    field: 'price',
    required: true,
    custom: (value) => validateNumeric(value, 'Price', { min: 0, max: 999999.99, precision: 2 })
  },
  {
    field: 'cost',
    required: false,
    custom: (value) => validateNumeric(value, 'Cost', { min: 0, max: 999999.99, precision: 2 })
  },
  {
    field: 'quantity',
    required: true,
    custom: (value) => validateNumeric(value, 'Quantity', { min: 0, max: 999999, integer: true })
  },
  {
    field: 'minStock',
    required: false,
    custom: (value) => validateNumeric(value, 'Minimum stock', { min: 0, max: 999999, integer: true })
  },
  {
    field: 'maxStock',
    required: false,
    custom: (value) => validateNumeric(value, 'Maximum stock', { min: 0, max: 999999, integer: true })
  }
];

// Employee validation rules
export const employeeValidationRules: ValidationRule[] = [
  {
    field: 'employeeId',
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[A-Z0-9-]+$/
  },
  {
    field: 'firstName',
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/
  },
  {
    field: 'lastName',
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/
  },
  {
    field: 'email',
    required: true,
    custom: (value) => validateEmail(value) ? null : 'Invalid email format'
  },
  {
    field: 'phone',
    required: true,
    custom: (value) => validatePhilippinePhone(value) ? null : 'Invalid Philippine phone number format'
  },
  {
    field: 'basicSalary',
    required: true,
    custom: (value) => {
      if (isNaN(value) || value < 0) {
        return 'Basic salary must be a positive number';
      }
      return null;
    }
  },
  {
    field: 'tinNumber',
    required: false,
    custom: (value) => value && !validateTIN(value) ? 'Invalid TIN format (XXX-XXX-XXX-XXX)' : null
  },
  {
    field: 'sssNumber',
    required: false,
    custom: (value) => value && !validateSSS(value) ? 'Invalid SSS number format (XX-XXXXXXX-X)' : null
  },
  {
    field: 'philhealthNumber',
    required: false,
    custom: (value) => value && !validatePhilHealth(value) ? 'Invalid PhilHealth number format (XX-XXXXXXXXX-X)' : null
  },
  {
    field: 'pagibigNumber',
    required: false,
    custom: (value) => value && !validatePagIBIG(value) ? 'Invalid Pag-IBIG number format (XXXX-XXXX-XXXX)' : null
  }
];

// Sale validation rules
export const saleValidationRules: ValidationRule[] = [
  {
    field: 'customerName',
    required: false,
    maxLength: 100
  },
  {
    field: 'items',
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'At least one item is required';
      }
      return null;
    }
  },
  {
    field: 'total',
    required: true,
    custom: (value) => {
      if (isNaN(value) || value <= 0) {
        return 'Total must be a positive number';
      }
      return null;
    }
  }
];

// Expense validation rules
export const expenseValidationRules: ValidationRule[] = [
  {
    field: 'description',
    required: true,
    minLength: 5,
    maxLength: 200
  },
  {
    field: 'category',
    required: true,
    minLength: 2,
    maxLength: 50
  },
  {
    field: 'amount',
    required: true,
    custom: (value) => {
      if (isNaN(value) || value <= 0) {
        return 'Amount must be a positive number';
      }
      return null;
    }
  },
  {
    field: 'date',
    required: true,
    custom: (value) => {
      if (!(value instanceof Date) && !value) {
        return 'Date is required';
      }
      return null;
    }
  }
];

// Account validation rules
export const accountValidationRules: ValidationRule[] = [
  {
    field: 'code',
    required: true,
    minLength: 3,
    maxLength: 10,
    pattern: /^[0-9]+$/
  },
  {
    field: 'name',
    required: true,
    minLength: 3,
    maxLength: 100
  },
  {
    field: 'type',
    required: true,
    custom: (value) => {
      const validTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
      if (!validTypes.includes(value)) {
        return 'Account type must be Asset, Liability, Equity, Income, or Expense';
      }
      return null;
    }
  }
];

// Utility to format Philippine numbers
export const formatPhilippinePhone = (phone: string): string => {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('0')) {
    return '+63' + cleaned.substring(1);
  }
  return phone;
};

// Utility to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount);
};

// Utility to validate date ranges
export const validateDateRange = (startDate: Date, endDate: Date): string | null => {
  if (startDate > endDate) {
    return 'Start date must be before end date';
  }
  
  const today = new Date();
  if (startDate > today) {
    return 'Start date cannot be in the future';
  }
  
  return null;
};