"use client";

import { useState, useTransition } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import Button from "@/componentes/boton";
import { createEspecialidad, updateEspecialidad, deleteEspecialidad } from "@/lib/actions/especialidad.action";
import { useToastStore } from "@/stores/toast-store";
import type { Tables } from "@/types/database.types";
import { Plus, Pencil, X, Trash } from "lucide-react";

type Especialidad = Tables<"especialidad">;

interface GestionEspecialidadesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  especialidades: Especialidad[];
  onEspecialidadesUpdated?: () => void;
}

export function GestionEspecialidadesDialog({
  isOpen,
  onClose,
  especialidades,
  onEspecialidadesUpdated
}: GestionEspecialidadesDialogProps) {
  const [nombreNueva, setNombreNueva] = useState("");
  const [editando, setEditando] = useState<{ id: number; nombre: string } | null>(null);
  const [especialidadAEliminar, setEspecialidadAEliminar] = useState<Especialidad | null>(null);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToastStore();

  const handleCrear = () => {
    if (!nombreNueva.trim()) {
      addToast({
        variant: "error",
        message: "Campo requerido",
        description: "El nombre de la especialidad no puede estar vacío"
      });
      return;
    }

    startTransition(async () => {
      const result = await createEspecialidad(nombreNueva);
      
      addToast({
        variant: result.success ? "success" : "error",
        message: result.message,
        description: result.description
      });

      if (result.success) {
        setNombreNueva("");
        if (onEspecialidadesUpdated) onEspecialidadesUpdated();
      }
    });
  };

  const handleEditar = (especialidad: Especialidad) => {
    setEditando({
      id: especialidad.id_especialidad,
      nombre: especialidad.nombre
    });
  };

  const handleGuardarEdicion = () => {
    if (!editando || !editando.nombre.trim()) {
      addToast({
        variant: "error",
        message: "Campo requerido",
        description: "El nombre de la especialidad no puede estar vacío"
      });
      return;
    }

    startTransition(async () => {
      const result = await updateEspecialidad(editando.id, editando.nombre);
      
      addToast({
        variant: result.success ? "success" : "error",
        message: result.message,
        description: result.description
      });

      if (result.success) {
        setEditando(null);
        if (onEspecialidadesUpdated) onEspecialidadesUpdated();
      }
    });
  };

  const handleEliminar = (especialidad: Especialidad) => {
    setEspecialidadAEliminar(especialidad);
  };

  const confirmarEliminar = () => {
    if (!especialidadAEliminar) return;

    startTransition(async () => {
      const result = await deleteEspecialidad(especialidadAEliminar.id_especialidad);
      
      addToast({
        variant: result.success ? "success" : "error",
        message: result.message,
        description: result.description
      });

      if (result.success && onEspecialidadesUpdated) {
        onEspecialidadesUpdated();
      }
      
      setEspecialidadAEliminar(null);
    });
  };

  const cancelarEliminar = () => {
    setEspecialidadAEliminar(null);
  };

  const handleClose = () => {
    setNombreNueva("");
    setEditando(null);
    onClose();
  };

  return (
    <>
      <BaseDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Gestionar Especialidades"
        message="Administra las especialidades disponibles para los especialistas."
        type="custom"
        size="lg"
        showCloseButton={true}
      >
      <div className="space-y-6">
        {/* Formulario para crear nueva especialidad */}
          <div className="flex gap-2">
            <input
              type="text"
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isPending) {
                  handleCrear();
                }
              }}
              placeholder="Ej: Kinesiología, Fisioterapia..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:red-blue-200"
              disabled={isPending}
            />
            <Button
              variant="primary"
              onClick={handleCrear}
              disabled={isPending || !nombreNueva.trim()}
              className="whitespace-nowrap"
            >
              Agregar
            </Button>
        </div>

        {/* Lista de especialidades */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Especialidades ({especialidades.length})
          </h3>
          
          {especialidades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No hay especialidades registradas</p>
              <p className="text-xs mt-1">Agrega tu primera especialidad arriba</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {especialidades.map((especialidad) => {
                const isEditando = editando?.id === especialidad.id_especialidad;
                
                return (
                  <div
                    key={especialidad.id_especialidad}
                    className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    {isEditando ? (
                      <>
                        <input
                          type="text"
                          value={editando.nombre}
                          onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isPending) {
                              handleGuardarEdicion();
                            } else if (e.key === 'Escape') {
                              setEditando(null);
                            }
                          }}
                          className="flex-1 px-3 py-1.5 border border-red-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                          disabled={isPending}
                          autoFocus
                        />
                        <Button
                          variant="primary"
                          onClick={handleGuardarEdicion}
                          disabled={isPending || !editando.nombre.trim()}
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
                        <span className="flex-1 text-sm font-medium text-gray-900">
                          {especialidad.nombre}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditar(especialidad)}
                            disabled={isPending}
                            className="p-2 text-slate-400 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(especialidad)}
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
        title="¿Eliminar especialidad?"
        message={
          <>
            ¿Estás seguro de que deseas eliminar la especialidad "<b>{especialidadAEliminar?.nombre}</b>"?
            <br />
            <i style={{ marginTop: 12, display: "block", fontSize: 12, fontWeight: "bold" }}>
              Esta acción no se puede deshacer.
            </i>
          </>
        }
        isOpen={!!especialidadAEliminar}
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
