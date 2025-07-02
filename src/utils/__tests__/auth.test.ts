import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  authenticateUser,
  registerUser,
  validateEmail,
  validatePassword,
  validateName,
  resetAuthMocks
} from '../auth';
import { User } from '../../types/auth';

describe('Auth Utils', () => {
  beforeEach(async () => {
    await resetAuthMocks();
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should compare password correctly', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(password, hash);
      const isInvalid = await comparePassword('wrongPassword', hash);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Token', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      businessId: 'business-1',
      isActive: true,
      createdAt: new Date()
    };

    it('should generate valid JWT token', () => {
      const token = generateToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should verify valid JWT token', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('User Authentication', () => {
    it('should authenticate valid user', async () => {
      const credentials = {
        email: 'admin@fbms.com',
        password: 'admin123'
      };
      
      const result = await authenticateUser(credentials);
      
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(credentials.email);
    });

    it('should reject invalid credentials', async () => {
      const credentials = {
        email: 'admin@fbms.com',
        password: 'wrongpassword'
      };
      
      await expect(authenticateUser(credentials)).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };
      
      await expect(authenticateUser(credentials)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('User Registration', () => {
    it('should register new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
        businessName: 'Test Business'
      };
      
      const result = await registerUser(userData);
      
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'admin@fbms.com', // This email already exists
        password: 'Password123',
        firstName: 'Duplicate',
        lastName: 'User',
        businessName: 'Test Business'
      };
      
      await expect(registerUser(userData)).rejects.toThrow('User with this email already exists');
    });
  });

  describe('Validation Functions', () => {
    describe('Email Validation', () => {
      it('should validate correct email formats', () => {
        expect(validateEmail('test@example.com')).toBe(true);
        expect(validateEmail('user.name@domain.co.uk')).toBe(true);
        expect(validateEmail('user+tag@example.org')).toBe(true);
      });

      it('should reject invalid email formats', () => {
        expect(validateEmail('invalid-email')).toBe(false);
        expect(validateEmail('test@')).toBe(false);
        expect(validateEmail('@example.com')).toBe(false);
        expect(validateEmail('test.example.com')).toBe(false);
      });
    });

    describe('Password Validation', () => {
      it('should validate strong passwords', () => {
        const result = validatePassword('StrongPass123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject weak passwords', () => {
        const result = validatePassword('weak');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should provide specific error messages', () => {
        const result = validatePassword('short');
        expect(result.errors).toContain('Password must be at least 8 characters long');
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
        expect(result.errors).toContain('Password must contain at least one number');
      });
    });

    describe('Name Validation', () => {
      it('should validate correct names', () => {
        expect(validateName('John Doe')).toBe(true);
        expect(validateName('Maria Santos')).toBe(true);
        expect(validateName('Jose')).toBe(true);
      });

      it('should reject invalid names', () => {
        expect(validateName('A')).toBe(false); // Too short
        expect(validateName('John123')).toBe(false); // Contains numbers
        expect(validateName('')).toBe(false); // Empty
        expect(validateName('   ')).toBe(false); // Only spaces
      });
    });
  });
});