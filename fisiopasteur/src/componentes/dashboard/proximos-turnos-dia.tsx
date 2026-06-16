"use client";

import { Clock, MapPin, AlertCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  EmptyState,
  Skeleton,
} from "@/componentes/ui";
import { cn } from "@/lib/utils";

interface ProximoTurnoProps {
  id_turno: number;
  hora: string;
  nombrePaciente: string;
  apellidoPaciente: string;
  especialista: string;
  especialidad: string;
  colorEspecialista: string;
  box: number | null;
  telefono: string;
}

/**
 * Card individual de turno dentro del listado de "Próximos turnos del día".
 * El color del borde y el fondo translúcido reflejan el color del especialista.
 */
function TurnoCard({
  hora,
  nombrePaciente,
  apellidoPaciente,
  especialista,
  especialidad,
  colorEspecialista,
  box,
}: ProximoTurnoProps) {
  const horaNum = parseInt(hora.split(":")[0]);
  const ahora = new Date().getHours();
  const estaProximo = horaNum === ahora;

  return (
    <div
      className={cn(
        "rounded-md border-l-4 p-4 hover:shadow-md transition-all",
        estaProximo && "shadow-md",
      )}
      style={{
        backgroundColor: colorEspecialista + "20",
        borderColor: colorEspecialista,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Hora y paciente */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-lg font-bold text-foreground">{hora}</span>
            {estaProximo && (
              <Badge
                variant="destructive"
                size="sm"
                className="gap-1 animate-pulse"
              >
                <AlertCircle className="w-3 h-3" />
                EN PROGRESO
              </Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground truncate">
            {nombrePaciente} {apellidoPaciente}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {especialista}
          </p>
          <p className="text-xs text-muted-foreground/80 truncate">
            {especialidad}
          </p>
        </div>

        {/* Box */}
        {box && (
          <div className="flex items-center gap-2 bg-background/60 px-3 py-2 rounded-md text-sm border border-border shrink-0">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">Box {box}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProximosTurnosProps {
  turnos: ProximoTurnoProps[];
  isLoading?: boolean;
}

export function ProximosTurnosDia({
  turnos,
  isLoading = false,
}: ProximosTurnosProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Próximos turnos del día</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos turnos del día</CardTitle>
      </CardHeader>
      <CardContent>
        {turnos && turnos.length > 0 ? (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {turnos.map((turno) => (
              <TurnoCard key={turno.id_turno} {...turno} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Clock className="w-7 h-7" />}
            title="No hay turnos programados para hoy"
            description="Buen día para descansar 😊"
            className="py-8"
          />
        )}
      </CardContent>
    </Card>
  );
}
