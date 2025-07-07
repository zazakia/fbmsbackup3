import React from 'react';
import { Power, Info } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

const MainModuleSettings: React.FC = () => {
  const { mainModule, setMainModuleEnabled } = useSettingsStore();

  const handleToggle = () => {
    setMainModuleEnabled(!mainModule.enabled);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Power className="h-5 w-5" />
          Main Module Control
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Control the main application module on/off state
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${mainModule.enabled ? 'bg-green-100' : 'bg-red-100'}`}>
              <Power className={`h-5 w-5 ${mainModule.enabled ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Main Module</h4>
              <p className="text-sm text-gray-600">
                {mainModule.enabled ? 'Currently enabled' : 'Currently disabled'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              mainModule.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                mainModule.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-blue-900">Module Control Information</h5>
              <p className="text-sm text-blue-700 mt-1">
                When the main module is disabled, core application features will be turned off. 
                This setting affects the overall system functionality and should only be changed when necessary.
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Disabling may restrict access to key features</li>
                <li>• Changes take effect immediately</li>
                <li>• Admin users can always re-enable the module</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Current Status:</span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            mainModule.enabled 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {mainModule.enabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MainModuleSettings;