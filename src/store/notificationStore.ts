import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { soundNotificationManager } from '../utils/soundNotifications';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  category: 'system' | 'inventory' | 'sales' | 'finance' | 'hr' | 'general';
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isEnabled: boolean;
  settings: {
    showSystemNotifications: boolean;
    showInventoryAlerts: boolean;
    showSalesNotifications: boolean;
    showFinanceAlerts: boolean;
    showHRNotifications: boolean;
  };
}

interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  updateSettings: (settings: Partial<NotificationState['settings']>) => void;
  toggleNotifications: () => void;
  getNotificationsByCategory: (category: Notification['category']) => Notification[];
  getUnreadNotifications: () => Notification[];
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isEnabled: true,
      settings: {
        showSystemNotifications: true,
        showInventoryAlerts: true,
        showSalesNotifications: true,
        showFinanceAlerts: true,
        showHRNotifications: true,
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date(),
          read: false,
        };

        set((state) => {
          const notifications = [newNotification, ...state.notifications];
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          };
        });

        // Play sound based on notification type
        switch (notification.type) {
          case 'success':
            soundNotificationManager.playSuccess();
            break;
          case 'error':
            soundNotificationManager.playError();
            break;
          case 'warning':
            soundNotificationManager.playWarning();
            break;
          case 'info':
            soundNotificationManager.playInfo();
            break;
        }
      },

      markAsRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      deleteNotification: (id) => {
        set((state) => {
          const notifications = state.notifications.filter(n => n.id !== id);
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          };
        });
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      toggleNotifications: () => {
        set((state) => ({
          isEnabled: !state.isEnabled,
        }));
      },

      getNotificationsByCategory: (category) => {
        return get().notifications.filter(n => n.category === category);
      },

      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.read);
      },
    }),
    {
      name: 'fbms-notifications',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 100), // Keep only last 100 notifications
        settings: state.settings,
        isEnabled: state.isEnabled,
      }),
    }
  )
);

// Notification utilities
export const createSystemNotification = (title: string, message: string, type: Notification['type'] = 'info') => {
  return {
    type,
    title,
    message,
    category: 'system' as const,
  };
};

export const createInventoryAlert = (title: string, message: string, actionUrl?: string) => {
  return {
    type: 'warning' as const,
    title,
    message,
    category: 'inventory' as const,
    actionUrl,
    actionLabel: 'View Inventory',
  };
};

export const createSalesNotification = (title: string, message: string, actionUrl?: string) => {
  return {
    type: 'success' as const,
    title,
    message,
    category: 'sales' as const,
    actionUrl,
    actionLabel: 'View Sales',
  };
};

export const createFinanceAlert = (title: string, message: string, type: Notification['type'] = 'warning') => {
  return {
    type,
    title,
    message,
    category: 'finance' as const,
    actionUrl: '/finance',
    actionLabel: 'View Finance',
  };
};