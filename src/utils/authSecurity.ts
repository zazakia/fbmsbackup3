// Enhanced authentication security utilities
import { User } from '../types/auth';

// Password security configuration
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxConsecutiveChars: 3,
  minUniqueChars: 4,
};

// Common weak passwords to reject
const COMMON_PASSWORDS = [
  'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome',
  '123456789', 'password123', 'admin123', 'qwerty123', 'abc123',
  'password1', 'Password1', 'password!', 'Password!', '12345678',
  'iloveyou', 'princess', 'monkey', 'dragon', 'sunshine', 'football',
  'baseball', 'superman', 'michael', 'jennifer', 'charlie', 'aa123456'
];

// Rate limiting for authentication attempts
const AUTH_RATE_LIMITS = {
  maxAttempts: 5,
  windowMinutes: 15,
  lockoutMinutes: 30,
  maxDailyAttempts: 50,
};

interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

interface SecurityEvent {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'password_reset' | 'account_locked';
  userId?: string;
  email: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  reason?: string;
}

// Enhanced password validation
export const validatePassword = (password: string, userInfo?: Partial<User>): PasswordValidationResult => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Basic length check
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  } else if (password.length >= PASSWORD_REQUIREMENTS.minLength) {
    score += 20;
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must be less than ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  // Character requirements
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 15;
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 15;
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 15;
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  } else if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    score += 15;
  }

  // Advanced checks
  // Check for common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
    score -= 50;
  }

  // Check for consecutive characters
  let consecutiveCount = 1;
  let maxConsecutive = 1;
  for (let i = 1; i < password.length; i++) {
    if (password.charCodeAt(i) === password.charCodeAt(i - 1) + 1 ||
        password.charCodeAt(i) === password.charCodeAt(i - 1) - 1 ||
        password.charAt(i) === password.charAt(i - 1)) {
      consecutiveCount++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
    } else {
      consecutiveCount = 1;
    }
  }

  if (maxConsecutive > PASSWORD_REQUIREMENTS.maxConsecutiveChars) {
    errors.push(`Password should not contain more than ${PASSWORD_REQUIREMENTS.maxConsecutiveChars} consecutive characters`);
    score -= 10;
  }

  // Check for unique characters
  const uniqueChars = new Set(password.toLowerCase()).size;
  if (uniqueChars < PASSWORD_REQUIREMENTS.minUniqueChars) {
    errors.push(`Password should contain at least ${PASSWORD_REQUIREMENTS.minUniqueChars} unique characters`);
    score -= 10;
  } else if (uniqueChars >= 8) {
    score += 10;
  }

  // Check for personal information
  if (userInfo) {
    const personalInfo = [
      userInfo.firstName?.toLowerCase(),
      userInfo.lastName?.toLowerCase(),
      userInfo.email?.split('@')[0]?.toLowerCase(),
    ].filter(Boolean);

    for (const info of personalInfo) {
      if (info && password.toLowerCase().includes(info)) {
        errors.push('Password should not contain personal information');
        score -= 20;
        break;
      }
    }
  }

  // Check for keyboard patterns
  const keyboardPatterns = [
    'qwerty', 'asdf', 'zxcv', '123456', 'abcdef',
    'qwertyuiop', 'asdfghjkl', 'zxcvbnm'
  ];

  for (const pattern of keyboardPatterns) {
    if (password.toLowerCase().includes(pattern)) {
      errors.push('Password should not contain keyboard patterns');
      score -= 15;
      break;
    }
  }

  // Bonus points for length
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Generate suggestions
  if (score < 60) {
    if (password.length < 12) {
      suggestions.push('Consider using a longer password (12+ characters)');
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      suggestions.push('Add special characters for better security');
    }
    if (uniqueChars < 6) {
      suggestions.push('Use more unique characters');
    }
    suggestions.push('Consider using a passphrase with multiple words');
  }

  return {
    isValid: errors.length === 0 && score >= 60,
    score,
    errors,
    suggestions,
  };
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .substring(0, 1000); // Limit length
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim().substring(0, 320); // RFC 5321 limit
};

