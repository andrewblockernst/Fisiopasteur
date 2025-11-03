"use client";

import { Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";

interface KPICardProps {
  titulo: string;
  valor: number;
  icono: React.ReactNode;
  color: string;
  descripcion?: string;
}

function KPICard({ titulo, valor, icono, color, descripcion }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{titulo}</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${color}`}>{valor}</p>
            {descripcion && <p className="text-xs text-gray-500">{descripcion}</p>}
          </div>
        </div>
        <div className={`${color} bg-opacity-10 rounded-lg p-3 flex-shrink-0`}>
          {icono}
        </div>
      </div>
    </div>
  );
}

interface KPIsDashboardProps {
  turnosHoy: number;
  turnosCompletadosSemana: number;
  cancelacionesMes: number;
  notificacionesEnviadas: number;
}

export function KPIsCards({ 
  turnosHoy, 
  turnosCompletadosSemana, 
  cancelacionesMes, 
  notificacionesEnviadas 
}: KPIsDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        titulo="Turnos de Hoy"
        valor={turnosHoy}
        icono={<Clock className="w-6 h-6 text-blue-600" />}
        color="text-blue-600"
        descripcion="Programados"
      />
      <KPICard
        titulo="Completados esta Semana"
        valor={turnosCompletadosSemana}
        icono={<CheckCircle className="w-6 h-6 text-green-600" />}
        color="text-green-600"
        descripcion="Esta semana"
      />
      <KPICard
        titulo="Cancelaciones"
        valor={cancelacionesMes}
        icono={<XCircle className="w-6 h-6 text-orange-600" />}
        color="text-orange-600"
        descripcion="Este mes"
      />
      <KPICard
        titulo="Notificaciones Enviadas"
        valor={notificacionesEnviadas}
        icono={<MessageSquare className="w-6 h-6 text-purple-600" />}
        color="text-purple-600"
        descripcion="Total"
      />
    </div>
  );
}
