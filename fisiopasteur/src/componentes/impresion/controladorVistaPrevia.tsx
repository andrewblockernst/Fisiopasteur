"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import SelectorFechas from "./selectorFechas";

interface ControladorVistaPreviaProps {
  pacienteId: string;
  pacienteNombre: string;
  totalRegistros: number;
}

export default function ControladorVistaPrevia({ 
  pacienteId, 
  pacienteNombre, 
  totalRegistros 
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

  return (
    <div className="p-6 bg-gray-50 no-imprimir">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl text-black mb-6">
          Vista previa - Historia Clínica de {pacienteNombre}
        </h1>
        
        <SelectorFechas
          onFechasChange={handleFechasChange}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
        />

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg text-gray-800 mb-2">Resumen</h2>
          <p className="text-gray-800">Registros encontrados: <span className="text-gray-800">{totalRegistros}</span></p>
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
  );
}