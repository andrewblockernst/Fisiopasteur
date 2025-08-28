'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Info, AlertTriangle, AlertCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastProps {
  /** Tipo de notificación */
  variant: ToastVariant;
  /** Mensaje principal */
  message: string;
  /** Descripción opcional */
  description?: string;
  /** Duración en ms (default: 5000) */
  duration?: number;
  /** Si se puede cerrar manualmente */
  dismissible?: boolean;
  /** Callback cuando se cierra */
  onDismiss?: () => void;
  /** Si se muestra o no */
  visible?: boolean;
  /** Posición del toast */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const variantStyles = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-l-4 border-green-500',
    text: 'text-green-900 dark:text-green-100',
    icon: 'text-green-600 dark:text-green-400',
    hover: 'hover:bg-green-100 dark:hover:bg-green-900/40'
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-l-4 border-blue-500',
    text: 'text-blue-900 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40'
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-l-4 border-yellow-500',
    text: 'text-yellow-900 dark:text-yellow-100',
    icon: 'text-yellow-600 dark:text-yellow-400',
    hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-l-4 border-red-500',
    text: 'text-red-900 dark:text-red-100',
    icon: 'text-red-600 dark:text-red-400',
    hover: 'hover:bg-red-100 dark:hover:bg-red-900/40'
  }
};

const iconMap = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle
};

const positionStyles = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
};

export function Toast({
  variant,
  message,
  description,
  duration = 5000,
  dismissible = true,
  onDismiss,
  visible = true,
  position = 'top-right'
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(visible);
  const [isLeaving, setIsLeaving] = useState(false);

  const styles = variantStyles[variant];
  const IconComponent = iconMap[variant];

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  useEffect(() => {
    if (!isVisible || duration <= 0) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration]);

  const handleDismiss = () => {
    if (!dismissible) return;
    
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300); // Duración de la animación de salida
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`transition-all duration-300 ease-in-out ${
        isLeaving ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
      }`}
    >
      <div
        role="alert"
        className={`
          ${styles.bg} ${styles.border} ${styles.text} ${styles.hover}
          p-4 rounded-lg flex items-start gap-3 shadow-lg min-w-[320px] max-w-md
          transition duration-300 ease-in-out transform hover:scale-105
        `}
      >
        {/* Icono */}
        <IconComponent className={`h-5 w-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {message}
          </p>
          {description && (
            <p className="text-xs mt-1 opacity-90 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Botón cerrar */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={`
              flex-shrink-0 p-1 rounded-md transition-colors
              ${styles.icon} hover:bg-black/10 dark:hover:bg-white/10
            `}
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}