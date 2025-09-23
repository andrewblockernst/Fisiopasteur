import { formatoNumeroTelefono } from "@/lib/utils";
import { Tables } from "@/types/database.types";
import { Printer } from 'lucide-react';

type Paciente = Tables<"paciente">;
type Observacion = Tables<"evolucion_clinica">; 


interface Props {
  paciente: Paciente;
  observaciones?: Observacion[]; 
}

export default function DatosPaciente({ paciente, observaciones }: Props) {
  const handleImprimir = () => {
    const url = `/imprimir/historia-clinica/${paciente.id_paciente}`;
    window.open(url, '_blank');
  };

  return (
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
  );
}