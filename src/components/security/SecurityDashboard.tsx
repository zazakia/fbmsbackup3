/**
 * Security Dashboard Component
 * Displays security status, rate limiting, and audit logs for administrators
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react';
import { useSecurity, useSecurityMonitoring } from '../../hooks/useSecurity';
import { getSecurityConfig } from '../../utils/security';

const SecurityDashboard: React.FC = () => {
  const { securityStatus, rateLimits } = useSecurity();
  const { securityEvents, clearSecurityEvents } = useSecurityMonitoring();
  const [activeTab, setActiveTab] = useState<'status' | 'events' | 'limits'>('status');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    // Load stored audit logs
    try {
      const storedLogs = JSON.parse(localStorage.getItem('fbms_security_events') || '[]');
      setAuditLogs(storedLogs);
    } catch (e) {
      console.warn('Failed to load security audit logs:', e);
    }
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'CSP_VIOLATION':
        return 'text-red-600 bg-red-50';
      case 'RATE_LIMIT_EXCEEDED':
        return 'text-yellow-600 bg-yellow-50';
      case 'INVALID_ORIGIN':
        return 'text-orange-600 bg-orange-50';
      case 'FILE_UPLOAD_BLOCKED':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const exportSecurityReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      securityStatus,
      auditLogs: auditLogs.slice(-50), // Last 50 events
      rateLimitStatus: {
        auth: rateLimits.auth.checkLimit(),
        general: rateLimits.general.checkLimit(),
        upload: rateLimits.upload.checkLimit(),
        pdf: rateLimits.pdf.checkLimit()
      },
      config: getSecurityConfig()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStatusTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {getStatusIcon(securityStatus.initialized)}
            <div>
              <h3 className="font-medium">Security Initialized</h3>
              <p className="text-sm text-gray-500">Core security systems</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {getStatusIcon(securityStatus.environmentValid)}
            <div>
              <h3 className="font-medium">Environment Valid</h3>
              <p className="text-sm text-gray-500">Configuration check</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {getStatusIcon(securityStatus.cspEnabled)}
            <div>
              <h3 className="font-medium">CSP Enabled</h3>
              <p className="text-sm text-gray-500">Content Security Policy</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {getStatusIcon(securityStatus.rateLimitEnabled)}
            <div>
              <h3 className="font-medium">Rate Limiting</h3>
              <p className="text-sm text-gray-500">API protection active</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {getStatusIcon(securityStatus.httpsEnforced)}
            <div>
              <h3 className="font-medium">HTTPS Enforced</h3>
              <p className="text-sm text-gray-500">Secure transport</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {getStatusIcon(securityStatus.errors.length === 0)}
            <div>
              <h3 className="font-medium">No Errors</h3>
              <p className="text-sm text-gray-500">{securityStatus.errors.length} error(s)</p>
            </div>
          </div>
        </div>
      </div>

      {securityStatus.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-medium text-red-800">Security Errors</h3>
          </div>
          <ul className="space-y-1">
            {securityStatus.errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderEventsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Security Events ({auditLogs.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              try {
                const storedLogs = JSON.parse(localStorage.getItem('fbms_security_events') || '[]');
                setAuditLogs(storedLogs);
              } catch (e) {
                console.warn('Failed to refresh logs:', e);
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={clearSecurityEvents}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear Events
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No security events recorded</p>
          </div>
        ) : (
          auditLogs.slice().reverse().map((event, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getSeverityColor(event.type)}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{event.type.replace(/_/g, ' ')}</span>
                    <span className="text-xs px-2 py-1 bg-white rounded">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {event.details && (
                    <div className="mt-1 text-sm opacity-75">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderLimitsTab = () => {
    const limits = [
      { name: 'Authentication', type: 'auth' as const, description: 'Login attempts' },
      { name: 'General API', type: 'general' as const, description: 'General requests' },
      { name: 'File Upload', type: 'upload' as const, description: 'File uploads' },
      { name: 'PDF Generation', type: 'pdf' as const, description: 'PDF exports' }
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Rate Limit Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {limits.map(limit => {
            const status = rateLimits[limit.type].checkLimit();
            const percentage = ((status.remaining / 100) * 100); // Assuming max 100 for display
            
            return (
              <div key={limit.type} className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{limit.name}</h4>
                    <p className="text-sm text-gray-500">{limit.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {status.remaining}
                    </div>
                    <div className="text-xs text-gray-500">remaining</div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      status.remaining > 50 ? 'bg-green-500' :
                      status.remaining > 20 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(5, percentage)}%` }}
                  />
                </div>
                
                {status.resetTime > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Resets in {Math.ceil(status.resetTime / 1000)}s
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              Security Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Monitor application security status and events</p>
          </div>
          <button
            onClick={exportSecurityReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'status', label: 'Security Status', icon: CheckCircle },
            { key: 'events', label: 'Security Events', icon: Eye },
            { key: 'limits', label: 'Rate Limits', icon: Activity }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'status' && renderStatusTab()}
        {activeTab === 'events' && renderEventsTab()}
        {activeTab === 'limits' && renderLimitsTab()}
      </div>
    </div>
  );
};

export default SecurityDashboard;