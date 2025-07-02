import { User, LoginCredentials, RegisterData } from '../types/auth';

const JWT_SECRET = 'fbms-secret-key-2024'; // In production, use environment variable

// Simple hash function for browser compatibility (replace bcrypt)
const simpleHash = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'fbms-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Simple JWT implementation for browser
const base64UrlEncode = (str: string): string => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64UrlDecode = (str: string): string => {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
};

// Mock database - in production, this would be a real database
export let users: User[] = [];
export let passwords: Record<string, string> = {};

// Initialize mock data
export const resetAuthMocks = async (): Promise<void> => {
  users = [
    {
      id: '1',
      email: 'admin@fbms.com',
      firstName: 'Juan',
      lastName: 'dela Cruz',
      role: 'admin',
      businessId: 'business-1',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date()
    }
  ];
  
  passwords = {
    '1': await simpleHash('admin123')
  };
};

// Initialize on module load
resetAuthMocks();

export const hashPassword = async (password: string): Promise<string> => {
  return simpleHash(password);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await simpleHash(password);
  return passwordHash === hash;
};

export const generateToken = (user: User): string => {
  const header = {
    typ: 'JWT',
    alg: 'HS256'
  };

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // Simple signature (in production, use proper HMAC)
  const signature = base64UrlEncode(encodedHeader + '.' + encodedPayload + '.' + JWT_SECRET);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const verifyToken = (token: string): any => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const authenticateUser = async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
  const user = users.find(u => u.email === credentials.email && u.isActive);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const passwordHash = passwords[user.id];
  if (!passwordHash) {
    throw new Error('Invalid email or password');
  }

  const isValidPassword = await comparePassword(credentials.password, passwordHash);
  
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  user.lastLogin = new Date();
  
  const token = generateToken(user);
  
  return { user, token };
};

export const registerUser = async (data: RegisterData): Promise<{ user: User; token: string }> => {
  // Check if user already exists
  const existingUser = users.find(u => u.email === data.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create new user
  const newUser: User = {
    id: (users.length + 1).toString(),
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role || 'admin',
    businessId: `business-${users.length + 1}`,
    isActive: true,
    createdAt: new Date(),
    lastLogin: new Date()
  };

  // Hash password
  const passwordHash = await hashPassword(data.password);
  
  // Store user and password
  users.push(newUser);
  passwords[newUser.id] = passwordHash;
  
  const token = generateToken(newUser);
  
  return { user: newUser, token };
};

export const getUserById = (id: string): User | null => {
  return users.find(u => u.id === id && u.isActive) || null;
};

export const updateUserLastLogin = (userId: string): void => {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.lastLogin = new Date();
  }
};

// Validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(name);
};