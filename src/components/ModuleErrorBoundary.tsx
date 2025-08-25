import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, WifiOff, Shield, Clock, Navigation } from 'lucide-react';
import { 
  ModuleId, 
  ModuleLoadingError, 
  ModuleLoadingErrorType, 
  ModuleErrorBoundaryProps,
  LoadingStateInfo 
} from '../types/moduleLoading';
import { createError, logError, ERROR_CODES } from '../utils/errorHandling';
import { checkUserPermissions } from '../utils/permissions';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

interface State {
  hasError: boolean;
  moduleError: ModuleLoadingError | null;
  retryCount: number;
  isRetrying: boolean;
  showFallbacks: boolean;
}

class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, State> {
  private retryTimer: NodeJS.Timeout | null = null;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    moduleError: null,
    retryCount: 0,
    isRetrying: false,
    showFallbacks: false
  };

  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.maxRetries = 3; // Default max retries, can be made configurable
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const moduleError = this.classifyModuleError(error, errorInfo);
    
    // Log the error with comprehensive context
    const appError = createError(
      ERROR_CODES.UNKNOWN_ERROR,
      error.message,
      {
        moduleId: this.props.moduleId,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'ModuleErrorBoundary',
        originalError: error,
        retryCount: this.state.retryCount
      },
      `Module: ${this.props.moduleId}`
    );

    logError(appError, {
      errorInfo,
      moduleId: this.props.moduleId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      networkStatus: this.getNetworkStatus()
    });

    // Notify parent component if callback provided
    if (this.props.onError) {
      this.props.onError(moduleError);
    }

    this.setState({ moduleError });
  }

  private classifyModuleError = (error: Error, errorInfo: ErrorInfo): ModuleLoadingError => {
    let errorType: ModuleLoadingErrorType = ModuleLoadingErrorType.UNKNOWN_ERROR;
    let recoverable = false;
    let fallbackSuggestions: ModuleId[] = [];

    // Analyze error to determine type and recovery options
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      errorType = ModuleLoadingErrorType.CHUNK_LOAD_ERROR;
      recoverable = true;
    } else if (error.message.includes('NetworkError') || !navigator.onLine) {
      errorType = ModuleLoadingErrorType.NETWORK_ERROR;
      recoverable = true;
    } else if (error.name === 'TimeoutError') {
      errorType = ModuleLoadingErrorType.TIMEOUT_ERROR;
      recoverable = true;
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      errorType = ModuleLoadingErrorType.PERMISSION_DENIED;
      recoverable = false;
    } else if (error.message.includes('Module not found') || error.message.includes('404')) {
      errorType = ModuleLoadingErrorType.MODULE_NOT_FOUND;
      recoverable = false;
    } else {
      errorType = ModuleLoadingErrorType.COMPONENT_ERROR;
      recoverable = this.state.retryCount < this.maxRetries;
    }

    // Generate fallback suggestions
    fallbackSuggestions = this.getFallbackSuggestions(this.props.moduleId);

    return {
      type: errorType,
      moduleId: this.props.moduleId,
      message: this.getUserFriendlyMessage(errorType, error.message),
      originalError: error,
      timestamp: new Date(),
      retryCount: this.state.retryCount,
      maxRetries: this.maxRetries,
      recoverable,
      fallbackSuggestions,
      context: {
        componentStack: errorInfo.componentStack,
        networkOnline: navigator.onLine,
        userAgent: navigator.userAgent
      }
    };
  };

  private getUserFriendlyMessage = (errorType: ModuleLoadingErrorType, originalMessage: string): string => {
    const moduleDisplayName = this.getModuleDisplayName(this.props.moduleId);

    switch (errorType) {
      case ModuleLoadingErrorType.CHUNK_LOAD_ERROR:
        return `Failed to load ${moduleDisplayName} components. This usually happens when the app was updated.`;
      case ModuleLoadingErrorType.NETWORK_ERROR:
        return `Network error while loading ${moduleDisplayName}. Please check your internet connection.`;
      case ModuleLoadingErrorType.OFFLINE_ERROR:
        return `${moduleDisplayName} requires an internet connection to load.`;
      case ModuleLoadingErrorType.TIMEOUT_ERROR:
        return `${moduleDisplayName} is taking too long to load. This might be due to a slow connection.`;
      case ModuleLoadingErrorType.PERMISSION_DENIED:
        return `You don't have permission to access ${moduleDisplayName}.`;
      case ModuleLoadingErrorType.MODULE_NOT_FOUND:
        return `${moduleDisplayName} module is not available or was moved.`;
      case ModuleLoadingErrorType.COMPONENT_ERROR:
        return `There was an error in the ${moduleDisplayName} module.`;
      default:
        return `Unable to load ${moduleDisplayName}. Please try again.`;
    }
  };

  private getModuleDisplayName = (moduleId: ModuleId): string => {
    const displayNames: Record<ModuleId, string> = {
      dashboard: 'Dashboard',
      pos: 'Point of Sale',
      inventory: 'Inventory Management',
      accounting: 'Accounting',
      expenses: 'Expense Tracking',
      purchases: 'Purchase Management',
      payroll: 'Payroll Management',
      'bir-forms': 'BIR Forms',
      sales: 'Sales History',
      customers: 'Customer Management',
      'manager-operations': 'Manager Operations',
      marketing: 'Marketing Campaigns',
      loyalty: 'Loyalty Programs',
      gcash: 'GCash Integration',
      paymaya: 'PayMaya Integration',
      'cloud-backup': 'Cloud Backup',
      'electronic-receipts': 'Electronic Receipts',
      'product-history': 'Product History',
      branches: 'Branch Management',
      settings: 'Settings',
      help: 'Help & Support',
      reports: 'Reports & Analytics'
    };

    return displayNames[moduleId] || moduleId;
  };

  private getFallbackSuggestions = (moduleId: ModuleId): ModuleId[] => {
    // Define fallback relationships
    const fallbackMap: Partial<Record<ModuleId, ModuleId[]>> = {
      expenses: ['accounting', 'dashboard'],
      'manager-operations': ['dashboard', 'settings'],
      'bir-forms': ['accounting', 'reports', 'dashboard'],
      payroll: ['accounting', 'dashboard'],
      'cloud-backup': ['settings', 'dashboard'],
      inventory: ['dashboard'],
      purchases: ['inventory', 'accounting', 'dashboard'],
      pos: ['sales', 'inventory', 'dashboard'],
      accounting: ['reports', 'dashboard'],
      reports: ['dashboard']
    };

    return fallbackMap[moduleId] || ['dashboard'];
  };

  private getNetworkStatus = () => {
    return {
      online: navigator.onLine,
      effectiveType: (navigator as any).connection?.effectiveType,
      downlink: (navigator as any).connection?.downlink,
      rtt: (navigator as any).connection?.rtt
    };
  };

  private canUserRetry = (): boolean => {
    if (!this.state.moduleError) return false;
    
    const { recoverable } = this.state.moduleError;
    const underRetryLimit = this.state.retryCount < this.maxRetries;
    const notCurrentlyRetrying = !this.state.isRetrying;

    return recoverable && underRetryLimit && notCurrentlyRetrying;
  };

  private handleRetry = async () => {
    if (!this.canUserRetry()) return;

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1 
    });

    // Exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    this.retryTimer = setTimeout(() => {
      this.setState({
        hasError: false,
        moduleError: null,
        isRetrying: false
      });
    }, delay);
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleShowFallbacks = () => {
    this.setState({ showFallbacks: !this.state.showFallbacks });
  };

  private handleFallbackNavigation = (moduleId: ModuleId) => {
    const routes: Record<ModuleId, string> = {
      dashboard: '/',
      expenses: '/expenses',
      accounting: '/accounting',
      'manager-operations': '/manager',
      'bir-forms': '/bir',
      payroll: '/payroll',
      'cloud-backup': '/settings',
      inventory: '/inventory',
      purchases: '/purchases',
      pos: '/pos',
      sales: '/sales',
      customers: '/customers',
      marketing: '/marketing',
      loyalty: '/loyalty',
      gcash: '/payments/gcash',
      paymaya: '/payments/paymaya',
      'electronic-receipts': '/receipts',
      'product-history': '/inventory/history',
      branches: '/branches',
      settings: '/settings',
      help: '/help',
      reports: '/reports'
    };

    const route = routes[moduleId] || '/';
    window.location.href = route;
  };

  private getErrorIcon = (errorType?: ModuleLoadingErrorType) => {
    switch (errorType) {
      case ModuleLoadingErrorType.NETWORK_ERROR:
      case ModuleLoadingErrorType.OFFLINE_ERROR:
        return WifiOff;
      case ModuleLoadingErrorType.PERMISSION_DENIED:
        return Shield;
      case ModuleLoadingErrorType.TIMEOUT_ERROR:
        return Clock;
      default:
        return AlertTriangle;
    }
  };

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  public render() {
    if (this.state.hasError && this.state.moduleError) {
      // Use custom fallback if provided
      if (this.props.fallbackComponent) {
        return <this.props.fallbackComponent />;
      }

      const { moduleError } = this.state;
      
      // Handle multiple failures degradation message
      if (this.state.multipleFailuresDegraded) {
        const degradationResult = fallbackSuggestionService.handleMultipleFailures(
          [this.props.moduleId],
          this.state.userRole,
          this.state.consecutiveFailures
        );
        
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
              <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Multiple Module Failures
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {degradationResult.message}
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-4">
                Redirecting to Dashboard in a few seconds...
              </p>
              <button
                onClick={this.handleGoHome}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard Now
              </button>
            </div>
          </div>
        );
      }

      // Route to appropriate error UI component based on error type
      const commonProps = {
        error: moduleError,
        userRole: this.state.userRole,
        onDashboardNavigate: this.handleGoHome,
        onFallbackNavigate: this.handleFallbackNavigation,
      };

      // Permission-related errors
      if (moduleError.type === ModuleLoadingErrorType.PERMISSION_DENIED || 
          moduleError.type === ModuleLoadingErrorType.ROLE_INSUFFICIENT) {
        return (
          <PermissionDeniedError
            {...commonProps}
            onRequestAccess={this.handleRequestAccess}
          />
        );
      }

      // Network-related errors
      if (moduleError.type === ModuleLoadingErrorType.NETWORK_ERROR ||
          moduleError.type === ModuleLoadingErrorType.OFFLINE_ERROR ||
          moduleError.type === ModuleLoadingErrorType.TIMEOUT_ERROR) {
        return (
          <NetworkErrorUI
            {...commonProps}
            onRetry={this.handleRetry}
            onOfflineRetry={this.handleOfflineRetry}
          />
        );
      }

      // Generic module loading errors
      return (
        <ModuleLoadingError
          {...commonProps}
          onRetry={this.handleRetry}
          onContactSupport={this.handleContactSupport}
          showRetryButton={this.props.showRetryButton !== false}
          showFallbackOptions={this.props.showFallbackOptions !== false}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component wrapper for easier usage
export const withModuleErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  moduleId: ModuleId,
  options?: {
    fallbackComponent?: React.ComponentType<any>;
    onError?: (error: ModuleLoadingError) => void;
    showRetryButton?: boolean;
    showFallbackOptions?: boolean;
  }
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <ModuleErrorBoundary
      moduleId={moduleId}
      fallbackComponent={options?.fallbackComponent}
      onError={options?.onError}
      showRetryButton={options?.showRetryButton}
      showFallbackOptions={options?.showFallbackOptions}
    >
      <WrappedComponent {...props} ref={ref} />
    </ModuleErrorBoundary>
  ));
};

export default ModuleErrorBoundary;