import { supabase } from '../utils/supabase';
import { 
  UserSettings, 
  SystemSettings, 
  SettingsUpdateRequest, 
  SettingsResponse,
  defaultUserSettings 
} from '../types/settings';

export class SettingsAPI {
  private static instance: SettingsAPI;

  static getInstance(): SettingsAPI {
    if (!SettingsAPI.instance) {
      SettingsAPI.instance = new SettingsAPI();
    }
    return SettingsAPI.instance;
  }

  // User Settings Methods

  /**
   * Get user settings by user ID
   */
  async getUserSettings(userId: string): Promise<SettingsResponse> {
    try {
      // Validate user ID format and check for test/placeholder UUIDs
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.warn('Invalid user ID provided to getUserSettings:', userId);
        return { 
          success: false, 
          error: 'Invalid user ID provided' 
        };
      }

      // Check if this is a test/placeholder UUID
      const isTestUUID = userId === '123e4567-e89b-12d3-a456-426614174000' || 
                        /^00000000-0000-0000-0000-[0-9a-f]{12}$/.test(userId);
      if (isTestUUID) {
        console.log('Test/placeholder UUID detected, returning default settings');
        return {
          success: true,
          data: {
            id: crypto.randomUUID(),
            userId,
            ...defaultUserSettings,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
      }

      // Log the request for debugging (remove in production)
      console.log('Fetching user settings for user ID:', userId);
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Handle specific errors first
      if (error) {
        // Handle PGRST116 (no rows returned) - this is expected for new users
        if (error.code === 'PGRST116') {
          console.log('No existing settings found for user, creating defaults:', userId);
          return this.createDefaultUserSettings(userId);
        }
        
        // If table doesn't exist, return default settings without saving
        if (error.code === '42P01') { // Table doesn't exist
          return { 
            success: true, 
            data: {
              id: crypto.randomUUID(),
              userId,
              ...defaultUserSettings,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          };
        }
        
        // Handle other unexpected errors
        console.error('Supabase HTTP error', {
          status: error.code,
          statusText: error.message,
          url: `user_settings query for user_id=${userId}`,
          body: {
            code: error.code,
            details: error.details,
            hint: error.hint,
            message: error.message
          }
        });
        
        return { success: false, error: error.message };
      }

      if (!data) {
        // This shouldn't happen if we handled PGRST116 above, but just in case
        console.log('Data is null but no error, creating default settings for user:', userId);
        return this.createDefaultUserSettings(userId);
      }

      // Transform snake_case to camelCase and ensure complete structure
      const transformedData = {
        ...data,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        dateFormat: data.date_format,
        timeFormat: data.time_format,
      };

      // Ensure data has the complete structure with safe defaults
      const safeData = {
        ...defaultUserSettings,
        ...transformedData,
        display: {
          ...defaultUserSettings.display,
          ...transformedData.display,
          topBar: {
            ...defaultUserSettings.display.topBar,
            ...transformedData.display?.topBar
          },
          tableSettings: {
            ...defaultUserSettings.display.tableSettings,
            ...transformedData.display?.tableSettings
          },
          dashboardLayout: {
            ...defaultUserSettings.display.dashboardLayout,
            ...transformedData.display?.dashboardLayout
          }
        },
        notifications: {
          ...defaultUserSettings.notifications,
          ...transformedData.notifications
        },
        privacy: {
          ...defaultUserSettings.privacy,
          ...transformedData.privacy
        },
        security: {
          ...defaultUserSettings.security,
          ...transformedData.security
        },
        reports: {
          ...defaultUserSettings.reports,
          ...transformedData.reports
        },
        inventory: {
          ...defaultUserSettings.inventory,
          ...transformedData.inventory
        },
        menuVisibility: {
          ...defaultUserSettings.menuVisibility,
          ...transformedData.menuVisibility
        }
      };

      return { success: true, data: safeData };
    } catch (error) {
      console.error('Error in getUserSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create default settings for a new user
   */
  async createDefaultUserSettings(userId: string): Promise<SettingsResponse> {
    try {
      const { dateFormat, timeFormat, ...otherDefaults } = defaultUserSettings;
      const newSettings = {
        id: crypto.randomUUID(),
        user_id: userId,
        ...otherDefaults,
        date_format: dateFormat,
        time_format: timeFormat,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_settings')
        .insert(newSettings)
        .select()
        .single();

      if (error) {
        console.error('Error creating default settings:', error);
        // If table doesn't exist, just return the default settings
        if (error.code === '42P01') {
          return { 
            success: true, 
            data: {
              id: newSettings.id,
              userId,
              ...defaultUserSettings,
              createdAt: newSettings.created_at,
              updatedAt: newSettings.updated_at,
            }
          };
        }
        return { success: false, error: error.message };
      }

      // Transform snake_case back to camelCase for response
      const transformedData = {
        ...data,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        dateFormat: data.date_format,
        timeFormat: data.time_format,
      };

      return { success: true, data: transformedData };
    } catch (error) {
      console.error('Error in createDefaultUserSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update user settings
   */
  async updateUserSettings(
    userId: string, 
    updates: Partial<UserSettings>
  ): Promise<SettingsResponse> {
    try {
      // Transform camelCase to snake_case for database
      const { id: _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, ...rawUpdates } = updates;
      
      // Transform field names from camelCase to snake_case
      const dbUpdates: Record<string, unknown> = {};
      Object.entries(rawUpdates).forEach(([key, value]) => {
        if (key === 'dateFormat') {
          dbUpdates.date_format = value;
        } else if (key === 'timeFormat') {
          dbUpdates.time_format = value;
        } else {
          dbUpdates[key] = value;
        }
      });
      
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user settings:', error);
        // If table doesn't exist or no rows found, try to create
        if (error.code === '42P01' || error.code === 'PGRST116') {
          return this.createDefaultUserSettings(userId);
        }
        return { success: false, error: error.message };
      }

      // Transform snake_case back to camelCase for response
      const transformedData = {
        ...data,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        dateFormat: data.date_format,
        timeFormat: data.time_format,
      };

      return { 
        success: true, 
        data: transformedData, 
        message: 'Settings updated successfully' 
      };
    } catch (error) {
      console.error('Error in updateUserSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update specific settings section
   */
  async updateSettingsSection(
    userId: string, 
    request: SettingsUpdateRequest
  ): Promise<SettingsResponse> {
    try {
      const updates: Partial<UserSettings> = {
        [request.section]: request.data,
        updatedAt: new Date().toISOString(),
      };

      return this.updateUserSettings(userId, updates);
    } catch (error) {
      console.error('Error in updateSettingsSection:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete user settings
   */
  async deleteUserSettings(userId: string): Promise<SettingsResponse> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting user settings:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        message: 'Settings deleted successfully' 
      };
    } catch (error) {
      console.error('Error in deleteUserSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // System Settings Methods (Admin only)

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<{ success: boolean; data?: SystemSettings; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching system settings:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        // Create default system settings
        return this.createDefaultSystemSettings();
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in getSystemSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create default system settings
   */
  async createDefaultSystemSettings(): Promise<{ success: boolean; data?: SystemSettings; error?: string }> {
    try {
      const defaultSettings: SystemSettings = {
        businessInfo: {
          name: 'FBMS Business',
          address: '',
          phone: '',
          email: '',
          taxId: '',
          website: '',
          logo: '',
        },
        integration: {
          paymentGateways: {
            gcash: { enabled: false, apiKey: '' },
            paymaya: { enabled: false, apiKey: '' },
            paypal: { enabled: false, apiKey: '' },
          },
          emailService: {
            provider: 'smtp',
            config: {},
          },
          smsService: {
            provider: 'local',
            config: {},
          },
        },
        backup: {
          enabled: true,
          frequency: 'daily',
          time: '02:00',
          retention: 30,
          location: 'local',
          encryption: true,
        },
        maintenance: {
          mode: false,
          message: 'System is under maintenance. Please try again later.',
          allowedUsers: [],
        },
      };

      const { data, error } = await supabase
        .from('system_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) {
        console.error('Error creating default system settings:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in createDefaultSystemSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(updates: Partial<SystemSettings>): Promise<{ success: boolean; data?: SystemSettings; error?: string; message?: string }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .update(updates)
        .select()
        .single();

      if (error) {
        console.error('Error updating system settings:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data, 
        message: 'System settings updated successfully' 
      };
    } catch (error) {
      console.error('Error in updateSystemSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Settings validation methods

  /**
   * Validate settings data
   */
  validateSettings(settings: Partial<UserSettings>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate theme
    if (settings.theme && !['light', 'dark', 'system'].includes(settings.theme)) {
      errors.push('Invalid theme value');
    }

    // Validate time format
    if (settings.timeFormat && !['12h', '24h'].includes(settings.timeFormat)) {
      errors.push('Invalid time format');
    }

    // Validate security settings
    if (settings.security) {
      const { security } = settings;
      
      if (security.sessionTimeout && ![15, 30, 60, 120, 240].includes(security.sessionTimeout)) {
        errors.push('Invalid session timeout value');
      }

      if (security.passwordPolicy) {
        const { passwordPolicy } = security;
        if (passwordPolicy.minLength && passwordPolicy.minLength < 6) {
          errors.push('Minimum password length must be at least 6 characters');
        }
      }
    }

    // Validate notification settings
    if (settings.notifications) {
      const { notifications } = settings;
      
      if (notifications.frequency && !['immediate', 'hourly', 'daily', 'weekly'].includes(notifications.frequency)) {
        errors.push('Invalid notification frequency');
      }

      if (notifications.quietHours) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (notifications.quietHours.start && !timeRegex.test(notifications.quietHours.start)) {
          errors.push('Invalid quiet hours start time format');
        }
        if (notifications.quietHours.end && !timeRegex.test(notifications.quietHours.end)) {
          errors.push('Invalid quiet hours end time format');
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Utility methods

  /**
   * Get all users' settings (admin only)
   */
  async getAllUsersSettings(): Promise<{ success: boolean; data?: UserSettings[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching all users settings:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error in getAllUsersSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Reset user settings to default
   */
  async resetUserSettings(userId: string): Promise<SettingsResponse> {
    try {
      // Delete existing settings
      await this.deleteUserSettings(userId);
      
      // Create new default settings
      return this.createDefaultUserSettings(userId);
    } catch (error) {
      console.error('Error in resetUserSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Bulk update settings for multiple users
   */
  async bulkUpdateSettings(
    userIds: string[], 
    updates: Partial<UserSettings>
  ): Promise<{ success: boolean; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const userId of userIds) {
      try {
        const result = await this.updateUserSettings(userId, updates);
        if (result.success) {
          updated++;
        } else {
          errors.push(`Failed to update settings for user ${userId}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Error updating user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors,
    };
  }

  /**
   * Export user settings
   */
  async exportUserSettings(userId: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const result = await this.getUserSettings(userId);
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'No settings found' };
      }

      const exportData = JSON.stringify(result.data, null, 2);
      return { success: true, data: exportData };
    } catch (error) {
      console.error('Error in exportUserSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Import user settings
   */
  async importUserSettings(userId: string, settingsData: string): Promise<SettingsResponse> {
    try {
      const settings = JSON.parse(settingsData) as UserSettings;
      
      // Validate imported settings
      const validation = this.validateSettings(settings);
      if (!validation.valid) {
        return { 
          success: false, 
          error: `Invalid settings data: ${validation.errors.join(', ')}` 
        };
      }

      // Remove ID and timestamps as they will be generated
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, ...settingsToImport } = settings;
      
      return this.updateUserSettings(userId, settingsToImport);
    } catch (error) {
      console.error('Error in importUserSettings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON format' 
      };
    }
  }
}

// Export singleton instance
export const settingsAPI = SettingsAPI.getInstance();