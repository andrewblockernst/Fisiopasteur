"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import type { Database } from '@/types/database.types';

type Notificacion = Database['public']['Tables']['notificacion']['Row'];

interface Props {
  turnoId: number;
  pacienteTelefono?: string;
  className?: string;
}

export default function NotificacionesTurno({ turnoId, pacienteTelefono, className = "" }: Props) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEnviarMensaje, setShowEnviarMensaje] = useState(false);
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  
  const { enviarMensaje, loading: enviandoMensaje } = useWhatsApp();

  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/notificaciones/estadisticas?action=turno&turno_id=${turnoId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setNotificaciones(result.data);
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarMensaje = async () => {
    if (!pacienteTelefono || !mensajePersonalizado.trim()) return;
    
    const exito = await enviarMensaje(pacienteTelefono, mensajePersonalizado);
    if (exito) {
      setMensajePersonalizado('');
      setShowEnviarMensaje(false);
      // Recargar notificaciones para ver la nueva
      setTimeout(cargarNotificaciones, 2000);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
  }, [turnoId]);

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'enviado':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'fallido':
        return <XCircle size={16} className="text-red-500" />;
      case 'pendiente':
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'enviado': return 'Enviado';
      case 'fallido': return 'Fallido';
      case 'pendiente': return 'Pendiente';
      default: return 'Desconocido';
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-green-600" />
          <span className="font-medium text-gray-900">Notificaciones WhatsApp</span>
          {loading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          )}
        </div>
        
        {pacienteTelefono && (
          <button
            onClick={() => setShowEnviarMensaje(!showEnviarMensaje)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Send size={14} />
            Enviar mensaje
          </button>
        )}
      </div>

      {/* Enviar mensaje personalizado */}
      {showEnviarMensaje && pacienteTelefono && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje personalizado para {pacienteTelefono}
            </label>
            <textarea
              value={mensajePersonalizado}
              onChange={(e) => setMensajePersonalizado(e.target.value)}
              placeholder="Escriba su mensaje aquí..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEnviarMensaje}
              disabled={!mensajePersonalizado.trim() || enviandoMensaje}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {enviandoMensaje ? 'Enviando...' : 'Enviar'}
            </button>
            <button
              onClick={() => {
                setShowEnviarMensaje(false);
                setMensajePersonalizado('');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de notificaciones */}
      {notificaciones.length > 0 ? (
        <div className="space-y-2">
          {notificaciones.map((notif) => (
            <div
              key={notif.id_notificacion}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getEstadoIcon(notif.estado || 'pendiente')}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {getEstadoText(notif.estado || 'pendiente')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {notif.fecha_programada && formatearFecha(notif.fecha_programada)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2">
                  {notif.mensaje}
                </p>
                
                {notif.fecha_envio && (
                  <div className="text-xs text-gray-500 mt-1">
                    Enviado: {formatearFecha(notif.fecha_envio)}
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  notif.estado === 'enviado' ? 'bg-green-500' : 
                  notif.estado === 'fallido' ? 'bg-red-500' : 
                  'bg-yellow-500'
                }`}></span>
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="text-center py-6 text-gray-500">
          <MessageSquare size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No hay notificaciones para este turno</p>
          {!pacienteTelefono && (
            <p className="text-xs mt-1">El paciente no tiene teléfono registrado</p>
          )}
        </div>
      ) : null}
    </div>
  );
}