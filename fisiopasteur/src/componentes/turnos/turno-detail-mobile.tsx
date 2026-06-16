"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  Phone,
  Mail,
  FileText,
  Edit3,
  Trash2,
} from "lucide-react";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { useInvalidateTurnos } from "@/hooks/useTurnosQuery";
import { cancelarTurno, marcarComoAtendido } from "@/lib/actions/turno.action";
import { puedeConfirmar, puedeCancelar } from "@/lib/utils/turno-acciones";
import { useToastStore } from "@/stores/toast-store";
import EditarTurnoModal from "./editar-turno-modal";
import { dayjs } from "@/lib/dayjs";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  IconButton,
} from "@/componentes/ui";
import type { BadgeProps } from "@/componentes/ui";

interface TurnoDetailMobileProps {
  turno: TurnoConDetalles;
  numeroTalonario?: string | null;
}

/**
 * Mapea estado del turno → variant de Badge. Centralizado acá para que el resto
 * de las vistas (lista mobile, detalle desktop) puedan reusar el mapeo si quieren.
 */
const estadoToVariant: Record<string, BadgeProps["variant"]> = {
  programado: "info",
  pendiente: "info",
  vencido: "warning",
  atendido: "success",
  en_curso: "success",
  completado: "default",
  cancelado: "destructive",
  no_asistio: "warning",
};

export default function TurnoDetailMobile({
  turno,
  numeroTalonario,
}: TurnoDetailMobileProps) {
  const router = useRouter();
  const invalidateTurnos = useInvalidateTurnos();
  const { addToast } = useToastStore();
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMarcarComoAtendido = async () => {
    if (!turno?.id_turno || isSubmitting) return;
    setIsSubmitting(true);
    const resultado = await marcarComoAtendido(turno.id_turno);

    if (resultado.success) {
      addToast({ variant: "success", message: "Turno marcado como atendido" });
      invalidateTurnos({
        scope: "statuses",
        statuses: ["programado", "pendiente", "atendido"],
      });
      invalidateTurnos({ scope: "dates", date: turno.fecha });
      router.refresh();
    } else {
      addToast({
        variant: "error",
        message: resultado.error || "Error al marcar turno como atendido",
      });
    }
    setIsSubmitting(false);
  };

  const handleCancelarTurno = async () => {
    if (!turno?.id_turno || isSubmitting) return;
    setIsSubmitting(true);
    const resultado = await cancelarTurno(turno.id_turno);

    if (resultado.success) {
      addToast({ variant: "success", message: "Turno cancelado" });
      invalidateTurnos({
        scope: "statuses",
        statuses: ["programado", "pendiente", "cancelado"],
      });
      invalidateTurnos({ scope: "dates", date: turno.fecha });
      router.refresh();
    } else {
      addToast({
        variant: "error",
        message: resultado.error || "Error al cancelar turno",
      });
    }
    setIsSubmitting(false);
  };

  const formatDate = (fecha: string) =>
    dayjs(fecha).format("dddd D [de] MMMM [de] YYYY");
  const formatTime = (hora: string) =>
    dayjs(hora, "HH:mm:ss").format("hh:mm A");

  const estadoActual = turno.estado || "programado";
  const mostrarConfirmar = puedeConfirmar(estadoActual);
  const mostrarCancelar = puedeCancelar(estadoActual);

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      {/* Header sticky mobile */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <IconButton
            aria-label="Volver"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => router.back()}
            className="-ml-2"
          />
          <h1 className="text-base font-semibold truncate">Detalle del Turno</h1>
          <IconButton
            aria-label="Editar turno"
            variant="ghost"
            size="sm"
            icon={<Edit3 className="w-5 h-5 text-brand" />}
            onClick={() => setModalEditarAbierto(true)}
          />
        </div>
      </header>

      <div className="px-4 py-6 space-y-4">
        {/* Estado y talonario */}
        <div className="flex flex-col items-center gap-2">
          <Badge
            variant={estadoToVariant[estadoActual] ?? "default"}
            size="lg"
            pill
          >
            {estadoActual.replace("_", " ").toUpperCase()}
          </Badge>
          {numeroTalonario && (
            <Badge variant="info" size="md">
              📋 Paquete: Turno {numeroTalonario}
            </Badge>
          )}
        </div>

        {/* Fecha y Hora */}
        <Card>
          <CardHeader>
            <CardTitle>Fecha y hora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-brand shrink-0" />
              <div>
                <p className="font-medium text-foreground capitalize">
                  {formatDate(turno.fecha)}
                </p>
                <p className="text-sm text-muted-foreground">{turno.fecha}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-brand shrink-0" />
              <div>
                <p className="font-medium text-foreground">
                  {formatTime(turno.hora)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duración estimada: 45 min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paciente */}
        {turno.paciente && (
          <Card>
            <CardHeader>
              <CardTitle>Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-brand shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {turno.paciente.nombre} {turno.paciente.apellido}
                  </p>
                  {turno.paciente.dni && (
                    <p className="text-sm text-muted-foreground">
                      DNI: {turno.paciente.dni}
                    </p>
                  )}
                </div>
              </div>

              {turno.paciente.telefono && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-brand shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {turno.paciente.telefono}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="success" size="sm">Llamar</Badge>
                      <Badge variant="info" size="sm">WhatsApp</Badge>
                    </div>
                  </div>
                </div>
              )}

              {turno.paciente.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-brand shrink-0" />
                  <p className="text-sm text-muted-foreground truncate">
                    {turno.paciente.email}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Especialista */}
        {turno.especialista && (
          <Card>
            <CardHeader>
              <CardTitle>Especialista</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{
                    backgroundColor:
                      turno.especialista.color || "var(--brand)",
                  }}
                  aria-hidden="true"
                >
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {turno.especialista.nombre} {turno.especialista.apellido}
                  </p>
                  {turno.especialidad && (
                    <p className="text-sm text-muted-foreground truncate">
                      {turno.especialidad.nombre}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ubicación */}
        {turno.box && (
          <Card>
            <CardHeader>
              <CardTitle>Ubicación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-brand shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    Box {turno.box.numero}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Consultorio médico
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observaciones */}
        {turno.observaciones && (
          <Card>
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-brand mt-0.5 shrink-0" />
                <p className="text-foreground/80 leading-relaxed">
                  {turno.observaciones}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acciones */}
        <div className="space-y-3 pt-2">
          {mostrarConfirmar && (
            <Button
              variant="success"
              fullWidth
              leftIcon={<Clock className="w-5 h-5" />}
              onClick={handleMarcarComoAtendido}
              loading={isSubmitting}
            >
              Marcar como atendido
            </Button>
          )}
          {mostrarCancelar && (
            <Button
              variant="destructive"
              fullWidth
              leftIcon={<Trash2 className="w-5 h-5" />}
              onClick={handleCancelarTurno}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Cancelar turno
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Edición */}
      {modalEditarAbierto && (
        <EditarTurnoModal
          turno={turno as any}
          open={modalEditarAbierto}
          onClose={() => setModalEditarAbierto(false)}
          onSaved={(updated) => {
            setModalEditarAbierto(false);
            const fechaAnterior = turno.fecha;
            const fechaNueva = updated?.fecha || turno.fecha;
            invalidateTurnos({ scope: "dates", date: fechaAnterior });
            if (fechaNueva !== fechaAnterior) {
              invalidateTurnos({ scope: "dates", date: fechaNueva });
            }
            invalidateTurnos({ scope: "lists" });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
