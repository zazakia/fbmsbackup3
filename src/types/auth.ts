export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  businessId: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export type UserRole = 'admin' | 'manager' | 'cashier' | 'accountant';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
  role?: UserRole;
}