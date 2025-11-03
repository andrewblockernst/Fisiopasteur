import { formatoNumeroTelefono } from "@/lib/utils";
import { Tables } from "@/types/database.types";
import { Printer } from 'lucide-react';
import { TablaHistorialClinico } from "./tabla-historial";
import { obtenerHistorialClinicoPorPaciente } from "@/lib/actions/turno.action";
import { useEffect, useState } from "react";

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
    setCargando(true);
    // ✅ Convertir number a string
    const resultado = await obtenerHistorialClinicoPorPaciente(String(paciente.id_paciente));
    
    if (resultado.success) {
      setHistorialClinico(resultado.data || []);
    }
    
    setCargando(false);
  };

  useEffect(() => {
    cargarHistorial();
  }, [paciente.id_paciente]);

  const handleImprimir = () => {
    const url = `/imprimir/historia-clinica/${paciente.id_paciente}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Datos básicos del paciente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-black">
        <div>
          <span className="font-semibold text-black">Nombre:</span> {paciente.nombre + " " + paciente.apellido}
        </div>
        <div>
          <span className="font-semibold text-black">Contacto:</span> {formatoNumeroTelefono(paciente.telefono)}
        </div>
        <div>
          <span className="font-semibold text-black">Dirección:</span> {paciente.direccion}
        </div>
        <div>
          <span className="font-semibold text-black">Fecha de nacimiento:</span> {
            paciente.fecha_nacimiento
              ? paciente.fecha_nacimiento.split('-').reverse().join('/')
              : ""
          }
        </div>
        <div className="sm:col-span-2">
          <span className="font-semibold text-black"></span> {paciente.historia_clinica}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleImprimir}
            className="flex items-center gap-2 px-4 py-2 bg-[#9C1838] text-white rounded-lg hover:bg-[#7d1429] transition-colors"
          >
            <Printer size={18} />
            Imprimir Historial
          </button>
        </div>
      </div>

      {/* Historial Clínico */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Historial Clínico</h2>
        
        {cargando ? (
          <div className="text-center py-8 text-gray-500">Cargando historial...</div>
        ) : historialClinico.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
            No hay tratamientos registrados para este paciente
          </div>
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