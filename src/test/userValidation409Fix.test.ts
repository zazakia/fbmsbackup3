// Test suite for 409 Foreign Key Constraint Error Fix
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  validateUserId, 
  getValidUserId, 
  prepareReceivingUserData, 
  handleForeignKeyError,
  getCurrentValidatedUser,
  getSystemUser,
  getActiveUsers
} from '../utils/userValidation';
import { createReceivingRecord } from '../api/receivingRecords';
import { supabase } from '../utils/supabase';

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('User Validation - 409 Error Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateUserId', () => {
    it('should return valid result for existing user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true
      };

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockUser, error: null })
            })
          })
        })
      });

      const result = await validateUserId('user-123');
      
      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.userName).toBe('Test User');
    });

    it('should return invalid result for non-existent user', async () => {
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'User not found' } })
            })
          })
        })
      });

      const result = await validateUserId('invalid-user');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('User not found or inactive');
    });

    it('should handle null/undefined user IDs', async () => {
      const result = await validateUserId(null);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('User ID is required');
    });
  });

  describe('getValidUserId with Fallbacks', () => {
    it('should return user ID when valid', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true
      };

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockUser, error: null })
            })
          })
        })
      });

      const result = await getValidUserId('user-123', null, true);
      
      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    it('should fallback to email lookup when user ID fails', async () => {
      const mockUserByEmail = {
        id: 'user-456',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true
      };

      let callCount = 0;
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => {
                callCount++;
                if (callCount === 1) {
                  // First call (by ID) fails
                  return Promise.resolve({ data: null, error: { message: 'User not found' } });
                } else {
                  // Second call (by email) succeeds
                  return Promise.resolve({ data: mockUserByEmail, error: null });
                }
              }
            })
          })
        })
      });

      const result = await getValidUserId('invalid-user', 'test@example.com', true);
      
      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('user-456');
    });

    it('should create system user as fallback when allowed', async () => {
      const mockSystemUser = {
        id: 'system-user',
        email: 'system@erp.local',
        first_name: 'System',
        last_name: 'User',
        role: 'system',
        is_active: true
      };

      let selectCallCount = 0;
      (supabase.from as any).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => {
                selectCallCount++;
                if (selectCallCount <= 2) {
                  // User validation calls fail
                  return Promise.resolve({ data: null, error: { message: 'User not found' } });
                } else {
                  // System user lookup succeeds
                  return Promise.resolve({ data: mockSystemUser, error: null });
                }
              }
            })
          })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockSystemUser, error: null })
          })
        })
      }));

      const result = await getValidUserId('invalid-user', 'invalid@email.com', true);
      
      expect(result.isValid).toBe(true);
      expect(result.userName).toBe('System User');
    });
  });

  describe('prepareReceivingUserData', () => {
    it('should prepare valid user data for receiving records', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true
      };

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockUser, error: null })
            })
          })
        })
      });

      const result = await prepareReceivingUserData('user-123', 'Test User', 'test@example.com');
      
      expect(result.received_by).toBe('user-123');
      expect(result.received_by_name).toBe('Test User');
    });

    it('should throw error for invalid user data', async () => {
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'User not found' } })
            })
          })
        })
      });

      await expect(prepareReceivingUserData('invalid-user', null, null))
        .rejects.toThrow('User validation failed');
    });
  });

  describe('handleForeignKeyError', () => {
    it('should detect 409 foreign key constraint violations', async () => {
      const mockError = {
        code: '23503',
        message: 'insert or update on table "purchase_order_receiving_records" violates foreign key constraint "received_by_fkey"'
      };

      const mockSystemUser = {
        id: 'system-user',
        email: 'system@erp.local',
        first_name: 'System',
        last_name: 'User',
        role: 'system',
        is_active: true
      };

      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockSystemUser, error: null })
            })
          })
        })
      });

      const result = await handleForeignKeyError(mockError, 'test operation');
      
      expect(result.shouldRetry).toBe(true);
      expect(result.fallbackUserId).toBe('system-user');
      expect(result.fallbackUserName).toBe('System User');
    });

    it('should not retry for non-foreign key errors', async () => {
      const mockError = {
        code: '42703',
        message: 'column "invalid_column" does not exist'
      };

      const result = await handleForeignKeyError(mockError, 'test operation');
      
      expect(result.shouldRetry).toBe(false);
      expect(result.errorMessage).toBe('column "invalid_column" does not exist');
    });
  });

  describe('Integration - createReceivingRecord with Validation', () => {
    it('should successfully create receiving record with valid user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true
      };

      const mockReceivingRecord = {
        id: 'record-123',
        purchase_order_id: 'po-123',
        received_by: 'user-123',
        received_by_name: 'Test User',
        received_date: new Date().toISOString(),
        notes: 'Test notes',
        status: 'completed',
        created_at: new Date().toISOString()
      };

      // Mock validation call
      const callCount = 0;
      (supabase.from as any).mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockUser, error: null })
                })
              })
            })
          };
        } else if (table === 'purchase_order_receiving_records') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockReceivingRecord, error: null })
              })
            })
          };
        }
      });

      const result = await createReceivingRecord('po-123', {
        receivedBy: 'user-123',
        receivedByName: 'Test User',
        notes: 'Test notes'
      });
      
      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data?.id).toBe('record-123');
    });

    it('should handle validation failure gracefully', async () => {
      // Mock user validation failure
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'User not found' } })
            })
          })
        })
      });

      const result = await createReceivingRecord('po-123', {
        receivedBy: 'invalid-user',
        receivedByName: 'Invalid User',
        notes: 'Test notes'
      });
      
      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('User validation failed');
    });
  });
});

