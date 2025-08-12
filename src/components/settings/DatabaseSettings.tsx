import React from 'react';
import { Cloud, Wifi } from 'lucide-react';

const DatabaseSettings: React.FC = () => {

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Database Configuration</h2>
        <p className="text-gray-600">This application uses remote cloud database for production.</p>
      </div>

      <div className="grid gap-4">
        {/* Remote Database - Always Active */}
        <div className="relative rounded-lg border-2 p-4 border-green-500 bg-green-50 ring-2 ring-green-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Cloud className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">Remote Database</h3>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Wifi className="h-3 w-3 mr-1" />
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Connected to cloud Supabase instance (coqjcziquviehgyifhek.supabase.co)
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
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Secure and reliable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-green-900">Production Configuration</h4>
            <p className="text-sm text-green-700 mt-1">
              Currently using: <span className="font-semibold">Remote</span> database (Production Mode)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSettings;