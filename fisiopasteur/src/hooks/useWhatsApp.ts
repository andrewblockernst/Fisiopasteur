"use client";

import { useState, useCallback } from 'react';
import { useToastStore } from '@/stores/toast-store';

interface WhatsAppHookReturn {
  enviarMensaje: (telefono: string, mensaje: string) => Promise<boolean>;
  verificarBot: () => Promise<boolean>;
  procesarPendientes: () => Promise<{ enviadas: number; fallidas: number; total: number } | null>;
  loading: boolean;
  error: string | null;
}

export function useWhatsApp(): WhatsAppHookReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToastStore();

  const enviarMensaje = useCallback(async (telefono: string, mensaje: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-test-message',
          telefono,
          mensaje
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        addToast({
          variant: 'success',
          message: 'Mensaje enviado',
          description: 'El mensaje fue enviado correctamente por WhatsApp'
        });
        return true;
      } else {
        setError(result.message || 'Error enviando mensaje');
        addToast({
          variant: 'error',
          message: 'Error enviando mensaje',
          description: result.message || 'Error desconocido'
        });
        return false;
      }
    } catch (err) {
      const errorMsg = 'Error de conexión con WhatsApp';
      setError(errorMsg);
      addToast({
        variant: 'error',
        message: 'Error de conexión',
        description: errorMsg
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const verificarBot = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-bot' })
      });

      const result = await response.json();

      if (result.success) {
        const disponible = result.botDisponible;
        
        addToast({
          variant: disponible ? 'success' : 'warning',
          message: 'Estado del Bot',
          description: disponible ? 'Bot de WhatsApp conectado' : 'Bot de WhatsApp desconectado'
        });
        
        return disponible;
      } else {
        setError('Error verificando bot');
        return false;
      }
    } catch (err) {
      const errorMsg = 'Error verificando estado del bot';
      setError(errorMsg);
      addToast({
        variant: 'error',
        message: 'Error',
        description: errorMsg
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const procesarPendientes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notificaciones');
      const result = await response.json();

      if (result.success) {
        const { procesadas, enviadas, fallidas } = result;
        
        addToast({
          variant: 'success',
          message: 'Notificaciones procesadas',
          description: `${enviadas} enviadas, ${fallidas} fallidas de ${procesadas} total`
        });
        
        return { enviadas, fallidas, total: procesadas };
      } else {
        setError(result.error || 'Error procesando notificaciones');
        addToast({
          variant: 'error',
          message: 'Error procesando notificaciones',
          description: result.error || 'Error desconocido'
        });
        return null;
      }
    } catch (err) {
      const errorMsg = 'Error de conexión procesando notificaciones';
      setError(errorMsg);
      addToast({
        variant: 'error',
        message: 'Error de conexión',
        description: errorMsg
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  return {
    enviarMensaje,
    verificarBot,
    procesarPendientes,
    loading,
    error
  };
}