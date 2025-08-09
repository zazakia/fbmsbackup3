/**
 * Production Security Hardening Utilities
 * Implements CSP, rate limiting, and security headers for FBMS
 */

import { createError, ERROR_CODES } from './errorHandling';

// Content Security Policy Configuration
export const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite in development
    "'unsafe-eval'", // Required for Vite in development
    'https://cdn.jsdelivr.net', // For CDN libraries
    'https://unpkg.com' // For CDN libraries
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:', // For base64 images
    'https:', // For external images
    'blob:' // For generated images
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co', // Supabase API
    'https://*.vercel.app', // Vercel deployment
    'wss://*.supabase.co' // Supabase realtime
  ],
  'object-src': ["'none'"],
  'media-src': ["'self'"],
  'child-src': ["'none'"],
  'worker-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': []
};

// Generate CSP header string
export const generateCSPHeader = (): string => {
  const policies = Object.entries(CSP_POLICY).map(([directive, sources]) => {
    if (sources.length === 0) {
      return directive;
    }
    return `${directive} ${sources.join(' ')}`;
  });
  
  return policies.join('; ');
};

// Security Headers Configuration
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': generateCSPHeader()
};

// Rate Limiting Configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message: string; // Error message when limit exceeded
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const RATE_LIMIT_CONFIGS = {
  // General API rate limiting
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: true
  },
  
  // Authentication rate limiting (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },
  
  // File upload rate limiting
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 uploads per hour
    message: 'Too many file uploads, please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: true
  },
  
  // PDF generation rate limiting
  pdf: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 PDF generations per hour
    message: 'Too many PDF generation requests, please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: true
  }
};

