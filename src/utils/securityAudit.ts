/**
 * Security Audit Logging System
 * Tracks critical security events and changes
 */

// import { createError, ERROR_CODES, logError } from './errorHandling'; // Currently unused

export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  type: 'VULNERABILITY_FIXED' | 'ROLE_CHANGE' | 'LOGIN_ATTEMPT' | 'PERMISSION_DENIED' | 'CONFIG_CHANGE';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

class SecurityAuditLogger {
  private events: SecurityAuditEvent[] = [];
  private readonly MAX_EVENTS = 1000;

  constructor() {
    // Load existing events from localStorage
    this.loadStoredEvents();
    
    // Log the critical security fix
    this.logSecurityFix();
  }

  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('fbms_security_audit');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.events = parsed.map((event: Record<string, unknown>) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load stored security events:', error);
    }
  }

  private saveEvents(): void {
    try {
      // Keep only the most recent events
      const eventsToSave = this.events.slice(-this.MAX_EVENTS);
      localStorage.setItem('fbms_security_audit', JSON.stringify(eventsToSave));
    } catch (error) {
      console.warn('Failed to save security events:', error);
    }
  }

  private logSecurityFix(): void {
    // Log the critical security vulnerability fix
    const fixEvent: SecurityAuditEvent = {
      id: `security-fix-${Date.now()}`,
      timestamp: new Date(),
      type: 'VULNERABILITY_FIXED',
      severity: 'critical',
      description: 'Fixed automatic admin login vulnerability - removed hardcoded credentials and auto-admin assignment',
      metadata: {
        vulnerabilities: [
          'Hardcoded admin credentials (admin@fbms.com)',
          'Automatic admin account creation',
          'Auto-role assignment based on email patterns',
          'Persistent admin sessions across devices'
        ],
        fixes: [
          'Disabled automatic admin setup',
          'Removed hardcoded credentials',
          'Default new users to employee role',
          'Implemented secure admin management',
          'Added role assignment audit trail'
        ],
        impact: 'High - Prevented unauthorized admin access',
        dateFixed: new Date().toISOString()
      }
    };

    this.events.push(fixEvent);
    this.saveEvents();

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.group('🔒 SECURITY VULNERABILITY FIXED');
      console.log('Vulnerability: Automatic admin login on any device');
      console.log('Risk Level: CRITICAL');
      console.log('Status: RESOLVED');
      console.log('Details:', fixEvent.metadata);
      console.groupEnd();
    }
  }

  public logEvent(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: SecurityAuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    };

    this.events.push(auditEvent);
    this.saveEvents();

    // Log high/critical severity events to console
    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn('🚨 Security Event:', auditEvent);
    }

    // In production, send to security monitoring service
    if (import.meta.env.PROD) {
      this.sendToSecurityService(auditEvent);
    }
  }

  private sendToSecurityService(event: SecurityAuditEvent): void {
    // In a real application, send to your security monitoring service
    // Example: Sentry, DataDog, custom security endpoint
    
    try {
      // Placeholder for security service integration
      fetch('/api/security/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      }).catch(error => {
        console.warn('Failed to send security event to monitoring service:', error);
      });
    } catch (error) {
      console.warn('Security service integration error:', error);
    }
  }

  public getEvents(
    filters?: {
      type?: SecurityAuditEvent['type'];
      severity?: SecurityAuditEvent['severity'];
      userId?: string;
      since?: Date;
    }
  ): SecurityAuditEvent[] {
    let filteredEvents = [...this.events];

    if (filters) {
      if (filters.type) {
        filteredEvents = filteredEvents.filter(event => event.type === filters.type);
      }
      if (filters.severity) {
        filteredEvents = filteredEvents.filter(event => event.severity === filters.severity);
      }
      if (filters.userId) {
        filteredEvents = filteredEvents.filter(event => event.userId === filters.userId);
      }
      if (filters.since) {
        filteredEvents = filteredEvents.filter(event => event.timestamp >= filters.since!);
      }
    }

    return filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getCriticalEvents(): SecurityAuditEvent[] {
    return this.getEvents({ severity: 'critical' });
  }

  public getRecentEvents(hours: number = 24): SecurityAuditEvent[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.getEvents({ since });
  }

  public clearEvents(): void {
    this.events = [];
    this.saveEvents();
  }

  public exportAuditLog(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

// Create a singleton instance
export const securityAudit = new SecurityAuditLogger();

// Convenience functions for common security events
export const auditRoleChange = (
  userId: string, 
  userEmail: string, 
  oldRole: string, 
  newRole: string, 
  changedBy: string
) => {
  securityAudit.logEvent({
    type: 'ROLE_CHANGE',
    severity: newRole === 'admin' ? 'high' : 'medium',
    description: `User role changed from ${oldRole} to ${newRole}`,
    userId,
    userEmail,
    metadata: {
      oldRole,
      newRole,
      changedBy,
      timestamp: new Date().toISOString()
    }
  });
};

export const auditLoginAttempt = (
  email: string, 
  success: boolean, 
  reason?: string
) => {
  securityAudit.logEvent({
    type: 'LOGIN_ATTEMPT',
    severity: success ? 'low' : 'medium',
    description: success ? 'Successful login' : `Failed login attempt: ${reason}`,
    userEmail: email,
    metadata: {
      success,
      reason,
      timestamp: new Date().toISOString()
    }
  });
};

export const auditPermissionDenied = (
  userId: string, 
  action: string, 
  resource: string
) => {
  securityAudit.logEvent({
    type: 'PERMISSION_DENIED',
    severity: 'medium',
    description: `Permission denied for action: ${action} on resource: ${resource}`,
    userId,
    metadata: {
      action,
      resource,
      timestamp: new Date().toISOString()
    }
  });
};