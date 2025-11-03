 "use client";

import { useState } from "react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import Image from "next/image";
import type { Tables } from "@/types/database.types";
import { useToastStore } from '@/stores/toast-store';

type Especialidad = Tables<"especialidad">;

// ✅ Tipo que coincide con getEspecialistas()
type EspecialistaConDatos = {
  id_usuario: string;
  id_usuario_organizacion: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  color: string | null;
  activo: boolean;
  id_rol: number;
  rol: {
    id: number;
    nombre: string;
  };
  especialidades: Array<{
    id_especialidad: number;
    nombre: string;
    precio_particular: number | null;
    precio_obra_social: number | null;
  }>;
  usuario_especialidad: Array<{
    precio_particular: number | null;
    precio_obra_social: number | null;
    activo: boolean | null;
    especialidad: {
      id_especialidad: number;
      nombre: string;
    };
  }>;
};

interface EditarEspecialistaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  especialidades: Especialidad[];
  especialista: EspecialistaConDatos;
}

export function EditarEspecialistaDialog({ 
  isOpen, 
  onClose, 
  especialidades,
  especialista
}: EditarEspecialistaDialogProps) {
  return (
    <BaseDialog
      type="custom"
      size="lg"
      title="Editar Especialista"
      customIcon={
        <Image
          src="/favicon.svg"
          alt="Logo Fisiopasteur"
          width={120}
          height={40}
          className="object-contain"
        />
      }
      message={
        <div className="text-left">
          <div className="text-gray-600 mb-6 text-center">Modifica la información del especialista.</div>
          <EspecialistaEditFormWrapper 
            especialidades={especialidades}
            especialista={especialista}
            onSuccess={onClose}
          />
        </div>
      }
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
    />
  );
}

interface EspecialistaEditFormWrapperProps {
  especialidades: Especialidad[];
  especialista: EspecialistaConDatos;
  onSuccess: () => void;
}

function EspecialistaEditFormWrapper({ especialidades, especialista, onSuccess }: EspecialistaEditFormWrapperProps) {
  return (
    <div className="max-w-4xl">
      <EspecialistaEditFormForDialog 
        especialidades={especialidades}
        especialista={especialista}
        onSuccess={onSuccess}
      />
    </div>
  );
}

// Versión modificada del formulario para editar en el dialog
import { updateEspecialista } from "@/lib/actions/especialista.action";
import Button from "@/componentes/boton";
import ColorPicker from "@/componentes/color-selector";

interface EspecialistaEditFormForDialogProps {
  especialidades: Especialidad[];
  especialista: EspecialistaConDatos;
  onSuccess: () => void;
}

