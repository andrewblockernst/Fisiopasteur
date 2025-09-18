"use client";

import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import BaseDialog from '@/componentes/dialog/base-dialog';
import { getEvolucionesClinicas } from '@/lib/actions/paciente.action';
import { useToastStore } from '@/stores/toast-store';
import ImprimirVistaPrevia from '@/componentes/paciente/imprimir-vista-previa';

interface ImprimirHistorialDialogProps {
  paciente: any;
  open: boolean;
  onClose: () => void;
}

export default function ImprimirHistorialDialog({ 
  paciente, 
  open, 
  onClose 
}: ImprimirHistorialDialogProps) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarVista, setMostrarVista] = useState(false);
  const [evoluciones, setEvoluciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (open && paciente?.id_paciente) {
      cargarEvoluciones();
    }
  }, [open, paciente?.id_paciente]);

  const cargarEvoluciones = async () => {
    setLoading(true);
    try {
      const data = await getEvolucionesClinicas(paciente.id_paciente);
      setEvoluciones(data);
    } catch (error) {
      addToast({
        variant: 'error',
        message: 'Error',
        description: 'No se pudieron cargar las evoluciones clínicas',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = () => {
    setMostrarVista(true);
  };

  const handleCerrarVista = () => {
    setMostrarVista(false);
    onClose();
  };

  return (
    <>
      {/* Dialog principal para seleccionar fechas */}
      <BaseDialog
        type="custom"
        size="md"
        title="Imprimir Historial Clínico"
        customIcon={<Printer size={24} />}
        isOpen={open && !mostrarVista}
        onClose={onClose}
        showCloseButton
        customColor="#9C1838"
        message={
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              <strong>Paciente:</strong> {paciente?.nombre} {paciente?.apellido}
            </p>
            
            <p className="text-gray-600 mb-4">
              <strong>Evoluciones disponibles:</strong> {evoluciones.length} registros
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de inicio (opcional)
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de fin (opcional)
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Si no seleccionas fechas, se imprimirá todo el historial disponible.
              </p>
            </div>
          </div>
        }
        primaryButton={{
          text: loading ? "Cargando..." : "Vista Previa",
          onClick: handleContinuar,
          disabled: loading,
        }}
        secondaryButton={{
          text: "Cancelar",
          onClick: onClose,
        }}
      />

      {/* Vista de impresión */}
      {mostrarVista && (
        <ImprimirVistaPrevia
          paciente={paciente}
          evoluciones={evoluciones}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          open={mostrarVista}
          onClose={handleCerrarVista}
        />
      )}
    </>
  );
}