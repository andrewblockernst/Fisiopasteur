import { Clock, FileText, Phone, Edit, Trash2, Pen, Trash, Handshake } from "lucide-react";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { formatoNumeroTelefono } from "@/lib/utils";

interface TurnoCardProps {
  turno: TurnoConDetalles;
  onEdit: (turno: TurnoConDetalles) => void;
  onDelete: (turno: TurnoConDetalles) => void;
  getEstadoColor: (estado: string) => string;
  formatearHora: (hora: string) => string;
}

export default function TurnoCard({
  turno,
  onEdit,
  onDelete,
  getEstadoColor,
  formatearHora,
}: TurnoCardProps) {
  return (
    <div
      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: turno.especialista?.color || '#9C1838' }}
          />
          <div>
            <h4 className="font-semibold text-gray-900">
              {turno.paciente?.nombre} {turno.paciente?.apellido}
            </h4>
            <p className="text-sm text-gray-600">
              {turno.especialista?.nombre} {turno.especialista?.apellido}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`
            px-3 py-1 rounded-full text-xs font-medium border
            ${getEstadoColor(turno.estado || 'pendiente')}
          `}>
            {turno.estado || 'pendiente'}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(turno)}
              className="p-2 bg-[#9C1838] hover:bg-[#5b0f22] rounded-full transition-colors"
            >
              <Pen className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => onDelete(turno)}
              className="p-2 bg-[#9C1838] hover:bg-[#5b0f22] rounded-full transition-colors"
            >
              <Trash className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>
            {formatearHora(turno.hora)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="w-4 h-4" />
          <span>{formatoNumeroTelefono(turno.paciente?.telefono || 'Sin teléfono')}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Handshake className="w-4 h-4" />
          <span>
            {turno.tipo_plan === 'obra_social'
              ? 'Obra Social'
              : turno.tipo_plan === 'particular'
                ? 'Particular'
                : 'No especificado'}
          </span>
        </div>

        {turno.observaciones && (
          <div className="md:col-span-2 flex items-start gap-2 text-gray-600 mt-4">
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{turno.observaciones}</span>
          </div>
        )}
      </div>
    </div>
  );
}