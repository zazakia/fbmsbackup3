import { supabase } from '../utils/supabase';

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastBackup: string;
  databaseConnections: number;
  errorRate: number;
  responseTime: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  username: string;
  action: string;
  module: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  success: boolean;
  details?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorCount: number;
}

export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'failed_login' | 'permission_denied' | 'suspicious_activity' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip: string;
  timestamp: string;
  details: Record<string, unknown>;
  resolved: boolean;
}

class AdminMonitoringService {
  private static instance: AdminMonitoringService;
  private activityBuffer: UserActivity[] = [];
  private metricsBuffer: PerformanceMetrics[] = [];

  static getInstance(): AdminMonitoringService {
    if (!AdminMonitoringService.instance) {
      AdminMonitoringService.instance = new AdminMonitoringService();
    }
    return AdminMonitoringService.instance;
  }

  // Log user activity
  async logActivity(activity: Omit<UserActivity, 'id' | 'timestamp'>): Promise<void> {
    try {
      const activityRecord: UserActivity = {
        ...activity,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };

      // Store in buffer for immediate access
      this.activityBuffer.unshift(activityRecord);
      if (this.activityBuffer.length > 100) {
        this.activityBuffer = this.activityBuffer.slice(0, 100);
      }

      // Store in database
      const { error } = await supabase
        .from('user_activity_logs')
        .insert(activityRecord);

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  // Get recent activity logs
  async getRecentActivity(limit: number = 50): Promise<UserActivity[]> {
    try {
      // First try to get from buffer
      if (this.activityBuffer.length > 0) {
        return this.activityBuffer.slice(0, limit);
      }

      // Fallback to database
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch activity logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  }

  // Record performance metrics
  async recordMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): Promise<void> {
    try {
      const metricsRecord: PerformanceMetrics = {
        ...metrics,
        timestamp: new Date().toISOString()
      };

      // Store in buffer
      this.metricsBuffer.unshift(metricsRecord);
      if (this.metricsBuffer.length > 1440) { // Keep 24 hours of data (1 per minute)
        this.metricsBuffer = this.metricsBuffer.slice(0, 1440);
      }

      // Store in database (batch insert for efficiency)
      if (this.metricsBuffer.length % 10 === 0) {
        const { error } = await supabase
          .from('performance_metrics')
          .insert(this.metricsBuffer.slice(0, 10));

        if (error) {
          console.error('Failed to record metrics:', error);
        }
      }
    } catch (error) {
      console.error('Error recording metrics:', error);
    }
  }

  // Get system health status
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Calculate health based on recent metrics
      const recentMetrics = this.metricsBuffer.slice(0, 5);
      const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length || 0;
      const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length || 0;
      const errorRate = recentMetrics.reduce((sum, m) => sum + m.errorCount, 0) / recentMetrics.length || 0;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (avgCpu > 80 || avgMemory > 85 || errorRate > 10) {
        status = 'critical';
      } else if (avgCpu > 60 || avgMemory > 70 || errorRate > 5) {
        status = 'warning';
      }

      return {
        status,
        uptime: Date.now() - (new Date('2024-01-01').getTime()), // Mock uptime
        lastBackup: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        databaseConnections: 5 + Math.floor(Math.random() * 10),
        errorRate,
        responseTime: 150 + Math.random() * 100
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        status: 'critical',
        uptime: 0,
        lastBackup: '',
        databaseConnections: 0,
        errorRate: 100,
        responseTime: 0
      };
    }
  }

  // Log security events
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('security_events')
        .insert(securityEvent);

      if (error) {
        console.error('Failed to log security event:', error);
      }

      // Auto-alert for critical events
      if (event.severity === 'critical') {
        await this.triggerSecurityAlert(securityEvent);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Get security events
  async getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch security events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching security events:', error);
      return [];
    }
  }

  // Get active user sessions
  async getActiveSessions(): Promise<Array<{
    id: string;
    userId: string;
    username: string;
    loginTime: string;
    lastActivity: string;
    ip: string;
    userAgent: string;
  }>> {
    try {
      // This would typically query active sessions from your auth system
      // For now, return mock data
      return [
        {
          id: '1',
          userId: 'user1',
          username: 'admin',
          loginTime: new Date(Date.now() - 3600000).toISOString(),
          lastActivity: new Date(Date.now() - 300000).toISOString(),
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          location: 'Manila, Philippines'
        }
      ];
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }
  }

  // Get database statistics
  async getDatabaseStats(): Promise<any> {
    try {
      // Query various table sizes and statistics
      const stats = {
        totalRecords: 0,
        tableStats: {},
        indexStats: {},
        connectionCount: 0
      };

      // This would typically run actual database queries
      // For now, return mock data
      return {
        totalRecords: 15420,
        tableStats: {
          customers: 1250,
          products: 850,
          sales: 5420,
          inventory: 2100,
          users: 45
        },
        indexStats: {
          totalIndexes: 23,
          indexSize: '45.2 MB'
        },
        connectionCount: 8
      };
    } catch (error) {
      console.error('Error fetching database stats:', error);
      return null;
    }
  }

  // Trigger security alert
  private async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      // This would typically send notifications via email, SMS, or push notifications
      console.warn('SECURITY ALERT:', event);
      
      // You could integrate with services like:
      // - Email service (SendGrid, AWS SES)
      // - SMS service (Twilio)
      // - Push notifications
      // - Slack/Discord webhooks
      
    } catch (error) {
      console.error('Error triggering security alert:', error);
    }
  }

  // Clean up old data
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clean up activity logs
      await supabase
        .from('user_activity_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      // Clean up performance metrics
      await supabase
        .from('performance_metrics')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      // Clean up resolved security events
      await supabase
        .from('security_events')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .eq('resolved', true);

    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  // Export monitoring data
  async exportData(startDate: string, endDate: string): Promise<any> {
    try {
      const [activities, metrics, securityEvents] = await Promise.all([
        supabase
          .from('user_activity_logs')
          .select('*')
          .gte('timestamp', startDate)
          .lte('timestamp', endDate),
        
        supabase
          .from('performance_metrics')
          .select('*')
          .gte('timestamp', startDate)
          .lte('timestamp', endDate),
          
        supabase
          .from('security_events')
          .select('*')
          .gte('timestamp', startDate)
          .lte('timestamp', endDate)
      ]);

      return {
        activities: activities.data || [],
        metrics: metrics.data || [],
        securityEvents: securityEvents.data || [],
        exportedAt: new Date().toISOString(),
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }
}

// Auto-track common activities
export const trackActivity = (action: string, module: string, details?: any) => {
  const monitor = AdminMonitoringService.getInstance();
  
  // Get current user info (you'd get this from your auth context)
  const currentUser = {
    userId: 'current-user-id',
    username: 'current-username'
  };

  monitor.logActivity({
    userId: currentUser.userId,
    username: currentUser.username,
    action,
    module,
    ip: 'client-ip', // You'd get this from request
    userAgent: navigator.userAgent,
    success: true,
    details
  });
};

// Auto-track security events
export const trackSecurityEvent = (
  type: SecurityEvent['type'], 
  severity: SecurityEvent['severity'], 
  details: any, 
  userId?: string
) => {
  const monitor = AdminMonitoringService.getInstance();
  
  monitor.logSecurityEvent({
    type,
    severity,
    userId,
    ip: 'client-ip', // You'd get this from request
    details,
    resolved: false
  });
};

export default AdminMonitoringService;