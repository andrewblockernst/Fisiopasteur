"use client";

import { useState } from 'react';
import { OPCIONES_RECORDATORIO, type TipoRecordatorio } from '@/lib/utils/whatsapp.utils';
import { Clock, Bell, X } from 'lucide-react';

interface SelectorRecordatoriosProps {
  recordatoriosSeleccionados: TipoRecordatorio[];
  onRecordatoriosChange: (recordatorios: TipoRecordatorio[]) => void;
  className?: string;
}

export function SelectorRecordatorios({
  recordatoriosSeleccionados,
  onRecordatoriosChange,
  className = ""
}: SelectorRecordatoriosProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleRecordatorio = (tipo: TipoRecordatorio) => {
    if (recordatoriosSeleccionados.includes(tipo)) {
      // Remover
      const nuevos = recordatoriosSeleccionados.filter(r => r !== tipo);
      onRecordatoriosChange(nuevos);
    } else {
      // Agregar
      const nuevos = [...recordatoriosSeleccionados, tipo];
      onRecordatoriosChange(nuevos);
    }
  };

  const obtenerTextoSeleccion = () => {
    if (recordatoriosSeleccionados.length === 0) {
      return 'Sin recordatorios';
    }
    if (recordatoriosSeleccionados.length === 1) {
      return OPCIONES_RECORDATORIO[recordatoriosSeleccionados[0]].label;
    }
    return `${recordatoriosSeleccionados.length} recordatorios`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Botón principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent bg-white text-left flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="text-sm">
            {obtenerTextoSeleccion()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {recordatoriosSeleccionados.length > 0 && (
            <span className="bg-[#9C1838] text-white text-xs px-2 py-1 rounded-full">
              {recordatoriosSeleccionados.length}
            </span>
          )}
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Opciones */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-700 mb-2 px-2 py-1">
                Seleccionar recordatorios automáticos:
              </div>
              
              {Object.entries(OPCIONES_RECORDATORIO).map(([tipo, config]) => {
                const isSelected = recordatoriosSeleccionados.includes(tipo as TipoRecordatorio);
                
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => toggleRecordatorio(tipo as TipoRecordatorio)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                      isSelected 
                        ? 'bg-[#9C1838] text-white' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {config.label}
                    </div>
                    {isSelected && (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                );
              })}
              
              {/* Opción para quitar todos */}
              {recordatoriosSeleccionados.length > 0 && (
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onRecordatoriosChange([])}
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Quitar todos los recordatorios
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Chips de recordatorios seleccionados */}
      {recordatoriosSeleccionados.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {recordatoriosSeleccionados.map((tipo) => (
            <span
              key={tipo}
              className="inline-flex items-center gap-1 bg-[#9C1838] text-white text-xs px-2 py-1 rounded-full"
            >
              {OPCIONES_RECORDATORIO[tipo].label}
              <button
                type="button"
                onClick={() => toggleRecordatorio(tipo)}
                className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default SelectorRecordatorios;