// Rate limiting storage (in-memory for now, should be moved to Redis in production)
const rateLimitStore = new Map<string, { attempts: number; firstAttempt: Date; lockedUntil?: Date }>();

export const checkRateLimit = (identifier: string): { allowed: boolean; remainingAttempts: number; lockedUntil?: Date } => {
  const now = new Date();
  const key = `auth:${identifier}`;
  const record = rateLimitStore.get(key);

  if (!record) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: AUTH_RATE_LIMITS.maxAttempts - 1 };
  }

  // Check if locked
  if (record.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, remainingAttempts: 0, lockedUntil: record.lockedUntil };
  }

  // Check if window has expired
  const windowEnd = new Date(record.firstAttempt.getTime() + AUTH_RATE_LIMITS.windowMinutes * 60 * 1000);
  if (now > windowEnd) {
    // Reset window
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: AUTH_RATE_LIMITS.maxAttempts - 1 };
  }

  // Check if max attempts reached
  if (record.attempts >= AUTH_RATE_LIMITS.maxAttempts) {
    const lockedUntil = new Date(now.getTime() + AUTH_RATE_LIMITS.lockoutMinutes * 60 * 1000);
    rateLimitStore.set(key, { ...record, lockedUntil });
    return { allowed: false, remainingAttempts: 0, lockedUntil };
  }

  // Increment attempts
  record.attempts++;
  rateLimitStore.set(key, record);

  return { 
    allowed: true, 
    remainingAttempts: AUTH_RATE_LIMITS.maxAttempts - record.attempts 
  };
};

export const clearRateLimit = (identifier: string): void => {
  rateLimitStore.delete(`auth:${identifier}`);
};

// Security event logging
const securityEvents: SecurityEvent[] = [];

export const logSecurityEvent = (event: Omit<SecurityEvent, 'timestamp'>): void => {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  };

  securityEvents.push(fullEvent);

  // Keep only last 1000 events
  if (securityEvents.length > 1000) {
    securityEvents.splice(0, securityEvents.length - 1000);
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('Security Event:', fullEvent);
  }

  // In production, this should send to a security monitoring service
};

export const getSecurityEvents = (filters?: {
  email?: string;
  userId?: string;
  type?: SecurityEvent['type'];
  since?: Date;
}): SecurityEvent[] => {
  let events = securityEvents;

  if (filters) {
    events = events.filter(event => {
      if (filters.email && event.email !== filters.email) return false;
      if (filters.userId && event.userId !== filters.userId) return false;
      if (filters.type && event.type !== filters.type) return false;
      if (filters.since && event.timestamp < filters.since) return false;
      return true;
    });
  }

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Session security
export const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateUserAgent = (userAgent: string): boolean => {
  // Basic user agent validation to detect suspicious patterns
  if (!userAgent || userAgent.length < 10 || userAgent.length > 500) {
    return false;
  }

  // Check for common bot patterns
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /phantom/i, /headless/i
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      return false;
    }
  }

  return true;
};

// CSRF protection
export const generateCSRFToken = (): string => {
  return generateSecureToken();
};

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  // Simple CSRF validation - in production, use more sophisticated methods
  return token === sessionToken && token.length === 64;
};

// Secure headers helper
export const getSecurityHeaders = () => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
};

// Account security recommendations
export const getAccountSecurityRecommendations = (user: User): string[] => {
  const recommendations: string[] = [];

  // Check last login
  if (user.lastLogin) {
    const daysSinceLogin = Math.floor((Date.now() - user.lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLogin > 30) {
      recommendations.push('Consider changing your password regularly');
    }
  }

  // Check role-specific recommendations
  if (user.role === 'admin') {
    recommendations.push('Enable two-factor authentication for enhanced security');
    recommendations.push('Regularly review user access and permissions');
    recommendations.push('Monitor security logs for suspicious activity');
  }

  if (user.role === 'manager') {
    recommendations.push('Enable two-factor authentication');
    recommendations.push('Use strong, unique passwords');
  }

  return recommendations;
};

export { AUTH_RATE_LIMITS };