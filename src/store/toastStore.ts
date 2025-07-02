import { create } from 'zustand';
import { Toast, ToastType } from '../components/Toast';

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  
  // Convenience methods
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const newToast: Toast = {
      ...toast,
      id: generateId(),
      duration: toast.duration || 5000
    };

    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },

  showSuccess: (title, message, duration) => {
    get().addToast({
      type: 'success',
      title,
      message,
      duration
    });
  },

  showError: (title, message, duration) => {
    get().addToast({
      type: 'error',
      title,
      message,
      duration: duration || 7000 // Errors stay longer by default
    });
  },

  showWarning: (title, message, duration) => {
    get().addToast({
      type: 'warning',
      title,
      message,
      duration
    });
  },

  showInfo: (title, message, duration) => {
    get().addToast({
      type: 'info',
      title,
      message,
      duration
    });
  }
}));