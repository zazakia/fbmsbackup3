// Error Components Export Index
// Centralized exports for all error handling components and services

// Error UI Components
export { default as ModuleLoadingError } from './ModuleLoadingError';
export { default as PermissionDeniedError } from './PermissionDeniedError';
export { default as NetworkErrorUI } from './NetworkErrorUI';

// Error Handling Services
export { permissionErrorHandler, PermissionErrorHandler } from '../../services/PermissionErrorHandler';
export { fallbackSuggestionService, FallbackSuggestionService } from '../../services/FallbackSuggestionService';
export { networkRecoveryService, NetworkRecoveryService } from '../../services/NetworkRecoveryService';

// Main Error Boundary (Enhanced)
export { default as ModuleErrorBoundary, withModuleErrorBoundary } from '../ModuleErrorBoundary';

// Type definitions
export type {
  ModuleLoadingError,
  ModuleLoadingErrorType,
  NetworkCondition,
  NetworkStatus,
  SystemStatus
} from '../../types/moduleLoading';

export type { UserRole } from '../../types/auth';

/**
 * Phase 2 Error Recovery and Fallbacks Implementation
 * 
 * This module provides a comprehensive error recovery system with the following features:
 * 
 * Task 7 - Permission Error Handling:
 * - Role-based permission validation before module loading
 * - Contextual error messages with clear role requirements
 * - Permission change detection during user sessions
 * - Request access functionality with admin contact integration
 * 
 * Task 8 - Fallback Suggestions:
 * - Intelligent module relationship mapping
 * - User permission-aware fallback recommendations
 * - System health monitoring and module availability tracking
 * - Graceful degradation to Dashboard on multiple failures
 * 
 * Task 9 - Network Recovery:
 * - Real-time network condition monitoring
 * - Offline detection with automatic retry queuing
 * - Adaptive loading strategies based on connection quality
 * - Network-aware retry mechanisms with exponential backoff
 * 
 * Task 10 - Error UI Components:
 * - ModuleLoadingError: Generic module loading failures with retry options
 * - PermissionDeniedError: Permission-specific UI with role information and access requests
 * - NetworkErrorUI: Network-aware error handling with connection diagnostics
 * 
 * Task 11 - User Recovery Actions:
 * - Manual retry buttons with loading state feedback
 * - "Go to Dashboard" fallback navigation option
 * - Alternative module navigation from error screens
 * - Support contact integration for persistent failures
 * 
 * Integration Points:
 * - Enhanced ModuleErrorBoundary automatically routes to appropriate error components
 * - Services integrate with existing ModuleLoadingManager and RetryManager
 * - Components use existing permission system and auth store
 * - Network monitoring works with browser APIs for connection detection
 * 
 * Usage Example:
 * 
 * ```typescript
 * import { 
 *   ModuleErrorBoundary, 
 *   permissionErrorHandler, 
 *   networkRecoveryService 
 * } from './components/errors';
 * 
 * // Wrap components with enhanced error boundary
 * <ModuleErrorBoundary
 *   moduleId="expenses"
 *   onError={(error) => console.log('Module error:', error)}
 *   showRetryButton={true}
 *   showFallbackOptions={true}
 * >
 *   <ExpenseTrackingModule />
 * </ModuleErrorBoundary>
 * 
 * // Manual permission validation
 * const permissionError = permissionErrorHandler.validatePermissions(moduleConfig, userRole);
 * if (permissionError) {
 *   // Handle permission error
 * }
 * 
 * // Network-aware retry strategy
 * const retryStrategy = networkRecoveryService.getNetworkAwareRetryStrategy(moduleId, error);
 * if (retryStrategy.shouldRetry) {
 *   // Implement retry with appropriate delay
 * }
 * ```
 */