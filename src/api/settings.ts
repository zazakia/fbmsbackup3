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
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('userId', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user settings:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        // Create default settings for new user
        return this.createDefaultUserSettings(userId);
      }

      return { success: true, data };
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
      const newSettings: UserSettings = {
        id: crypto.randomUUID(),
        userId,
        ...defaultUserSettings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_settings')
        .insert(newSettings)
        .select()
        .single();

      if (error) {
        console.error('Error creating default settings:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
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
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('userId', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user settings:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data, 
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
      const { error } = await supabase
        .from('user_settings')
        .delete()
        .eq('userId', userId);

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
        .order('updatedAt', { ascending: false });

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