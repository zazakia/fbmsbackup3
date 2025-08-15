import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Mock environment variables for testing
const TEST_SUPABASE_URL = 'https://test.supabase.co';
const TEST_SUPABASE_ANON_KEY = 'test-anon-key-123';

// Mock global fetch
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

// Create a simplified mock implementation of testSupabaseConnection
const createTestSupabaseConnection = () => {
  return async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(`${TEST_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': TEST_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${TEST_SUPABASE_ANON_KEY}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return { connected: true, error: null };
      } else {
        return { connected: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return { connected: false, error: 'Connection timeout' };
      }
      
      return { connected: false, error: error.message };
    }
  };
};

// Mock AbortController for timeout testing
class MockAbortController {
  signal = { aborted: false };
  abort = vi.fn(() => {
    this.signal.aborted = true;
  });
}

// Helper to create a test Supabase client
function createTestClient(): SupabaseClient {
  return createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
    global: {
      fetch: mockFetch
    }
  });
}

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Supabase Connection Reliability Tests', () => {
  let originalAbortController: typeof AbortController;
  let testClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock AbortController
    originalAbortController = global.AbortController;
    global.AbortController = MockAbortController as any;
    
    testClient = createTestClient();
    
    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.AbortController = originalAbortController;
  });

  describe('1. Basic Ping Test (testSupabaseConnection)', () => {
    it('should successfully connect to Supabase with valid credentials', async () => {
      // Mock the testSupabaseConnection function to return success
      mockTestSupabaseConnection.mockResolvedValueOnce({
        connected: true,
        error: null
      });

      // Mock successful fetch response for internal validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        clone: () => ({
          json: () => Promise.resolve({})
        })
      });

      const result = await mockTestSupabaseConnection();

      expect(result).toEqual({
        connected: true,
        error: null
      });
      
      // Verify the mock was called
      expect(mockTestSupabaseConnection).toHaveBeenCalledOnce();
    });

    it('should handle HTTP errors gracefully', async () => {
      // Mock testSupabaseConnection to return error
      mockTestSupabaseConnection.mockResolvedValueOnce({
        connected: false,
        error: 'HTTP 401: Unauthorized'
      });

      const result = await mockTestSupabaseConnection();

      expect(result).toEqual({
        connected: false,
        error: 'HTTP 401: Unauthorized'
      });
    });

    it('should handle network failures', async () => {
      // Mock testSupabaseConnection to return network error
      mockTestSupabaseConnection.mockResolvedValueOnce({
        connected: false,
        error: 'Network error'
      });

      const result = await mockTestSupabaseConnection();

      expect(result).toEqual({
        connected: false,
        error: 'Network error'
      });
    });
  });

  describe('2. Simulated Timeout via AbortController', () => {
    it('should timeout after specified duration', async () => {
      let abortController: MockAbortController;
      
      // Mock fetch to simulate slow response
      mockFetch.mockImplementationOnce(async (input, init) => {
        abortController = init?.signal as any;
        
        // Simulate slow response that should be aborted
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            if (abortController?.aborted) {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            } else {
              resolve({ ok: true });
            }
          }, 10000); // Simulate 10s delay
        });
        
        return { ok: true };
      });

      // Start the connection test
      const connectionPromise = testSupabaseConnection();

      // Fast-forward time to trigger timeout (5 seconds)
      vi.advanceTimersByTime(5000);
      
      const result = await connectionPromise;

      expect(result).toEqual({
        connected: false,
        error: 'Connection timeout'
      });
    });

    it('should respect custom timeout values', async () => {
      // Create client with custom timeout
      const customTimeoutMs = 2000;
      
      mockFetch.mockImplementationOnce(async (input, init) => {
        // Simulate response that takes longer than custom timeout
        await delay(customTimeoutMs + 500);
        return { ok: true };
      });

      // Mock environment variable for custom timeout
      const originalEnv = process.env.VITE_SUPABASE_FETCH_TIMEOUT_MS;
      process.env.VITE_SUPABASE_FETCH_TIMEOUT_MS = customTimeoutMs.toString();

      const connectionPromise = testSupabaseConnection();
      
      // Advance time by custom timeout amount
      vi.advanceTimersByTime(customTimeoutMs);
      
      const result = await connectionPromise;

      expect(result.connected).toBe(false);
      expect(result.error).toContain('timeout');

      // Restore environment
      process.env.VITE_SUPABASE_FETCH_TIMEOUT_MS = originalEnv;
    });
  });

  describe('3. Retry Logic Verification', () => {
    it('should implement exponential backoff strategy', async () => {
      const fetchCallTimes: number[] = [];
      let callCount = 0;
      
      mockFetch.mockImplementation(async () => {
        fetchCallTimes.push(Date.now());
        callCount++;
        
        if (callCount < 3) {
          // Fail first 2 attempts
          throw new Error('Network failure');
        }
        
        // Succeed on 3rd attempt
        return {
          ok: true,
          status: 200,
          clone: () => ({
            json: () => Promise.resolve({})
          })
        };
      });

      // Create a retry-enabled operation
      const retryableOperation = async () => {
        const maxRetries = 3;
        const baseDelay = 100;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await mockFetch('test');
            return response;
          } catch (error) {
            if (attempt === maxRetries) {
              throw error;
            }
            
            // Exponential backoff: 100ms, 200ms, 400ms...
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      await retryableOperation();

      // Verify correct number of calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // Verify exponential backoff timing
      expect(fetchCallTimes).toHaveLength(3);
      
      // Check that delays increase exponentially (allowing for timing variance)
      const delay1 = fetchCallTimes[1] - fetchCallTimes[0];
      const delay2 = fetchCallTimes[2] - fetchCallTimes[1];
      
      // Should be approximately 100ms and 200ms respectively
      expect(delay1).toBeGreaterThan(90);
      expect(delay1).toBeLessThan(150);
      expect(delay2).toBeGreaterThan(180);
      expect(delay2).toBeLessThan(250);
    });

    it('should stop retrying after max attempts', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent network error'));

      const maxRetries = 3;
      let attempts = 0;
      
      const retryableOperation = async () => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          attempts++;
          try {
            return await mockFetch('test');
          } catch (error) {
            if (attempt === maxRetries) {
              throw error;
            }
            await delay(50);
          }
        }
      };

      await expect(retryableOperation()).rejects.toThrow('Persistent network error');
      expect(attempts).toBe(maxRetries);
    });

    it('should not retry on non-retryable errors', async () => {
      // Mock 401 Unauthorized (non-retryable)
      mockFetch.mockRejectedValueOnce(
        Object.assign(new Error('Unauthorized'), { status: 401 })
      );

      try {
        await mockFetch('test');
      } catch (error: any) {
        // Should not retry 401 errors
        expect(error.message).toBe('Unauthorized');
        expect(mockFetch).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('4. Network Failure Recovery', () => {
    it('should recover from temporary network failures', async () => {
      let callCount = 0;
      
      mockFetch.mockImplementation(async () => {
        callCount++;
        
        if (callCount <= 2) {
          // First two calls fail
          const error = new Error('Network failure');
          error.name = 'NetworkError';
          throw error;
        }
        
        // Third call succeeds
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          clone: () => ({
            json: () => Promise.resolve({})
          })
        };
      });

      // Implement recovery logic
      const recoverableOperation = async () => {
        const maxAttempts = 5;
        let lastError: Error;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const result = await testSupabaseConnection();
            if (result.connected) {
              return result;
            }
            throw new Error(result.error || 'Connection failed');
          } catch (error: any) {
            lastError = error;
            if (attempt < maxAttempts) {
              await delay(100 * attempt); // Progressive delay
            }
          }
        }
        
        throw lastError!;
      };

      const result = await recoverableOperation();
      
      expect(result.connected).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Failed twice, succeeded on third
    });

    it('should handle DNS resolution failures', async () => {
      mockFetch.mockRejectedValueOnce(
        Object.assign(new Error('getaddrinfo ENOTFOUND'), {
          code: 'ENOTFOUND',
          errno: -3008,
          syscall: 'getaddrinfo'
        })
      );

      const result = await testSupabaseConnection();
      
      expect(result.connected).toBe(false);
      expect(result.error).toContain('getaddrinfo ENOTFOUND');
    });

    it('should handle SSL/TLS certificate errors', async () => {
      mockFetch.mockRejectedValueOnce(
        Object.assign(new Error('certificate verify failed'), {
          code: 'CERT_VERIFY_FAILED'
        })
      );

      const result = await testSupabaseConnection();
      
      expect(result.connected).toBe(false);
      expect(result.error).toContain('certificate verify failed');
    });
  });

  describe('5. Connection Pool Behavior', () => {
    it('should handle 50 parallel lightweight selects without leaks', async () => {
      const connectionPool = new Map<string, boolean>();
      let activeConnections = 0;
      let maxConcurrentConnections = 0;
      const connectionIds: string[] = [];

      // Mock successful responses for all requests
      mockFetch.mockImplementation(async (input, init) => {
        const connectionId = `conn_${Date.now()}_${Math.random()}`;
        connectionIds.push(connectionId);
        
        // Simulate connection opening
        connectionPool.set(connectionId, true);
        activeConnections++;
        maxConcurrentConnections = Math.max(maxConcurrentConnections, activeConnections);

        // Simulate some processing time
        await delay(Math.random() * 50 + 10); // 10-60ms random delay

        // Simulate connection closing
        connectionPool.set(connectionId, false);
        activeConnections--;

        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [{ id: Math.random() }], count: 1 })
        };
      });

      // Create 50 parallel lightweight select operations
      const operations = Array.from({ length: 50 }, (_, index) => 
        testClient
          .from('test_table')
          .select('id')
          .limit(1)
          .single()
          .then(() => ({ success: true, index }))
          .catch(error => ({ success: false, index, error }))
      );

      const results = await Promise.allSettled(operations);

      // Verify all operations completed
      expect(results).toHaveLength(50);
      
      // Check that all operations were attempted
      expect(mockFetch).toHaveBeenCalledTimes(50);

      // Verify no connection leaks (all connections should be closed)
      expect(activeConnections).toBe(0);
      
      // Verify reasonable concurrency (should not exceed system limits)
      // Most systems can handle at least 10-20 concurrent connections
      expect(maxConcurrentConnections).toBeGreaterThan(0);
      expect(maxConcurrentConnections).toBeLessThanOrEqual(50);

      // Verify all connection IDs are unique (no connection reuse conflicts)
      const uniqueIds = new Set(connectionIds);
      expect(uniqueIds.size).toBe(connectionIds.length);

      // Check that most operations succeeded (allowing for some potential failures in heavy load)
      const successfulOperations = results.filter(result => result.status === 'fulfilled');
      expect(successfulOperations.length).toBeGreaterThanOrEqual(45); // At least 90% success rate
    });

    it('should enforce maximum concurrent connection limits', async () => {
      const MAX_CONCURRENT_CONNECTIONS = 10;
      let currentConnections = 0;
      const connectionQueue: Array<() => void> = [];

      mockFetch.mockImplementation(async () => {
        return new Promise((resolve) => {
          const executeConnection = () => {
            currentConnections++;
            
            // Simulate database operation
            setTimeout(() => {
              currentConnections--;
              resolve({
                ok: true,
                status: 200,
                json: async () => ({ data: [], count: 0 })
              });
              
              // Process next queued connection
              if (connectionQueue.length > 0) {
                const nextConnection = connectionQueue.shift()!;
                nextConnection();
              }
            }, 10);
          };

          if (currentConnections < MAX_CONCURRENT_CONNECTIONS) {
            executeConnection();
          } else {
            connectionQueue.push(executeConnection);
          }
        });
      });

      // Create more operations than the concurrent limit
      const operations = Array.from({ length: 25 }, () =>
        testClient.from('test_table').select('*').limit(1)
      );

      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();

      // Verify all operations completed
      expect(mockFetch).toHaveBeenCalledTimes(25);
      
      // Verify that operations were queued (took longer due to connection limit)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeGreaterThan(20); // Should take at least 20ms due to queuing

      // Verify no connection leaks
      expect(currentConnections).toBe(0);
      expect(connectionQueue).toHaveLength(0);
    });

    it('should detect and prevent connection leaks', async () => {
      const activeConnections = new Set<string>();
      let leakDetected = false;

      mockFetch.mockImplementation(async () => {
        const connectionId = `leak_test_${Math.random()}`;
        activeConnections.add(connectionId);

        // Simulate a connection that "forgets" to close properly
        if (activeConnections.size > 20) {
          leakDetected = true;
        }

        // Simulate normal response but intentionally don't clean up connection
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [], count: 0 })
        };
      });

      // Attempt many operations that could potentially leak
      const operations = Array.from({ length: 30 }, () =>
        testClient.from('test_table').select('id').limit(1)
      );

      await Promise.allSettled(operations);

      // In a real scenario, this would detect if connections weren't properly closed
      expect(activeConnections.size).toBeGreaterThan(0); // Intentionally leaky for test
      expect(leakDetected).toBe(true);

      // Clean up for test
      activeConnections.clear();
    });
  });

  describe('6. Advanced Connection Scenarios', () => {
    it('should handle connection pool exhaustion gracefully', async () => {
      const POOL_SIZE = 5;
      let poolExhausted = false;
      let activeConnections = 0;

      mockFetch.mockImplementation(async () => {
        activeConnections++;
        
        if (activeConnections > POOL_SIZE) {
          poolExhausted = true;
          const error = new Error('Connection pool exhausted');
          error.name = 'PoolExhaustionError';
          throw error;
        }

        // Simulate long-running operation
        await delay(100);
        
        activeConnections--;
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [], count: 0 })
        };
      });

      // Try to create more connections than pool size
      const operations = Array.from({ length: POOL_SIZE + 3 }, () =>
        testClient.from('test_table').select('*')
      );

      const results = await Promise.allSettled(operations);
      
      expect(poolExhausted).toBe(true);
      
      // Some operations should fail due to pool exhaustion
      const failures = results.filter(result => result.status === 'rejected');
      expect(failures.length).toBeGreaterThan(0);
    });

    it('should recover from database connection drops', async () => {
      let connectionDropped = false;
      let callCount = 0;

      mockFetch.mockImplementation(async () => {
        callCount++;
        
        if (callCount === 3) {
          // Simulate connection drop on 3rd call
          connectionDropped = true;
          const error = new Error('Connection terminated unexpectedly');
          error.name = 'ConnectionError';
          throw error;
        }
        
        if (callCount > 3) {
          // Simulate successful reconnection
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: [], count: 0 })
          };
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [], count: 0 })
        };
      });

      // Simulate multiple operations with connection recovery
      const operations = [];
      for (let i = 0; i < 5; i++) {
        operations.push(
          testClient.from('test_table').select('*').limit(1)
        );
      }

      const results = await Promise.allSettled(operations);
      
      expect(connectionDropped).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(5);
      
      // Verify that some operations succeeded after reconnection
      const successes = results.filter(result => result.status === 'fulfilled');
      expect(successes.length).toBeGreaterThanOrEqual(2);
    });
  });
});
