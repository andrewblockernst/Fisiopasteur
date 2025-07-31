"use client";

import { createEspecialista, updateEspecialista } from "@/lib/actions/especialista.action";
import Button from "@/components/button";
import { useState } from "react";
import Link from "next/link";
import type { Tables } from "@/types/database.types";

type Especialidad = Tables<"especialidad">;
type Usuario = Tables<"usuario">;

interface EspecialistaFormProps {
  especialidades: Especialidad[];
  mode: "create" | "edit";
  initialData?: Usuario;
}

export default function EspecialistaForm({ 
  especialidades, 
  mode, 
  initialData 
}: EspecialistaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};

    // Validaciones requeridas
    if (!formData.get("nombre")) newErrors.nombre = "El nombre es requerido";
    if (!formData.get("apellido")) newErrors.apellido = "El apellido es requerido";
    if (!formData.get("email")) newErrors.email = "El email es requerido";
    if (!formData.get("usuario")) newErrors.usuario = "El usuario es requerido";
    
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
    setIsSubmitting(false); // Solo resetear el estado si hay error real
  }
  // No poner finally aquí porque interfiere con el redirect
};

  const colors = [
    { value: "#3B82F6", label: "Azul" },
    { value: "#EF4444", label: "Rojo" },
    { value: "#10B981", label: "Verde" },
    { value: "#F59E0B", label: "Amarillo" },
    { value: "#8B5CF6", label: "Púrpura" },
    { value: "#EC4899", label: "Rosa" },
    { value: "#14B8A6", label: "Turquesa" },
    { value: "#F97316", label: "Naranja" },
  ];

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

          {/* Usuario */}
          <div>
            <label htmlFor="usuario" className="block text-sm font-medium text-gray-700 mb-2">
              Usuario *
            </label>
            <input
              type="text"
              id="usuario"
              name="usuario"
              defaultValue={initialData?.usuario || ""}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.usuario ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="nombre_usuario"
            />
            {errors.usuario && <p className="text-red-500 text-sm mt-1">{errors.usuario}</p>}
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

          {/* Especialidad */}
          <div>
            <label htmlFor="id_especialidad" className="block text-sm font-medium text-gray-700 mb-2">
              Especialidad
            </label>
            <select
              id="id_especialidad"
              name="id_especialidad"
              defaultValue={initialData?.id_especialidad || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar especialidad</option>
              {(especialidades && especialidades.length > 0) ? (
                especialidades.map((especialidad) => (
                  <option key={especialidad.id_especialidad} value={especialidad.id_especialidad}>
                    {especialidad.nombre}
                  </option>
                ))
              ) : (
                <option disabled value="">No hay especialidades disponibles</option>
              )}
            </select>
          </div>

          {/* Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              Color de identificación
            </label>
            <select
              id="color"
              name="color"
              defaultValue={initialData?.color || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar color</option>
              {colors.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
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