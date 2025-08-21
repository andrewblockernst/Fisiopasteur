'use client';

import React from 'react';
import { useToastStore } from '@/stores/toast-store';
import { Toast } from './base-toast';

export function GlobalToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            variant={toast.variant}
            message={toast.message}
            description={toast.description}
            duration={toast.duration}
            dismissible={toast.dismissible}
            onDismiss={() => removeToast(toast.id)}
            visible={true}
          />
        </div>
      ))}
    </div>
  );
}
