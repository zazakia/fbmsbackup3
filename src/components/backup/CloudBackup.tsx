import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Clock,
  Shield,
  Database,
  Settings,
  Calendar,
  File,
  Archive,
  Smartphone,
  Wifi,
  WifiOff,
  Play,
  Pause,
  RotateCcw,
  HardDrive,
  Monitor,
  Zap
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';
import { formatDate, formatCurrency } from '../../utils/formatters';
import EnhancedBackupButton from './EnhancedBackupButton';

interface BackupJob {
  id: string;
  type: 'manual' | 'scheduled' | 'automatic';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  dataSize: number;
  modules: string[];
  location: 'local' | 'cloud';
  error?: string;
}

interface SyncStatus {
  lastSync: Date;
  status: 'synced' | 'syncing' | 'error' | 'offline';
  pendingChanges: number;
  conflictCount: number;
  nextSync?: Date;
}

interface CloudStorage {
  provider: 'google' | 'aws' | 'azure' | 'dropbox';
  connected: boolean;
  usage: number;
  limit: number;
  lastBackup?: Date;
}

const CloudBackup: React.FC = () => {
  const { products, customers, sales, employees } = useBusinessStore();
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'synced',
    pendingChanges: 0,
    conflictCount: 0,
    nextSync: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
  });
  const [cloudStorage, setCloudStorage] = useState<CloudStorage>({
    provider: 'google',
    connected: true,
    usage: 1.2, // GB
    limit: 15, // GB
    lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
  });
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'sales', 'inventory', 'customers', 'accounting', 'employees'
  ]);

  useEffect(() => {
    generateSampleBackupJobs();
    simulateRealTimeSync();
  }, []);

  const generateSampleBackupJobs = () => {
    const jobs: BackupJob[] = [
      {
        id: '1',
        type: 'automatic',
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 6 * 60 * 60 * 1000 + 5 * 60 * 1000),
        dataSize: 45.6,
        modules: ['sales', 'inventory', 'customers'],
        location: 'cloud'
      },
      {
        id: '2',
        type: 'manual',
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 8 * 60 * 1000),
        dataSize: 125.8,
        modules: ['sales', 'inventory', 'customers', 'accounting', 'employees'],
        location: 'cloud'
      },
      {
        id: '3',
        type: 'scheduled',
        status: 'failed',
        progress: 45,
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        dataSize: 0,
        modules: ['accounting'],
        location: 'cloud',
        error: 'Network connection timeout'
      }
    ];

    setBackupJobs(jobs);
  };

  const simulateRealTimeSync = () => {
    const interval = setInterval(() => {
      // Simulate random pending changes
      setSyncStatus(prev => ({
        ...prev,
        pendingChanges: Math.floor(Math.random() * 5),
        status: Math.random() > 0.9 ? 'syncing' : 'synced'
      }));
    }, 10000);

    return () => clearInterval(interval);
  };

  const startBackup = async (type: 'manual' | 'scheduled' = 'manual') => {
    const newJob: BackupJob = {
      id: Date.now().toString(),
      type,
      status: 'running',
      progress: 0,
      startTime: new Date(),
      dataSize: 0,
      modules: selectedModules,
      location: 'cloud'
    };

    setBackupJobs(prev => [newJob, ...prev]);

    // Simulate backup progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setBackupJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, progress, dataSize: (progress / 100) * 85.4 }
          : job
      ));
    }

    // Complete backup
    setBackupJobs(prev => prev.map(job => 
      job.id === newJob.id 
        ? { 
            ...job, 
            status: 'completed', 
            endTime: new Date(),
            dataSize: 85.4
          }
        : job
    ));

    addToast('Backup completed successfully', 'success');
    
    // Update cloud storage
    setCloudStorage(prev => ({
      ...prev,
      usage: prev.usage + 0.1,
      lastBackup: new Date()
    }));
  };

  const restoreBackup = async (jobId: string) => {
    addToast('Restore initiated - this may take several minutes', 'info');
    
    // Simulate restore process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    addToast('Data restored successfully', 'success');
  };

  const forceSync = async () => {
    setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSyncStatus(prev => ({ 
      ...prev, 
      status: 'synced',
      lastSync: new Date(),
      pendingChanges: 0
    }));
    
    addToast('Sync completed', 'success');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="h-4 w-4 text-green-600" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed': return <X className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-700 bg-green-100';
      case 'syncing': return 'text-blue-700 bg-blue-100';
      case 'error': return 'text-red-700 bg-red-100';
      case 'offline': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const calculateTotalDataSize = () => {
    return (products || []).length * 0.5 + 
           (customers || []).length * 0.3 + 
           (sales || []).length * 0.2 + 
           (employees || []).length * 0.1;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cloud Backup & Sync</h1>
            <p className="text-gray-600">Manage your data backup and synchronization</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={forceSync}
              disabled={syncStatus.status === 'syncing'}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>
            <EnhancedBackupButton
              modules={selectedModules}
              location="cloud"
              onBackupStart={() => console.log('Backup started')}
              onBackupComplete={(result) => {
                console.log('Backup completed:', result);
                setCloudStorage(prev => ({
                  ...prev,
                  usage: prev.usage + (result.size / 1024 / 1024), // Convert KB to GB
                  lastBackup: result.timestamp
                }));
              }}
              onBackupError={(error) => {
                console.error('Backup failed:', error);
                addToast('Backup failed: ' + error.message, 'error');
              }}
            />
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sync Status</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSyncStatusColor(syncStatus.status)}`}>
                    {syncStatus.status.charAt(0).toUpperCase() + syncStatus.status.slice(1)}
                  </span>
                </div>
              </div>
              <Wifi className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Last sync: {formatDate(syncStatus.lastSync)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cloud Storage</p>
                <p className="text-lg font-semibold text-gray-900">
                  {cloudStorage.usage.toFixed(1)} / {cloudStorage.limit} GB
                </p>
              </div>
              <Cloud className="h-8 w-8 text-blue-500" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(cloudStorage.usage / cloudStorage.limit) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Changes</p>
                <p className="text-lg font-semibold text-gray-900">{syncStatus.pendingChanges}</p>
              </div>
              <Database className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {syncStatus.conflictCount} conflicts
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Backup</p>
                <p className="text-lg font-semibold text-gray-900">
                  {cloudStorage.lastBackup ? formatDate(cloudStorage.lastBackup) : 'Never'}
                </p>
              </div>
              <Archive className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Auto backup: {autoBackupEnabled ? 'On' : 'Off'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Monitor },
                { id: 'backups', label: 'Backup History', icon: Archive },
                { id: 'sync', label: 'Sync Status', icon: RefreshCw },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Upload className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="font-medium text-gray-900">Full Backup</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Create a complete backup of all your business data
                    </p>
                    <button
                      onClick={() => startBackup()}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                      Start Full Backup
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="font-medium text-gray-900">Sync Data</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Synchronize pending changes with the cloud
                    </p>
                    <button
                      onClick={forceSync}
                      disabled={syncStatus.status === 'syncing'}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {syncStatus.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Download className="h-5 w-5 text-purple-600" />
                      </div>
                      <h3 className="font-medium text-gray-900">Restore Data</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Restore your data from a previous backup
                    </p>
                    <button 
                      onClick={() => setActiveTab('backups')}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
                    >
                      View Backups
                    </button>
                  </div>
                </div>

                {/* Data Summary */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{(products || []).length}</div>
                      <div className="text-sm text-gray-600">Products</div>
                      <div className="text-xs text-gray-500">{((products || []).length * 0.5).toFixed(1)} MB</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{(customers || []).length}</div>
                      <div className="text-sm text-gray-600">Customers</div>
                      <div className="text-xs text-gray-500">{((customers || []).length * 0.3).toFixed(1)} MB</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{(sales || []).length}</div>
                      <div className="text-sm text-gray-600">Sales</div>
                      <div className="text-xs text-gray-500">{((sales || []).length * 0.2).toFixed(1)} MB</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{(employees || []).length}</div>
                      <div className="text-sm text-gray-600">Employees</div>
                      <div className="text-xs text-gray-500">{((employees || []).length * 0.1).toFixed(1)} MB</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      Total Data Size: {calculateTotalDataSize().toFixed(1)} MB
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Backup History Tab */}
            {activeTab === 'backups' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Backup History</h3>
                  <button
                    onClick={() => startBackup()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>New Backup</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {backupJobs.map((job) => (
                    <div key={job.id} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(job.status)}
                            <span className="font-medium text-gray-900">
                              {job.type.charAt(0).toUpperCase() + job.type.slice(1)} Backup
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(job.startTime)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {job.status === 'completed' && (
                            <span className="text-sm text-gray-600">
                              {job.dataSize.toFixed(1)} MB
                            </span>
                          )}
                          {job.status === 'completed' && (
                            <button
                              onClick={() => restoreBackup(job.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>

                      {job.status === 'running' && (
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{job.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${job.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {job.error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-700">{job.error}</span>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                        <span>Modules: {job.modules.join(', ')}</span>
                        <span>Location: {job.location}</span>
                        {job.endTime && (
                          <span>
                            Duration: {Math.round((job.endTime.getTime() - job.startTime.getTime()) / 60000)}m
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sync Status Tab */}
            {activeTab === 'sync' && (
              <div className="space-y-6">
                <div className="bg-white border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Real-time Sync Status</h3>
                    <button
                      onClick={forceSync}
                      disabled={syncStatus.status === 'syncing'}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
                      <span>Force Sync</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{syncStatus.pendingChanges}</div>
                      <div className="text-sm text-gray-600">Pending Changes</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{syncStatus.conflictCount}</div>
                      <div className="text-sm text-gray-600">Conflicts</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {syncStatus.nextSync ? formatDate(syncStatus.nextSync) : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Next Auto Sync</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync History</h3>
                  <div className="space-y-3">
                    {[
                      { time: new Date(), type: 'Auto Sync', status: 'success', changes: 3 },
                      { time: new Date(Date.now() - 2 * 60 * 60 * 1000), type: 'Manual Sync', status: 'success', changes: 7 },
                      { time: new Date(Date.now() - 6 * 60 * 60 * 1000), type: 'Auto Sync', status: 'success', changes: 2 },
                      { time: new Date(Date.now() - 12 * 60 * 60 * 1000), type: 'Auto Sync', status: 'failed', changes: 0 }
                    ].map((sync, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {sync.status === 'success' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <span className="font-medium text-gray-900">{sync.type}</span>
                            <div className="text-sm text-gray-600">{formatDate(sync.time)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {sync.changes} changes
                          </div>
                          <div className={`text-xs ${
                            sync.status === 'success' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {sync.status.charAt(0).toUpperCase() + sync.status.slice(1)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Settings</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Auto Backup</h4>
                        <p className="text-sm text-gray-600">Automatically backup your data</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoBackupEnabled}
                          onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Backup Frequency
                      </label>
                      <select
                        value={backupFrequency}
                        onChange={(e) => setBackupFrequency(e.target.value as 'hourly' | 'daily' | 'weekly')}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!autoBackupEnabled}
                      >
                        <option value="hourly">Every Hour</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modules to Backup
                      </label>
                      <div className="space-y-2">
                        {[
                          { id: 'sales', label: 'Sales & Transactions' },
                          { id: 'inventory', label: 'Inventory & Products' },
                          { id: 'customers', label: 'Customer Data' },
                          { id: 'accounting', label: 'Accounting & Finance' },
                          { id: 'employees', label: 'Employee Records' }
                        ].map((module) => (
                          <label key={module.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedModules.includes(module.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedModules([...selectedModules, module.id]);
                                } else {
                                  setSelectedModules(selectedModules.filter(m => m !== module.id));
                                }
                              }}
                              className="text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{module.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cloud Storage</h3>
                  
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Cloud className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Google Drive</h4>
                      <p className="text-sm text-gray-600">
                        {cloudStorage.usage.toFixed(1)} GB of {cloudStorage.limit} GB used
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        cloudStorage.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {cloudStorage.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(cloudStorage.usage / cloudStorage.limit) * 100}%` }}
                    ></div>
                  </div>

                  <button className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300">
                    Manage Cloud Storage
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudBackup;