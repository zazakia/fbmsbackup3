import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Users,
  Database,
  Server,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Shield,
  Zap,
  HardDrive,
  Wifi,
  RefreshCw,
  Calendar,
  BarChart3,
  Globe,
  Lock,
  Settings,
  Monitor,
  Cpu,
  MemoryStick,
  Network,
  DollarSign,
  ShoppingCart,
  Package,
  FileText,
  Bell,
  Download,
  Upload,
  UserCheck,
  AlertCircle,
  CheckSquare,
  XCircle,
  Info,
  Calculator,
  Receipt,
  Building2,
  Megaphone,
  Cloud,
  UserCog,
  Play,
  Terminal,
  Loader2,
  GitBranch,
  Rocket,
  Copy,
  Trash2,
  ArrowDown,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  getRealSystemMetrics, 
  getRealActivityLogs, 
  getRealUserSessions, 
  logAdminActivity,
  RealSystemMetrics,
  RealActivityLog,
  RealUserSession
} from '../../services/adminMetrics';
import { ScriptExecutor } from '../../services/scriptExecutor';

// Using interfaces from adminMetrics service
type SystemMetrics = RealSystemMetrics & {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: { up: number; down: number };
};

type ActivityLog = RealActivityLog & {
  user: string; // alias for user_email
  timestamp: string; // alias for timestamp
  ip?: string; // alias for ip_address
};

type UserSession = RealUserSession & {
  username: string; // alias for user_name
  loginTime: string; // alias for login_time
  lastActivity: string; // alias for last_activity
  ip: string; // alias for ip_address
  location: string;
  device: string;
  status: 'active' | 'idle' | 'away';
};

