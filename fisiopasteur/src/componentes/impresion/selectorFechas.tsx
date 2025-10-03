"use client";
import { useState } from "react";
import { Filter, X } from "lucide-react";

interface SelectorFechasProps {
  onFechasChange: (fechaInicio: Date | null, fechaFin: Date | null) => void;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
}

export default function SelectorFechas({ 
  onFechasChange, 
  fechaInicio = null, 
  fechaFin = null 
}: SelectorFechasProps) {
  const [fechaInicioLocal, setFechaInicioLocal] = useState<string>(
    fechaInicio ? fechaInicio.toISOString().split('T')[0] : ''
  );
  const [fechaFinLocal, setFechaFinLocal] = useState<string>(
    fechaFin ? fechaFin.toISOString().split('T')[0] : ''
  );

  // Función para formatear fecha 
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleFechaInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFechaInicioLocal(value);
    const fecha = value ? new Date(value) : null;
    onFechasChange(fecha, fechaFinLocal ? new Date(fechaFinLocal) : null);
  };

  const handleFechaFinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFechaFinLocal(value);
    const fecha = value ? new Date(value) : null;
    onFechasChange(fechaInicioLocal ? new Date(fechaInicioLocal) : null, fecha);
  };

  const removerFiltro = (tipo: 'inicio' | 'fin') => {
    if (tipo === 'inicio') {
      setFechaInicioLocal('');
      onFechasChange(null, fechaFinLocal ? new Date(fechaFinLocal) : null);
    } else {
      setFechaFinLocal('');
      onFechasChange(fechaInicioLocal ? new Date(fechaInicioLocal) : null, null);
    }
  };

  const limpiarFiltros = () => {
    setFechaInicioLocal('');
    setFechaFinLocal('');
    onFechasChange(null, null);
  };

  const filtrosActivos = (fechaInicioLocal ? 1 : 0) + (fechaFinLocal ? 1 : 0);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Título con icono */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtrar por rango de fechas</span>
            </div>

            {/* Campos de fecha */}
            <div className="flex items-center gap-2">
              <label htmlFor="fechaInicio" className="text-sm text-gray-600">
                Desde:
              </label>
              <input
                type="date"
                id="fechaInicio"
                value={fechaInicioLocal}
                onChange={handleFechaInicioChange}
                className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="fechaFin" className="text-sm text-gray-600">
                Hasta:
              </label>
              <input
                type="date"
                id="fechaFin"
                value={fechaFinLocal}
                onChange={handleFechaFinChange}
                min={fechaInicioLocal}
                className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              />
            </div>

            {/* Botón limpiar */}
            {filtrosActivos > 0 && (
              <button
                onClick={limpiarFiltros}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
                Limpiar ({filtrosActivos})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mostrar filtros activos (igual que en filtros-turnos) */}
      {filtrosActivos > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {fechaInicioLocal && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1 group">
                Desde: {formatearFecha(fechaInicioLocal)}
                <button
                  onClick={() => removerFiltro('inicio')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors group-hover:bg-blue-200"
                  aria-label="Remover filtro de fecha desde"
                >
                  <X size={12} className="text-blue-600 hover:text-blue-800" />
                </button>
              </span>
            )}
            {fechaFinLocal && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1 group">
                Hasta: {formatearFecha(fechaFinLocal)}
                <button
                  onClick={() => removerFiltro('fin')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors group-hover:bg-blue-200"
                  aria-label="Remover filtro de fecha hasta"
                >
                  <X size={12} className="text-blue-600 hover:text-blue-800" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}