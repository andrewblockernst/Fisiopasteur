import { getPaciente } from "@/lib/actions/paciente.action";
import { obtenerHistorialClinicoPorPaciente } from "@/lib/actions/turno.action";
import PlantillaImpresion from "@/componentes/impresion/plantilla";
import AutoImpresion from "@/componentes/impresion/autoImpresion";
import ControladorVistaPrevia from "@/componentes/impresion/controladorVistaPrevia";
import { notFound } from "next/navigation";
import { Tables } from "@/types/database.types";

type Paciente = Tables<"paciente">;

type Props = {
  params: Promise<{ id: string }>; 
  searchParams: Promise<{  
    desde?: string; 
    hasta?: string; 
    auto?: string; 
  }>;
};

export default async function ImprimirHistorialPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const pacienteId = parseInt(resolvedParams.id);
  
  if (isNaN(pacienteId)) {
    notFound();
  }

  let paciente: Paciente | null = null;
  let grupos: any[] = [];

  try {
    // Obtener datos del paciente
    const pacienteResult = await getPaciente(pacienteId);
    paciente = pacienteResult as Paciente;
    
    // Obtener historial clínico agrupado por tratamientos
    const historialResult = await obtenerHistorialClinicoPorPaciente(pacienteId);
    
    if (historialResult.success && historialResult.data) {
      grupos = historialResult.data;
    }
    
  } catch (error) {
    console.error("Error cargando datos:", error);
    notFound();
  }

  if (!paciente) {
    notFound();
  }

  // Filtrar grupos por fechas si se especifican
  let gruposFiltrados = grupos;
  
  if (resolvedSearchParams.desde || resolvedSearchParams.hasta) {
    gruposFiltrados = grupos.map(grupo => {
      const turnosFiltrados = grupo.turnos.filter((turno: any) => {
        const fechaTurno = new Date(turno.fecha);
        
        if (resolvedSearchParams.desde && fechaTurno < new Date(resolvedSearchParams.desde)) {
          return false;
        }
        if (resolvedSearchParams.hasta && fechaTurno > new Date(resolvedSearchParams.hasta)) {
          return false;
        }
        return true;
      });
      
      return {
        ...grupo,
        turnos: turnosFiltrados,
        total_sesiones: turnosFiltrados.length
      };
    }).filter(grupo => grupo.turnos.length > 0);
  }

  // Contar total de sesiones (turnos) para el resumen
  const totalRegistros = gruposFiltrados.reduce(
    (sum, grupo) => sum + grupo.turnos.length, 
    0
  );

  const autoImprimir = resolvedSearchParams.auto === "1";

  return (
    <>
      {/* Vista previa */}
      {!autoImprimir && (
        <ControladorVistaPrevia
          pacienteId={resolvedParams.id}
          pacienteNombre={`${paciente.nombre} ${paciente.apellido}`}
          totalRegistros={totalRegistros}
          grupos={gruposFiltrados}
          paciente={paciente}
        />
      )}

      {/* Contenido de impresión */}
      <div className={autoImprimir ? 'block' : 'hidden print:block'}>
        <AutoImpresion habilitado={autoImprimir} />
        
        <PlantillaImpresion
          paciente={paciente}
          grupos={gruposFiltrados}
          fechaInicio={resolvedSearchParams.desde || null}
          fechaFin={resolvedSearchParams.hasta || null}
        />
      </div>
    </>
  );
}