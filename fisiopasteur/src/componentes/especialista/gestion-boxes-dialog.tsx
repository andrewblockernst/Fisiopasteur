'use client';

import { useState, useTransition, useEffect } from 'react';
import BaseDialog from '../dialog/base-dialog';
import { Button, Input, IconButton, EmptyState } from "@/componentes/ui";
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
  const [createErrors, setCreateErrors] = useState<{ numero?: string; nombre?: string }>({});
  const [editErrors, setEditErrors] = useState<{ numero?: string; nombre?: string }>({});
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
    const errs: { numero?: string; nombre?: string } = {};
    if (!formData.numero.trim()) errs.numero = "Requerido";
    if (!formData.nombre.trim()) errs.nombre = "Requerido";
    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) return;

    startTransition(async () => {
      try {
        const formDataObj = new FormData();
        formDataObj.append('numero', formData.numero);
        formDataObj.append('nombre', formData.nombre);

        const result = await crearBox(formDataObj);
        if (!result.success) {
          addToast({
            variant: 'error',
            message: 'Error al crear box',
            description: result.error
          });
          return;
        }
        
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
    if (!editando) return;
    const errs: { numero?: string; nombre?: string } = {};
    if (!editando.numero.trim()) errs.numero = "Requerido";
    if (!editando.nombre.trim()) errs.nombre = "Requerido";
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    startTransition(async () => {
      try {
        const formDataObj = new FormData();
        formDataObj.append('numero', editando.numero);
        formDataObj.append('nombre', editando.nombre);

        const result = await actualizarBox(editando.id, formDataObj);
        if (!result.success) {
          addToast({
            variant: 'error',
            message: 'Error al actualizar box',
            description: result.error
          });
          return;
        }
        
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
        const result = await eliminarBox(boxAEliminar.id_box);
        if (!result.success) {
          addToast({
            variant: 'error',
            message: 'Error al eliminar box',
            description: result.error
          });
          return;
        }
        
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
          <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-2 items-start">
            <div>
              <Input
                type="number"
                min="1"
                value={formData.numero}
                onChange={(e) => {
                  setFormData({ ...formData, numero: e.target.value });
                  if (createErrors.numero) setCreateErrors((p) => ({ ...p, numero: undefined }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isPending) handleCrear();
                }}
                placeholder="N° BOX"
                disabled={isPending}
                error={!!createErrors.numero}
              />
              {createErrors.numero && <p className="text-destructive text-xs mt-1">{createErrors.numero}</p>}
            </div>
            <div>
              <Input
                type="text"
                value={formData.nombre}
                onChange={(e) => {
                  setFormData({ ...formData, nombre: e.target.value });
                  if (createErrors.nombre) setCreateErrors((p) => ({ ...p, nombre: undefined }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isPending) handleCrear();
                }}
                placeholder="Ej: RPG, KINESIO, FISIO..."
                disabled={isPending}
                error={!!createErrors.nombre}
              />
              {createErrors.nombre && <p className="text-destructive text-xs mt-1">{createErrors.nombre}</p>}
            </div>
            <Button
              variant="primary"
              onClick={handleCrear}
              disabled={isPending}
              className="whitespace-nowrap"
            >
              Agregar
            </Button>
          </div>

          {/* Lista de boxes */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Boxes ({boxes.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Cargando boxes...</p>
              </div>
            ) : boxes.length === 0 ? (
              <EmptyState
                title="No hay boxes registrados"
                description="Agregá tu primer box usando el formulario de arriba."
                className="py-6"
              />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {boxes.map((box) => {
                  const isEditando = editando?.id === box.id_box;

                  return (
                    <div
                      key={box.id_box}
                      className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg hover:border-muted-foreground/30 transition-colors"
                    >
                      {isEditando ? (
                        <>
                          <Input
                            type="number"
                            min="1"
                            value={editando?.numero ?? ''}
                            onChange={(e) => editando && setEditando({ ...editando, numero: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isPending) handleGuardarEdicion();
                              else if (e.key === 'Escape') setEditando(null);
                            }}
                            disabled={isPending}
                            autoFocus
                            size="sm"
                            className="w-24"
                          />
                          <Input
                            type="text"
                            value={editando?.nombre ?? ''}
                            onChange={(e) => editando && setEditando({ ...editando, nombre: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isPending) handleGuardarEdicion();
                              else if (e.key === 'Escape') setEditando(null);
                            }}
                            disabled={isPending}
                            size="sm"
                            className="flex-1"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleGuardarEdicion}
                            disabled={isPending || !editando?.numero.trim() || !editando?.nombre.trim()}
                          >
                            Actualizar
                          </Button>
                          <IconButton
                            aria-label="Cancelar edición"
                            variant="ghost"
                            size="sm"
                            icon={<X className="w-4 h-4" />}
                            onClick={() => setEditando(null)}
                            disabled={isPending}
                          />
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-brand text-brand-foreground rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                            {box.numero}
                          </div>
                          <span className="flex-1 text-sm font-medium text-foreground truncate">
                            {box.nombre}
                          </span>
                          <div className="flex gap-1">
                            <IconButton
                              aria-label="Editar box"
                              variant="ghost"
                              size="sm"
                              icon={<Pencil className="w-4 h-4" />}
                              onClick={() => handleEditar(box)}
                              disabled={isPending}
                            />
                            <IconButton
                              aria-label="Eliminar box"
                              variant="ghost"
                              size="sm"
                              icon={<Trash className="w-4 h-4 text-destructive" />}
                              onClick={() => handleEliminar(box)}
                              disabled={isPending}
                            />
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
