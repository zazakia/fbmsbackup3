// Comprehensive validation utilities for FBMS

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
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

// Generic field validator
export const validateField = (value: any, rules: ValidationRule): string | null => {
  const { required, minLength, maxLength, pattern, custom } = rules;

  // Check if required
  if (required && (!value || value.toString().trim() === '')) {
    return `${rules.field} is required`;
  }

  // If not required and empty, skip other validations
  if (!value || value.toString().trim() === '') {
    return null;
  }

  const stringValue = value.toString();

  // Check minimum length
  if (minLength && stringValue.length < minLength) {
    return `${rules.field} must be at least ${minLength} characters`;
  }

  // Check maximum length
  if (maxLength && stringValue.length > maxLength) {
    return `${rules.field} must not exceed ${maxLength} characters`;
  }

  // Check pattern
  if (pattern && !pattern.test(stringValue)) {
    return `${rules.field} format is invalid`;
  }

  // Custom validation
  if (custom) {
    return custom(value);
  }

  return null;
};

// Validate object against multiple rules
export const validateObject = (data: Record<string, any>, rules: ValidationRule[]): ValidationResult => {
  const errors: Record<string, string> = {};

  rules.forEach(rule => {
    const value = data[rule.field];
    const error = validateField(value, rule);
    if (error) {
      errors[rule.field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Customer validation rules
export const customerValidationRules: ValidationRule[] = [
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
    required: false,
    custom: (value) => value && !validateEmail(value) ? 'Invalid email format' : null
  },
  {
    field: 'phone',
    required: false,
    custom: (value) => value && !validatePhilippinePhone(value) ? 'Invalid Philippine phone number format' : null
  },
  {
    field: 'creditLimit',
    required: false,
    custom: (value) => {
      if (value !== undefined && value !== null && (isNaN(value) || value < 0)) {
        return 'Credit limit must be a positive number';
      }
      return null;
    }
  }
];

// Product validation rules
export const productValidationRules: ValidationRule[] = [
  {
    field: 'name',
    required: true,
    minLength: 2,
    maxLength: 100
  },
  {
    field: 'sku',
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[A-Z0-9-]+$/
  },
  {
    field: 'category',
    required: true,
    minLength: 2,
    maxLength: 50
  },
  {
    field: 'price',
    required: true,
    custom: (value) => {
      if (isNaN(value) || value < 0) {
        return 'Price must be a positive number';
      }
      return null;
    }
  },
  {
    field: 'cost',
    required: true,
    custom: (value) => {
      if (isNaN(value) || value < 0) {
        return 'Cost must be a positive number';
      }
      return null;
    }
  },
  {
    field: 'stock',
    required: true,
    custom: (value) => {
      if (!Number.isInteger(Number(value)) || value < 0) {
        return 'Stock must be a non-negative integer';
      }
      return null;
    }
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