interface ErrorDetails {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  context?: Record<string, any>;
  count: number;
}

interface ErrorMonitorConfig {
  maxErrors: number;
  excludePatterns: RegExp[];
  includeStackTrace: boolean;
  enableConsoleCapture: boolean;
  enableUnhandledRejectionCapture: boolean;
  enableReactErrorCapture: boolean;
  enableAutoCopy: boolean;
  autoCopyDelay: number;
}

class ErrorMonitor {
  private errors: Map<string, ErrorDetails> = new Map();
  private config: ErrorMonitorConfig;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private autoCopyTimeout: NodeJS.Timeout | null = null;

  constructor(config: Partial<ErrorMonitorConfig> = {}) {
    this.config = {
      maxErrors: 50,
      excludePatterns: [
        /Script error/,
        /Non-Error promise rejection captured/,
        /ResizeObserver loop limit exceeded/,
        /ChunkLoadError/,
        /Database connection error/,
        /Failed to fetch/,
        /NetworkError/
      ],
      includeStackTrace: true,
      enableConsoleCapture: true,
      enableUnhandledRejectionCapture: true,
      enableReactErrorCapture: true,
      enableAutoCopy: false,
      autoCopyDelay: 3000,
      ...config
    };

    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.init();
  }

  private init() {
    this.setupGlobalErrorHandler();
    this.setupUnhandledRejectionHandler();
    this.setupConsoleInterception();
  }

