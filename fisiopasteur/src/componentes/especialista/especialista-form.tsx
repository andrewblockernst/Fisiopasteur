"use client";

import { createEspecialista, updateEspecialista } from "@/lib/actions/especialista.action";
import Button from "@/componentes/boton";
import ColorPicker from "@/componentes/color-selector";
import { useState } from "react";
import Link from "next/link";
import type { Tables } from "@/types/database.types";

type Especialidad = Tables<"especialidad">;
type Usuario = Tables<"usuario">;

interface EspecialistaFormProps {
  especialidades: Especialidad[];
  mode: "create" | "edit";
  initialData?: Usuario & { 
    especialidades?: (Especialidad & { 
      precio_particular?: number | null; 
      precio_obra_social?: number | null 
    })[] 
  };
}

export default function EspecialistaForm({ 
  especialidades, 
  mode, 
  initialData 
}: EspecialistaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<number[]>(
    initialData?.especialidades?.map(e => e.id_especialidad) || []
  );
  const [selectedColor, setSelectedColor] = useState(initialData?.color || "#3B82F6");
  
  // Estado para precios por especialidad
  const [precios, setPrecios] = useState<Record<number, { particular: number; obraSocial: number }>>(() => {
    const initialPrecios: Record<number, { particular: number; obraSocial: number }> = {};
    initialData?.especialidades?.forEach(esp => {
      initialPrecios[esp.id_especialidad] = {
        particular: esp.precio_particular || 0,
        obraSocial: esp.precio_obra_social || 0
      };
    });
    return initialPrecios;
  });

  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};

    // Validaciones requeridas
    if (!formData.get("nombre")) newErrors.nombre = "El nombre es requerido";
    if (!formData.get("apellido")) newErrors.apellido = "El apellido es requerido";
    if (!formData.get("email")) newErrors.email = "El email es requerido";
    
    // Solo validar contraseña en modo crear o si se proporciona en editar
    if (mode === "create" && !formData.get("contraseña")) {
      newErrors.contraseña = "La contraseña es requerida";
    }

    // Validar email
    const email = formData.get("email") as string;
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (formData: FormData) => {
    if (!validateForm(formData)) return;

    // Agregar especialidades seleccionadas con sus precios al FormData
    selectedEspecialidades.forEach((especialidadId, index) => {
      formData.append(`especialidades[${index}]`, especialidadId.toString());
      
      // Agregar precios de esta especialidad
      const precio = precios[especialidadId] || { particular: 0, obraSocial: 0 };
      formData.append(`precios[${especialidadId}][particular]`, precio.particular.toString());
      formData.append(`precios[${especialidadId}][obraSocial]`, precio.obraSocial.toString());
    });

    // Agregar color seleccionado
    formData.set("color", selectedColor);

    try {
      setIsSubmitting(true);
      
      if (mode === "create") {
        await createEspecialista(formData);
      } else if (initialData) {
        await updateEspecialista(initialData.id_usuario, formData);
      }
    } catch (error: any) {
      // Solo mostrar error si NO es un redirect de Next.js
      if (error?.digest?.includes('NEXT_REDIRECT')) {
        // Es un redirect exitoso, no hacer nada
        return;
      }
      
      console.error("Error:", error);
      alert(`Error al ${mode === "create" ? "crear" : "actualizar"} especialista`);
      setIsSubmitting(false);
    }
  };

  const toggleEspecialidad = (especialidadId: number) => {
    setSelectedEspecialidades(prev => {
      if (prev.includes(especialidadId)) {
        return prev.filter(id => id !== especialidadId);
      } else {
        // Al agregar nueva especialidad, inicializar precios en 0 si no existen
        if (!precios[especialidadId]) {
          setPrecios(p => ({
            ...p,
            [especialidadId]: { particular: 0, obraSocial: 0 }
          }));
        }
        return [...prev, especialidadId];
      }
    });
  };

  const removeEspecialidad = (especialidadId: number) => {
    setSelectedEspecialidades(prev => prev.filter(id => id !== especialidadId));
  };

  const updatePrecio = (especialidadId: number, tipo: 'particular' | 'obraSocial', valor: string) => {
    const numero = parseFloat(valor) || 0;
    setPrecios(prev => ({
      ...prev,
      [especialidadId]: {
        ...prev[especialidadId],
        [tipo]: numero
      }
    }));
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <form action={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              defaultValue={initialData?.nombre || ""}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.nombre ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ingresa el nombre"
            />
            {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
          </div>

          {/* Apellido */}
          <div>
            <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-2">
              Apellido *
            </label>
            <input
              type="text"
              id="apellido"
              name="apellido"
              defaultValue={initialData?.apellido || ""}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.apellido ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ingresa el apellido"
            />
            {errors.apellido && <p className="text-red-500 text-sm mt-1">{errors.apellido}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              defaultValue={initialData?.email || ""}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="correo@ejemplo.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="contraseña" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña {mode === "create" ? "*" : "(dejar vacío para no cambiar)"}
            </label>
            <input
              type="password"
              id="contraseña"
              name="contraseña"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.contraseña ? "border-red-500" : "border-gray-300"
              }`}
              placeholder={mode === "create" ? "Ingresa la contraseña" : "Nueva contraseña (opcional)"}
            />
            {errors.contraseña && <p className="text-red-500 text-sm mt-1">{errors.contraseña}</p>}
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              defaultValue={initialData?.telefono || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          {/* Color de identificación */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              Color de identificación
            </label>
            <ColorPicker
              value={selectedColor}
              onChange={setSelectedColor}
              disabled={isSubmitting}
            />
          </div>

          {/* Especialidades - Ahora alineado en el grid */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especialidades *
            </label>
            
            {/* Tags seleccionadas con precios */}
            {selectedEspecialidades.length > 0 && (
              <div className="mb-3 p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="space-y-3">
                  {selectedEspecialidades.map((especialidadId) => {
                    const especialidad = especialidades.find(e => e.id_especialidad === especialidadId);
                    const precioActual = precios[especialidadId] || { particular: 0, obraSocial: 0 };
                    
                    return (
                      <div key={especialidadId} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900">
                            {especialidad?.nombre}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeEspecialidad(especialidadId)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Precio Particular ($)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={precioActual.particular}
                              onChange={(e) => updatePrecio(especialidadId, 'particular', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Precio Obra Social ($)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={precioActual.obraSocial}
                              onChange={(e) => updatePrecio(especialidadId, 'obraSocial', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lista compacta de especialidades disponibles */}
            <div className="border border-gray-300 rounded-md max-h-32 overflow-y-auto">
              {especialidades.map((especialidad) => {
                const isSelected = selectedEspecialidades.includes(especialidad.id_especialidad);
                return (
                  <label
                    key={especialidad.id_especialidad}
                    className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                      isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEspecialidad(especialidad.id_especialidad)}
                      className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className={`text-xs ${isSelected ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
                      {especialidad.nombre}
                    </span>
                  </label>
                );
              })}
              {especialidades.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-500 text-center">
                  No hay especialidades disponibles
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4 mt-8">
          <Link href="/especialista">
            <Button variant="secondary" disabled={isSubmitting}>
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? (mode === "create" ? "Creando..." : "Actualizando...") 
              : (mode === "create" ? "Crear Especialista" : "Actualizar Especialista")
            }
          </Button>
        </div>
      </form>
    </div>
  );
}