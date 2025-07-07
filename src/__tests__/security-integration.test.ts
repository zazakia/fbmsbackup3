import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validatePassword, checkRateLimit, logSecurityEvent } from '../utils/authSecurity';
import { validateEmail, validatePhone, validateTIN, validateSSS, validatePhilHealth, validatePagIBIG } from '../utils/validation';

describe('Security Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Security Workflow', () => {
    it('should handle complete authentication security flow', () => {
      const email = 'user@example.com';
      
      // 1. Check rate limit (should allow first attempt)
      let rateLimitResult = checkRateLimit(email);
      expect(rateLimitResult.allowed).toBe(true);
      expect(rateLimitResult.remainingAttempts).toBe(4);
      
      // 2. Validate password (weak password)
      let passwordResult = validatePassword('weak123');
      expect(passwordResult.isValid).toBe(false);
      expect(passwordResult.score).toBeLessThan(60);
      
      // 3. Log failed attempt
      logSecurityEvent({
        type: 'login_failure',
        email,
        success: false,
        reason: 'Weak password'
      });
      
      // 4. Try with strong password
      passwordResult = validatePassword('StrongP@ssw0rd123!');
      expect(passwordResult.isValid).toBe(true);
      expect(passwordResult.score).toBeGreaterThan(60);
      
      // 5. Log successful attempt
      logSecurityEvent({
        type: 'login_success',
        email,
        success: true
      });
    });

    it('should handle rate limiting escalation', () => {
      const email = 'attacker@example.com';
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(email);
        if (i < 4) {
          expect(result.allowed).toBe(true);
        }
        
        logSecurityEvent({
          type: 'login_failure',
          email,
          success: false,
          reason: 'Invalid credentials'
        });
      }
      
      // Should be blocked after 5 attempts
      const blockedResult = checkRateLimit(email);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.lockedUntil).toBeInstanceOf(Date);
      
      // Log the lockout event
      logSecurityEvent({
        type: 'account_locked',
        email,
        success: false,
        reason: 'Too many failed attempts'
      });
    });
  });

  describe('Data Validation Security Workflow', () => {
    it('should validate customer data with format checks', () => {
      // Test with valid customer data
      const validCustomer = {
        email: 'john@example.com',
        phone: '09123456789'
      };
      
      expect(validateEmail(validCustomer.email)).toBe(true);
      expect(validatePhone(validCustomer.phone)).toBe(true);
      
      // Test with invalid data
      const invalidCustomer = {
        email: 'invalid-email',
        phone: '123'
      };
      
      expect(validateEmail(invalidCustomer.email)).toBe(false);
      expect(validatePhone(invalidCustomer.phone)).toBe(false);
    });

    it('should validate product data with basic format checks', () => {
      // Test email validation for product notifications
      const productEmails = [
        'valid@example.com',
        'invalid-email',
        'another@valid.com'
      ];
      
      expect(validateEmail(productEmails[0])).toBe(true);
      expect(validateEmail(productEmails[1])).toBe(false);
      expect(validateEmail(productEmails[2])).toBe(true);
    });
  });

  describe('Multi-layer Security Validation', () => {
    it('should perform comprehensive format validation', () => {
      const testData = {
        email: 'user@example.com',
        phone: '09123456789',
        invalidEmail: 'invalid-email',
        invalidPhone: '123'
      };
      
      // Format Validation
      expect(validateEmail(testData.email)).toBe(true);
      expect(validatePhone(testData.phone)).toBe(true);
      expect(validateEmail(testData.invalidEmail)).toBe(false);
      expect(validatePhone(testData.invalidPhone)).toBe(false);
      
      // Security scoring based on format validation
      let securityScore = 100;
      
      if (!validateEmail(testData.email)) securityScore -= 25;
      if (!validatePhone(testData.phone)) securityScore -= 25;
      if (!validateEmail(testData.invalidEmail)) securityScore -= 25;
      if (!validatePhone(testData.invalidPhone)) securityScore -= 25;
      
      expect(securityScore).toBe(50); // Failed invalid email and phone checks
    });

    it('should validate Philippine business data formats', () => {
      const businessData = {
        tinNumber: '123-456-789-000',
        sssNumber: '12-3456789-0',
        philhealthNumber: '12-345678901-2',
        pagibigNumber: '1234-5678-9012'
      };
      
      expect(validateTIN(businessData.tinNumber)).toBe(true);
      expect(validateSSS(businessData.sssNumber)).toBe(true);
      expect(validatePhilHealth(businessData.philhealthNumber)).toBe(true);
      expect(validatePagIBIG(businessData.pagibigNumber)).toBe(true);
      
      // Test invalid formats
      expect(validateTIN('123-456-789')).toBe(false);
      expect(validateSSS('12-345678-0')).toBe(false);
      expect(validatePhilHealth('12-34567890-2')).toBe(false);
      expect(validatePagIBIG('123-5678-9012')).toBe(false);
    });
  });

  describe('Security Event Logging Integration', () => {
    it('should log security events throughout the application flow', async () => {
      const { getSecurityEvents } = await import('../utils/authSecurity');
      
      // Clear existing events
      const existingEvents = getSecurityEvents();
      existingEvents.length = 0;
      
      // Simulate a complete user interaction flow
      const userEmail = 'test@example.com';
      
      // 1. User attempts login
      logSecurityEvent({
        type: 'login_attempt',
        email: userEmail,
        success: false,
        reason: 'Initial attempt'
      });
      
      // 2. Password validation fails
      const weakPassword = validatePassword('weak');
      if (!weakPassword.isValid) {
        logSecurityEvent({
          type: 'login_failure',
          email: userEmail,
          success: false,
          reason: 'Weak password'
        });
      }
      
      // 3. User gets locked out
      logSecurityEvent({
        type: 'account_locked',
        email: userEmail,
        success: false,
        reason: 'Multiple failed attempts'
      });
      
      // 4. User requests password reset
      logSecurityEvent({
        type: 'password_reset',
        email: userEmail,
        success: true
      });
      
      // 5. Verify all events were logged
      const events = getSecurityEvents();
      expect(events).toHaveLength(4);
      
      // Check event types
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('login_attempt');
      expect(eventTypes).toContain('login_failure');
      expect(eventTypes).toContain('account_locked');
      expect(eventTypes).toContain('password_reset');
      
      // Check events are sorted by timestamp (newest first)
      for (let i = 1; i < events.length; i++) {
        expect(events[i-1].timestamp.getTime()).toBeGreaterThanOrEqual(events[i].timestamp.getTime());
      }
    });

    it('should filter security events by criteria', async () => {
      const { getSecurityEvents } = await import('../utils/authSecurity');
      
      // Clear existing events
      const existingEvents = getSecurityEvents();
      existingEvents.length = 0;
      
      // Add test events
      logSecurityEvent({
        type: 'login_success',
        email: 'user1@example.com',
        success: true
      });
      
      logSecurityEvent({
        type: 'login_failure',
        email: 'user2@example.com',
        success: false
      });
      
      logSecurityEvent({
        type: 'password_reset',
        email: 'user1@example.com',
        success: true
      });
      
      // Filter by email
      const user1Events = getSecurityEvents({ email: 'user1@example.com' });
      expect(user1Events).toHaveLength(2);
      expect(user1Events.every(e => e.email === 'user1@example.com')).toBe(true);
      
      // Filter by type
      const loginEvents = getSecurityEvents({ type: 'login_failure' });
      expect(loginEvents).toHaveLength(1);
      expect(loginEvents[0].type).toBe('login_failure');
      
      // Filter by success status
      const successfulEvents = getSecurityEvents().filter(e => e.success);
      expect(successfulEvents).toHaveLength(2);
    });
  });
});