  private setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack
      });
    });
  }

  private setupUnhandledRejectionHandler() {
    if (this.config.enableUnhandledRejectionCapture) {
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
          stack: event.reason instanceof Error ? event.reason.stack : undefined
        });
      });
    }
  }

  private setupConsoleInterception() {
    if (this.config.enableConsoleCapture) {
      console.error = (...args) => {
        this.captureConsoleError('error', args);
        this.originalConsoleError.apply(console, args);
      };

      console.warn = (...args) => {
        this.captureConsoleError('warn', args);
        this.originalConsoleWarn.apply(console, args);
      };
    }
  }

  private captureConsoleError(level: 'error' | 'warn', args: any[]) {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      return JSON.stringify(arg, null, 2);
    }).join(' ');

    const error = args.find(arg => arg instanceof Error);
    
    this.captureError({
      message: `Console ${level}: ${message}`,
      error,
      stack: error?.stack,
      context: { level, args: args.length }
    });
  }

  private captureError(errorData: {
    message: string;
    stack?: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    error?: Error;
    context?: Record<string, any>;
  }) {
    // Filter out excluded errors
    if (this.config.excludePatterns.some(pattern => pattern.test(errorData.message))) {
      return;
    }

    const errorKey = this.generateErrorKey(errorData.message, errorData.stack);
    const existingError = this.errors.get(errorKey);

    if (existingError) {
      existingError.count++;
      existingError.timestamp = Date.now();
      return;
    }

    const errorDetails: ErrorDetails = {
      id: errorKey,
      timestamp: Date.now(),
      message: errorData.message,
      stack: this.config.includeStackTrace ? errorData.stack : undefined,
      filename: errorData.filename,
      lineno: errorData.lineno,
      colno: errorData.colno,
      error: errorData.error,
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: errorData.context,
      count: 1
    };

    this.errors.set(errorKey, errorDetails);

    // Limit the number of stored errors
    if (this.errors.size > this.config.maxErrors) {
      const oldestKey = Array.from(this.errors.keys())[0];
      this.errors.delete(oldestKey);
    }

    // Emit event for real-time handling
    this.emitErrorEvent(errorDetails);
  }

  private generateErrorKey(message: string, stack?: string): string {
    const key = message + (stack?.split('\n')[0] || '');
    try {
      // Use btoa for Latin1 characters, fallback to base64 encoding for Unicode
      return btoa(unescape(encodeURIComponent(key))).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    } catch (error) {
      // Fallback: create hash from string using simple algorithm
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        const char = key.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16).substring(0, 16);
    }
  }

  private emitErrorEvent(error: ErrorDetails) {
    window.dispatchEvent(new CustomEvent('errorMonitor:newError', {
      detail: error
    }));

    // Auto-copy functionality
    if (this.config.enableAutoCopy) {
      // Clear any existing timeout
      if (this.autoCopyTimeout) {
        clearTimeout(this.autoCopyTimeout);
      }

      // Set new timeout to auto-copy after delay
      this.autoCopyTimeout = setTimeout(() => {
        this.copyErrorReportToClipboard();
        
        // Show notification that error was auto-copied
        window.dispatchEvent(new CustomEvent('errorMonitor:autoCopy', {
          detail: {
            message: 'Error report auto-copied to clipboard',
            errorCount: this.errors.size
          }
        }));
      }, this.config.autoCopyDelay);
    }
  }

  public captureReactError(error: Error, errorInfo: any) {
    this.captureError({
      message: `React Error: ${error.message}`,
      error,
      stack: error.stack,
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });
  }

  public getAllErrors(): ErrorDetails[] {
    return Array.from(this.errors.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public getErrorsInLastMinutes(minutes: number): ErrorDetails[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.getAllErrors().filter(error => error.timestamp > cutoff);
  }

  public clearErrors() {
    this.errors.clear();
  }

  public async copyErrorReportToClipboard(): Promise<boolean> {
    try {
      const report = this.generateClaudeErrorReport();
      
      // Check if document is focused
      if (!document.hasFocus()) {
        console.warn('Document not focused, skipping auto-copy');
        return false;
      }
      
      await navigator.clipboard.writeText(report);
      return true;
    } catch (error) {
      console.warn('Failed to copy error report to clipboard:', error);
      // Fallback method for older browsers or when clipboard API fails
      try {
        const report = this.generateClaudeErrorReport();
        const textArea = document.createElement('textarea');
        textArea.value = report;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      } catch (fallbackError) {
        console.warn('Fallback copy method also failed:', fallbackError);
        return false;
      }
    }
  }

  public generateErrorReport(): string {
    const errors = this.getAllErrors();
    const recentErrors = this.getErrorsInLastMinutes(30);
    
    const report = {
      summary: {
        totalErrors: errors.length,
        recentErrors: recentErrors.length,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      errors: errors.slice(0, 10).map(error => ({
        message: error.message,
        count: error.count,
        timestamp: new Date(error.timestamp).toISOString(),
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        filename: error.filename,
        line: error.lineno,
        context: error.context
      }))
    };

    return JSON.stringify(report, null, 2);
  }

  public generateClaudeErrorReport(): string {
    const errors = this.getAllErrors();
    const recentErrors = this.getErrorsInLastMinutes(10);
    
    let report = "🚨 **Error Report for Claude Code**\n\n";
    report += `**Summary:**\n`;
    report += `- Total Errors: ${errors.length}\n`;
    report += `- Recent Errors (last 10 min): ${recentErrors.length}\n`;
    report += `- URL: ${window.location.href}\n`;
    report += `- Timestamp: ${new Date().toISOString()}\n\n`;

    if (recentErrors.length > 0) {
      report += "**Recent Errors:**\n\n";
      recentErrors.slice(0, 5).forEach((error, index) => {
        report += `**${index + 1}. ${error.message}**\n`;
        report += `- Count: ${error.count}\n`;
        report += `- Time: ${new Date(error.timestamp).toLocaleTimeString()}\n`;
        if (error.filename) report += `- File: ${error.filename}:${error.lineno}\n`;
        if (error.stack) {
          report += `- Stack:\n\`\`\`\n${error.stack.split('\n').slice(0, 3).join('\n')}\n\`\`\`\n`;
        }
        if (error.context) {
          report += `- Context: ${JSON.stringify(error.context)}\n`;
        }
        report += "\n";
      });
    }

    report += "\n**Please analyze these errors and suggest fixes.**";
    return report;
  }

  public enableAutoCopy(enabled: boolean = true) {
    this.config.enableAutoCopy = enabled;
  }

  public setAutoCopyDelay(delay: number) {
    this.config.autoCopyDelay = delay;
  }

  public destroy() {
    if (this.autoCopyTimeout) {
      clearTimeout(this.autoCopyTimeout);
    }
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
    this.errors.clear();
  }
}

export const errorMonitor = new ErrorMonitor({
  enableAutoCopy: true,
  autoCopyDelay: 3000
});
export type { ErrorDetails, ErrorMonitorConfig };