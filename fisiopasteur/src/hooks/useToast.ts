'use client';

import { useState, useCallback } from 'react';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast = { 
      ...toast, 
      id,
      duration: toast.duration ?? 5000,
      dismissible: toast.dismissible ?? true
    };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Método específico para Server Actions
  const showServerActionResponse = useCallback((response: {
    success: boolean;
    message: string;
    toastType: ToastVariant;
    description?: string;
  }) => {
    return addToast({
      variant: response.toastType,
      message: response.message,
      description: response.description
    });
  }, [addToast]);

  return {
    toasts,
    removeToast,
    showServerActionResponse
  };
}