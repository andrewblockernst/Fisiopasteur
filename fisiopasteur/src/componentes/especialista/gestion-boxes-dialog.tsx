'use client';

import { useState, useTransition, useEffect } from 'react';
import BaseDialog from '../dialog/base-dialog';
import Button from '../boton';
import { useToastStore } from '@/stores/toast-store';
import { obtenerBoxes, crearBox, actualizarBox, eliminarBox } from '@/lib/actions/box.action';
import { Pencil, Trash, X } from 'lucide-react';

interface GestionBoxesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBoxesUpdated?: () => void;
}

export function GestionBoxesDialog({
  isOpen,
  onClose,
  onBoxesUpdated
}: GestionBoxesDialogProps) {
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ numero: '', nombre: '' });
  const [editando, setEditando] = useState<{ id: number; numero: string; nombre: string } | null>(null);
  const [boxAEliminar, setBoxAEliminar] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToastStore();

  useEffect(() => {
    if (isOpen) {
      cargarBoxes();
    }
  }, [isOpen]);

  const cargarBoxes = async () => {
    setLoading(true);
    try {
      const res = await obtenerBoxes();
      if (res.success) {
        setBoxes(res.data || []);
      } else {
        addToast({
          variant: 'error',
          message: 'Error al cargar boxes',
          description: res.error
        });
      }
    } catch (error) {
      console.error('Error cargando boxes:', error);
      addToast({
        variant: 'error',
        message: 'Error al cargar boxes'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = () => {
    if (!formData.numero.trim() || !formData.nombre.trim()) {
      addToast({
        variant: "error",
        message: "Campos requeridos",
        description: "El número y nombre del box no pueden estar vacíos"
      });
      return;
    }

    startTransition(async () => {
      try {
        const formDataObj = new FormData();
        formDataObj.append('numero', formData.numero);
        formDataObj.append('nombre', formData.nombre);

        await crearBox(formDataObj);
        
        addToast({
          variant: 'success',
          message: 'Box creado exitosamente'
        });

        setFormData({ numero: '', nombre: '' });
        await cargarBoxes();
        if (onBoxesUpdated) onBoxesUpdated();
      } catch (error: any) {
        addToast({
          variant: 'error',
          message: 'Error al crear box',
          description: error.message
        });
      }
    });
  };

  const handleEditar = (box: any) => {
    setEditando({
      id: box.id_box,
      numero: box.numero.toString(),
      nombre: box.nombre
    });
  };

  const handleGuardarEdicion = () => {
    if (!editando || !editando.numero.trim() || !editando.nombre.trim()) {
      addToast({
        variant: "error",
        message: "Campos requeridos",
        description: "El número y nombre del box no pueden estar vacíos"
      });
      return;
    }

    startTransition(async () => {
      try {
        const formDataObj = new FormData();
        formDataObj.append('numero', editando.numero);
        formDataObj.append('nombre', editando.nombre);

        await actualizarBox(editando.id, formDataObj);
        
        addToast({
          variant: 'success',
          message: 'Box actualizado exitosamente'
        });

        setEditando(null);
        await cargarBoxes();
        if (onBoxesUpdated) onBoxesUpdated();
      } catch (error: any) {
        addToast({
          variant: 'error',
          message: 'Error al actualizar box',
          description: error.message
        });
      }
    });
  };

  const handleEliminar = (box: any) => {
    setBoxAEliminar(box);
  };

  const confirmarEliminar = () => {
    if (!boxAEliminar) return;

    startTransition(async () => {
      try {
        await eliminarBox(boxAEliminar.id_box);
        
        addToast({
          variant: 'success',
          message: 'Box eliminado exitosamente'
        });

        await cargarBoxes();
        if (onBoxesUpdated) onBoxesUpdated();
      } catch (error: any) {
        addToast({
          variant: 'error',
          message: 'Error al eliminar box',
          description: error.message
        });
      }
      
      setBoxAEliminar(null);
    });
  };

  const cancelarEliminar = () => {
    setBoxAEliminar(null);
  };

  const handleClose = () => {
    setFormData({ numero: '', nombre: '' });
    setEditando(null);
    onClose();
  };

  return (
    <>
      <BaseDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Gestionar Boxes/Consultorios"
        message="Administra los boxes/consultorios disponibles para los turnos."
        type="custom"
        size="lg"
        showCloseButton={true}
      >
        <div className="space-y-6">
          {/* Formulario para crear nuevo box */}
          <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-2">
            <input
              type="number"
              min="1"
              value={formData.numero}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isPending) {
                  handleCrear();
                }
              }}
              placeholder="N° BOX"
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:red-blue-200"
              disabled={isPending}
            />
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isPending) {
                  handleCrear();
                }
              }}
              placeholder="Ej: RPG, KINESIO, FISIO..."
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:red-blue-200"
              disabled={isPending}
            />
            <Button
              variant="primary"
              onClick={handleCrear}
              disabled={isPending || !formData.numero.trim() || !formData.nombre.trim()}
              className="whitespace-nowrap"
            >
              Agregar
            </Button>
          </div>

          {/* Lista de boxes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Boxes ({boxes.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Cargando boxes...</p>
              </div>
            ) : boxes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No hay boxes registrados</p>
                <p className="text-xs mt-1">Agrega tu primer box arriba</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {boxes.map((box) => {
                  const isEditando = editando?.id === box.id_box;
                  
                  return (
                    <div
                      key={box.id_box}
                      className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      {isEditando ? (
                        <>
                          <input
                            type="number"
                            min="1"
                            value={editando?.numero ?? ''}
                            onChange={(e) => editando && setEditando({ ...editando, numero: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isPending) {
                                handleGuardarEdicion();
                              } else if (e.key === 'Escape') {
                                setEditando(null);
                              }
                            }}
                            className="w-20 px-3 py-1.5 border border-red-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                            disabled={isPending}
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editando?.nombre ?? ''}
                            onChange={(e) => editando && setEditando({ ...editando, nombre: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isPending) {
                                handleGuardarEdicion();
                              } else if (e.key === 'Escape') {
                                setEditando(null);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 border border-red-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                            disabled={isPending}
                          />
                          <Button
                            variant="primary"
                            onClick={handleGuardarEdicion}
                            disabled={isPending || !editando?.numero.trim() || !editando?.nombre.trim()}
                            className="px-3 text-xs"
                          >
                            Actualizar
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setEditando(null)}
                            disabled={isPending}
                            className="px-3"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-[#9C1838] text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                            {box.numero}
                          </div>
                          <span className="flex-1 text-sm font-medium text-gray-900">
                            {box.nombre}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditar(box)}
                              disabled={isPending}
                              className="p-2 text-slate-400 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEliminar(box)}
                              disabled={isPending}
                              className="p-2 text-red-400 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Eliminar"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </BaseDialog>

      {/* Dialog de confirmación de eliminación */}
      <BaseDialog
        type="warning"
        title="¿Eliminar box?"
        message={
          <>
            ¿Estás seguro de que deseas eliminar el box "<b>{boxAEliminar?.nombre}</b>" (#{boxAEliminar?.numero})?
            <br />
            <i style={{ marginTop: 12, display: "block", fontSize: 12, fontWeight: "bold" }}>
              Esta acción no se puede deshacer.
            </i>
          </>
        }
        isOpen={!!boxAEliminar}
        primaryButton={{
          text: isPending ? "Eliminando..." : "Eliminar",
          onClick: confirmarEliminar,
          disabled: isPending,
        }}
        secondaryButton={{
          text: "Cancelar",
          onClick: cancelarEliminar,
        }}
        onClose={cancelarEliminar}
        showCloseButton={true}
      />
    </>
  );
}
