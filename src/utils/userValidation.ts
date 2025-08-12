// User Validation Utilities for Preventing 409 Foreign Key Errors
import { supabase } from './supabase';

export interface UserValidationResult {
  isValid: boolean;
  userId?: string;
  userName?: string;
  error?: string;
}

export interface ValidatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

/**
 * Validates if a user ID exists in the database
 * This prevents 409 foreign key constraint violations
 */
export const validateUserId = async (userId: string | null): Promise<UserValidationResult> => {
  if (!userId) {
    return { 
      isValid: false, 
      error: 'User ID is required' 
    };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.warn('User validation failed:', error);
      return { 
        isValid: false, 
        error: 'User not found or inactive' 
      };
    }

    return {
      isValid: true,
      userId: data.id,
      userName: `${data.first_name} ${data.last_name}`.trim() || data.email
    };
  } catch (error) {
    console.error('Error validating user ID:', error);
    return { 
      isValid: false, 
      error: 'Failed to validate user' 
    };
  }
};

/**
 * Validates user by email and returns their ID
 */
export const validateUserEmail = async (email: string): Promise<UserValidationResult> => {
  if (!email) {
    return { 
      isValid: false, 
      error: 'Email is required' 
    };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { 
        isValid: false, 
        error: 'User not found with this email' 
      };
    }

    return {
      isValid: true,
      userId: data.id,
      userName: `${data.first_name} ${data.last_name}`.trim() || data.email
    };
  } catch (error) {
    console.error('Error validating user email:', error);
    return { 
      isValid: false, 
      error: 'Failed to validate user email' 
    };
  }
};

/**
 * Gets a valid user ID with fallback options
 * Tries userId first, then email, then returns system user
 */
export const getValidUserId = async (
  userId?: string | null, 
  email?: string | null,
  allowSystemFallback = true
): Promise<UserValidationResult> => {
  
  // Try user ID first
  if (userId) {
    const result = await validateUserId(userId);
    if (result.isValid) {
      return result;
    }
  }

  // Try email as fallback
  if (email) {
    const result = await validateUserEmail(email);
    if (result.isValid) {
      return result;
    }
  }

  // System user fallback if allowed
  if (allowSystemFallback) {
    return await getSystemUser();
  }

  return { 
    isValid: false, 
    error: 'No valid user found' 
  };
};

/**
 * Gets or creates a system user for automated operations
 */
export const getSystemUser = async (): Promise<UserValidationResult> => {
  try {
    // Try to find existing system user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', 'system@erp.local')
      .eq('is_active', true)
      .single();

    if (existingUser) {
      return {
        isValid: true,
        userId: existingUser.id,
        userName: 'System User'
      };
    }

    // System user doesn't exist, create one
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: 'system@erp.local',
        first_name: 'System',
        last_name: 'User',
        role: 'system',
        is_active: true,
        status: 'active'
      })
      .select('id, email, first_name, last_name')
      .single();

    if (createError || !newUser) {
      console.error('Failed to create system user:', createError);
      return { 
        isValid: false, 
        error: 'Could not create system user' 
      };
    }

    return {
      isValid: true,
      userId: newUser.id,
      userName: 'System User'
    };
  } catch (error) {
    console.error('Error getting system user:', error);
    return { 
      isValid: false, 
      error: 'Failed to get system user' 
    };
  }
};

/**
 * Gets current authenticated user with validation
 */
export const getCurrentValidatedUser = async (): Promise<UserValidationResult> => {
  try {
    // Get current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return await getSystemUser(); // Fallback to system user
    }

    // Validate the auth user exists in our users table
    const result = await validateUserId(authUser.id);
    
    if (result.isValid) {
      return result;
    }

    // Try by email if ID validation failed
    const emailResult = await validateUserEmail(authUser.email || '');
    if (emailResult.isValid) {
      return emailResult;
    }

    // Fallback to system user
    return await getSystemUser();
  } catch (error) {
    console.error('Error getting current validated user:', error);
    return await getSystemUser();
  }
};

/**
 * Gets all active users for dropdown/selection purposes
 */
export const getActiveUsers = async (): Promise<ValidatedUser[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('is_active', true)
      .order('first_name', { ascending: true });

    if (error || !data) {
      console.error('Error fetching active users:', error);
      return [];
    }

    return data.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`.trim() || user.email,
      role: user.role,
      isActive: user.is_active
    }));
  } catch (error) {
    console.error('Error fetching active users:', error);
    return [];
  }
};

/**
 * Validates and prepares user data for receiving records
 */
export const prepareReceivingUserData = async (
  userId?: string | null,
  userName?: string | null,
  userEmail?: string | null
) => {
  // Get valid user ID
  const validation = await getValidUserId(userId, userEmail, true);
  
  if (!validation.isValid) {
    throw new Error(`User validation failed: ${validation.error}`);
  }

  return {
    received_by: validation.userId,
    received_by_name: userName || validation.userName || 'Unknown User'
  };
};

/**
 * Error handler specifically for foreign key constraint violations
 */
export const handleForeignKeyError = async (error: any, context: string = 'operation') => {
  if (error?.code === '23503' && error?.message?.includes('received_by_fkey')) {
    console.error(`Foreign key violation in ${context}:`, error);
    
    // Try to get a valid system user for recovery
    const systemUser = await getSystemUser();
    
    if (systemUser.isValid) {
      return {
        shouldRetry: true,
        fallbackUserId: systemUser.userId,
        fallbackUserName: systemUser.userName,
        errorMessage: 'Original user not found, using system user as fallback'
      };
    }
    
    return {
      shouldRetry: false,
      errorMessage: 'User validation failed and no system user available'
    };
  }

  return {
    shouldRetry: false,
    errorMessage: error?.message || 'Unknown error occurred'
  };
};

/**
 * Batch validate multiple user IDs
 */
export const validateMultipleUsers = async (userIds: string[]): Promise<{
  valid: string[];
  invalid: string[];
  users: ValidatedUser[];
}> => {
  const valid: string[] = [];
  const invalid: string[] = [];
  const users: ValidatedUser[] = [];

  for (const userId of userIds) {
    const result = await validateUserId(userId);
    if (result.isValid && result.userId) {
      valid.push(userId);
      // Fetch full user data
      const { data } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, is_active')
        .eq('id', userId)
        .single();
      
      if (data) {
        users.push({
          id: data.id,
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
          fullName: `${data.first_name} ${data.last_name}`.trim() || data.email,
          role: data.role,
          isActive: data.is_active
        });
      }
    } else {
      invalid.push(userId);
    }
  }

  return { valid, invalid, users };
};
