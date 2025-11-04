import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Turno {
  id_turno: number;
  fecha: string;
  estado: string;
  tipo_plan: 'particular' | 'obra_social';
  evolucion_clinica?: string;
  evolucion_completada_en?: string;
  observaciones?: string;
}

interface GrupoTratamiento {
  id_grupo: string;
  especialidad: string;
  especialista?: { nombre: string; apellido: string };
  fecha_inicio: string;
  tipo_plan: 'particular' | 'obra_social';
  total_sesiones: number;
  turnos: Turno[];
}

interface PlantillaImpresionProps {
  paciente: {
    nombre: string;
    apellido: string;
    dni: string | null;
    telefono?: string | null;
    email?: string | null;
    fecha_nacimiento?: string | null;
    obra_social?: string | null;
    direccion?: string | null;
  };
  grupos: GrupoTratamiento[];
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

export default function PlantillaImpresion({
  paciente,
  grupos,
  fechaInicio,
  fechaFin
}: PlantillaImpresionProps) {
  const formatearFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), "dd/MM/yyyy", { locale: es });
    } catch {
      return fecha;
    }
  };

  const formatearFechaHora = (fecha: string) => {
    try {
      return format(new Date(fecha), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
    } catch {
      return fecha;
    }
  };

  const estadoLabel = (estado: string) => {
    const estados: Record<string, string> = {
      programado: "Programado",
      atendido: "Atendido",
      cancelado: "Cancelado",
      confirmado: "Confirmado",
      vencido: "Vencido"
    };
    return estados[estado] || estado;
  };

  const calcularEdad = (fechaNacimiento: string) => {
    try {
      const hoy = new Date();
      const nacimiento = new Date(fechaNacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      return edad;
    } catch {
      return null;
    }
  };

  return (
    <div className="p-8 bg-white text-black max-w-[210mm] mx-auto">
      {/* Header */}
      <div className="mb-8 pb-4 border-b-2 border-gray-300">
        <h1 className="text-3xl font-bold text-[#9C1838] mb-2">
          Historia Clínica
        </h1>
        <p className="text-sm text-gray-600">
          Generado el {format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
        </p>
        {(fechaInicio || fechaFin) && (
          <p className="text-sm text-gray-600 mt-1">
            Período: {fechaInicio ? formatearFecha(fechaInicio) : 'Inicio'} - {fechaFin ? formatearFecha(fechaFin) : 'Actualidad'}
          </p>
        )}
      </div>

      {/* Datos del Paciente */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200 evitar-corte">
        <h2 className="text-xl font-semibold text-[#9C1838] mb-4">
          Datos del Paciente
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nombre completo</p>
            <p className="font-medium text-gray-900">{paciente.nombre} {paciente.apellido}</p>
          </div>
          {paciente.dni && (
            <div>
              <p className="text-sm text-gray-600">DNI</p>
              <p className="font-medium text-gray-900">{paciente.dni}</p>
            </div>
          )}
          {paciente.fecha_nacimiento && (
            <div>
              <p className="text-sm text-gray-600">Fecha de nacimiento</p>
              <p className="font-medium text-gray-900">
                {formatearFecha(paciente.fecha_nacimiento)}
                {calcularEdad(paciente.fecha_nacimiento) && (
                  <span className="text-gray-600 ml-1">
                    ({calcularEdad(paciente.fecha_nacimiento)} años)
                  </span>
                )}
              </p>
            </div>
          )}
          {paciente.telefono && (
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="font-medium text-gray-900">{paciente.telefono}</p>
            </div>
          )}
          {paciente.email && (
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{paciente.email}</p>
            </div>
          )}
          {paciente.obra_social && (
            <div>
              <p className="text-sm text-gray-600">Obra Social</p>
              <p className="font-medium text-gray-900">{paciente.obra_social}</p>
            </div>
          )}
          {paciente.direccion && (
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Dirección</p>
              <p className="font-medium text-gray-900">{paciente.direccion}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tratamientos */}
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold text-[#9C1838] mb-4">
          Historial de Tratamientos
        </h2>

        {grupos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
            No hay registros en el período seleccionado
          </div>
        ) : (
          grupos.map((grupo, grupoIndex) => (
            <div key={grupo.id_grupo} className="evitar-corte mb-8">
              {/* Encabezado del tratamiento */}
              <div className="bg-[#9C1838] text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-semibold mb-1">
                  Tratamiento: {grupo.especialidad}
                </h3>
                <div className="text-sm opacity-90 space-y-1">
                  {grupo.especialista && (
                    <p>Profesional: {grupo.especialista.nombre} {grupo.especialista.apellido}</p>
                  )}
                  <p>
                    Inicio: {formatearFecha(grupo.fecha_inicio)} | 
                    Total sesiones: {grupo.total_sesiones} | 
                    Modalidad: {grupo.tipo_plan === 'particular' ? 'Particular' : 'Obra Social'}
                  </p>
                </div>
              </div>

              {/* Tabla de sesiones */}
              <div className="border border-gray-300 border-t-0 rounded-b-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Evolución Clínica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {grupo.turnos.map((turno, index) => (
                      <tr 
                        key={turno.id_turno}
                        className={
                          turno.estado === 'atendido' 
                            ? 'bg-green-50' 
                            : turno.estado === 'cancelado'
                              ? 'bg-red-50'
                              : ''
                        }
                      >
                        <td className="px-4 py-3 text-gray-900">{index + 1}</td>
                        <td className="px-4 py-3 text-gray-900">
                          {formatearFecha(turno.fecha)}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {estadoLabel(turno.estado)}
                        </td>
                        <td className="px-4 py-3">
                          {turno.evolucion_clinica ? (
                            <div>
                              <p className="text-gray-900 whitespace-pre-wrap">
                                {turno.evolucion_clinica}
                              </p>
                              {turno.evolucion_completada_en && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Completada el {formatearFechaHora(turno.evolucion_completada_en)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Sin evolución registrada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Separador entre grupos (solo si no es el último) */}
              {grupoIndex < grupos.length - 1 && (
                <div className="my-6 border-t-2 border-dashed border-gray-300"></div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-600">
        <p>Documento confidencial - Historia Clínica</p>
        <p className="mt-1">Página generada automáticamente desde Fisiopasteur</p>
      </div>
    </div>
  );
}