function EspecialistaEditFormForDialog({ 
  especialidades, 
  especialista,
  onSuccess
}: EspecialistaEditFormForDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<number[]>(
    // ✅ Eliminar duplicados usando Set
    [...new Set(especialista.especialidades?.map((e: { id_especialidad: number }) => e.id_especialidad) || [])]
  );
  const [selectedColor, setSelectedColor] = useState(especialista.color || "#3B82F6");
  const { showServerActionResponse } = useToastStore();

  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.get("nombre")) newErrors.nombre = "El nombre es requerido";
    if (!formData.get("apellido")) newErrors.apellido = "El apellido es requerido";
    if (!formData.get("email")) newErrors.email = "El email es requerido";

    const email = formData.get("email") as string;
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (formData: FormData) => {
    if (!validateForm(formData)) return;

    setIsSubmitting(true);

    // Agregar especialidades seleccionadas al FormData
    selectedEspecialidades.forEach((especialidadId, index) => {
      formData.append(`especialidades[${index}]`, especialidadId.toString());
    });

    // Agregar color seleccionado
    formData.set("color", selectedColor);

    console.log('Enviando datos:', {
      nombre: formData.get('nombre'),
      apellido: formData.get('apellido'),
      email: formData.get('email'),
      telefono: formData.get('telefono'),
      color: formData.get('color'),
      especialidades: selectedEspecialidades
    });

    try {
      const result = await updateEspecialista(especialista.id_usuario, formData);
      
      console.log('Resultado de actualización:', result);
      
      showServerActionResponse(result);
      
      if (result.success) {
        // Esperar un momento antes de cerrar para que el usuario vea el mensaje
        setTimeout(() => {
          onSuccess(); // Cerrar el dialog y refrescar la lista
        }, 500);
      } else {
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error("Error al actualizar:", error);
      
      if (error?.digest?.includes('NEXT_REDIRECT')) {
        onSuccess(); // También cerrar en caso de redirect exitoso
        return;
      }
      
      showServerActionResponse({
        success: false,
        message: "Error al actualizar especialista",
        toastType: "error",
        description: error?.message || "Ocurrió un error inesperado"
      });
      setIsSubmitting(false);
    }
  };

  const toggleEspecialidad = (especialidadId: number) => {
    setSelectedEspecialidades(prev => {
      if (prev.includes(especialidadId)) {
        // Remover la especialidad
        return prev.filter(id => id !== especialidadId);
      } else {
        // Agregar solo si no existe (prevenir duplicados)
        return [...new Set([...prev, especialidadId])];
      }
    });
  };

  const removeEspecialidad = (especialidadId: number) => {
    setSelectedEspecialidades(prev => prev.filter(id => id !== especialidadId));
  };

  return (
    <form action={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            defaultValue={especialista.nombre}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
              errors.nombre ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Ingresa el nombre"
          />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>

        {/* Apellido */}
        <div>
          <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
            Apellido *
          </label>
          <input
            type="text"
            id="apellido"
            name="apellido"
            defaultValue={especialista.apellido}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
              errors.apellido ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Ingresa el apellido"
          />
          {errors.apellido && <p className="text-red-500 text-xs mt-1">{errors.apellido}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            defaultValue={especialista.email}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="correo@ejemplo.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Contraseña */}
        <div>
          <label htmlFor="contraseña" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña (dejar vacío para no cambiar)
          </label>
          <input
            type="password"
            id="contraseña"
            name="contraseña"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            placeholder="Nueva contraseña (opcional)"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            defaultValue={especialista.telefono || ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            placeholder="+54 9 11 1234-5678"
          />
        </div>
      </div>

      {/* Color de identificación */}
      <div className="mt-4">
        <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
          Color de identificación
        </label>
        <ColorPicker
          value={selectedColor}
          onChange={setSelectedColor}
          disabled={isSubmitting}
        />
      </div>

      {/* Especialidades */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Especialidades *
        </label>
        
        {selectedEspecialidades.length > 0 && (
          <div className="mb-3 p-2 bg-gray-50 rounded-md">
            <div className="flex flex-wrap gap-1">
              {selectedEspecialidades.map((especialidadId) => {
                const especialidad = especialidades.find(e => e.id_especialidad === especialidadId);
                return (
                  <span
                    key={especialidadId}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-[#9C1838]"
                  >
                    {especialidad?.nombre}
                    <button
                      type="button"
                      onClick={() => removeEspecialidad(especialidadId)}
                      className="ml-1 text-[#9C1838] hover:text-red-800 text-sm"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="border border-gray-300 rounded-md max-h-32 overflow-y-auto">
          {especialidades.map((especialidad) => {
            const isSelected = selectedEspecialidades.includes(especialidad.id_especialidad);
            return (
              <label
                key={especialidad.id_especialidad}
                className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                  isSelected ? 'bg-red-50 border-l-2' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleEspecialidad(especialidad.id_especialidad)}
                  className="mr-2 h-3 w-3 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className={`text-xs ${isSelected ? 'font-medium text-red-900' : 'text-gray-700'}`}>
                  {especialidad.nombre}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-3 mt-6">
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={onSuccess}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Actualizando..." : "Actualizar Especialista"}
        </Button>
      </div>
    </form>
  );
}
