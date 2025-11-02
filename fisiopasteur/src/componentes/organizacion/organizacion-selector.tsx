"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UsuarioConOrganizaciones } from "@/types/extended-database.types";

interface OrgSelectorProps {
  usuario: UsuarioConOrganizaciones;
}

/**
 * Componente para que usuarios con múltiples organizaciones seleccionen una
 * Se muestra cuando:
 * - El usuario tiene más de una organización activa
 * - No hay una organización seleccionada en cookies
 */
export function OrganizacionSelector({ usuario }: OrgSelectorProps) {
  const router = useRouter();
  const [seleccionando, setSeleccionando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSeleccionarOrg = async (orgId: string) => {
    setSeleccionando(true);
    setError(null);

    try {
      // Llamar a la action para setear la organización
      const response = await fetch("/api/organizacion/seleccionar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orgId }),
      });

      if (!response.ok) {
        throw new Error("Error al seleccionar organización");
      }

      // Redirigir al inicio
      router.push("/inicio");
      router.refresh();
    } catch (err) {
      console.error("Error seleccionando organización:", err);
      setError("Error al seleccionar organización. Por favor intenta de nuevo.");
      setSeleccionando(false);
    }
  };

  if (usuario.organizaciones.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🏥</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Sin organizaciones asignadas
          </h1>
          <p className="text-gray-600 mb-6">
            No tienes organizaciones asignadas. Por favor contacta al administrador.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl w-full bg-white shadow-xl rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏢</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Selecciona una organización
          </h1>
          <p className="text-gray-600">
            Hola <span className="font-semibold">{usuario.nombre} {usuario.apellido}</span>,
            tienes acceso a múltiples organizaciones. Selecciona una para continuar.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {usuario.organizaciones
            .filter(org => org.organizacion.activo)
            .map((org) => (
              <button
                key={org.id_usuario_organizacion}
                onClick={() => handleSeleccionarOrg(org.id_organizacion)}
                disabled={seleccionando}
                className="w-full text-left p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 mb-1">
                      {org.organizacion.nombre}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                        {org.rol.nombre}
                      </span>
                      {org.color_calendario && (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full border-2 border-white shadow"
                            style={{ backgroundColor: org.color_calendario }}
                          />
                          <span>Color asignado</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <svg
                      className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <button
            onClick={() => router.push("/login")}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
