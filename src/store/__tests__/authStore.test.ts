import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';
import * as authUtils from '../../utils/auth';

// Mock the auth utilities
vi.mock('../../utils/auth', async () => {
  const actual = await vi.importActual('../../utils/auth');
  return {
    ...actual,
    authenticateUser: vi.fn(),
    registerUser: vi.fn(),
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
    
    // Clear localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    // Clear auth utils mocks
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const state = useAuthStore.getState();
    
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should handle successful login', async () => {
    const credentials = {
      email: 'admin@fbms.com',
      password: 'admin123'
    };

    const mockUser = {
      id: '1',
      email: credentials.email,
      firstName: 'Juan',
      lastName: 'dela Cruz',
      role: 'admin' as const,
      businessId: 'business-1',
      isActive: true,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const mockToken = 'mock-jwt-token';

    // Mock successful authentication
    vi.mocked(authUtils.authenticateUser).mockResolvedValue({
      user: mockUser,
      token: mockToken
    });

    await useAuthStore.getState().login(credentials);
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.error).toBeNull();
    expect(localStorageMock.setItem).toHaveBeenCalledWith('fbms_token', mockToken);
  });

  it('should handle login failure', async () => {
    const credentials = {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    };

    // Mock failed authentication
    vi.mocked(authUtils.authenticateUser).mockRejectedValue(new Error('Invalid email or password'));

    try {
      await useAuthStore.getState().login(credentials);
    } catch (error) {
      // Expected to throw
    }

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.error).toBe('Invalid email or password');
  });

  it('should handle successful registration', async () => {
    const userData = {
      email: 'newuser@example.com',
      password: 'Password123',
      firstName: 'New',
      lastName: 'User',
      businessName: 'Test Business'
    };

    const mockUser = {
      id: '2',
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: 'admin' as const,
      businessId: 'business-2',
      isActive: true,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const mockToken = 'mock-jwt-token';

    // Mock successful registration
    vi.mocked(authUtils.registerUser).mockResolvedValue({
      user: mockUser,
      token: mockToken
    });

    await useAuthStore.getState().register(userData);
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.error).toBeNull();
    expect(localStorageMock.setItem).toHaveBeenCalledWith('fbms_token', mockToken);
  });

  it('should handle logout', () => {
    // First set authenticated state
    useAuthStore.setState({
      user: { id: '1', email: 'test@example.com' } as any,
      isAuthenticated: true
    });

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('fbms_token');
  });

  it('should clear error', () => {
    useAuthStore.setState({ error: 'Test error' });
    
    useAuthStore.getState().clearError();
    const state = useAuthStore.getState();

    expect(state.error).toBeNull();
  });
});