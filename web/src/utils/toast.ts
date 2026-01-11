/**
 * Toast Notification Utilities
 * Centralized toast notifications using react-hot-toast
 */

import toast from 'react-hot-toast';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#10b981',
        color: '#fff',
      },
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: '#fff',
      },
    });
  },

  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#f59e0b',
        color: '#fff',
      },
    });
  },

  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#3b82f6',
        color: '#fff',
      },
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, messages, {
      position: 'top-right',
      success: {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
        },
      },
      error: {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      },
    });
  },
};

