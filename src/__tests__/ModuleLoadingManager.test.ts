/**
 * Comprehensive Unit Tests for ModuleLoadingManager
 * Tests all error scenarios, retry logic, and state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModuleLoadingManager } from '../services/ModuleLoadingManager';
import { RetryManager } from '../services/RetryManager';
import { LoadingStateManager } from '../services/LoadingStateManager';
import { PermissionErrorHandler } from '../services/PermissionErrorHandler';
import { ModuleLoggingService } from '../services/ModuleLoggingService';
import { FallbackSuggestionService } from '../services/FallbackSuggestionService';
import { ModuleCacheService } from '../services/ModuleCacheService';
import type { ModuleConfig, ModuleLoadingError, UserRole } from '../types/moduleLoading';

// Mock dependencies
vi.mock('../services/RetryManager');
vi.mock('../services/LoadingStateManager');
vi.mock('../services/PermissionErrorHandler');
vi.mock('../services/ModuleLoggingService');
vi.mock('../services/FallbackSuggestionService');
vi.mock('../services/ModuleCacheService');

// Mock React.lazy and related functions
const mockLazyComponent = vi.fn();
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    lazy: vi.fn(() => mockLazyComponent),
    Suspense: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('ModuleLoadingManager', () => {
  let moduleLoadingManager: ModuleLoadingManager;
  let mockRetryManager: vi.Mocked<RetryManager>;
  let mockLoadingStateManager: vi.Mocked<LoadingStateManager>;
  let mockPermissionHandler: vi.Mocked<PermissionErrorHandler>;
  let mockLoggingService: vi.Mocked<ModuleLoggingService>;
  let mockFallbackService: vi.Mocked<FallbackSuggestionService>;
  let mockCacheService: vi.Mocked<ModuleCacheService>;

  const mockUser = {
    id: 'user-123',
    role: 'manager' as UserRole,
    permissions: ['expenses', 'operations', 'dashboard']
  };

  const mockModuleConfig: ModuleConfig = {
    id: 'expenses',
    name: 'Expense Tracking',
    component: 'ExpenseTracking',
    path: '/expenses',
    requiredPermissions: ['expenses'],
    requiredRole: 'employee',
    timeout: 5000,
    retryable: true,
    priority: 'high'
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mocked instances
    mockRetryManager = vi.mocked(new RetryManager());
    mockLoadingStateManager = vi.mocked(new LoadingStateManager());
    mockPermissionHandler = vi.mocked(new PermissionErrorHandler());
    mockLoggingService = vi.mocked(new ModuleLoggingService());
    mockFallbackService = vi.mocked(new FallbackSuggestionService());
    mockCacheService = vi.mocked(new ModuleCacheService());

    // Setup default mock behaviors
    mockPermissionHandler.validateModuleAccess.mockResolvedValue(true);
    mockCacheService.getFromCache.mockResolvedValue(null);
    mockRetryManager.shouldRetry.mockReturnValue(true);
    mockRetryManager.executeWithRetry.mockImplementation((fn) => fn());
    mockLoadingStateManager.setLoading.mockResolvedValue(undefined);
    mockLoadingStateManager.setSuccess.mockResolvedValue(undefined);
    mockLoadingStateManager.setError.mockResolvedValue(undefined);

    moduleLoadingManager = new ModuleLoadingManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadModule - Success Scenarios', () => {
    it('should successfully load a module with valid permissions', async () => {
      // Arrange
      const mockComponent = { default: vi.fn() };
      mockLazyComponent.mockResolvedValue(mockComponent);
      mockCacheService.getFromCache.mockResolvedValue(null);

      // Act
      const result = await moduleLoadingManager.loadModule(mockModuleConfig, mockUser);

      // Assert
      expect(result).toBeDefined();
      expect(mockPermissionHandler.validateModuleAccess).toHaveBeenCalledWith(
        mockModuleConfig,
        mockUser
      );
      expect(mockLoadingStateManager.setLoading).toHaveBeenCalledWith(mockModuleConfig.id);
      expect(mockLoadingStateManager.setSuccess).toHaveBeenCalledWith(mockModuleConfig.id);
      expect(mockLoggingService.logLoadingSuccess).toHaveBeenCalled();
    });

    it('should serve cached module when available', async () => {
      // Arrange
      const cachedComponent = { default: vi.fn() };
      mockCacheService.getFromCache.mockResolvedValue(cachedComponent);

      // Act
      const result = await moduleLoadingManager.loadModule(mockModuleConfig, mockUser);

      // Assert
      expect(result).toBe(cachedComponent);
      expect(mockCacheService.getFromCache).toHaveBeenCalledWith(mockModuleConfig.id);
      expect(mockLazyComponent).not.toHaveBeenCalled();
      expect(mockLoggingService.logCacheHit).toHaveBeenCalled();
    });

    it('should cache successfully loaded module', async () => {
      // Arrange
      const mockComponent = { default: vi.fn() };
      mockLazyComponent.mockResolvedValue(mockComponent);

      // Act
      await moduleLoadingManager.loadModule(mockModuleConfig, mockUser);

      // Assert
      expect(mockCacheService.setCache).toHaveBeenCalledWith(
        mockModuleConfig.id,
        mockComponent,
        expect.any(Number)
      );
    });
  });

  describe('loadModule - Permission Error Scenarios', () => {
    it('should handle permission denial errors', async () => {
      // Arrange
      mockPermissionHandler.validateModuleAccess.mockResolvedValue(false);
      const permissionError: ModuleLoadingError = {
        type: 'permission_denied',
        message: 'Insufficient permissions',
        moduleId: mockModuleConfig.id,
        timestamp: Date.now(),
        userRole: mockUser.role,
        retryable: false
      };
      mockPermissionHandler.createPermissionError.mockReturnValue(permissionError);

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ).rejects.toThrow('Insufficient permissions');

      expect(mockLoadingStateManager.setError).toHaveBeenCalledWith(
        mockModuleConfig.id,
        permissionError
      );
      expect(mockLoggingService.logPermissionDenial).toHaveBeenCalled();
    });

    it('should not attempt retry for permission errors', async () => {
      // Arrange
      mockPermissionHandler.validateModuleAccess.mockResolvedValue(false);
      const permissionError: ModuleLoadingError = {
        type: 'permission_denied',
        message: 'Access denied',
        moduleId: mockModuleConfig.id,
        timestamp: Date.now(),
        userRole: mockUser.role,
        retryable: false
      };
      mockPermissionHandler.createPermissionError.mockReturnValue(permissionError);

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ).rejects.toThrow();

      expect(mockRetryManager.executeWithRetry).not.toHaveBeenCalled();
    });
  });

  describe('loadModule - Network and Loading Error Scenarios', () => {
    it('should handle network timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Loading timeout');
      timeoutError.name = 'TimeoutError';
      mockLazyComponent.mockRejectedValue(timeoutError);
      mockRetryManager.shouldRetry.mockReturnValue(true);
      mockRetryManager.executeWithRetry.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ).rejects.toThrow('Loading timeout');

      expect(mockRetryManager.executeWithRetry).toHaveBeenCalled();
      expect(mockLoggingService.logLoadingError).toHaveBeenCalled();
    });

    it('should handle chunk loading failures', async () => {
      // Arrange
      const chunkError = new Error('Loading chunk 0 failed');
      chunkError.name = 'ChunkLoadError';
      mockLazyComponent.mockRejectedValue(chunkError);
      mockRetryManager.executeWithRetry.mockRejectedValue(chunkError);

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ).rejects.toThrow('Loading chunk 0 failed');

      expect(mockRetryManager.executeWithRetry).toHaveBeenCalled();
      expect(mockLoadingStateManager.setError).toHaveBeenCalledWith(
        mockModuleConfig.id,
        expect.objectContaining({
          type: 'chunk_load_error',
          retryable: true
        })
      );
    });

    it('should handle JavaScript errors in module', async () => {
      // Arrange
      const jsError = new Error('Module execution error');
      jsError.name = 'Error';
      mockLazyComponent.mockRejectedValue(jsError);
      mockRetryManager.executeWithRetry.mockRejectedValue(jsError);

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ).rejects.toThrow('Module execution error');

      expect(mockLoadingStateManager.setError).toHaveBeenCalledWith(
        mockModuleConfig.id,
        expect.objectContaining({
          type: 'module_error',
          retryable: false
        })
      );
    });
  });

  describe('loadModule - Retry Logic', () => {
    it('should retry failed loads according to retry manager', async () => {
      // Arrange
      const networkError = new Error('Network error');
      mockLazyComponent.mockRejectedValueOnce(networkError).mockResolvedValue({ default: vi.fn() });
      mockRetryManager.executeWithRetry.mockImplementationOnce(async (fn) => {
        // First call fails, second succeeds
        try {
          await fn();
        } catch (error) {
          // Simulate retry
          return await fn();
        }
      });

      // Act
      const result = await moduleLoadingManager.loadModule(mockModuleConfig, mockUser);

      // Assert
      expect(result).toBeDefined();
      expect(mockRetryManager.executeWithRetry).toHaveBeenCalled();
      expect(mockLoggingService.logRetryAttempt).toHaveBeenCalled();
    });

    it('should not retry non-retryable errors', async () => {
      // Arrange
      const syntaxError = new Error('Syntax error in module');
      syntaxError.name = 'SyntaxError';
      mockLazyComponent.mockRejectedValue(syntaxError);
      mockRetryManager.shouldRetry.mockReturnValue(false);

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ).rejects.toThrow('Syntax error in module');

      expect(mockRetryManager.executeWithRetry).not.toHaveBeenCalled();
    });
  });

  describe('loadModule - Timeout Handling', () => {
    it('should timeout module loading after configured duration', async () => {
      // Arrange
      const slowModuleConfig = { ...mockModuleConfig, timeout: 100 };
      mockLazyComponent.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(slowModuleConfig, mockUser)
      ).rejects.toThrow('Module loading timeout');

      expect(mockLoadingStateManager.setError).toHaveBeenCalledWith(
        slowModuleConfig.id,
        expect.objectContaining({
          type: 'timeout',
          retryable: true
        })
      );
    });

    it('should show slow loading warning before timeout', async () => {
      // Arrange
      const slowModuleConfig = { ...mockModuleConfig, timeout: 2000 };
      mockLazyComponent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ default: vi.fn() }), 1500))
      );

      // Act
      await moduleLoadingManager.loadModule(slowModuleConfig, mockUser);

      // Assert
      expect(mockLoadingStateManager.setSlowLoading).toHaveBeenCalledWith(slowModuleConfig.id);
    });
  });

  describe('Multiple Module Loading', () => {
    it('should handle concurrent module loading requests', async () => {
      // Arrange
      const module1Config = { ...mockModuleConfig, id: 'module1' };
      const module2Config = { ...mockModuleConfig, id: 'module2' };
      mockLazyComponent.mockResolvedValue({ default: vi.fn() });

      // Act
      const [result1, result2] = await Promise.all([
        moduleLoadingManager.loadModule(module1Config, mockUser),
        moduleLoadingManager.loadModule(module2Config, mockUser)
      ]);

      // Assert
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(mockLoadingStateManager.setLoading).toHaveBeenCalledTimes(2);
      expect(mockLoadingStateManager.setSuccess).toHaveBeenCalledTimes(2);
    });

    it('should prevent duplicate loading of same module', async () => {
      // Arrange
      mockLazyComponent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ default: vi.fn() }), 100))
      );

      // Act
      const [result1, result2] = await Promise.all([
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser),
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ]);

      // Assert
      expect(result1).toBe(result2);
      expect(mockLazyComponent).toHaveBeenCalledTimes(1);
      expect(mockLoggingService.logDuplicateRequest).toHaveBeenCalled();
    });
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', async () => {
      // Arrange
      const networkError = new Error('Failed to fetch');
      networkError.name = 'TypeError';
      mockLazyComponent.mockRejectedValue(networkError);
      mockRetryManager.executeWithRetry.mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ).rejects.toThrow();

      expect(mockLoadingStateManager.setError).toHaveBeenCalledWith(
        mockModuleConfig.id,
        expect.objectContaining({
          type: 'network_error',
          retryable: true
        })
      );
    });

    it('should classify module compilation errors correctly', async () => {
      // Arrange
      const compileError = new Error('Unexpected token');
      compileError.name = 'SyntaxError';
      mockLazyComponent.mockRejectedValue(compileError);
      mockRetryManager.shouldRetry.mockReturnValue(false);

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ).rejects.toThrow();

      expect(mockLoadingStateManager.setError).toHaveBeenCalledWith(
        mockModuleConfig.id,
        expect.objectContaining({
          type: 'module_error',
          retryable: false
        })
      );
    });
  });

  describe('Performance Metrics', () => {
    it('should track loading performance metrics', async () => {
      // Arrange
      mockLazyComponent.mockResolvedValue({ default: vi.fn() });

      // Act
      await moduleLoadingManager.loadModule(mockModuleConfig, mockUser);

      // Assert
      expect(mockLoggingService.logPerformanceMetrics).toHaveBeenCalledWith(
        mockModuleConfig.id,
        expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number),
          fromCache: false
        })
      );
    });

    it('should track cache hit performance', async () => {
      // Arrange
      const cachedComponent = { default: vi.fn() };
      mockCacheService.getFromCache.mockResolvedValue(cachedComponent);

      // Act
      await moduleLoadingManager.loadModule(mockModuleConfig, mockUser);

      // Assert
      expect(mockLoggingService.logPerformanceMetrics).toHaveBeenCalledWith(
        mockModuleConfig.id,
        expect.objectContaining({
          fromCache: true,
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup resources on error', async () => {
      // Arrange
      const error = new Error('Loading failed');
      mockLazyComponent.mockRejectedValue(error);
      mockRetryManager.executeWithRetry.mockRejectedValue(error);

      // Act & Assert
      await expect(
        moduleLoadingManager.loadModule(mockModuleConfig, mockUser)
      ).rejects.toThrow();

      expect(mockCacheService.invalidateCache).toHaveBeenCalledWith(mockModuleConfig.id);
      expect(mockLoadingStateManager.cleanup).toHaveBeenCalledWith(mockModuleConfig.id);
    });

    it('should handle module unloading', async () => {
      // Arrange
      mockLazyComponent.mockResolvedValue({ default: vi.fn() });
      await moduleLoadingManager.loadModule(mockModuleConfig, mockUser);

      // Act
      await moduleLoadingManager.unloadModule(mockModuleConfig.id);

      // Assert
      expect(mockCacheService.removeFromCache).toHaveBeenCalledWith(mockModuleConfig.id);
      expect(mockLoadingStateManager.cleanup).toHaveBeenCalledWith(mockModuleConfig.id);
    });
  });
});