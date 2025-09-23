import { getPaciente, getEvolucionesClinicas } from "@/lib/actions/paciente.action";
import PlantillaImpresion from "@/componentes/impresion/plantilla";
import AutoImpresion from "@/componentes/impresion/autoImpresion";
import { notFound } from "next/navigation";
import { Tables } from "@/types/database.types";

type Paciente = Tables<"paciente">;
type Evolucion = Tables<"evolucion_clinica">;

type Props = {
  params: Promise<{ id: string }>; // ← Cambiar a Promise
  searchParams: Promise<{  // ← Cambiar a Promise
    desde?: string; 
    hasta?: string; 
    auto?: string; 
  }>;
};

export default async function ImprimirHistorialPage({ params, searchParams }: Props) {
  // AWAIT los parámetros
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const pacienteId = parseInt(resolvedParams.id);
  
  if (isNaN(pacienteId)) {
    notFound();
  }

  let paciente: Paciente | null = null;
  let evoluciones: Evolucion[] = [];

  try {
    const pacienteResult = await getPaciente(pacienteId);
    const evolucionesResult = await getEvolucionesClinicas(pacienteId);
    
    paciente = pacienteResult as Paciente;
    evoluciones = (evolucionesResult as Evolucion[]) || [];
    
    
  } catch (error) {
    console.error("Error cargando datos:", error);
    notFound();
  }

  if (!paciente) {
    notFound();
  }

  if (!Array.isArray(evoluciones)) {
    evoluciones = [];
  }

  // Filtrar por fechas - usar resolvedSearchParams
  const evolucionesFiltradas = evoluciones.filter(evo => {
    if (!resolvedSearchParams.desde && !resolvedSearchParams.hasta) return true;
    
    if (!evo.created_at) return true;
    
    try {
      const fechaEvo = new Date(evo.created_at);
      if (resolvedSearchParams.desde && fechaEvo < new Date(resolvedSearchParams.desde)) return false;
      if (resolvedSearchParams.hasta && fechaEvo > new Date(resolvedSearchParams.hasta)) return false;
      return true;
    } catch {
      return true;
    }
  });

  const formatearFechaHora = (fecha: string | null) => {
    if (!fecha) return 'Sin fecha';
    try {
      return new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const calcularEdad = (fechaNacimiento: string | null) => {
    if (!fechaNacimiento) return 'No especificada';
    try {
      const hoy = new Date();
      const nacimiento = new Date(fechaNacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      return `${edad} años`;
    } catch {
      return 'Edad no calculable';
    }
  };

  const textoPeriodo = (resolvedSearchParams.desde || resolvedSearchParams.hasta) 
    ? `Período: ${resolvedSearchParams.desde || 'Inicio'} - ${resolvedSearchParams.hasta || 'Actual'}`
    : undefined;

  const autoImprimir = resolvedSearchParams.auto !== "0";

  return (
    <>
      <AutoImpresion habilitado={autoImprimir} />
      
      <PlantillaImpresion
        titulo="HISTORIAL CLÍNICO"
        subtitulo={`${paciente.nombre} ${paciente.apellido}`}
        textoPeriodo={textoPeriodo}
      >
        {/* Datos del paciente */}
        <section className="evitar-corte">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            DATOS DEL PACIENTE
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Nombre completo:</span>
              <p className="text-gray-900">{paciente.nombre} {paciente.apellido}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">DNI:</span>
              <p className="text-gray-900">{paciente.dni || 'No especificado'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Edad:</span>
              <p className="text-gray-900">{calcularEdad(paciente.fecha_nacimiento)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Teléfono:</span>
              <p className="text-gray-900">{paciente.telefono}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Dirección:</span>
              <p className="text-gray-900">{paciente.direccion || 'No especificada'}</p>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-gray-700">Email:</span>
              <p className="text-gray-900">{paciente.email || 'No especificado'}</p>
            </div>
          </div>
        </section>

        {/* Evoluciones clínicas */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            EVOLUCIONES CLÍNICAS ({evolucionesFiltradas.length} registros)
          </h3>
          
          {evolucionesFiltradas.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <p>No hay evoluciones clínicas{resolvedSearchParams.desde || resolvedSearchParams.hasta ? ' en el período seleccionado' : ' registradas'}</p>
              <p className="text-xs mt-2">Paciente ID: {paciente.id_paciente} - Debug: Verificar turnos y evoluciones en base de datos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {evolucionesFiltradas
                .sort((a, b) => {
                  const fechaA = a.created_at ? new Date(a.created_at).getTime() : 0;
                  const fechaB = b.created_at ? new Date(b.created_at).getTime() : 0;
                  return fechaB - fechaA;
                })
                .map((evolucion, index) => (
                  <article 
                    key={evolucion.id_evolucion || index} 
                    className="evitar-corte superficie-impresion border border-gray-200 rounded-lg p-4"
                  >
                    <div className="mb-3">
                      <span className="font-medium text-gray-700 text-sm">Fecha:</span>
                      <p className="text-gray-900">{formatearFechaHora(evolucion.created_at)}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Observaciones:</span>
                      <div className="text-gray-900 text-sm mt-1">
                        {evolucion.observaciones?.startsWith("[") ? (
                          <>
                            <span className="font-semibold text-[#9C1838]">
                              {evolucion.observaciones.split("]")[0].replace("[", "")}:
                            </span>
                            <span className="ml-1">{evolucion.observaciones.split("]")[1] || ''}</span>
                          </>
                        ) : (
                          <span>{evolucion.observaciones || 'Sin observaciones'}</span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>
      </PlantillaImpresion>
    </>
  );
}