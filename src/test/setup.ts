import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { testEnv } from './utils/testUtils';
import { testDb } from './database/testDatabase';
import { mockServices } from './mocks/mockServices';
import { TestDataFactory } from './factories/testDataFactory';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Global test setup
beforeEach(async () => {
  // Reset test data factory counter for consistent test runs
  TestDataFactory.resetIdCounter();
  
  // Setup basic test environment
  await testEnv.setupTestEnvironment({
    mockDatabase: true,
    mockPayments: true,
    mockNotifications: true,
    mockReporting: true,
    loadTestData: false // Load data per test as needed
  });
});

// Cleanup after each test case
afterEach(async () => {
  // Cleanup React Testing Library
  cleanup();
  
  // Cleanup test environment
  await testEnv.cleanupTestData();
  
  // Cleanup test database
  await testDb.cleanupTestDatabase();
  
  // Reset all mocks
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress console warnings in tests unless explicitly needed
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.warn = vi.fn();
console.error = vi.fn();

// Restore console methods when needed for debugging
export function restoreConsole() {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
}

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver for component visibility tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for responsive component tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch for API tests
global.fetch = vi.fn();

// Mock crypto for ID generation in tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => `test-uuid-${Math.random().toString(36).substr(2, 9)}`),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  }
});

// Export test utilities for easy access in test files
export { testEnv, testDb, mockServices, TestDataFactory };
export * from './utils/testUtils';
export * from './config/testConfig';
export * from './factories/testDataFactory';
export * from './mocks/mockServices';
export * from './database/testDatabase';