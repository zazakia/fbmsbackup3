export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  display: DisplaySettings;
  reports: ReportSettings;
  inventory: InventorySettings;
  security: SecuritySettings;
  createdAt: string;
  updatedAt: string;
}



export interface NotificationSettings {
  enabled: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
  categories: {
    system: boolean;
    inventory: boolean;
    sales: boolean;
    reports: boolean;
    security: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  channels: {
    lowStock: ('email' | 'push' | 'sms')[];
    newSale: ('email' | 'push' | 'sms')[];
    systemAlert: ('email' | 'push' | 'sms')[];
    reportReady: ('email' | 'push' | 'sms')[];
  };
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'team' | 'private';
  activityLogging: boolean;
  dataSharing: boolean;
  analytics: boolean;
  cookies: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  dataRetention: 30 | 90 | 180 | 365; // days
}

export interface DisplaySettings {
  sidebarCollapsed: boolean;
  density: 'compact' | 'comfortable' | 'spacious';
  animations: boolean;
  sounds: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  dashboardLayout: {
    widgets: string[];
    layout: 'grid' | 'list';
    columns: 2 | 3 | 4;
  };
  tableSettings: {
    rowsPerPage: 10 | 25 | 50 | 100;
    showRowNumbers: boolean;
    stickyHeaders: boolean;
  };
  topBar: {
    showDatabaseStatus: boolean;
    showSupabaseStatus: boolean;
    showThemeToggle: boolean;
    showNotifications: boolean;
    showSearch: boolean;
    showUserProfile: boolean;
    showMobileSearch: boolean;
  };
  showDatabaseStatus?: boolean; // Deprecated - kept for backward compatibility
  showThemeToggle?: boolean; // Deprecated - kept for backward compatibility
}

export interface ReportSettings {
  autoGenerate: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
    quarterly: boolean;
  };
  emailSchedule: {
    enabled: boolean;
    recipients: string[];
    time: string; // HH:mm format
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  };
  exportFormats: ('pdf' | 'excel' | 'csv' | 'json')[];
  includeCharts: boolean;
  chartTypes: ('bar' | 'line' | 'pie' | 'area')[];
  dataRange: 7 | 30 | 90 | 365; // days
  compression: boolean;
}

export interface InventorySettings {
  thresholds: {
    lowStock: number;
    outOfStock: number;
    overStock: number;
    expiryWarning: number; // days
  };
  autoReorder: {
    enabled: boolean;
    method: 'manual' | 'automatic';
    leadTime: number; // days
    safetyStock: number;
  };
  monitoring: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    alertChannels: ('email' | 'push' | 'sms')[];
  };
  barcodeSettings: {
    enabled: boolean;
    format: 'code128' | 'ean13' | 'upc' | 'qr';
    autoGenerate: boolean;
  };
}

export interface SecuritySettings {
  twoFactorAuth: {
    enabled: boolean;
    method: 'sms' | 'email' | 'app';
    backupCodes: string[];
  };
  sessionTimeout: 15 | 30 | 60 | 120 | 240; // minutes
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays: 30 | 60 | 90 | 365 | 0; // 0 = never
  };
  loginAttempts: {
    maxAttempts: number;
    lockoutDuration: number; // minutes
  };
  auditLog: {
    enabled: boolean;
    retention: 30 | 90 | 180 | 365; // days
  };
  ipWhitelist: {
    enabled: boolean;
    addresses: string[];
  };
}

export interface SystemSettings {
  businessInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
    website: string;
    logo: string;
  };
  integration: {
    paymentGateways: {
      gcash: { enabled: boolean; apiKey: string; };
      paymaya: { enabled: boolean; apiKey: string; };
      paypal: { enabled: boolean; apiKey: string; };
    };
    emailService: {
      provider: 'smtp' | 'sendgrid' | 'mailgun';
      config: Record<string, string>;
    };
    smsService: {
      provider: 'twilio' | 'nexmo' | 'local';
      config: Record<string, string>;
    };
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm format
    retention: number; // days
    location: 'local' | 'cloud';
    encryption: boolean;
  };
  maintenance: {
    mode: boolean;
    message: string;
    allowedUsers: string[];
  };
}

export interface SettingsUpdateRequest {
  section: keyof UserSettings;
  data: Partial<UserSettings[keyof UserSettings]>;
}

export interface SettingsResponse {
  success: boolean;
  data?: UserSettings;
  error?: string;
  message?: string;
}

// Default settings
export const defaultUserSettings: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  theme: 'system',
  language: 'en',
  timezone: 'Asia/Manila',
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h',
  currency: 'PHP',
  notifications: {
    enabled: true,
    email: true,
    push: true,
    sms: false,
    categories: {
      system: true,
      inventory: true,
      sales: true,
      reports: true,
      security: true,
      reminders: true,
      marketing: false,
    },
    frequency: 'immediate',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    channels: {
      lowStock: ['email', 'push'],
      newSale: ['push'],
      systemAlert: ['email', 'push'],
      reportReady: ['email'],
    },
  },
  privacy: {
    profileVisibility: 'team',
    activityLogging: true,
    dataSharing: false,
    analytics: true,
    cookies: {
      essential: true,
      functional: true,
      analytics: true,
      marketing: false,
    },
    dataRetention: 365,
  },
  display: {
    sidebarCollapsed: false,
    density: 'comfortable',
    animations: true,
    sounds: false,
    highContrast: false,
    fontSize: 'medium',
    dashboardLayout: {
      widgets: [],
      layout: 'grid',
      columns: 2,
    },
    tableSettings: {
      rowsPerPage: 25,
      showRowNumbers: true,
      stickyHeaders: true,
    },
    topBar: {
      showDatabaseStatus: true,
      showSupabaseStatus: true,
      showThemeToggle: true,
      showNotifications: true,
      showSearch: true,
      showUserProfile: true,
      showMobileSearch: true,
    },
    showDatabaseStatus: true, // Deprecated - kept for backward compatibility
    showThemeToggle: true, // Deprecated - kept for backward compatibility
  },
  reports: {
    autoGenerate: {
      daily: false,
      weekly: true,
      monthly: true,
      quarterly: false,
    },
    emailSchedule: {
      enabled: false,
      recipients: [],
      time: '09:00',
      day: 'monday',
    },
    exportFormats: ['pdf', 'excel'],
    includeCharts: true,
    chartTypes: ['bar', 'line', 'pie'],
    dataRange: 30,
    compression: false,
  },
  inventory: {
    thresholds: {
      lowStock: 10,
      outOfStock: 0,
      overStock: 1000,
      expiryWarning: 7,
    },
    autoReorder: {
      enabled: false,
      method: 'manual',
      leadTime: 7,
      safetyStock: 5,
    },
    monitoring: {
      enabled: true,
      frequency: 'daily',
      alertChannels: ['email', 'push'],
    },
    barcodeSettings: {
      enabled: true,
      format: 'code128',
      autoGenerate: true,
    },
  },
  security: {
    twoFactorAuth: {
      enabled: false,
      method: 'email',
      backupCodes: [],
    },
    sessionTimeout: 60,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      expiryDays: 90,
    },
    loginAttempts: {
      maxAttempts: 5,
      lockoutDuration: 15,
    },
    auditLog: {
      enabled: true,
      retention: 90,
    },
    ipWhitelist: {
      enabled: false,
      addresses: [],
    },
  },
};