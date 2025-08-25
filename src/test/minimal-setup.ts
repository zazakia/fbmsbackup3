import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { mockSupabaseModule } from './mocks/supabaseMock';
import { mockStores, resetAllStoreMocks } from './mocks/storeMocks';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: mockSupabaseModule.supabase,
  createClient: mockSupabaseModule.createClient
}));

// Mock Zustand stores
vi.mock('../store/businessStore', () => ({
  useBusinessStore: vi.fn(() => mockStores.business),
  default: vi.fn(() => mockStores.business)
}));

vi.mock('../store/notificationStore', () => ({
  useNotificationStore: vi.fn(() => mockStores.notification),
  default: vi.fn(() => mockStores.notification)
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(() => mockStores.auth),
  default: vi.fn(() => mockStores.auth)
}));

vi.mock('../store/cartStore', () => ({
  useCartStore: vi.fn(() => mockStores.cart),
  default: vi.fn(() => mockStores.cart)
}));

vi.mock('../store/settingsStore', () => ({
  useSettingsStore: vi.fn(() => mockStores.settings),
  default: vi.fn(() => mockStores.settings)
}));

// Setup before each test
beforeEach(() => {
  // Reset all store mocks
  resetAllStoreMocks();
  
  // Reset Supabase mocks
  vi.clearAllMocks();
});

// Cleanup after each test case
afterEach(() => {
  // Cleanup React Testing Library
  cleanup();
  
  // Reset all mocks
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
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

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});