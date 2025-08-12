import React from 'react';
import { Cloud, Server, Wifi, WifiOff } from 'lucide-react';

const DatabaseSettings: React.FC = () => {
  const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
  const isLocal = supabaseUrl?.includes('localhost') || supabaseUrl?.includes('127.0.0.1');
  const isCloud = supabaseUrl?.includes('supabase.co');
  
  const getDatabaseType = () => {
    if (isLocal) return { type: 'Local', icon: Server, color: 'blue' };
    if (isCloud) return { type: 'Cloud', icon: Cloud, color: 'green' };
    return { type: 'Unknown', icon: Cloud, color: 'gray' };
  };
  
  const dbInfo = getDatabaseType();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Database Configuration</h2>
        <p className="text-gray-600">Current database configuration from environment variables.</p>
      </div>

      <div className="grid gap-4">
        {/* Current Database Configuration */}
        <div className={`relative rounded-lg border-2 p-4 border-${dbInfo.color}-500 bg-${dbInfo.color}-50 ring-2 ring-${dbInfo.color}-200`}>
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg bg-${dbInfo.color}-100 text-${dbInfo.color}-600`}>
              <dbInfo.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">{dbInfo.type} Database</h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${dbInfo.color}-100 text-${dbInfo.color}-800`}>
                  <Wifi className="h-3 w-3 mr-1" />
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Connected to: {supabaseUrl || 'Not configured'}
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                {isCloud && (
                  <>
                    <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span>Data persisted in cloud</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span>Accessible from anywhere</span>
                    </div>
                  </>
                )}
                {isLocal && (
                  <>
                    <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span>Local development instance</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                      <span>Data not persistent across restarts</span>
                    </div>
                  </>
                )}
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Configured via environment variables</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`bg-${dbInfo.color}-50 border border-${dbInfo.color}-200 rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`font-medium text-${dbInfo.color}-900`}>Current Configuration</h4>
            <p className={`text-sm text-${dbInfo.color}-700 mt-1`}>
              Database type: <span className="font-semibold">{dbInfo.type}</span>
            </p>
            <p className={`text-sm text-${dbInfo.color}-700`}>
              URL: <span className="font-mono text-xs">{supabaseUrl}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div>
            <h4 className="font-medium text-blue-900">How to Change Database</h4>
            <p className="text-sm text-blue-800 mt-2">
              To switch databases, update the environment variables in <code>.env.local</code>:
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4">
              <li>• <code>VITE_PUBLIC_SUPABASE_URL</code> - Database URL</li>
              <li>• <code>VITE_PUBLIC_SUPABASE_ANON_KEY</code> - Anonymous key</li>
            </ul>
            <p className="text-sm text-blue-800 mt-2">
              Restart the development server after making changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSettings;