import { useState, useCallback } from 'react';
import { sanitizeFormData } from '../utils/inputSanitization';

interface UseSafeFormOptions {
  validateOnChange?: boolean;
  sanitizeOnChange?: boolean;
}

interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  isValid: boolean;
  isDirty: boolean;
}

/**
 * Custom hook for safe form handling with automatic sanitization and validation
 */
export function useSafeForm<T extends Record<string, any>>(
  initialData: T,
  options: UseSafeFormOptions = {}
) {
  const { validateOnChange = true, sanitizeOnChange = true } = options;
  
  const [formState, setFormState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    isValid: true,
    isDirty: false
  });

  const updateField = useCallback((field: keyof T, value: any) => {
    setFormState(prevState => {
      const newData = { ...prevState.data, [field]: value };
      
      if (sanitizeOnChange || validateOnChange) {
        const { sanitized, errors } = sanitizeFormData(newData);
        return {
          data: sanitized,
          errors: validateOnChange ? errors : prevState.errors,
          isValid: Object.keys(errors).length === 0,
          isDirty: true
        };
      }
      
      return {
        ...prevState,
        data: newData,
        isDirty: true
      };
    });
  }, [sanitizeOnChange, validateOnChange]);

  const updateMultipleFields = useCallback((updates: Partial<T>) => {
    setFormState(prevState => {
      const newData = { ...prevState.data, ...updates };
      
      const { sanitized, errors } = sanitizeFormData(newData);
      return {
        data: sanitized,
        errors: validateOnChange ? errors : prevState.errors,
        isValid: Object.keys(errors).length === 0,
        isDirty: true
      };
    });
  }, [validateOnChange]);

  const validate = useCallback(() => {
    const { sanitized, errors } = sanitizeFormData(formState.data);
    setFormState(prevState => ({
      ...prevState,
      data: sanitized,
      errors,
      isValid: Object.keys(errors).length === 0
    }));
    
    return Object.keys(errors).length === 0;
  }, [formState.data]);

  const reset = useCallback(() => {
    setFormState({
      data: initialData,
      errors: {},
      isValid: true,
      isDirty: false
    });
  }, [initialData]);

  const clearErrors = useCallback(() => {
    setFormState(prevState => ({
      ...prevState,
      errors: {},
      isValid: true
    }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setFormState(prevState => ({
      ...prevState,
      errors: { ...prevState.errors, [field]: error },
      isValid: false
    }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setFormState(prevState => {
      const newErrors = { ...prevState.errors };
      delete newErrors[field as string];
      
      return {
        ...prevState,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0
      };
    });
  }, []);

  // Helper function to get field props for input components
  const getFieldProps = useCallback((field: keyof T) => ({
    value: formState.data[field] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      updateField(field, e.target.value);
    },
    error: formState.errors[field as string],
    'aria-invalid': !!formState.errors[field as string],
    'aria-describedby': formState.errors[field as string] ? `${String(field)}-error` : undefined
  }), [formState.data, formState.errors, updateField]);

  return {
    // Form state
    data: formState.data,
    errors: formState.errors,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
    
    // Actions
    updateField,
    updateMultipleFields,
    validate,
    reset,
    clearErrors,
    setFieldError,
    clearFieldError,
    getFieldProps,
    
    // Computed values
    hasErrors: Object.keys(formState.errors).length > 0,
    canSubmit: formState.isValid && formState.isDirty
  };
}