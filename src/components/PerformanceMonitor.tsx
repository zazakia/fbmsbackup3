import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  frameRate: number;
  memoryUsage?: number;
}

interface PerformanceMonitorProps {
  threshold?: number; // milliseconds
  showWarnings?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  threshold = 16, // 60fps = 16.67ms per frame
  showWarnings = process.env.NODE_ENV === 'development'
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    frameRate: 0
  });
  const [isSlowRender, setIsSlowRender] = useState(false);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measurePerformance = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      frameCount++;

      // Calculate frame rate every second
      if (frameCount % 60 === 0) {
        const fps = Math.round(1000 / (delta / 60));
        const renderTime = delta / 60;
        
        setMetrics({
          renderTime,
          frameRate: fps,
          memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024
        });

        setIsSlowRender(renderTime > threshold);
        frameCount = 0;
      }

      lastTime = currentTime;
      animationId = requestAnimationFrame(measurePerformance);
    };

    if (showWarnings) {
      animationId = requestAnimationFrame(measurePerformance);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [threshold, showWarnings]);

  if (!showWarnings || !isSlowRender) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-lg shadow-lg z-50 max-w-xs">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-4 w-4" />
        <div className="text-xs">
          <div className="font-medium">Performance Warning</div>
          <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
          <div>FPS: {metrics.frameRate}</div>
          {metrics.memoryUsage && (
            <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;