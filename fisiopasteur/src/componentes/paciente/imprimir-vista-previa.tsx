"use client";

import { Printer, Download } from 'lucide-react';
import BaseDialog from '@/componentes/dialog/base-dialog';
import { useToastStore } from '@/stores/toast-store';

interface ImprimirVistaPreviaProps {
  paciente: any;
  evoluciones: any[];
  fechaInicio?: string;
  fechaFin?: string;
  open: boolean;
  onClose: () => void;
}

export default function ImprimirVistaPrevia({ 
  paciente, 
  evoluciones, 
  fechaInicio, 
  fechaFin, 
  open, 
  onClose 
}: ImprimirVistaPreviaProps) {
  const { addToast } = useToastStore();

  const handleImprimir = () => {
    window.print();
  };

  const handleDescargarPDF = () => {
    addToast({
      variant: 'info',
      message: 'Descargar PDF',
      description: 'Use Ctrl+P y seleccione "Guardar como PDF" en el diálogo de impresión.',
    });
    window.print();
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatearFechaHora = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularEdad = (fechaNacimiento?: string) => {
    if (!fechaNacimiento) return 'No especificada';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return `${edad} años`;
  };

  // Filtrar evoluciones por fecha si se especifica rango
  const evolucionesFiltradas = evoluciones.filter(evo => {
    if (!fechaInicio && !fechaFin) return true;
    const fechaEvo = new Date(evo.created_at);
    if (fechaInicio && fechaEvo < new Date(fechaInicio)) return false;
    if (fechaFin && fechaEvo > new Date(fechaFin)) return false;
    return true;
  });

  return (
    <>
      <BaseDialog
        type="custom"
        size="lg"
        title="Vista previa de impresión"
        isOpen={open}
        onClose={onClose}
        showCloseButton
        customColor="#9C1838"
        message={
          <div className="space-y-4">
            {/* Botones de acción */}
            <div className="flex gap-3 mb-6 print:hidden">
              <button
                onClick={handleImprimir}
                className="flex items-center gap-2 px-4 py-2 bg-[#9C1838] text-white rounded-lg hover:bg-[#7d1429] transition-colors"
              >
                <Printer size={18} />
                Imprimir
              </button>
              <button
                onClick={handleDescargarPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={18} />
                Descargar PDF
              </button>
            </div>

            {/* Contenido para impresión */}
            <div className="bg-white print:shadow-none border print:border-none rounded-lg print:rounded-none p-6 print:p-0">
              {/* Encabezado */}
              <div className="text-center mb-8 print:mb-6">
                <h1 className="text-2xl font-bold text-[#9C1838] mb-2">
                  FISIOPASTEUR
                </h1>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  HISTORIAL CLÍNICO
                </h2>
                {(fechaInicio || fechaFin) && (
                  <p className="text-gray-600 text-sm">
                    Período: {fechaInicio ? formatearFecha(fechaInicio) : 'Inicio'} - {fechaFin ? formatearFecha(fechaFin) : 'Actual'}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  Fecha de impresión: {formatearFecha(new Date().toISOString())}
                </p>
              </div>

              {/* Datos del paciente */}
              <div className="mb-8 print:mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                  DATOS DEL PACIENTE
                </h3>
                <div className="grid grid-cols-2 gap-4 print:gap-2">
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
                    <p className="text-gray-900">{paciente.telefono || 'No especificado'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900">{paciente.email || 'No especificado'}</p>
                  </div>
                </div>
              </div>

              {/* Evoluciones clínicas */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                  EVOLUCIONES CLÍNICAS ({evolucionesFiltradas.length} registros)
                </h3>
                
                {evolucionesFiltradas.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No hay evoluciones clínicas en el período seleccionado
                  </p>
                ) : (
                  <div className="space-y-4 print:space-y-3">
                    {evolucionesFiltradas
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((evolucion, index) => (
                        <div 
                          key={index} 
                          className="border border-gray-200 rounded-lg print:rounded print:border-gray-400 p-4 print:p-3 print:break-inside-avoid"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="font-medium text-gray-700 text-sm">Fecha:</span>
                              <p className="text-gray-900">{formatearFechaHora(evolucion.created_at)}</p>
                            </div>
                          </div>
                          
                          <div>
                            <span className="font-medium text-gray-700 text-sm">Observaciones:</span>
                            <div className="text-gray-900 text-sm mt-1">
                              {evolucion.observaciones?.startsWith("[") ? (
                                <>
                                  <span className="font-semibold text-[#9C1838]">
                                    {evolucion.observaciones.split("]")[0].replace("[", "")}:
                                  </span>
                                  <span className="ml-1">{evolucion.observaciones.split("]")[1]}</span>
                                </>
                              ) : (
                                <span>{evolucion.observaciones}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Pie de página */}
              <div className="mt-12 print:mt-8 text-center text-xs text-gray-500 border-t border-gray-200 pt-4 print:pt-3">
                <p>Este documento fue generado automáticamente por el sistema Fisiopasteur</p>
                <p>Para consultas: contacto@fisiopasteur.com</p>
              </div>
            </div>
          </div>
        }
        primaryButton={{
          text: "Cerrar",
          onClick: onClose,
        }}
      />

      {/* Estilos CSS para impresión */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
          
          h1, h2, h3 {
            break-after: avoid;
          }
        }
      `}</style>
    </>
  );
}