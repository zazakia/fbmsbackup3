import React, { useState, useEffect } from 'react';
import { AlertTriangle, Copy, X, RefreshCw, Download } from 'lucide-react';
import { errorMonitor, ErrorDetails } from '../utils/errorMonitor';
import { useToastStore } from '../store/toastStore';

interface ErrorReporterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ErrorReporter: React.FC<ErrorReporterProps> = ({ isOpen, onClose }) => {
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [filter, setFilter] = useState<'all' | 'recent'>('recent');
  const [copied, setCopied] = useState(false);
  const [autoCopyEnabled, setAutoCopyEnabled] = useState(true);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (isOpen) {
      updateErrors();
      const interval = setInterval(updateErrors, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, filter]);

  useEffect(() => {
    const handleNewError = () => {
      if (isOpen) updateErrors();
    };

    window.addEventListener('errorMonitor:newError', handleNewError);
    return () => window.removeEventListener('errorMonitor:newError', handleNewError);
  }, [isOpen, filter]);

  const updateErrors = () => {
    const allErrors = filter === 'recent' 
      ? errorMonitor.getErrorsInLastMinutes(30) 
      : errorMonitor.getAllErrors();
    setErrors(allErrors);
  };

  const handleCopyReport = async () => {
    const report = errorMonitor.generateClaudeErrorReport();
    
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      addToast({
        type: 'success',
        title: 'Report Copied',
        message: 'Error report copied to clipboard. Paste it in Claude Code chat.'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = report;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied(true);
      addToast({
        type: 'success',
        title: 'Report Copied',
        message: 'Error report copied to clipboard (fallback method).'
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadReport = () => {
    const report = errorMonitor.generateErrorReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addToast({
      type: 'success',
      title: 'Report Downloaded',
      message: 'Detailed error report downloaded as JSON file.'
    });
  };

  const handleClearErrors = () => {
    errorMonitor.clearErrors();
    setErrors([]);
    addToast({
      type: 'info',
      title: 'Errors Cleared',
      message: 'All error records have been cleared.'
    });
  };

  const handleToggleAutoCopy = () => {
    const newState = !autoCopyEnabled;
    setAutoCopyEnabled(newState);
    errorMonitor.enableAutoCopy(newState);
    addToast({
      type: 'info',
      title: 'Auto-Copy',
      message: `Auto-copy ${newState ? 'enabled' : 'disabled'}`
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Error Monitor
            </h2>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {errors.length} errors
            </span>
            <button
              onClick={handleToggleAutoCopy}
              className={`text-xs px-2 py-1 rounded-full border ${
                autoCopyEnabled 
                  ? 'bg-green-100 text-green-800 border-green-300' 
                  : 'bg-gray-100 text-gray-600 border-gray-300'
              }`}
            >
              Auto-Copy: {autoCopyEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'recent')}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-800"
            >
              <option value="recent">Recent (30 min)</option>
              <option value="all">All Errors</option>
            </select>
            <button
              onClick={updateErrors}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyReport}
              disabled={errors.length === 0}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="h-4 w-4" />
              <span>{copied ? 'Copied!' : 'Copy for Claude'}</span>
            </button>
            <button
              onClick={handleDownloadReport}
              disabled={errors.length === 0}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
            <button
              onClick={handleClearErrors}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Instructions */}
        {errors.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>To get help from Claude Code:</strong> Click "Copy for Claude" and paste the report in your chat. 
              Claude will analyze the errors and suggest specific fixes for your codebase.
            </p>
          </div>
        )}

        {/* Error List */}
        <div className="flex-1 overflow-y-auto">
          {errors.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No errors found</p>
                <p className="text-sm">Your application is running smoothly!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {errors.map((error) => (
                <ErrorItem key={error.id} error={error} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400">
          <p>
            This monitor captures console errors, unhandled promises, and React errors automatically. 
            Errors are deduplicated and stored locally. Use "Copy for Claude" to get automated fixes.
          </p>
        </div>
      </div>
    </div>
  );
};

interface ErrorItemProps {
  error: ErrorDetails;
}

const ErrorItem: React.FC<ErrorItemProps> = ({ error }) => {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getSeverityColor = (message: string) => {
    if (message.includes('Console error')) return 'text-red-600 bg-red-50';
    if (message.includes('Console warn')) return 'text-yellow-600 bg-yellow-50';
    if (message.includes('React Error')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="border dark:border-gray-600 rounded-lg overflow-hidden">
      <div
        className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(error.message)}`}>
                {error.message.includes('Console') ? 'Console' : 
                 error.message.includes('React') ? 'React' : 'Runtime'}
              </span>
              {error.count > 1 && (
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                  {error.count}x
                </span>
              )}
              <span className="text-xs text-gray-500">{formatTime(error.timestamp)}</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">
              {error.message}
            </p>
            {error.filename && (
              <p className="text-xs text-gray-500 mt-1">
                {error.filename}:{error.lineno}
              </p>
            )}
          </div>
          <div className="text-xs text-gray-400 ml-2">
            {expanded ? '▼' : '▶'}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3">
          {error.stack && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Stack Trace:</h4>
              <pre className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto">
                {error.stack}
              </pre>
            </div>
          )}
          
          {error.context && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Context:</h4>
              <pre className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded">
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};