import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validatePassword,
  sanitizeInput,
  sanitizeEmail,
  checkRateLimit,
  clearRateLimit,
  logSecurityEvent,
  getSecurityEvents,
  generateSecureToken,
  validateUserAgent,
  generateCSRFToken,
  validateCSRFToken,
  getSecurityHeaders,
  getAccountSecurityRecommendations,
  PASSWORD_REQUIREMENTS,
  AUTH_RATE_LIMITS
} from '../authSecurity';
import { User } from '../../types/auth';

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn(() => new Uint8Array(32).fill(1))
  }
});

// Mock import.meta.env
vi.mock('import.meta.env', () => ({
  DEV: false
}));

describe('Authentication Security Utils', () => {
  beforeEach(() => {
    // Clear rate limit storage between tests
    // This is a hack to access the private Map, but necessary for testing
    (checkRateLimit as any).rateLimitStore?.clear();
    vi.clearAllMocks();
  });

  describe('validatePassword', () => {
    it('should accept a strong password', () => {
      const result = validatePassword('StrongP@ssw0rd123');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(60);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a weak password', () => {
      const result = validatePassword('123');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(60);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject common passwords', () => {
      const result = validatePassword('password');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('common'))).toBe(true);
    });

    it('should reject passwords with keyboard patterns', () => {
      const result = validatePassword('qwerty123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('keyboard'))).toBe(true);
    });

    it('should reject passwords with personal information', () => {
      const userInfo: Partial<User> = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };
      
      const result = validatePassword('JohnPassword123', userInfo);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('personal'))).toBe(true);
    });

    it('should enforce minimum length requirement', () => {
      const result = validatePassword('Sh0rt!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('at least'))).toBe(true);
    });

    it('should enforce character requirements', () => {
      const noUppercase = validatePassword('lowercase123!');
      const noLowercase = validatePassword('UPPERCASE123!');
      const noNumbers = validatePassword('NoNumbers!');
      const noSpecial = validatePassword('NoSpecial123');
      
      expect(noUppercase.errors.some(error => error.includes('uppercase'))).toBe(true);
      expect(noLowercase.errors.some(error => error.includes('lowercase'))).toBe(true);
      expect(noNumbers.errors.some(error => error.includes('number'))).toBe(true);
      expect(noSpecial.errors.some(error => error.includes('special'))).toBe(true);
    });

    it('should provide helpful suggestions for weak passwords', () => {
      const result = validatePassword('weak');
      
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('longer'))).toBe(true);
    });

    it('should give bonus points for longer passwords', () => {
      const short = validatePassword('StrongP@ss1');
      const long = validatePassword('VeryLongStrongP@ssw0rd123');
      
      expect(long.score).toBeGreaterThan(short.score);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeInput(input);
      
      expect(result).toBe('scriptalert("xss")/scriptHello World');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeInput(input);
      
      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert("xss")';
      const result = sanitizeInput(input);
      
      expect(result).toBe('alert("xss")');
    });

    it('should limit input length', () => {
      const input = 'a'.repeat(2000);
      const result = sanitizeInput(input);
      
      expect(result.length).toBe(1000);
    });

    it('should trim whitespace', () => {
      const input = '   hello world   ';
      const result = sanitizeInput(input);
      
      expect(result).toBe('hello world');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      const result = sanitizeEmail('USER@EXAMPLE.COM');
      
      expect(result).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      const result = sanitizeEmail('  user@example.com  ');
      
      expect(result).toBe('user@example.com');
    });

    it('should limit length to RFC 5321 standard', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const result = sanitizeEmail(longEmail);
      
      expect(result.length).toBe(320);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first attempt', () => {
      const result = checkRateLimit('user@example.com');
      
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(AUTH_RATE_LIMITS.maxAttempts - 1);
    });

    it('should track multiple attempts', () => {
      const identifier = 'user@example.com';
      
      // First attempt
      checkRateLimit(identifier);
      
      // Second attempt
      const result = checkRateLimit(identifier);
      
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(AUTH_RATE_LIMITS.maxAttempts - 2);
    });

    it('should block after max attempts', () => {
      const identifier = 'user@example.com';
      
      // Exhaust attempts
      for (let i = 0; i < AUTH_RATE_LIMITS.maxAttempts; i++) {
        checkRateLimit(identifier);
      }
      
      // Should be blocked now
      const result = checkRateLimit(identifier);
      
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.lockedUntil).toBeInstanceOf(Date);
    });

    it('should reset after window expires', () => {
      const identifier = 'user@example.com';
      
      // First attempt
      checkRateLimit(identifier);
      
      // Mock time passing beyond window
      const originalDate = Date;
      const mockDate = new Date(Date.now() + (AUTH_RATE_LIMITS.windowMinutes + 1) * 60 * 1000);
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      const result = checkRateLimit(identifier);
      
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(AUTH_RATE_LIMITS.maxAttempts - 1);
      
      // Restore original Date
      vi.mocked(global.Date).mockRestore();
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit for user', () => {
      const identifier = 'user@example.com';
      
      // Make some attempts
      checkRateLimit(identifier);
      checkRateLimit(identifier);
      
      // Clear rate limit
      clearRateLimit(identifier);
      
      // Should be reset
      const result = checkRateLimit(identifier);
      expect(result.remainingAttempts).toBe(AUTH_RATE_LIMITS.maxAttempts - 1);
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event', () => {
      const event = {
        type: 'login_failure' as const,
        email: 'user@example.com',
        success: false,
        reason: 'Invalid password'
      };
      
      logSecurityEvent(event);
      
      const events = getSecurityEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject(event);
      expect(events[0].timestamp).toBeInstanceOf(Date);
    });

    it('should limit events to 1000', () => {
      // Add 1001 events
      for (let i = 0; i < 1001; i++) {
        logSecurityEvent({
          type: 'login_attempt',
          email: `user${i}@example.com`,
          success: true
        });
      }
      
      const events = getSecurityEvents();
      expect(events.length).toBe(1000);
    });
  });

  describe('getSecurityEvents', () => {
    beforeEach(() => {
      // Clear events
      getSecurityEvents().length = 0;
    });

    it('should filter events by email', () => {
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
      
      const events = getSecurityEvents({ email: 'user1@example.com' });
      expect(events).toHaveLength(1);
      expect(events[0].email).toBe('user1@example.com');
    });

    it('should filter events by type', () => {
      logSecurityEvent({
        type: 'login_success',
        email: 'user@example.com',
        success: true
      });
      
      logSecurityEvent({
        type: 'password_reset',
        email: 'user@example.com',
        success: true
      });
      
      const events = getSecurityEvents({ type: 'login_success' });
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('login_success');
    });

    it('should sort events by timestamp (newest first)', () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000);
      
      // Mock Date to control timestamps
      vi.spyOn(global, 'Date').mockImplementationOnce(() => earlier as any);
      logSecurityEvent({
        type: 'login_success',
        email: 'user@example.com',
        success: true
      });
      
      vi.spyOn(global, 'Date').mockImplementationOnce(() => now as any);
      logSecurityEvent({
        type: 'login_failure',
        email: 'user@example.com',
        success: false
      });
      
      const events = getSecurityEvents();
      expect(events[0].type).toBe('login_failure'); // Newest first
      expect(events[1].type).toBe('login_success');
      
      vi.mocked(global.Date).mockRestore();
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateSecureToken();
      
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different tokens on each call', () => {
      // Mock different random values
      vi.mocked(crypto.getRandomValues)
        .mockImplementationOnce(() => new Uint8Array(32).fill(1))
        .mockImplementationOnce(() => new Uint8Array(32).fill(2));
      
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateUserAgent', () => {
    it('should accept valid user agents', () => {
      const validUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      expect(validateUserAgent(validUA)).toBe(true);
    });

    it('should reject too short user agents', () => {
      expect(validateUserAgent('short')).toBe(false);
    });

    it('should reject too long user agents', () => {
      const longUA = 'a'.repeat(600);
      expect(validateUserAgent(longUA)).toBe(false);
    });

    it('should reject bot patterns', () => {
      const botUAs = [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'curl/7.68.0',
        'python-requests/2.25.1'
      ];
      
      botUAs.forEach(ua => {
        expect(validateUserAgent(ua)).toBe(false);
      });
    });

    it('should reject empty or null user agents', () => {
      expect(validateUserAgent('')).toBe(false);
      expect(validateUserAgent(null as any)).toBe(false);
    });
  });

  describe('generateCSRFToken', () => {
    it('should generate a CSRF token', () => {
      const token = generateCSRFToken();
      
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate matching tokens', () => {
      const token = 'a'.repeat(64);
      
      expect(validateCSRFToken(token, token)).toBe(true);
    });

    it('should reject mismatched tokens', () => {
      const token1 = 'a'.repeat(64);
      const token2 = 'b'.repeat(64);
      
      expect(validateCSRFToken(token1, token2)).toBe(false);
    });

    it('should reject tokens with wrong length', () => {
      const shortToken = 'a'.repeat(32);
      const longToken = 'a'.repeat(64);
      
      expect(validateCSRFToken(shortToken, longToken)).toBe(false);
    });
  });

  describe('getSecurityHeaders', () => {
    it('should return security headers', () => {
      const headers = getSecurityHeaders();
      
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
      expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block');
      expect(headers).toHaveProperty('Strict-Transport-Security');
      expect(headers).toHaveProperty('Referrer-Policy');
      expect(headers).toHaveProperty('Permissions-Policy');
    });
  });

  describe('getAccountSecurityRecommendations', () => {
    it('should provide recommendations for admin users', () => {
      const adminUser: User = {
        id: '1',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        businessId: 'business-1',
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      const recommendations = getAccountSecurityRecommendations(adminUser);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('two-factor'))).toBe(true);
      expect(recommendations.some(r => r.includes('permissions'))).toBe(true);
    });

    it('should provide recommendations for manager users', () => {
      const managerUser: User = {
        id: '2',
        email: 'manager@example.com',
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager',
        businessId: 'business-1',
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      const recommendations = getAccountSecurityRecommendations(managerUser);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('two-factor'))).toBe(true);
      expect(recommendations.some(r => r.includes('strong'))).toBe(true);
    });

    it('should recommend password change for users with old last login', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago
      
      const user: User = {
        id: '3',
        email: 'user@example.com',
        firstName: 'Old',
        lastName: 'User',
        role: 'cashier',
        businessId: 'business-1',
        isActive: true,
        createdAt: new Date(),
        lastLogin: oldDate
      };
      
      const recommendations = getAccountSecurityRecommendations(user);
      
      expect(recommendations.some(r => r.includes('password'))).toBe(true);
    });
  });

  describe('PASSWORD_REQUIREMENTS', () => {
    it('should have expected requirements', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBe(8);
      expect(PASSWORD_REQUIREMENTS.maxLength).toBe(128);
      expect(PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireLowercase).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireNumbers).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireSpecialChars).toBe(true);
    });
  });

  describe('AUTH_RATE_LIMITS', () => {
    it('should have expected rate limits', () => {
      expect(AUTH_RATE_LIMITS.maxAttempts).toBe(5);
      expect(AUTH_RATE_LIMITS.windowMinutes).toBe(15);
      expect(AUTH_RATE_LIMITS.lockoutMinutes).toBe(30);
      expect(AUTH_RATE_LIMITS.maxDailyAttempts).toBe(50);
    });
  });
});