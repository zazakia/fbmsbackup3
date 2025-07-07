/**
 * Input sanitization utilities to prevent XSS attacks
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
  '=': '&#x3D;'
};

/**
 * Escapes HTML entities in a string to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return String(str);
  
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Removes potentially dangerous characters from input
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return String(input);
  
  // Remove script tags and their content
  const withoutScripts = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove on* event handlers
  const withoutEvents = withoutScripts.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  const withoutJavascript = withoutEvents.replace(/javascript:/gi, '');
  
  // Remove vbscript: protocol
  const withoutVbscript = withoutJavascript.replace(/vbscript:/gi, '');
  
  // Remove data: protocol for images (except safe data URIs)
  const withoutDataUrls = withoutVbscript.replace(/data:(?!image\/(png|jpg|jpeg|gif|webp|svg\+xml);base64,)[^,]*,/gi, '');
  
  return escapeHtml(withoutDataUrls.trim());
}

/**
 * Sanitizes object properties recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : 
        typeof item === 'object' && item !== null ? sanitizeObject(item) : item
      ) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number format (Philippine format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+63|0)9\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

/**
 * Sanitizes and validates form data
 */
export function sanitizeFormData<T extends Record<string, any>>(formData: T): {
  sanitized: T;
  errors: Record<string, string>;
} {
  const sanitized = sanitizeObject(formData);
  const errors: Record<string, string> = {};
  
  // Validate email fields
  Object.entries(sanitized).forEach(([key, value]) => {
    if (key.toLowerCase().includes('email') && typeof value === 'string' && value) {
      if (!isValidEmail(value)) {
        errors[key] = 'Please enter a valid email address';
      }
    }
    
    // Validate phone fields
    if ((key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) && 
        typeof value === 'string' && value) {
      if (!isValidPhoneNumber(value)) {
        errors[key] = 'Please enter a valid Philippine phone number';
      }
    }
    
    // Check for potentially dangerous content
    if (typeof value === 'string' && value !== sanitizeInput(value)) {
      errors[key] = 'Input contains potentially unsafe content';
    }
  });
  
  return { sanitized, errors };
}

/**
 * Creates a Content Security Policy header value
 */
export function getCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');
}