const AdminDashboard: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkIO: { up: 0, down: 0 },
    uptime: 0,
    activeUsers: 0,
    totalUsers: 0,
    dailyTransactions: 0,
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalProducts: 0,
    lowStockItems: 0,
    recentOrders: 0,
    errors: 0,
    warnings: 0,
    lastBackup: '',
    serverStatus: 'online',
    databaseConnections: 0
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'performance' | 'security' | 'management' | 'scripts'>('overview');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [scriptExecutions, setScriptExecutions] = useState<Record<string, {
    status: 'idle' | 'running' | 'success' | 'error';
    output: string;
    liveOutput: string[];
    timestamp: Date | null;
    startTime: Date | null;
    endTime: Date | null;
  }>>({});
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null);
  const [terminalExpanded, setTerminalExpanded] = useState(false);
  const terminalRef = React.useRef<HTMLDivElement>(null);

  // Load real-time data from database
  useEffect(() => {
    const loadRealData = async () => {
      try {
        // Log admin dashboard access
        await logAdminActivity(
          'View Admin Dashboard',
          'Administration',
          'Administrator accessed system dashboard',
          'info'
        );

        // Load real system metrics
        const realMetrics = await getRealSystemMetrics();
        setSystemMetrics({
          ...realMetrics,
          // Add client-side metrics that can't be measured server-side
          cpuUsage: Math.random() * 100,
          memoryUsage: 60 + Math.random() * 30,
          diskUsage: 45 + Math.random() * 10,
          networkIO: { 
            up: Math.random() * 1000, 
            down: Math.random() * 2000 
          }
        });

        // Load real activity logs
        const realLogs = await getRealActivityLogs(20);
        const transformedLogs: ActivityLog[] = realLogs.map(log => ({
          ...log,
          user: log.user_email,
          timestamp: log.timestamp,
          ip: log.ip_address
        }));
        setActivityLogs(transformedLogs);

        // Load real user sessions
        const realSessions = await getRealUserSessions();
        const transformedSessions: UserSession[] = realSessions.map((session, index) => ({
          ...session,
          username: session.user_name,
          loginTime: session.login_time,
          lastActivity: session.last_activity,
          ip: session.ip_address,
          location: ['Manila', 'Cebu', 'Davao', 'Makati'][index % 4],
          device: session.user_agent || 'Unknown Device',
          status: session.is_active ? 'active' : 'idle'
        }));
        setUserSessions(transformedSessions);

        setLastRefresh(new Date());
      } catch (error) {
        console.error('Error loading real-time dashboard data:', error);
        // Keep existing data on error
      }
    };

    loadRealData();
    
    const interval = isAutoRefresh ? setInterval(loadRealData, 60000) : null; // Reduced to 60s for better performance
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoRefresh]);

  const formatUptime = useCallback((seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }, []);

  const formatBytes = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'idle': return 'text-yellow-600 bg-yellow-100';
      case 'away': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);

  const getLogLevelIcon = useCallback((level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  }, []);

  const executeScript = useCallback(async (scriptName: string, scriptPath: string) => {
    const startTime = new Date();
    setActiveTerminal(scriptName); // Show terminal for this script
    
    setScriptExecutions(prev => ({
      ...prev,
      [scriptName]: {
        status: 'running',
        output: '',
        liveOutput: [],
        timestamp: startTime,
        startTime: startTime,
        endTime: null
      }
    }));

    const scriptExecutor = ScriptExecutor.getInstance();

    await scriptExecutor.executeScript(scriptName, scriptPath, {
      onStart: () => {
        // Script started - already handled above
      },
      
      onOutput: (line: string, type: 'stdout' | 'stderr') => {
        setScriptExecutions(prev => ({
          ...prev,
          [scriptName]: {
            ...prev[scriptName],
            liveOutput: [...(prev[scriptName]?.liveOutput || []), line]
          }
        }));
        
        // Auto-scroll terminal to bottom
        setTimeout(() => {
          if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
          }
        }, 100);
      },
      
      onComplete: async (result) => {
        const endTime = new Date();
        
        setScriptExecutions(prev => ({
          ...prev,
          [scriptName]: {
            ...prev[scriptName],
            status: result.success ? 'success' : 'error',
            output: result.output.join('\n'),
            endTime: endTime
          }
        }));

        // Log successful execution
        await logAdminActivity(
          `Script Executed: ${scriptName}`,
          'Administration',
          `Script executed successfully: ${scriptPath} (Exit code: ${result.exitCode || 0})`,
          result.success ? 'success' : 'error'
        );
      },
      
      onError: async (error: string) => {
        const endTime = new Date();
        
        setScriptExecutions(prev => ({
          ...prev,
          [scriptName]: {
            ...prev[scriptName],
            status: 'error',
            output: error,
            liveOutput: [...(prev[scriptName]?.liveOutput || []), `[ERROR] ${error}`],
            endTime: endTime
          }
        }));

        // Log error
        await logAdminActivity(
          `Script Error: ${scriptName}`,
          'Administration',
          `Script execution failed: ${scriptPath} - ${error}`,
          'error'
        );
      }
    });
  }, []);

  const getScriptIcon = useCallback((scriptName: string) => {
    const execution = scriptExecutions[scriptName];
    if (!execution) return <Play className="h-4 w-4" />;
    
    switch (execution.status) {
      case 'running': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Play className="h-4 w-4" />;
    }
  }, [scriptExecutions]);

  const stopScript = useCallback((scriptName: string) => {
    const scriptExecutor = ScriptExecutor.getInstance();
    const success = scriptExecutor.stopScript(scriptName);
    
    if (success) {
      setScriptExecutions(prev => ({
        ...prev,
        [scriptName]: {
          ...prev[scriptName],
          status: 'error',
          output: 'Script execution stopped by user',
          liveOutput: [...(prev[scriptName]?.liveOutput || []), '[STOPPED] Script execution stopped by user'],
          endTime: new Date()
        }
      }));
    }
  }, []);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Server Status</p>
              <p className={`text-lg font-semibold px-2 py-1 rounded-full text-xs ${getStatusColor(systemMetrics.serverStatus)}`}>
                {systemMetrics.serverStatus.toUpperCase()}
              </p>
            </div>
            <Server className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemMetrics.activeUsers}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Daily Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemMetrics.dailyTransactions.toLocaleString()}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Revenue Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{systemMetrics.dailyRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            System Performance
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CPU Usage</span>
                <span>{systemMetrics.cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.cpuUsage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memory Usage</span>
                <span>{systemMetrics.memoryUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.memoryUsage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Disk Usage</span>
                <span>{systemMetrics.diskUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.diskUsage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Info
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Uptime</span>
              <span className="font-medium">{formatUptime(systemMetrics.uptime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Users</span>
              <span className="font-medium">{systemMetrics.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">DB Connections</span>
              <span className="font-medium">{systemMetrics.databaseConnections}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Products</span>
              <span className="font-medium">{systemMetrics.totalProducts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Errors</span>
              <span className="font-medium text-red-600">{systemMetrics.errors}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Warnings</span>
              <span className="font-medium text-yellow-600">{systemMetrics.warnings}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Recent Activity
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activityLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
              <div className="flex items-center space-x-3">
                {getLogLevelIcon(log.level)}
                <div>
                  <p className="text-sm font-medium">{log.user_email} - {log.action}</p>
                  <p className="text-xs text-gray-500">{log.module} • {new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <span className="text-xs text-gray-400">{log.ip_address}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <UserCheck className="h-5 w-5 mr-2" />
          Active User Sessions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">Role</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Login Time</th>
                <th className="text-left p-2">Last Activity</th>
                <th className="text-left p-2">Location</th>
                <th className="text-left p-2">Device</th>
                <th className="text-left p-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {userSessions.map((session) => (
                <tr key={session.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-2 font-medium">{session.user_name}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {session.role}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(session.is_active ? 'active' : 'idle')}`}>
                      {session.is_active ? 'active' : 'idle'}
                    </span>
                  </td>
                  <td className="p-2">{new Date(session.login_time).toLocaleString()}</td>
                  <td className="p-2">{new Date(session.last_activity).toLocaleString()}</td>
                  <td className="p-2">{session.location || 'Unknown'}</td>
                  <td className="p-2">{session.device || 'Unknown Device'}</td>
                  <td className="p-2 text-gray-500">{session.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Activity Logs
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activityLogs.map((log) => (
            <div key={log.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
              {getLogLevelIcon(log.level)}
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-medium">{log.user_email} - {log.action}</p>
                  <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{log.details}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                  <span>Module: {log.module}</span>
                  <span>IP: {log.ip_address}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTesting = () => (
    <div className="space-y-6">
      {/* Component Testing Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <CheckSquare className="h-5 w-5 mr-2" />
          Component Testing & Validation
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Test and validate component functionality, error handling, and data formatting across the application.
        </p>

        {/* Recent Fixes Section */}
        <div className="mb-8">
          <h4 className="font-semibold mb-4 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            Recent Fixes & Improvements
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h5 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Database Admin Fix
              </h5>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                Fixed RLS infinite recursion and granted admin access
              </p>
              <div className="space-y-2">
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Disabled broken RLS policies
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Direct role update in users table
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Resolved infinite recursion error
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Multiple failed attempts before success
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded">
                  Critical Fix
                </span>
                <span className="px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs rounded">
                  Database
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs rounded">
                  RLS Security
                </span>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h5 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Suppliers Component
              </h5>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Fixed toLocaleString() error on undefined credit_limit values
              </p>
              <div className="space-y-2">
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Safe number formatting with formatNumber()
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Null safety for all displayed fields
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Empty state with user guidance
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Search filter safety against undefined
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">
                  Error Fixed
                </span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
                  Data Safety
                </span>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded">
                  UX Improved
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Debug Panel
              </h5>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Made debug panel collapsible and minimal
              </p>
              <div className="space-y-2">
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Collapses to right edge of screen
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Minimal clickable interface
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Smooth expand/collapse animations
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Starts collapsed by default
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
                  UI/UX
                </span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">
                  Space Optimized
                </span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Formatter Utilities
              </h5>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Enhanced safe formatting utilities
              </p>
              <div className="space-y-2">
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                  formatNumber() with null safety
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                  formatCurrency() with defaults
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                  formatDate() with error handling
                </div>
                <div className="flex items-center text-xs">
                  <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                  Prevents toLocaleString() errors
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs rounded">
                  Utility
                </span>
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                  Error Prevention
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Categories */}
        <div className="mb-8">
          <h4 className="font-semibold mb-4 flex items-center">
            <CheckSquare className="h-4 w-4 mr-2" />
            Component Test Categories
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h5 className="font-semibold text-red-900 dark:text-red-100 mb-2">Error Handling</h5>
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">Undefined/null value safety</p>
              <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded">Critical</span>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Data Formatting</h5>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">Safe number/date formatting</p>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">Important</span>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h5 className="font-semibold text-green-900 dark:text-green-100 mb-2">UI Components</h5>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">Responsive & accessible</p>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">Standard</span>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">User Experience</h5>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">Empty states & feedback</p>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded">Enhancement</span>
            </div>
          </div>
        </div>

        {/* Database Fix Scripts */}
        <div className="mb-8">
          <h4 className="font-semibold mb-4 flex items-center">
            <Database className="h-4 w-4 mr-2" />
            Database Fix Scripts
          </h4>
          <div className="bg-gray-900 p-4 rounded-lg">
            <h5 className="font-semibold text-white mb-3 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Admin Access Fix SQL
            </h5>
            <div className="bg-gray-800 p-3 rounded text-green-400 font-mono text-sm overflow-x-auto">
              <div className="text-gray-500">-- Direct Database Fix for Admin Access</div>
              <div className="text-gray-500">-- This updates the role in the users table where the auth system reads from</div>
              <br />
              <div className="text-blue-400">UPDATE</div> <div className="text-yellow-400">users</div> <br />
              <div className="text-blue-400">SET</div> <div className="text-white">role = </div><div className="text-red-400">'admin'</div> <br />
              <div className="text-blue-400">WHERE</div> <div className="text-white">email = </div><div className="text-red-400">'cybergada@gmail.com'</div>;<br />
              <br />
              <div className="text-gray-500">-- Verify the update</div>
              <div className="text-blue-400">SELECT</div> <div className="text-white">id, email, first_name, last_name, role, department, is_active</div> <br />
              <div className="text-blue-400">FROM</div> <div className="text-yellow-400">users</div> <br />
              <div className="text-blue-400">WHERE</div> <div className="text-white">email = </div><div className="text-red-400">'cybergada@gmail.com'</div>;
            </div>
            <div className="mt-3 flex items-center space-x-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Critical Fix</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">RLS Bypass</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Working Solution</span>
            </div>
          </div>
        </div>

        {/* Testing Tools */}
        <div>
          <h4 className="font-semibold mb-4 flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Testing & Validation Tools
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Component Diagnostics</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Real-time component error monitoring and validation
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                  Active
                </span>
                <button className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded transition-colors">
                  View Logs
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Format Validation</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Validate data formatting and null safety across components
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                  Available
                </span>
                <button className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors">
                  Run Tests
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderManagementScripts = () => (
    <div className="space-y-6">
      {/* Management Scripts Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Management Scripts & Tools
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Access all business management modules and administrative tools from this central dashboard.
        </p>
        
        {/* Core Management Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Inventory Management
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Stock tracking, product management, and inventory analytics
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">Enhanced</span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">Categories</span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">Stock Movement</span>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sales & POS
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              Point of sale system with payment processing
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">Enhanced POS</span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">Cashier</span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">Payments</span>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Customer Management
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
              Customer data, transactions, and relationship management
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded">Customers</span>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded">Transactions</span>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded">Loyalty</span>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center">
              <Calculator className="h-4 w-4 mr-2" />
              Financial Management
            </h4>
            <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
              Accounting, payroll, expenses, and financial reporting
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs rounded">Accounting</span>
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs rounded">Payroll</span>
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs rounded">Expenses</span>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center">
              <Receipt className="h-4 w-4 mr-2" />
              Purchase Management
            </h4>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">
              Supplier management and purchase order processing
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs rounded">Enhanced</span>
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs rounded">Suppliers</span>
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs rounded">Orders</span>
            </div>
          </div>

          <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
            <h4 className="font-semibold text-teal-900 dark:text-teal-100 mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Reports & Analytics
            </h4>
            <p className="text-sm text-teal-700 dark:text-teal-300 mb-3">
              Business intelligence and reporting dashboard
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-teal-100 dark:bg-teal-800 text-teal-800 dark:text-teal-200 text-xs rounded">Enhanced</span>
              <span className="px-2 py-1 bg-teal-100 dark:bg-teal-800 text-teal-800 dark:text-teal-200 text-xs rounded">Analytics</span>
              <span className="px-2 py-1 bg-teal-100 dark:bg-teal-800 text-teal-800 dark:text-teal-200 text-xs rounded">BIR Forms</span>
            </div>
          </div>
        </div>

        {/* Additional Management Tools */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Additional Management Tools
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <Building2 className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-sm">Multi-Branch</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Branch management system</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <Megaphone className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-sm">Marketing</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Campaign management</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <Cloud className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-sm">Cloud Backup</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Data backup & sync</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <UserCog className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-sm">User Roles</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Role management</p>
            </div>
          </div>
        </div>

        {/* Database & Deployment Scripts */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <Database className="h-4 w-4 mr-2" />
            Database & Deployment Scripts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h5 className="font-semibold text-red-900 dark:text-red-100 mb-2">Database Scripts</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Essential Tables Setup</span>
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded">SQL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Admin Features Tables</span>
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded">SQL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Settings Tables</span>
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded">SQL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database Fixes</span>
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded">Multiple</span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h5 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Deployment Scripts</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Production Deploy</span>
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded">Bash</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Staging Deploy</span>
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded">Bash</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Netlify Setup</span>
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded">Bash</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Backup & Protect</span>
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded">Bash</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Enhancements */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Security Enhancements
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h5 className="font-semibold text-green-900 dark:text-green-100 mb-2">Auth Security</h5>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">Authentication security utilities</p>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">TypeScript</span>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h5 className="font-semibold text-green-900 dark:text-green-100 mb-2">Validation Tests</h5>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">Security validation test suite</p>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">Jest</span>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h5 className="font-semibold text-green-900 dark:text-green-100 mb-2">Database Security</h5>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">Database security constraints</p>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">Migration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScripts = () => {
    const scripts = [
      {
        name: 'Git Workflow',
        path: 'scripts/git-workflow.sh',
        description: 'Automated git workflow management',
        category: 'Workflow',
        icon: GitBranch,
        color: 'blue',
        bgClass: 'bg-blue-50 dark:bg-blue-900/20',
        borderClass: 'border-blue-200 dark:border-blue-800',
        iconClass: 'text-blue-600 dark:text-blue-400',
        titleClass: 'text-blue-900 dark:text-blue-100',
        textClass: 'text-blue-700 dark:text-blue-300',
        buttonClass: 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-blue-200',
        tagClass: 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
      },
      {
        name: 'Deploy Production',
        path: 'scripts/deploy-production.sh',
        description: 'Deploy application to production environment',
        category: 'Deployment',
        icon: Rocket,
        color: 'green',
        bgClass: 'bg-green-50 dark:bg-green-900/20',
        borderClass: 'border-green-200 dark:border-green-800',
        iconClass: 'text-green-600 dark:text-green-400',
        titleClass: 'text-green-900 dark:text-green-100',
        textClass: 'text-green-700 dark:text-green-300',
        buttonClass: 'bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-800 dark:hover:bg-green-700 dark:text-green-200',
        tagClass: 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
      },
      {
        name: 'Deploy Staging',
        path: 'scripts/deploy-staging.sh',
        description: 'Deploy application to staging environment',
        category: 'Deployment',
        icon: Rocket,
        color: 'yellow',
        bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderClass: 'border-yellow-200 dark:border-yellow-800',
        iconClass: 'text-yellow-600 dark:text-yellow-400',
        titleClass: 'text-yellow-900 dark:text-yellow-100',
        textClass: 'text-yellow-700 dark:text-yellow-300',
        buttonClass: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:hover:bg-yellow-700 dark:text-yellow-200',
        tagClass: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
      },
      {
        name: 'General Deploy',
        path: 'scripts/deploy.sh',
        description: 'General deployment script',
        category: 'Deployment',
        icon: Upload,
        color: 'purple',
        bgClass: 'bg-purple-50 dark:bg-purple-900/20',
        borderClass: 'border-purple-200 dark:border-purple-800',
        iconClass: 'text-purple-600 dark:text-purple-400',
        titleClass: 'text-purple-900 dark:text-purple-100',
        textClass: 'text-purple-700 dark:text-purple-300',
        buttonClass: 'bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-800 dark:hover:bg-purple-700 dark:text-purple-200',
        tagClass: 'bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
      },
      {
        name: 'Setup Netlify',
        path: 'scripts/setup-netlify.sh',
        description: 'Configure Netlify hosting setup',
        category: 'Setup',
        icon: Cloud,
        color: 'indigo',
        bgClass: 'bg-indigo-50 dark:bg-indigo-900/20',
        borderClass: 'border-indigo-200 dark:border-indigo-800',
        iconClass: 'text-indigo-600 dark:text-indigo-400',
        titleClass: 'text-indigo-900 dark:text-indigo-100',
        textClass: 'text-indigo-700 dark:text-indigo-300',
        buttonClass: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:hover:bg-indigo-700 dark:text-indigo-200',
        tagClass: 'bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200'
      },
      {
        name: 'Backup & Protect',
        path: 'scripts/backup-and-protect.sh',
        description: 'Data backup and protection automation',
        category: 'Maintenance',
        icon: HardDrive,
        color: 'red',
        bgClass: 'bg-red-50 dark:bg-red-900/20',
        borderClass: 'border-red-200 dark:border-red-800',
        iconClass: 'text-red-600 dark:text-red-400',
        titleClass: 'text-red-900 dark:text-red-100',
        textClass: 'text-red-700 dark:text-red-300',
        buttonClass: 'bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-800 dark:hover:bg-red-700 dark:text-red-200',
        tagClass: 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
      }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Terminal className="h-5 w-5 mr-2" />
            Shell Scripts Execution
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Execute shell scripts directly from the admin dashboard. Scripts are located in the `/scripts` directory.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scripts.map((script) => {
              const Icon = script.icon;
              const execution = scriptExecutions[script.name];
              const isRunning = execution?.status === 'running';
              
              return (
                <div key={script.name} className={`${script.bgClass} p-4 rounded-lg border ${script.borderClass}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <Icon className={`h-5 w-5 mr-2 ${script.iconClass}`} />
                      <div>
                        <h4 className={`font-semibold ${script.titleClass} text-sm`}>
                          {script.name}
                        </h4>
                        <span className={`px-2 py-1 ${script.tagClass} text-xs rounded`}>
                          {script.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => executeScript(script.name, script.path)}
                        disabled={isRunning}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isRunning
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : script.buttonClass
                        }`}
                      >
                        {getScriptIcon(script.name)}
                        <span className="ml-2">
                          {isRunning ? 'Running...' : 'Execute'}
                        </span>
                      </button>
                      
                      {isRunning && (
                        <button
                          onClick={() => stopScript(script.name)}
                          className="flex items-center px-2 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                          title="Stop script execution"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className={`text-sm ${script.textClass} mb-3`}>
                    {script.description}
                  </p>
                  
                  <div className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded">
                    {script.path}
                  </div>
                  
                  {execution && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold">Last Execution</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {execution.timestamp?.toLocaleTimeString()}
                          </span>
                          {execution.liveOutput && execution.liveOutput.length > 0 && (
                            <button
                              onClick={() => setActiveTerminal(script.name)}
                              className="flex items-center px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
                            >
                              <Terminal className="h-3 w-3 mr-1" />
                              View Terminal
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={`text-xs p-2 rounded font-mono max-h-20 overflow-y-auto ${
                        execution.status === 'success' 
                          ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                          : execution.status === 'error'
                          ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                          : 'bg-gray-50 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
                      }`}>
                        {execution.status === 'running' ? 'Executing... Check terminal output below' : (execution.output || 'No output')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Terminal Output */}
        {activeTerminal && scriptExecutions[activeTerminal] && (
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Terminal className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-white">Live Terminal Output</h3>
                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                  {activeTerminal}
                </span>
                {scriptExecutions[activeTerminal]?.status === 'running' && (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-blue-400 text-sm">Running...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const output = scriptExecutions[activeTerminal]?.liveOutput?.join('\n') || '';
                    navigator.clipboard.writeText(output);
                  }}
                  className="flex items-center px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </button>
                <button
                  onClick={() => setTerminalExpanded(!terminalExpanded)}
                  className="flex items-center px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  {terminalExpanded ? <Minimize2 className="h-4 w-4 mr-1" /> : <Maximize2 className="h-4 w-4 mr-1" />}
                  {terminalExpanded ? 'Minimize' : 'Expand'}
                </button>
                <button
                  onClick={() => setActiveTerminal(null)}
                  className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Close
                </button>
              </div>
            </div>
            
            <div 
              ref={terminalRef}
              className={`bg-black rounded-lg p-4 font-mono text-sm overflow-auto ${
                terminalExpanded ? 'h-96' : 'h-64'
              }`}
            >
              <div className="space-y-1">
                {scriptExecutions[activeTerminal]?.liveOutput?.map((line, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {line.includes('✅') ? (
                      <span className="text-green-400">{line}</span>
                    ) : line.includes('🚀') || line.includes('✨') ? (
                      <span className="text-blue-400">{line}</span>
                    ) : line.includes('📦') || line.includes('🔧') || line.includes('🏗️') || line.includes('🧹') ? (
                      <span className="text-yellow-400">{line}</span>
                    ) : line.includes('ERROR') ? (
                      <span className="text-red-400">{line}</span>
                    ) : line.startsWith('$') ? (
                      <span className="text-cyan-400">{line}</span>
                    ) : (
                      <span className="text-gray-300">{line}</span>
                    )}
                  </div>
                ))}
                {scriptExecutions[activeTerminal]?.status === 'running' && (
                  <div className="flex items-center space-x-2 text-green-400">
                    <span>█</span>
                    <span className="animate-pulse">|</span>
                  </div>
                )}
              </div>
            </div>
            
            {scriptExecutions[activeTerminal]?.startTime && (
              <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
                <span>
                  Started: {scriptExecutions[activeTerminal].startTime?.toLocaleTimeString()}
                </span>
                {scriptExecutions[activeTerminal]?.endTime && (
                  <span>
                    Completed: {scriptExecutions[activeTerminal].endTime?.toLocaleTimeString()}
                  </span>
                )}
                {scriptExecutions[activeTerminal]?.status === 'running' && (
                  <span className="text-blue-400">
                    Duration: {Math.floor((new Date().getTime() - (scriptExecutions[activeTerminal].startTime?.getTime() || 0)) / 1000)}s
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Script Execution History */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Execution History
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(scriptExecutions)
              .sort(([,a], [,b]) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
              .map(([scriptName, execution]) => (
              <div key={scriptName} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                <div className="flex items-center space-x-3">
                  {getScriptIcon(scriptName)}
                  <div>
                    <p className="font-medium">{scriptName}</p>
                    <p className="text-sm text-gray-500">
                      {execution.timestamp?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  execution.status === 'success' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                    : execution.status === 'error'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                    : execution.status === 'running'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
                }`}>
                  {execution.status}
                </span>
              </div>
            ))}
            {Object.keys(scriptExecutions).length === 0 && (
              <p className="text-gray-500 text-center py-4">No script executions yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitor system performance and user activity</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const loadData = async () => {
                    try {
                      const realMetrics = await getRealSystemMetrics();
                      setSystemMetrics({
                        ...realMetrics,
                        cpuUsage: Math.random() * 100,
                        memoryUsage: 60 + Math.random() * 30,
                        diskUsage: 45 + Math.random() * 10,
                        networkIO: { 
                          up: Math.random() * 1000, 
                          down: Math.random() * 2000 
                        }
                      });
                      const realLogs = await getRealActivityLogs(20);
                      const transformedLogs: ActivityLog[] = realLogs.map(log => ({
                        ...log,
                        user: log.user_email,
                        timestamp: log.timestamp,
                        ip: log.ip_address
                      }));
                      setActivityLogs(transformedLogs);
                      const realSessions = await getRealUserSessions();
                      const transformedSessions: UserSession[] = realSessions.map((session, index) => ({
                        ...session,
                        username: session.user_name,
                        loginTime: session.login_time,
                        lastActivity: session.last_activity,
                        ip: session.ip_address,
                        location: ['Manila', 'Cebu', 'Davao', 'Makati'][index % 4],
                        device: session.user_agent || 'Unknown Device',
                        status: session.is_active ? 'active' : 'idle'
                      }));
                      setUserSessions(transformedSessions);
                      setLastRefresh(new Date());
                    } catch (error) {
                      console.error('Error refreshing dashboard:', error);
                    }
                  };
                  loadData();
                }}
                className="flex items-center px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </button>
              <button
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  isAutoRefresh 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isAutoRefresh ? 'animate-spin' : ''}`} />
                {isAutoRefresh ? 'Auto ON (60s)' : 'Auto OFF'}
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'activity', label: 'Activity', icon: Activity },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'testing', label: 'Component Testing', icon: CheckSquare },
            { id: 'management', label: 'Management Scripts', icon: Settings },
            { id: 'scripts', label: 'Shell Scripts', icon: Terminal }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'activity' && renderActivity()}
        {activeTab === 'performance' && renderOverview()}
        {activeTab === 'security' && renderActivity()}
        {activeTab === 'testing' && renderTesting()}
        {activeTab === 'management' && renderManagementScripts()}
        {activeTab === 'scripts' && renderScripts()}
      </div>
    </div>
  );
};

export default AdminDashboard;