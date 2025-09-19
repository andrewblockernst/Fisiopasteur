import { formatoNumeroTelefono } from "@/lib/utils";
import { Tables } from "@/types/database.types";
import { Printer } from 'lucide-react';
import { useState } from 'react';
import ImprimirHistorialDialog from '@/componentes/paciente/imprimir-historial-dialog';

type Paciente = Tables<"paciente">;

export default function DatosPaciente({ paciente }: { paciente: Paciente }) {
  const [mostrarImprimir, setMostrarImprimir] = useState(false);
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
          onClick={() => setMostrarImprimir(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#9C1838] text-white rounded-lg hover:bg-[#7d1429] transition-colors"
        >
          <Printer size={18} />
          Imprimir Historial
        </button>
      </div>

      {/* Dialog de impresión */}
      {mostrarImprimir && (
        <ImprimirHistorialDialog
          paciente={paciente}
          open={mostrarImprimir}
          onClose={() => setMostrarImprimir(false)}
        />
      )}
    </div>
  );
}