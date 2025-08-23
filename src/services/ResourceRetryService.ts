/**
 * Resource Retry Service
 * 
 * Handles ERR_NETWORK_CHANGED and other resource loading failures
 * Provides automatic retry mechanisms for failed JavaScript and CSS resources
 */

interface FailedResource {
  url: string;
  type: 'script' | 'stylesheet' | 'module';
  error: string;
  timestamp: number;
  retryCount: number;
  element?: HTMLElement;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  networkChangeDetection: boolean;
}

class ResourceRetryService {
  private failedResources: Map<string, FailedResource> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private networkChangeHandlers: Set<() => void> = new Set();
  
  private config: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true,
    networkChangeDetection: true
  };

  private isRetrying = false;
  private retryQueue: string[] = [];

  constructor() {
    // DISABLED: This service was causing persistent loading issues
    // by overriding window.fetch and interfering with Supabase connections
    console.log('🚫 ResourceRetryService disabled to prevent loading issues');
    // this.initializeResourceMonitoring();
    // this.initializeNetworkChangeDetection();
  }

  /**
   * Initialize monitoring for resource loading failures
   */
  private initializeResourceMonitoring(): void {
    // Monitor script loading errors
    window.addEventListener('error', (event) => {
      if (event.target && (event.target as HTMLElement).tagName) {
        const element = event.target as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'script' || tagName === 'link') {
          this.handleResourceError(element, event.error || 'Resource load failed');
        }
      }
    }, true);

    // Monitor unhandled promise rejections (for dynamic imports)
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (error && typeof error === 'object' && error.message) {
        const message = error.message.toLowerCase();
        if (message.includes('loading chunk') || 
            message.includes('loading css chunk') ||
            message.includes('network') ||
            message.includes('err_network_changed')) {
          this.handleDynamicImportError(error);
        }
      }
    });

    // DISABLED: Monitor fetch failures for resources
    // This was causing persistent loading issues by interfering with Supabase
    console.log('🚫 Fetch override disabled to prevent middleware conflicts');
    /*
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok && args[0]) {
          const url = typeof args[0] === 'string' ? args[0] : args[0].url;
          if (this.isResourceUrl(url)) {
            this.handleFetchError(url, `HTTP ${response.status}`);
          }
        }
        return response;
      } catch (error) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
        if (this.isResourceUrl(url)) {
          this.handleFetchError(url, error.message || 'Fetch failed');
        }
        throw error;
      }
    };
    */
  }

  /**
   * Initialize network change detection for ERR_NETWORK_CHANGED
   */
  private initializeNetworkChangeDetection(): void {
    if (!this.config.networkChangeDetection) return;

    // Listen for online/offline events
    const handleNetworkChange = () => {
      if (navigator.onLine && this.failedResources.size > 0) {
        console.log('Network reconnected - retrying failed resources');
        this.retryAllFailedResources();
      }
    };

    window.addEventListener('online', handleNetworkChange);
    this.networkChangeHandlers.add(handleNetworkChange);

    // Listen for network connection changes (Chrome/Edge)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const handleConnectionChange = () => {
          // Wait a moment for connection to stabilize
          setTimeout(() => {
            if (navigator.onLine && this.failedResources.size > 0) {
              console.log('Network connection changed - retrying failed resources');
              this.retryAllFailedResources();
            }
          }, 1000);
        };

        connection.addEventListener('change', handleConnectionChange);
        this.networkChangeHandlers.add(handleConnectionChange);
      }
    }

    // Monitor for visibility change (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine && this.failedResources.size > 0) {
        console.log('Tab became visible - checking failed resources');
        setTimeout(() => this.retryAllFailedResources(), 500);
      }
    });
  }

  /**
   * Handle resource loading errors
   */
  private handleResourceError(element: HTMLElement, error: any): void {
    const url = this.getElementUrl(element);
    if (!url) return;

    const resourceType = this.getResourceType(element);
    const errorMessage = this.extractErrorMessage(error);

    console.warn(`Resource failed to load: ${url} (${errorMessage})`);

    this.trackFailedResource(url, resourceType, errorMessage, element);
    this.scheduleRetry(url);
  }

  /**
   * Handle dynamic import errors
   */
  private handleDynamicImportError(error: any): void {
    const errorMessage = error.message || error.toString();
    const url = this.extractUrlFromError(errorMessage);
    
    if (url) {
      console.warn(`Dynamic import failed: ${url} (${errorMessage})`);
      this.trackFailedResource(url, 'module', errorMessage);
      this.scheduleRetry(url);
    }
  }

  /**
   * Handle fetch errors
   */
  private handleFetchError(url: string, errorMessage: string): void {
    console.warn(`Fetch failed: ${url} (${errorMessage})`);
    this.trackFailedResource(url, 'script', errorMessage);
    this.scheduleRetry(url);
  }

  /**
   * Track a failed resource
   */
  private trackFailedResource(
    url: string, 
    type: 'script' | 'stylesheet' | 'module', 
    error: string,
    element?: HTMLElement
  ): void {
    const existing = this.failedResources.get(url);
    
    if (existing) {
      existing.retryCount++;
      existing.timestamp = Date.now();
      existing.error = error;
    } else {
      this.failedResources.set(url, {
        url,
        type,
        error,
        timestamp: Date.now(),
        retryCount: 0,
        element
      });
    }
  }

  /**
   * Schedule a retry for a failed resource
   */
  private scheduleRetry(url: string): void {
    const resource = this.failedResources.get(url);
    if (!resource || resource.retryCount >= this.config.maxRetries) {
      if (resource && resource.retryCount >= this.config.maxRetries) {
        console.error(`Max retries exceeded for resource: ${url}`);
        this.showPersistentErrorNotification(resource);
      }
      return;
    }

    // Clear any existing timer
    const existingTimer = this.retryTimers.get(url);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const delay = this.calculateDelay(resource.retryCount);
    console.log(`Scheduling retry for ${url} in ${delay}ms (attempt ${resource.retryCount + 1}/${this.config.maxRetries})`);

    const timer = setTimeout(() => {
      this.retryResource(url);
    }, delay);

    this.retryTimers.set(url, timer);
  }

  /**
   * Retry a specific resource
   */
  private async retryResource(url: string): Promise<void> {
    const resource = this.failedResources.get(url);
    if (!resource) return;

    console.log(`Retrying resource: ${url} (attempt ${resource.retryCount + 1})`);

    try {
      const success = await this.attemptResourceReload(resource);
      
      if (success) {
        console.log(`Successfully reloaded resource: ${url}`);
        this.failedResources.delete(url);
        this.retryTimers.delete(url);
        this.showSuccessNotification(resource);
      } else {
        resource.retryCount++;
        this.scheduleRetry(url);
      }
    } catch (error) {
      console.warn(`Retry failed for ${url}:`, error);
      resource.retryCount++;
      resource.error = error.message || 'Retry failed';
      this.scheduleRetry(url);
    }
  }

  /**
   * Attempt to reload a specific resource
   */
  private attemptResourceReload(resource: FailedResource): Promise<boolean> {
    return new Promise((resolve) => {
      switch (resource.type) {
        case 'script':
          this.reloadScript(resource).then(resolve).catch(() => resolve(false));
          break;
        case 'stylesheet':
          this.reloadStylesheet(resource).then(resolve).catch(() => resolve(false));
          break;
        case 'module':
          this.reloadModule(resource).then(resolve).catch(() => resolve(false));
          break;
        default:
          resolve(false);
      }
    });
  }

  /**
   * Reload a script resource
   */
  private reloadScript(resource: FailedResource): Promise<boolean> {
    return new Promise((resolve) => {
      // Remove old script if it exists
      if (resource.element && resource.element.parentNode) {
        resource.element.parentNode.removeChild(resource.element);
      }

      // Create new script element
      const script = document.createElement('script');
      script.src = resource.url + (resource.url.includes('?') ? '&' : '?') + '_retry=' + Date.now();
      script.async = true;

      const cleanup = () => {
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      };

      const onLoad = () => {
        cleanup();
        resolve(true);
      };

      const onError = () => {
        cleanup();
        resolve(false);
      };

      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);

      // Add to head
      document.head.appendChild(script);

      // Update resource element reference
      resource.element = script;
    });
  }

  /**
   * Reload a stylesheet resource
   */
  private reloadStylesheet(resource: FailedResource): Promise<boolean> {
    return new Promise((resolve) => {
      // Remove old link if it exists
      if (resource.element && resource.element.parentNode) {
        resource.element.parentNode.removeChild(resource.element);
      }

      // Create new link element
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = resource.url + (resource.url.includes('?') ? '&' : '?') + '_retry=' + Date.now();

      const cleanup = () => {
        link.removeEventListener('load', onLoad);
        link.removeEventListener('error', onError);
      };

      const onLoad = () => {
        cleanup();
        resolve(true);
      };

      const onError = () => {
        cleanup();
        resolve(false);
      };

      link.addEventListener('load', onLoad);
      link.addEventListener('error', onError);

      // Add to head
      document.head.appendChild(link);

      // Update resource element reference
      resource.element = link;
    });
  }

  /**
   * Reload a module (dynamic import)
   */
  private async reloadModule(resource: FailedResource): Promise<boolean> {
    try {
      // Try to re-import the module with cache busting
      const moduleUrl = resource.url + (resource.url.includes('?') ? '&' : '?') + '_retry=' + Date.now();
      await import(moduleUrl);
      return true;
    } catch (error) {
      console.warn(`Module reload failed: ${resource.url}`, error);
      return false;
    }
  }

  /**
   * Retry all failed resources
   */
  private retryAllFailedResources(): void {
    if (this.isRetrying) return;
    
    this.isRetrying = true;
    const urls = Array.from(this.failedResources.keys());
    
    console.log(`Retrying ${urls.length} failed resources`);

    // Process with staggered delays to avoid overwhelming the network
    urls.forEach((url, index) => {
      setTimeout(() => {
        this.retryResource(url);
      }, index * 200); // 200ms between retries
    });

    setTimeout(() => {
      this.isRetrying = false;
    }, urls.length * 200 + 1000);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateDelay(retryCount: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.baseDelay;
    }

    const delay = this.config.baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    
    return Math.min(delay + jitter, this.config.maxDelay);
  }

  /**
   * Show success notification
   */
  private showSuccessNotification(resource: FailedResource): void {
    if (window.dispatchEvent) {
      const event = new CustomEvent('resource-retry-success', {
        detail: {
          url: resource.url,
          type: resource.type,
          retryCount: resource.retryCount
        }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Show persistent error notification
   */
  private showPersistentErrorNotification(resource: FailedResource): void {
    if (window.dispatchEvent) {
      const event = new CustomEvent('resource-retry-failed', {
        detail: {
          url: resource.url,
          type: resource.type,
          error: resource.error,
          retryCount: resource.retryCount,
          suggestion: 'Please refresh the page to try loading the resource again.'
        }
      });
      window.dispatchEvent(event);
    }
  }

  // Helper methods

  private getElementUrl(element: HTMLElement): string | null {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'script') {
      return (element as HTMLScriptElement).src;
    } else if (tagName === 'link') {
      return (element as HTMLLinkElement).href;
    }
    return null;
  }

  private getResourceType(element: HTMLElement): 'script' | 'stylesheet' | 'module' {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'script') {
      const type = (element as HTMLScriptElement).type;
      return type === 'module' ? 'module' : 'script';
    } else if (tagName === 'link') {
      return 'stylesheet';
    }
    return 'script';
  }

  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error && error.message) return error.message;
    if (error && error.toString) return error.toString();
    return 'Unknown error';
  }

  private extractUrlFromError(errorMessage: string): string | null {
    // Try to extract URL from common error patterns
    const patterns = [
      /Loading chunk (\d+) failed[\s\S]*?\((\S+)\)/,
      /Loading CSS chunk (\d+) failed[\s\S]*?\((\S+)\)/,
      /Failed to fetch dynamically imported module: (\S+)/,
      /Error loading (\S+)/
    ];

    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match && match.length > 1) {
        return match[match.length - 1]; // Return the last capture group (URL)
      }
    }

    return null;
  }

  private isResourceUrl(url: string): boolean {
    return /\.(js|css|mjs)(\?|$)/.test(url) || url.includes('chunk');
  }

  // Public API

  /**
   * Get current failed resources
   */
  getFailedResources(): FailedResource[] {
    return Array.from(this.failedResources.values());
  }

  /**
   * Manually retry a specific resource
   */
  manualRetry(url: string): Promise<boolean> {
    const resource = this.failedResources.get(url);
    if (!resource) {
      return Promise.resolve(false);
    }

    return this.attemptResourceReload(resource);
  }

  /**
   * Clear all failed resources
   */
  clearFailedResources(): void {
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    this.failedResources.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// Create and export singleton
export const resourceRetryService = new ResourceRetryService();
export default resourceRetryService;