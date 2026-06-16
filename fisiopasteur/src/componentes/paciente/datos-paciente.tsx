import { formatoNumeroTelefono } from "@/lib/utils";
import { Tables } from "@/types/database.types";
import { Printer } from "lucide-react";
import { TablaHistorialClinico } from "./tabla-historial";
import { obtenerHistorialClinicoPorPaciente } from "@/lib/actions/turno.action";
import { useEffect, useState } from "react";
import { Button, EmptyState, Skeleton } from "@/componentes/ui";

type Paciente = Tables<"paciente">;
type Observacion = Tables<"evolucion_clinica">;

interface Props {
  paciente: Paciente;
  observaciones?: Observacion[];
}

export default function DatosPaciente({ paciente, observaciones }: Props) {
  const [historialClinico, setHistorialClinico] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarHistorial = async () => {
    if (!Number.isFinite(Number(paciente.id_paciente))) {
      setHistorialClinico([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    const resultado = await obtenerHistorialClinicoPorPaciente(
      String(paciente.id_paciente),
    );
    if (resultado.success) {
      setHistorialClinico(resultado.data || []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.id_paciente]);

  const handleImprimir = () => {
    const url = `/imprimir/historia-clinica/${paciente.id_paciente}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Datos básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-foreground">
        <div>
          <span className="font-semibold">Nombre:</span>{" "}
          {paciente.nombre} {paciente.apellido}
        </div>
        <div>
          <span className="font-semibold">Contacto:</span>{" "}
          {formatoNumeroTelefono(paciente.telefono)}
        </div>
        <div>
          <span className="font-semibold">Dirección:</span>{" "}
          {paciente.direccion}
        </div>
        <div>
          <span className="font-semibold">Fecha de nacimiento:</span>{" "}
          {paciente.fecha_nacimiento
            ? paciente.fecha_nacimiento.split("-").reverse().join("/")
            : ""}
        </div>
        {paciente.historia_clinica && (
          <div className="sm:col-span-2">
            <span className="font-semibold">Historia clínica:</span>{" "}
            {paciente.historia_clinica}
          </div>
        )}
        <div className="sm:col-span-2 mt-2">
          <Button
            variant="primary"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handleImprimir}
          >
            Imprimir historial
          </Button>
        </div>
      </div>

      {/* Historial Clínico */}
      <div className="mt-8">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
          Historial clínico
        </h2>

        {cargando ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : historialClinico.length === 0 ? (
          <EmptyState
            title="Sin tratamientos registrados"
            description="No hay tratamientos cargados para este paciente todavía."
            className="border border-border rounded-lg py-10"
          />
        ) : (
          <div className="space-y-6">
            {historialClinico.map((grupo) => (
              <TablaHistorialClinico
                key={grupo.id_grupo}
                grupo={grupo}
                onActualizar={cargarHistorial}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
