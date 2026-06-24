import { Clock, FileText, Phone, Pen, Trash, Handshake, MapPin, CheckCircle, XCircle } from "lucide-react";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { formatoNumeroTelefono } from "@/lib/utils";
import { Card, Badge, IconButton } from "@/componentes/ui";
import { puedeConfirmar, puedeCancelar, puedeEliminar } from "@/lib/utils/turno-acciones";

interface TurnoCardProps {
  turno: TurnoConDetalles;
  onEdit: (turno: TurnoConDetalles) => void;
  onDelete: (turno: TurnoConDetalles) => void;
  /** Si se provee, muestra el botón para marcar como atendido cuando el estado lo permita. */
  onMarcarAtendido?: (turno: TurnoConDetalles) => void;
  /** Si se provee, muestra el botón para cancelar el turno cuando el estado lo permita. */
  onCancelar?: (turno: TurnoConDetalles) => void;
  /** Devuelve clases tailwind para colorear el badge según el estado del turno. */
  getEstadoColor: (estado: string) => string;
  formatearHora: (hora: string) => string;
}

export default function TurnoCard({
  turno,
  onEdit,
  onDelete,
  onMarcarAtendido,
  onCancelar,
  getEstadoColor,
  formatearHora,
}: TurnoCardProps) {
  const mostrarMarcarAtendido = !!onMarcarAtendido && puedeConfirmar(turno.estado);
  const mostrarCancelar = !!onCancelar && puedeCancelar(turno.estado);
  return (
    <Card padding="md" interactive={false} className="relative hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            aria-hidden="true"
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: turno.especialista?.color || "var(--brand)" }}
          />
          <div className="min-w-0">
            <h4 className="font-semibold text-foreground truncate">
              {turno.paciente?.nombre} {turno.paciente?.apellido}
            </h4>
            <p className="text-sm text-muted-foreground truncate">
              {turno.especialista?.nombre} {turno.especialista?.apellido}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {mostrarMarcarAtendido && (
            <IconButton
              aria-label="Marcar como atendido"
              size="sm"
              variant="primary"
              className="rounded-full bg-green-600 hover:bg-green-700"
              icon={<CheckCircle className="w-4 h-4" />}
              onClick={() => onMarcarAtendido?.(turno)}
            />
          )}
          {mostrarCancelar && (
            <IconButton
              aria-label="Cancelar turno"
              size="sm"
              variant="primary"
              className="rounded-full bg-red-600 hover:bg-red-700"
              icon={<XCircle className="w-4 h-4" />}
              onClick={() => onCancelar?.(turno)}
            />
          )}
          <IconButton
            aria-label="Editar turno"
            size="sm"
            variant="primary"
            className="rounded-full"
            icon={<Pen className="w-4 h-4" />}
            onClick={() => onEdit(turno)}
          />
          {puedeEliminar(turno.estado) && (
            <IconButton
              aria-label="Eliminar turno"
              size="sm"
              variant="primary"
              className="rounded-full"
              icon={<Trash className="w-4 h-4" />}
              onClick={() => onDelete(turno)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 shrink-0" />
          <span>{formatearHora(turno.hora)}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {formatoNumeroTelefono(turno.paciente?.telefono || "Sin teléfono")}
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Handshake className="w-4 h-4 shrink-0" />
          <span>
            {turno.tipo_plan === "obra_social"
              ? "Obra Social"
              : turno.tipo_plan === "particular"
                ? "Particular"
                : "No especificado"}
          </span>
        </div>

        {typeof turno.numero_en_grupo === "number" &&
        turno.grupo_tratamiento?.cantidad_turnos_planificados ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4 shrink-0" />
            <span>
              {turno.numero_en_grupo}/
              {turno.grupo_tratamiento.cantidad_turnos_planificados}
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{turno.box?.numero ? `Box ${turno.box.numero}` : ""}</span>
        </div>

        {turno.observaciones && (
          <div className="sm:col-span-2 md:col-span-4 flex items-start gap-2 text-muted-foreground mt-2 pr-24">
            <FileText className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="text-sm">{turno.observaciones}</span>
          </div>
        )}
      </div>

      <Badge
        variant="outline"
        pill
        size="md"
        className={`absolute bottom-3 right-3 ${getEstadoColor(turno.estado || "pendiente")}`}
      >
        {turno.estado || "pendiente"}
      </Badge>
    </Card>
  );
}
