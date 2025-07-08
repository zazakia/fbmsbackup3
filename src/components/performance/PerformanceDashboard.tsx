/**
 * Performance Dashboard Component
 * Real-time performance monitoring and testing interface
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Database,
  Globe,
  Cpu,
  MemoryStick,
  Download
} from 'lucide-react';
import { usePerformanceMonitor } from '../../utils/performanceTesting';
import { codeQualityAnalyzer, type QualityReport } from '../../utils/codeQualityAnalysis';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  target: number;
}

const PerformanceDashboard: React.FC = () => {
  const { generateReport, clearMetrics, exportMetrics } = usePerformanceMonitor();
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [realTimeMetrics, setRealTimeMetrics] = useState<PerformanceMetric[]>([]);

  useEffect(() => {
    // Initialize with current performance data
    updateRealTimeMetrics();
    
    // Update metrics every 5 seconds
    const interval = setInterval(updateRealTimeMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateRealTimeMetrics = () => {
    const memory = (performance as any)?.memory;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics: PerformanceMetric[] = [
      {
        name: 'Page Load Time',
        value: navigation?.loadEventEnd - navigation?.navigationStart || 0,
        unit: 'ms',
        status: navigation?.loadEventEnd - navigation?.navigationStart > 3000 ? 'critical' : 
                navigation?.loadEventEnd - navigation?.navigationStart > 2000 ? 'warning' : 'good',
        target: 2000
      },
      {
        name: 'Memory Usage',
        value: memory?.usedJSHeapSize || 0,
        unit: 'MB',
        status: memory?.usedJSHeapSize > 50000000 ? 'critical' : 
                memory?.usedJSHeapSize > 30000000 ? 'warning' : 'good',
        target: 30000000
      },
      {
        name: 'DOM Nodes',
        value: document.querySelectorAll('*').length,
        unit: 'nodes',
        status: document.querySelectorAll('*').length > 1500 ? 'warning' : 'good',
        target: 1000
      },
      {
        name: 'Bundle Size',
        value: 1917500, // Simulated from build analysis
        unit: 'bytes',
        status: 'warning', // >1MB is warning
        target: 1000000
      }
    ];

    setRealTimeMetrics(metrics);
  };

  const runPerformanceAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Generate performance report
      const perfReport = generateReport();
      setPerformanceReport(perfReport);

      // Generate code quality report
      const qualReport = await codeQualityAnalyzer.analyzeCodebase();
      setQualityReport(qualReport);

    } catch (error) {
      console.error('Performance analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-600" />
              Performance Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Real-time performance monitoring and analysis</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runPerformanceAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
            <button
              onClick={() => {
                const data = exportMetrics();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {realTimeMetrics.map((metric, index) => (
          <div key={index} className={`border rounded-lg p-4 ${getStatusColor(metric.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(metric.status)}
                <span className="font-medium text-sm">{metric.name}</span>
              </div>
              {metric.status === 'good' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="text-2xl font-bold">
              {metric.unit === 'bytes' ? formatBytes(metric.value) :
               metric.unit === 'ms' ? formatDuration(metric.value) :
               metric.value.toLocaleString()}
              {metric.unit !== 'bytes' && metric.unit !== 'ms' && (
                <span className="text-sm font-normal ml-1">{metric.unit}</span>
              )}
            </div>
            <div className="text-xs mt-1">
              Target: {metric.unit === 'bytes' ? formatBytes(metric.target) :
                      metric.unit === 'ms' ? formatDuration(metric.target) :
                      metric.target.toLocaleString()} {metric.unit !== 'bytes' && metric.unit !== 'ms' && metric.unit}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Report */}
      {performanceReport && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Performance Analysis
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {performanceReport.summary.totalTests}
              </div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {performanceReport.summary.averageDuration.toFixed(2)}ms
              </div>
              <div className="text-sm text-gray-600">Average Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {performanceReport.summary.slowestTest?.duration.toFixed(2)}ms
              </div>
              <div className="text-sm text-gray-600">Slowest Operation</div>
            </div>
          </div>

          {performanceReport.summary.slowestTest && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="font-medium text-red-800">Slowest Operation:</div>
              <div className="text-red-700">{performanceReport.summary.slowestTest.name}</div>
            </div>
          )}
        </div>
      )}

      {/* Code Quality Report */}
      {qualityReport && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Code Quality Score
          </h2>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-blue-600">
              {qualityReport.score}/100
            </div>
            <div className={`px-3 py-1 rounded-full text-lg font-bold ${
              qualityReport.grade === 'A' ? 'bg-green-100 text-green-800' :
              qualityReport.grade === 'B' ? 'bg-blue-100 text-blue-800' :
              qualityReport.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
              qualityReport.grade === 'D' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              Grade {qualityReport.grade}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">
                {qualityReport.metrics.issues.critical.length}
              </div>
              <div className="text-sm text-gray-600">Critical Issues</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-600">
                {qualityReport.metrics.issues.major.length}
              </div>
              <div className="text-sm text-gray-600">Major Issues</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {qualityReport.metrics.maintainability.coverage}%
              </div>
              <div className="text-sm text-gray-600">Test Coverage</div>
            </div>
          </div>

          {qualityReport.recommendations.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Recommendations:</h3>
              <ul className="space-y-1">
                {qualityReport.recommendations.slice(0, 5).map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Performance Tools */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Performance Tools
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => {
              console.time('Render Test');
              // Simulate expensive operation
              const start = performance.now();
              for (let i = 0; i < 100000; i++) {
                document.createElement('div');
              }
              const end = performance.now();
              console.timeEnd('Render Test');
              console.log(`Render test completed in ${end - start}ms`);
            }}
            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
          >
            <Activity className="h-5 w-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">Render Test</div>
              <div className="text-xs text-gray-600">Test component rendering</div>
            </div>
          </button>

          <button
            onClick={() => {
              const memory = (performance as any)?.memory;
              if (memory) {
                console.log('Memory Usage:', {
                  used: formatBytes(memory.usedJSHeapSize),
                  total: formatBytes(memory.totalJSHeapSize),
                  limit: formatBytes(memory.jsHeapSizeLimit)
                });
              }
            }}
            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
          >
            <MemoryStick className="h-5 w-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium">Memory Check</div>
              <div className="text-xs text-gray-600">Analyze memory usage</div>
            </div>
          </button>

          <button
            onClick={() => {
              // Test API performance
              const start = performance.now();
              fetch('/api/test')
                .then(() => {
                  const end = performance.now();
                  console.log(`API test completed in ${end - start}ms`);
                })
                .catch(() => {
                  console.log('API test failed (expected for demo)');
                });
            }}
            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
          >
            <Globe className="h-5 w-5 text-purple-600" />
            <div className="text-left">
              <div className="font-medium">API Test</div>
              <div className="text-xs text-gray-600">Test API response time</div>
            </div>
          </button>

          <button
            onClick={clearMetrics}
            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
          >
            <Database className="h-5 w-5 text-orange-600" />
            <div className="text-left">
              <div className="font-medium">Clear Metrics</div>
              <div className="text-xs text-gray-600">Reset performance data</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;