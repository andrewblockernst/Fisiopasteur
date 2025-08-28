'use client';

import { create } from 'zustand';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  showServerActionResponse: (response: {
    success: boolean;
    message: string;
    toastType: ToastVariant;
    description?: string;
  }) => string;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: ToastItem = { 
      ...toast, 
      id,
      duration: toast.duration ?? 5000,
      dismissible: toast.dismissible ?? true
    };
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));
    
    return id;
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },
  
  showServerActionResponse: (response) => {
    return get().addToast({
      variant: response.toastType,
      message: response.message,
      description: response.description
    });
  }
}));
