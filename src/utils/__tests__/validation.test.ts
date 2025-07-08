import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateTIN,
  validateSSS,
  validatePhilHealth,
  validatePagIBIG,
  formatPhilippinePhone,
  formatCurrency,
  validateDateRange
} from '../validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'admin@fbms.com',
        'user+tag@example.org'
      ];
      
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@example',
        ''
      ];
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePhone', () => {
    it('should accept valid Philippine phone numbers', () => {
      const validPhones = [
        '09123456789',
        '+639123456789',
        '09876543210',
        '+639876543210'
      ];
      
      validPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123456789',      // Too short
        '091234567890',   // Too long
        '08123456789',    // Wrong prefix
        '+1234567890',    // Wrong country code
        'abc123456789',   // Contains letters
        ''
      ];
      
      invalidPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(false);
      });
    });
  });

  describe('Philippine ID Validations', () => {
    describe('validateTIN', () => {
      it('should accept valid TIN formats', () => {
        const validTINs = [
          '123-456-789-000',
          '987-654-321-123',
          '000-000-000-000'
        ];
        
        validTINs.forEach(tin => {
          expect(validateTIN(tin)).toBe(true);
        });
      });

      it('should reject invalid TIN formats', () => {
        const invalidTINs = [
          '123-456-789',      // Missing last group
          '123-456-789-00',   // Wrong last group length
          '123-45-789-000',   // Wrong group length
          'abc-456-789-000',  // Non-numeric
          '123456789000',     // No dashes
          ''
        ];
        
        invalidTINs.forEach(tin => {
          expect(validateTIN(tin)).toBe(false);
        });
      });
    });

    describe('validateSSS', () => {
      it('should accept valid SSS formats', () => {
        const validSSS = [
          '12-3456789-0',
          '98-7654321-1',
          '00-0000000-9'
        ];
        
        validSSS.forEach(sss => {
          expect(validateSSS(sss)).toBe(true);
        });
      });

      it('should reject invalid SSS formats', () => {
        const invalidSSS = [
          '12-345678-0',      // Wrong middle group length
          '123-456789-0',     // Wrong first group length
          '12-3456789-00',    // Wrong last group length
          'ab-3456789-0',     // Non-numeric
          '123456789',        // No dashes
          ''
        ];
        
        invalidSSS.forEach(sss => {
          expect(validateSSS(sss)).toBe(false);
        });
      });
    });

    describe('validatePhilHealth', () => {
      it('should accept valid PhilHealth formats', () => {
        const validPhilHealth = [
          '12-345678901-2',
          '98-765432109-8',
          '00-000000000-0'
        ];
        
        validPhilHealth.forEach(ph => {
          expect(validatePhilHealth(ph)).toBe(true);
        });
      });

      it('should reject invalid PhilHealth formats', () => {
        const invalidPhilHealth = [
          '12-34567890-2',    // Wrong middle group length
          '123-45678901-2',   // Wrong first group length
          '12-345678901-22',  // Wrong last group length
          'ab-345678901-2',   // Non-numeric
          '12345678901',      // No dashes
          ''
        ];
        
        invalidPhilHealth.forEach(ph => {
          expect(validatePhilHealth(ph)).toBe(false);
        });
      });
    });

    describe('validatePagIBIG', () => {
      it('should accept valid Pag-IBIG formats', () => {
        const validPagIbig = [
          '1234-5678-9012',
          '9876-5432-1098',
          '0000-0000-0000'
        ];
        
        validPagIbig.forEach(pi => {
          expect(validatePagIBIG(pi)).toBe(true);
        });
      });

      it('should reject invalid Pag-IBIG formats', () => {
        const invalidPagIbig = [
          '123-5678-9012',    // Wrong first group length
          '1234-567-9012',    // Wrong middle group length
          '1234-5678-901',    // Wrong last group length
          'abcd-5678-9012',   // Non-numeric
          '123456789012',     // No dashes
          ''
        ];
        
        invalidPagIbig.forEach(pi => {
          expect(validatePagIBIG(pi)).toBe(false);
        });
      });
    });
  });

  describe('Format Utilities', () => {
    describe('formatPhilippinePhone', () => {
      it('should format phone numbers correctly', () => {
        expect(formatPhilippinePhone('09123456789')).toBe('+63 912 345 6789');
        expect(formatPhilippinePhone('+639123456789')).toBe('+63 912 345 6789');
        expect(formatPhilippinePhone('9123456789')).toBe('+63 912 345 6789');
      });

      it('should handle invalid phone numbers', () => {
        expect(formatPhilippinePhone('123')).toBe('123');
        expect(formatPhilippinePhone('')).toBe('');
      });
    });

    describe('formatCurrency', () => {
      it('should format currency correctly', () => {
        expect(formatCurrency(1000)).toBe('₱1,000.00');
        expect(formatCurrency(1000.50)).toBe('₱1,000.50');
        expect(formatCurrency(0)).toBe('₱0.00');
        expect(formatCurrency(1234567.89)).toBe('₱1,234,567.89');
      });
    });

    describe('validateDateRange', () => {
      it('should accept valid date ranges', () => {
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');
        
        expect(validateDateRange(startDate, endDate)).toBeNull();
      });

      it('should reject invalid date ranges', () => {
        const startDate = new Date('2023-12-31');
        const endDate = new Date('2023-01-01');
        
        const result = validateDateRange(startDate, endDate);
        expect(result).toContain('End date must be after start date');
      });
    });
  });
});