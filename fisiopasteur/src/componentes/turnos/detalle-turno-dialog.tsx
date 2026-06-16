"use client";

import { useState, useEffect } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { actualizarTurno } from "@/lib/actions/turno.action";
import { useToastStore } from "@/stores/toast-store";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  ClipboardList,
  Save,
} from "lucide-react";
import Image from "next/image";
import type { TurnoWithRelations } from "@/types";
import { dayjs } from "@/lib/dayjs";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from "@/componentes/ui";
import type { BadgeProps } from "@/componentes/ui";

interface DetalleTurnoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  turno: TurnoWithRelations | null;
  numeroTalonario?: string | null;
  onTurnoActualizado?: () => void;
}

/**
 * Mapeo estado → variant de Badge. Usado en dialog y vista mobile.
 * Para reuso global futuro, mover a un módulo compartido en turnos/.
 */
const estadoConfig: Record<
  string,
  { variant: BadgeProps["variant"]; label: string; icon: React.ReactNode }
> = {
  programado: {
    variant: "info",
    label: "Programado",
    icon: <Calendar className="w-4 h-4" />,
  },
  pendiente: {
    variant: "info",
    label: "Pendiente",
    icon: <Calendar className="w-4 h-4" />,
  },
  vencido: {
    variant: "warning",
    label: "⚠️ Vencido",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  atendido: {
    variant: "success",
    label: "Atendido",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  cancelado: {
    variant: "destructive",
    label: "Cancelado",
    icon: <XCircle className="w-4 h-4" />,
  },
};

const defaultConfig = {
  variant: "default" as BadgeProps["variant"],
  label: "Sin estado",
  icon: <AlertCircle className="w-4 h-4" />,
};

export function DetalleTurnoDialog({
  isOpen,
  onClose,
  turno,
  numeroTalonario,
  onTurnoActualizado,
}: DetalleTurnoDialogProps) {
  const { addToast } = useToastStore();
  const [observaciones, setObservaciones] = useState(turno?.observaciones || "");
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);

  // Sincronizar observaciones cuando cambia el turno
  useEffect(() => {
    if (turno) {
      setObservaciones(turno.observaciones || "");
      setEditando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turno?.id_turno]);

  if (!turno) return null;

  const hayCambios = observaciones !== (turno.observaciones || "");

  const handleGuardarObservaciones = async () => {
    setGuardando(true);
    try {
      const resultado = await actualizarTurno(turno.id_turno, {
        observaciones: observaciones.trim() || null,
      });

      if (resultado.success) {
        addToast({
          variant: "success",
          message: "Observaciones guardadas",
          description: "Las observaciones se actualizaron correctamente",
        });
        setEditando(false);
        onTurnoActualizado?.();
      } else {
        addToast({
          variant: "error",
          message: "Error al guardar",
          description:
            resultado.error || "No se pudieron guardar las observaciones",
        });
      }
    } catch {
      addToast({
        variant: "error",
        message: "Error inesperado",
        description: "Ocurrió un error al guardar las observaciones",
      });
    } finally {
      setGuardando(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    try {
      return dayjs(fecha, "YYYY-MM-DD").format("dddd DD/MM/YYYY");
    } catch {
      return fecha;
    }
  };

  const formatearHora = (hora: string | null) =>
    !hora ? "-" : hora.slice(0, 5);

  const config =
    estadoConfig[(turno.estado || "").toLowerCase()] ?? defaultConfig;

  const contenido = (
    <div className="space-y-4 px-1">
      {/* Estado + talonario */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={config.variant} size="lg" className="gap-1.5">
          {config.icon}
          {config.label}
        </Badge>
        {numeroTalonario && (
          <Badge variant="info" size="md" className="gap-1.5">
            <ClipboardList className="w-4 h-4" />
            Paquete: Turno {numeroTalonario}
          </Badge>
        )}
      </div>

      {/* Fecha y Hora */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs md:text-sm font-medium text-muted-foreground">
              Fecha
            </span>
          </div>
          <p className="text-sm md:text-base font-semibold text-foreground capitalize">
            {formatearFecha(turno.fecha)}
          </p>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs md:text-sm font-medium text-muted-foreground">
              Hora
            </span>
          </div>
          <p className="text-sm md:text-base font-semibold text-foreground font-mono">
            {formatearHora(turno.hora)}
          </p>
        </Card>
      </div>

      {/* Paciente */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs md:text-sm font-medium text-muted-foreground">
            Paciente
          </span>
        </div>
        {turno.paciente ? (
          <div className="space-y-2">
            <p className="text-sm md:text-base font-semibold text-foreground">
              {turno.paciente.nombre} {turno.paciente.apellido}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-muted-foreground">
              {turno.paciente.dni && (
                <div>
                  <span className="font-medium">DNI:</span> {turno.paciente.dni}
                </div>
              )}
              {turno.paciente.telefono && (
                <div>
                  <span className="font-medium">Teléfono:</span>{" "}
                  {turno.paciente.telefono}
                </div>
              )}
              {turno.paciente.email && (
                <div className="md:col-span-2 truncate">
                  <span className="font-medium">Email:</span>{" "}
                  {turno.paciente.email}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Sin paciente asignado
          </p>
        )}
      </Card>

      {/* Especialista + Especialidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs md:text-sm font-medium text-muted-foreground">
              Especialista
            </span>
          </div>
          {turno.especialista ? (
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor: turno.especialista.color || "var(--brand)",
                }}
              />
              <p className="text-sm md:text-base font-semibold text-foreground truncate">
                {turno.especialista.nombre} {turno.especialista.apellido}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Sin especialista
            </p>
          )}
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs md:text-sm font-medium text-muted-foreground">
              Especialidad
            </span>
          </div>
          <p className="text-sm md:text-base font-semibold text-foreground">
            {turno.especialidad?.nombre || "Sin especialidad"}
          </p>
        </Card>
      </div>

      {/* Box */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs md:text-sm font-medium text-muted-foreground">
            Box / Consultorio
          </span>
        </div>
        <p className="text-sm md:text-base font-semibold text-foreground">
          {turno.box ? `Box ${turno.box.numero}` : "Sin box asignado"}
        </p>
      </Card>

      {/* Observaciones — editable */}
      <Card padding="md" className="bg-amber-50 border-amber-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <span className="text-xs md:text-sm font-medium text-amber-800">
              Observaciones
            </span>
          </div>
          {!editando && (
            <Button
              variant="link"
              size="sm"
              className="text-amber-700 hover:text-amber-900 underline px-0 h-auto"
              onClick={() => setEditando(true)}
            >
              Editar
            </Button>
          )}
        </div>

        {editando ? (
          <div className="space-y-3">
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              placeholder="Escribir observaciones..."
              className="bg-white border-amber-300 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                fullWidth
                disabled={guardando}
                onClick={() => {
                  setObservaciones(turno.observaciones || "");
                  setEditando(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="warning"
                fullWidth
                loading={guardando}
                disabled={!hayCambios}
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleGuardarObservaciones}
              >
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm md:text-base text-amber-900 whitespace-pre-wrap">
            {observaciones || "Sin observaciones"}
          </p>
        )}
      </Card>

      {/* Auditoría */}
      <div className="pt-3 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
          {turno.created_at && (
            <div>
              <span className="font-medium">Creado:</span>{" "}
              {dayjs(turno.created_at).format("DD/MM/YYYY HH:mm")}
            </div>
          )}
          {turno.updated_at && (
            <div>
              <span className="font-medium">Actualizado:</span>{" "}
              {dayjs(turno.updated_at).format("DD/MM/YYYY HH:mm")}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <BaseDialog
      type="custom"
      size="lg"
      title="Detalle del Turno"
      customIcon={
        <Image
          src="/favicon.svg"
          alt="Logo Fisiopasteur"
          width={24}
          height={24}
          className="w-6 h-6"
        />
      }
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton
      customColor="var(--brand)"
      message={contenido}
    />
  );
}