describe('Error Recovery Scenarios', () => {
  it('should simulate and recover from 409 error', async () => {
    const mockSystemUser = {
      id: 'system-user',
      email: 'system@erp.local',
      first_name: 'System',
      last_name: 'User',
      role: 'system',
      is_active: true
    };

    const mockReceivingRecord = {
      id: 'record-123',
      purchase_order_id: 'po-123',
      received_by: 'system-user',
      received_by_name: 'System User',
      received_date: new Date().toISOString(),
      notes: 'Test notes',
      status: 'completed',
      created_at: new Date().toISOString()
    };

    let attemptCount = 0;
    (supabase.from as any).mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockSystemUser, error: null })
              })
            })
          })
        };
      } else if (table === 'purchase_order_receiving_records') {
        return {
          insert: () => ({
            select: () => ({
              single: () => {
                attemptCount++;
                if (attemptCount === 1) {
                  // First attempt fails with 409 error
                  return Promise.reject({
                    code: '23503',
                    message: 'insert or update on table "purchase_order_receiving_records" violates foreign key constraint "received_by_fkey"'
                  });
                } else {
                  // Retry succeeds
                  return Promise.resolve({ data: mockReceivingRecord, error: null });
                }
              }
            })
          })
        };
      }
    });

    const result = await createReceivingRecord('po-123', {
      receivedBy: 'invalid-user',
      receivedByName: 'Invalid User',
      notes: 'Test notes'
    });
    
    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();
    expect(result.data?.receivedBy).toBe('system-user');
    expect(result.data?.receivedByName).toBe('System User');
    expect(attemptCount).toBe(2); // Confirm retry occurred
  });

  it('should provide helpful error messages for different scenarios', async () => {
    const testCases = [
      {
        input: { userId: null, email: null },
        expectedError: 'User ID is required'
      },
      {
        input: { userId: '', email: '' },
        expectedError: 'User ID is required'
      },
      {
        input: { userId: 'non-existent', email: null },
        expectedError: 'User not found or inactive'
      }
    ];

    for (const testCase of testCases) {
      (supabase.from as any).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'User not found' } })
            })
          })
        })
      });

      const result = await validateUserId(testCase.input.userId);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain(testCase.expectedError);
    }
  });
});

describe('System User Management', () => {
  it('should create system user if it doesn\'t exist', async () => {
    const mockNewSystemUser = {
      id: 'new-system-user',
      email: 'system@erp.local',
      first_name: 'System',
      last_name: 'User'
    };

    let selectCalled = false;
    (supabase.from as any).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => {
              if (!selectCalled) {
                selectCalled = true;
                // First call - system user doesn't exist
                return Promise.resolve({ data: null, error: { message: 'User not found' } });
              } else {
                // Shouldn't reach here in this test
                return Promise.resolve({ data: null, error: null });
              }
            }
          })
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: mockNewSystemUser, error: null })
        })
      })
    }));

    const result = await getSystemUser();
    
    expect(result.isValid).toBe(true);
    expect(result.userId).toBe('new-system-user');
    expect(result.userName).toBe('System User');
  });

  it('should return existing system user if found', async () => {
    const mockExistingSystemUser = {
      id: 'existing-system-user',
      email: 'system@erp.local',
      first_name: 'System',
      last_name: 'User'
    };

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockExistingSystemUser, error: null })
          })
        })
      })
    });

    const result = await getSystemUser();
    
    expect(result.isValid).toBe(true);
    expect(result.userId).toBe('existing-system-user');
    expect(result.userName).toBe('System User');
  });
});

describe('Performance and Edge Cases', () => {
  it('should handle concurrent validation requests', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      is_active: true
    };

    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockUser, error: null })
          })
        })
      })
    });

    const promises = Array(10).fill(null).map(() => validateUserId('user-123'));
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('user-123');
    });
  });

  it('should handle network timeouts gracefully', async () => {
    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.reject(new Error('Network timeout'))
          })
        })
      })
    });

    const result = await validateUserId('user-123');
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Failed to validate user');
  });
});