// Rate Limiter Class
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  // Check if request is allowed
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get existing requests for this identifier
    const existingRequests = this.requests.get(identifier) || [];
    
    // Filter requests within the current window
    const validRequests = existingRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit is exceeded
    if (validRequests.length >= this.config.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      this.cleanup();
    }
    
    return true;
  }

  // Get remaining requests for identifier
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const existingRequests = this.requests.get(identifier) || [];
    const validRequests = existingRequests.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.config.maxRequests - validRequests.length);
  }

  // Get time until window reset
  getTimeUntilReset(identifier: string): number {
    const existingRequests = this.requests.get(identifier) || [];
    if (existingRequests.length === 0) return 0;
    
    const oldestRequest = Math.min(...existingRequests);
    const resetTime = oldestRequest + this.config.windowMs;
    
    return Math.max(0, resetTime - Date.now());
  }

  // Clean up old entries
  private cleanup(): void {
    const now = Date.now();
    
    for (const [identifier, requests] of this.requests.entries()) {
      const windowStart = now - this.config.windowMs;
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Rate Limiter Instances
export const rateLimiters = {
  general: new RateLimiter(RATE_LIMIT_CONFIGS.general),
  auth: new RateLimiter(RATE_LIMIT_CONFIGS.auth),
  upload: new RateLimiter(RATE_LIMIT_CONFIGS.upload),
  pdf: new RateLimiter(RATE_LIMIT_CONFIGS.pdf)
};

// Rate Limiting Hook for React Components
export const useRateLimit = (
  type: keyof typeof rateLimiters,
  identifier?: string
) => {
  const limiter = rateLimiters[type];
  const id = identifier || 'anonymous';

  const checkLimit = (): { allowed: boolean; remaining: number; resetTime: number } => {
    const allowed = limiter.isAllowed(id);
    const remaining = limiter.getRemainingRequests(id);
    const resetTime = limiter.getTimeUntilReset(id);

    return { allowed, remaining, resetTime };
  };

  const enforceLimit = (): void => {
    const { allowed, remaining, resetTime } = checkLimit();
    
    if (!allowed) {
      throw createError(
        ERROR_CODES.API_RATE_LIMIT,
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds.`,
        {
          type,
          identifier: id,
          remaining,
          resetTime
        }
      );
    }
  };

  return { checkLimit, enforceLimit };
};

// Environment Validation
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  VITE_PUBLIC_SUPABASE_URL: string;
  VITE_PUBLIC_SUPABASE_ANON_KEY: string;
  VITE_ENABLE_ANALYTICS?: string;
  VITE_SENTRY_DSN?: string;
  VITE_API_BASE_URL?: string;
}

// Validate environment variables
export const validateEnvironment = (): EnvironmentConfig => {
  const env = import.meta.env;
  
  // Required environment variables
  const requiredVars = [
    'VITE_PUBLIC_SUPABASE_URL',
    'VITE_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !env[varName]);
  
  if (missing.length > 0) {
    throw createError(
      ERROR_CODES.UNKNOWN_ERROR,
      `Missing required environment variables: ${missing.join(', ')}`,
      { missing }
    );
  }
  
  // Validate Supabase URL format
  if (!env.VITE_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    throw createError(
      ERROR_CODES.UNKNOWN_ERROR,
      'VITE_PUBLIC_SUPABASE_URL must start with https://',
      { url: env.VITE_PUBLIC_SUPABASE_URL }
    );
  }
  
  // Validate Supabase key format (basic check)
  if (env.VITE_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
    throw createError(
      ERROR_CODES.UNKNOWN_ERROR,
      'VITE_PUBLIC_SUPABASE_ANON_KEY appears to be invalid',
      { keyLength: env.VITE_PUBLIC_SUPABASE_ANON_KEY.length }
    );
  }
  
  return {
    NODE_ENV: env.NODE_ENV as 'development' | 'production' | 'test',
    VITE_SUPABASE_URL: env.VITE_PUBLIC_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: env.VITE_PUBLIC_SUPABASE_ANON_KEY,
    VITE_ENABLE_ANALYTICS: env.VITE_ENABLE_ANALYTICS,
    VITE_SENTRY_DSN: env.VITE_SENTRY_DSN,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL
  };
};

// Security Configuration for Production
export const getSecurityConfig = () => {
  const env = validateEnvironment();
  
  return {
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    
    // CSP configuration
    csp: {
      enabled: env.NODE_ENV === 'production',
      policy: generateCSPHeader(),
      reportOnly: env.NODE_ENV === 'development'
    },
    
    // Rate limiting configuration
    rateLimit: {
      enabled: true,
      configs: RATE_LIMIT_CONFIGS
    },
    
    // HTTPS configuration
    https: {
      enforced: env.NODE_ENV === 'production',
      hsts: env.NODE_ENV === 'production'
    },
    
    // Security headers
    headers: SECURITY_HEADERS,
    
    // Environment validation
    environment: env
  };
};

// Security Middleware for API calls
export const securityMiddleware = {
  // Apply security headers to responses
  applySecurityHeaders: (headers: Headers = new Headers()): Headers => {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      headers.set(key, value);
    });
    return headers;
  },
  
  // Validate request origin
  validateOrigin: (origin: string): boolean => {
    const allowedOrigins = [
      'https://localhost:3000',
      'https://127.0.0.1:3000',
      'https://fbms.vercel.app',
      // Add your production domain here
    ];
    
    return allowedOrigins.includes(origin) || 
           origin.endsWith('.vercel.app') || 
           origin.endsWith('.localhost');
  },
  
  // Sanitize user input
  sanitizeInput: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  },
  
  // Validate file uploads
  validateFile: (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }
    
    return { valid: true };
  }
};

// Security Audit Logging
export const securityAudit = {
  logSecurityEvent: (event: {
    type: 'CSP_VIOLATION' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_ORIGIN' | 'FILE_UPLOAD_BLOCKED';
    details: any;
    userAgent?: string;
    ip?: string;
    timestamp?: Date;
  }) => {
    const auditLog = {
      ...event,
      timestamp: event.timestamp || new Date(),
      severity: 'security',
      environment: import.meta.env.NODE_ENV
    };
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.warn('🔒 Security Event:', auditLog);
    }
    
    // In production, send to security monitoring service
    if (import.meta.env.PROD) {
      // Send to your security monitoring service (e.g., Sentry, DataDog)
      // securityMonitoringService.log(auditLog);
    }
    
    // Store in localStorage for debugging
    try {
      const existingLogs = JSON.parse(localStorage.getItem('fbms_security_events') || '[]');
      existingLogs.push(auditLog);
      
      // Keep only last 50 security events
      const limitedLogs = existingLogs.slice(-50);
      localStorage.setItem('fbms_security_events', JSON.stringify(limitedLogs));
    } catch (e) {
      console.warn('Failed to store security event:', e);
    }
  }
};

// Initialize security configuration
export const initializeSecurity = (): void => {
  const config = getSecurityConfig();
  
  // Validate environment on startup
  try {
    validateEnvironment();
    console.log('✅ Environment validation passed');
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    if (config.isProduction) {
      throw error; // Fail fast in production
    }
  }
  
  // Set up CSP violation reporting
  if (typeof window !== 'undefined' && config.csp.enabled) {
    document.addEventListener('securitypolicyviolation', (e) => {
      securityAudit.logSecurityEvent({
        type: 'CSP_VIOLATION',
        details: {
          directive: e.violatedDirective,
          policy: e.originalPolicy,
          uri: e.blockedURI,
          source: e.sourceFile,
          line: e.lineNumber
        },
        userAgent: navigator.userAgent
      });
    });
  }
  
  console.log('🔒 Security configuration initialized:', {
    environment: config.environment.NODE_ENV,
    csp: config.csp.enabled,
    rateLimit: config.rateLimit.enabled,
    https: config.https.enforced
  });
};