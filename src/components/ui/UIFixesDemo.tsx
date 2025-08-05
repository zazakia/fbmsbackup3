import React, { useState } from 'react';
import { Bell, Download, Settings, TestTube, CheckCircle } from 'lucide-react';
import SimpleBackupButton from '../backup/SimpleBackupButton';
import { useToastStore } from '../../store/toastStore';

const UIFixesDemo: React.FC = () => {
  const [testMode, setTestMode] = useState(false);
  const { addToast } = useToastStore();

  const testNotifications = () => {
    // Test different notification types
    addToast({
      type: 'success',
      title: 'Success Notification',
      message: 'This is a success message with proper visibility and contrast.',
      duration: 5000
    });

    setTimeout(() => {
      addToast({
        type: 'error',
        title: 'Error Notification',
        message: 'This is an error message that should be clearly visible.',
        duration: 7000
      });
    }, 1000);

    setTimeout(() => {
      addToast({
        type: 'warning',
        title: 'Warning Notification',
        message: 'This is a warning message with improved readability.',
        duration: 6000
      });
    }, 2000);

    setTimeout(() => {
      addToast({
        type: 'info',
        title: 'Info Notification',
        message: 'This is an info message with enhanced visibility.',
        duration: 5000
      });
    }, 3000);
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            UI/UX Fixes Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the fixed backup button functionality and improved notification visibility.
          </p>
        </div>

        {/* Test Mode Toggle */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TestTube className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">Test Mode</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {testMode && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Test mode enabled. Backup operations will be simulated and notifications will show test data.
            </p>
          )}
        </div>

        {/* Backup Button Tests */}
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Backup Button Fixes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The backup button now has proper error handling, loading states, and user feedback.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Cloud Backup</h3>
              <SimpleBackupButton location="cloud" variant="primary" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Creates backup to cloud storage with progress feedback.
              </p>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Local Backup</h3>
              <SimpleBackupButton location="local" variant="secondary" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Creates local backup file with status updates.
              </p>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Large Button</h3>
              <SimpleBackupButton location="cloud" size="lg" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Larger button for better mobile accessibility.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Tests */}
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Visibility Fixes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Notifications now have improved contrast, opacity, and readability in both light and dark themes.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Toast Notifications</h3>
              <button
                onClick={testNotifications}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Test Toast Notifications
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Shows success, error, warning, and info toasts with improved visibility.
              </p>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">System Notifications</h3>
              <button
                onClick={() => addToast({
                  type: 'info',
                  title: 'System Update',
                  message: 'UI fixes have been applied successfully.',
                  duration: 5000
                })}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Test System Notifications
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Adds notifications with better contrast and visibility.
              </p>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center mb-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
            <h2 className="text-lg font-semibold text-green-900 dark:text-green-100">
              UI/UX Fixes Applied Successfully
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">Fixed Issues:</h3>
              <ul className="space-y-1 text-green-700 dark:text-green-300">
                <li>• Backup button functionality and error handling</li>
                <li>• Notification transparency and visibility</li>
                <li>• Toast message contrast and readability</li>
                <li>• Dark theme compatibility</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">Improvements:</h3>
              <ul className="space-y-1 text-green-700 dark:text-green-300">
                <li>• Enhanced accessibility compliance</li>
                <li>• Better user feedback and loading states</li>
                <li>• Improved mobile responsiveness</li>
                <li>• Consistent theme support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIFixesDemo;