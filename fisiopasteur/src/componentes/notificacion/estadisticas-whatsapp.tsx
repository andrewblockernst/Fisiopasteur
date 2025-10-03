"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, XCircle, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface EstadisticasWhatsApp {
  total: number;
  porEstado: Record<string, number>;
  porMedio: Record<string, number>;
  tasaExito: string;
  botDisponible: boolean;
  ultimaActualizacion: string;
}

interface Props {
  className?: string;
}

export default function EstadisticasWhatsApp({ className = "" }: Props) {
  const [estadisticas, setEstadisticas] = useState<EstadisticasWhatsApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/notificaciones/estadisticas?action=estadisticas');
      const result = await response.json();
      
      if (result.success && result.data) {
        setEstadisticas(result.data);
        setUltimaActualizacion(new Date());
      } else {
        setError('Error cargando estadísticas');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error cargando estadísticas WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  const probarBot = async () => {
    try {
      const response = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-bot' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Actualizar estado del bot
        if (estadisticas) {
          setEstadisticas({
            ...estadisticas,
            botDisponible: result.botDisponible
          });
        }
      }
    } catch (err) {
      console.error('Error probando bot:', err);
    }
  };

  const procesarPendientes = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/notificaciones');
      const result = await response.json();
      
      if (result.success) {
        // Recargar estadísticas después de procesar
        await cargarEstadisticas();
      } else {
        setError('Error procesando notificaciones');
      }
    } catch (err) {
      setError('Error procesando notificaciones');
      console.error('Error:', err);
    }
  };

  useEffect(() => {
    cargarEstadisticas();
    
    // Actualizar cada 5 minutos
    const interval = setInterval(cargarEstadisticas, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !estadisticas) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="text-green-600" size={20} />
          <h3 className="font-semibold">WhatsApp Bot</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error && !estadisticas) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="text-red-600" size={20} />
          <h3 className="font-semibold">WhatsApp Bot</h3>
        </div>
        <div className="text-red-600 text-sm">
          {error}
          <button
            onClick={cargarEstadisticas}
            className="ml-2 text-blue-600 hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const pendientes = estadisticas?.porEstado?.pendiente || 0;
  const enviados = estadisticas?.porEstado?.enviado || 0;
  const fallidos = estadisticas?.porEstado?.fallido || 0;

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-green-600" size={20} />
            <h3 className="font-semibold">WhatsApp Bot</h3>
            
            {/* Estado del Bot */}
            <div className="flex items-center gap-2">
              {estadisticas?.botDisponible ? (
                <>
                  <Wifi size={16} className="text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={16} className="text-red-500" />
                  <span className="text-xs text-red-600 font-medium">Offline</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={probarBot}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              title="Probar conexión"
            >
              <Wifi size={14} className="text-gray-600" />
            </button>
            
            <button
              onClick={cargarEstadisticas}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              title="Actualizar"
              disabled={loading}
            >
              <RefreshCw size={14} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Total de Mensajes */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {estadisticas?.total || 0}
            </div>
            <div className="text-sm text-gray-600">Total Mensajes</div>
          </div>
          
          {/* Tasa de Éxito */}
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {estadisticas?.tasaExito || '0.0'}%
            </div>
            <div className="text-sm text-gray-600">Tasa Éxito</div>
          </div>
        </div>

        {/* Estados */}
        <div className="space-y-2 mb-4">
          {/* Enviados */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              <span className="text-sm text-gray-600">Enviados</span>
            </div>
            <span className="text-sm font-medium">{enviados}</span>
          </div>

          {/* Pendientes */}
          {pendientes > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-yellow-500" />
                <span className="text-sm text-gray-600">Pendientes</span>
              </div>
              <span className="text-sm font-medium">{pendientes}</span>
            </div>
          )}

          {/* Fallidos */}
          {fallidos > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" />
                <span className="text-sm text-gray-600">Fallidos</span>
              </div>
              <span className="text-sm font-medium">{fallidos}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        {pendientes > 0 && (
          <div className="pt-3 border-t">
            <button
              onClick={procesarPendientes}
              disabled={loading || !estadisticas?.botDisponible}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                estadisticas?.botDisponible && !loading
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Procesando...' : `Enviar ${pendientes} pendientes`}
            </button>
          </div>
        )}

        {/* Última actualización */}
        {ultimaActualizacion && (
          <div className="text-xs text-gray-500 text-center mt-3">
            Actualizado: {ultimaActualizacion.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}