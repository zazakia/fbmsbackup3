import React, { useState } from 'react';
import { Database, Server, Cloud, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';

const DatabaseSettings: React.FC = () => {
  const { database, setDatabaseMode } = useSettingsStore();
  const { showSuccess, showWarning } = useToastStore();
  const [isChanging, setIsChanging] = useState(false);

  const handleModeChange = async (mode: 'local' | 'remote') => {
    if (isChanging || database.mode === mode) return;
    
    setIsChanging(true);
    
    try {
      showWarning(
        'Database Mode Change', 
        'The page will reload to apply the new database settings...',
        3000
      );
      
      // Wait a moment for the toast to show
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setDatabaseMode(mode);
    } catch (error) {
      console.error('Error changing database mode:', error);
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Database Configuration</h2>
        <p className="text-gray-600">Choose between local development database or remote cloud database.</p>
      </div>

      <div className="grid gap-4">
        {/* Local Database Option */}
        <div 
          className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
            database.mode === 'local'
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
          onClick={() => handleModeChange('local')}
        >
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${
              database.mode === 'local' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}>
              <Server className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">Local Database</h3>
                {database.mode === 'local' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Wifi className="h-3 w-3 mr-1" />
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Use local Supabase instance running on your machine (http://localhost:54321)
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Fast performance</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>No internet required</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span>Data not synced to cloud</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remote Database Option */}
        <div 
          className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
            database.mode === 'remote'
              ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
          onClick={() => handleModeChange('remote')}
        >
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${
              database.mode === 'remote' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
            }`}>
              <Cloud className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">Remote Database</h3>
                {database.mode === 'remote' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Use cloud Supabase instance (coqjcziquviehgyifhek.supabase.co)
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Data persisted in cloud</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Accessible from anywhere</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span>Requires internet connection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Important Notes</h4>
            <ul className="text-sm text-amber-800 mt-2 space-y-1">
              <li>• Changing database mode will reload the application</li>
              <li>• Local database requires Supabase to be running locally</li>
              <li>• Remote database requires internet connection</li>
              <li>• Data is not automatically synced between modes</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Current Status</h4>
            <p className="text-sm text-gray-600 mt-1">
              Currently using: <span className="font-semibold capitalize">{database.mode}</span> database
            </p>
          </div>
          {isChanging && (
            <div className="flex items-center text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Applying changes...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseSettings;