/**
 * React hook for security initialization and monitoring
 */

import { useEffect, useState } from 'react';
import { 
  initializeSecurity, 
  getSecurityConfig, 
  useRateLimit,
  securityAudit,
  validateEnvironment
} from '../utils/security';
import { createError, ERROR_CODES, logError } from '../utils/errorHandling';

export interface SecurityStatus {
  initialized: boolean;
  environmentValid: boolean;
  cspEnabled: boolean;
  rateLimitEnabled: boolean;
  httpsEnforced: boolean;
  errors: string[];
}

export const useSecurity = () => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    initialized: false,
    environmentValid: false,
    cspEnabled: false,
    rateLimitEnabled: false,
    httpsEnforced: false,
    errors: []
  });

  useEffect(() => {
    const initializeAppSecurity = async () => {
      try {
        // Validate environment
        const env = validateEnvironment();
        const config = getSecurityConfig();

        // Initialize security
        initializeSecurity();

        // Update status
        setSecurityStatus({
          initialized: true,
          environmentValid: true,
          cspEnabled: config.csp.enabled,
          rateLimitEnabled: config.rateLimit.enabled,
          httpsEnforced: config.https.enforced,
          errors: []
        });

        // Log successful initialization
        console.log('🔒 Security initialization completed successfully');

      } catch (error) {
        const appError = createError(
          ERROR_CODES.UNKNOWN_ERROR,
          'Security initialization failed',
          error,
          'useSecurity'
        );

        logError(appError);

        setSecurityStatus(prev => ({
          ...prev,
          initialized: false,
          errors: [...prev.errors, appError.message]
        }));

        // Audit security initialization failure
        securityAudit.logSecurityEvent({
          type: 'INVALID_ORIGIN',
          details: { error: appError },
          userAgent: navigator.userAgent
        });
      }
    };

    initializeAppSecurity();
  }, []);

  // Rate limiting hooks for different operations
  const authRateLimit = useRateLimit('auth');
  const generalRateLimit = useRateLimit('general');
  const uploadRateLimit = useRateLimit('upload');
  const pdfRateLimit = useRateLimit('pdf');

  return {
    securityStatus,
    rateLimits: {
      auth: authRateLimit,
      general: generalRateLimit,
      upload: uploadRateLimit,
      pdf: pdfRateLimit
    }
  };
};

// Security context for app-wide security monitoring
export const useSecurityMonitoring = () => {
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);

  useEffect(() => {
    // Listen for security events
    const handleSecurityEvent = (event: any) => {
      setSecurityEvents(prev => [...prev.slice(-9), event]); // Keep last 10 events
    };

    // CSP violation listener
    const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
      const event = {
        type: 'CSP_VIOLATION',
        timestamp: new Date(),
        details: {
          directive: e.violatedDirective,
          policy: e.originalPolicy,
          uri: e.blockedURI,
          source: e.sourceFile,
          line: e.lineNumber
        }
      };

      handleSecurityEvent(event);
      securityAudit.logSecurityEvent({
        type: 'CSP_VIOLATION',
        details: event.details,
        userAgent: navigator.userAgent
      });
    };

    // Add event listeners
    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    // Cleanup
    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    };
  }, []);

  const clearSecurityEvents = () => {
    setSecurityEvents([]);
  };

  return {
    securityEvents,
    clearSecurityEvents
  };
};

// Hook for secure file uploads
export const useSecureFileUpload = () => {
  const { rateLimits } = useSecurity();

  const validateAndUpload = async (
    file: File,
    uploadFunction: (file: File) => Promise<any>
  ) => {
    // Check rate limit
    rateLimits.upload.enforceLimit();

    // Validate file
    const validation = securityMiddleware.validateFile(file);
    if (!validation.valid) {
      throw createError(
        ERROR_CODES.FILE_TYPE_INVALID,
        validation.error,
        { fileName: file.name, fileType: file.type, fileSize: file.size }
      );
    }

    // Log file upload attempt
    securityAudit.logSecurityEvent({
      type: 'FILE_UPLOAD_BLOCKED',
      details: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        validated: true
      }
    });

    // Proceed with upload
    return await uploadFunction(file);
  };

  return { validateAndUpload };
};

// Security middleware for components
import { securityMiddleware } from '../utils/security';

export { securityMiddleware };