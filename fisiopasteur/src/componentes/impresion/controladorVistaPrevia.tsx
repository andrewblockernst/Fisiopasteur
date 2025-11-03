"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import SelectorFechas from "./selectorFechas";

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

interface ControladorVistaPreviaProps {
  pacienteId: string;
  pacienteNombre: string;
  totalRegistros: number;
  grupos: GrupoTratamiento[];
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
}

export default function ControladorVistaPrevia({ 
  pacienteId, 
  pacienteNombre, 
  totalRegistros,
  grupos,
  paciente
}: ControladorVistaPreviaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [fechaInicio, setFechaInicio] = useState<Date | null>(
    searchParams.get('desde') ? new Date(searchParams.get('desde')!) : null
  );
  const [fechaFin, setFechaFin] = useState<Date | null>(
    searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : null
  );

  // RESETEAR auto=1 cuando se monta el componente (vista previa)
  useEffect(() => {
    const autoParam = searchParams.get('auto');
    
    // Si hay auto=1 en la URL y estamos en vista previa, limpiarlo
    if (autoParam === '1') {
      const params = new URLSearchParams();
      if (searchParams.get('desde')) params.set('desde', searchParams.get('desde')!);
      if (searchParams.get('hasta')) params.set('hasta', searchParams.get('hasta')!);
      
      // Remover auto=1 para resetear el estado
      router.replace(`/imprimir/historia-clinica/${pacienteId}${params.toString() ? '?' + params.toString() : ''}`);
    }
  }, [searchParams, router, pacienteId]);

  const handleFechasChange = (inicio: Date | null, fin: Date | null) => {
    setFechaInicio(inicio);
    setFechaFin(fin);
    
    // Actualizar URL sin auto=1 para mantener vista previa
    const params = new URLSearchParams();
    if (inicio) params.set('desde', inicio.toISOString().split('T')[0]);
    if (fin) params.set('hasta', fin.toISOString().split('T')[0]);
    
    router.replace(`/imprimir/historia-clinica/${pacienteId}${params.toString() ? '?' + params.toString() : ''}`);
  };

  const iniciarImpresion = () => {
    const params = new URLSearchParams();
    if (fechaInicio) params.set('desde', fechaInicio.toISOString().split('T')[0]);
    if (fechaFin) params.set('hasta', fechaFin.toISOString().split('T')[0]);
    params.set('auto', '1');
    
    // Navegar a modo impresión
    router.push(`/imprimir/historia-clinica/${pacienteId}?${params.toString()}`);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

  return (
    <div className="min-h-screen bg-gray-50 no-imprimir">
      {/* Barra de control superior fija */}
      <div className="sticky top-0 z-10 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-2xl text-black mb-6">
            Vista previa - Historia Clínica de {pacienteNombre}
          </h1>
          
          <SelectorFechas
            onFechasChange={handleFechasChange}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
          />

          <div className="bg-white rounded-lg shadow p-6 mb-4 mt-4">
            <h2 className="text-lg text-gray-800 mb-2">Resumen</h2>
            <p className="text-gray-800">
              Registros encontrados: <span className="font-semibold text-gray-900">{totalRegistros}</span>
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={iniciarImpresion}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={totalRegistros === 0}
            >
              Imprimir Historia Clínica
            </button>
            
            <button
              onClick={() => window.close()}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* Vista previa del contenido a imprimir */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Datos del Paciente */}
          <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
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
                  <p className="font-medium text-gray-900">{formatearFecha(paciente.fecha_nacimiento)}</p>
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
            </div>
          </div>

          {/* Historial de Tratamientos */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-[#9C1838] mb-4">
              Historial de Tratamientos
            </h2>

            {grupos.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-lg">
                <p className="text-lg">No hay registros en el período seleccionado</p>
                <p className="text-sm mt-2">Intenta ajustar el rango de fechas</p>
              </div>
            ) : (
              grupos.map((grupo, grupoIndex) => (
                <div key={grupo.id_grupo} className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                  {/* Encabezado del tratamiento */}
                  <div className="bg-[#9C1838] text-white px-6 py-4">
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
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
                                  : turno.estado === 'confirmado'
                                    ? 'bg-blue-50'
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
                                      Completada el {formatearFecha(turno.evolucion_completada_en)}
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}