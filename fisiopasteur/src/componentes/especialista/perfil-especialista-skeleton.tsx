"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Skeleton loader para la página /especialistas/[id].
 *
 * Replica la estructura del perfil real:
 *  - Header sticky mobile con back button funcional + título placeholder + acciones (si aplica)
 *  - Bloque izquierdo (lg:col-span-7): nombre (2 líneas), 3 filas de info (email/teléfono/color), chips de especialidades
 *  - Bloque derecho (lg:col-span-5): card de Precios con header + items
 *
 * No usa overlay fixed: se renderiza inline para que la navbar del layout (main) siga visible.
 */
export function PerfilEspecialistaSkeleton({ canManage = false }: { canManage?: boolean }) {
  const router = useRouter();

  return (
    <div className="min-h-screen text-black animate-pulse" aria-busy="true" aria-label="Cargando perfil de especialista">
      {/* Mobile Header — el back button queda funcional para no atrapar al usuario en el skeleton */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/especialistas")}
            className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="absolute left-1/2 transform -translate-x-1/2 h-5 w-20 bg-gray-200 rounded" />

          {canManage && (
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-full bg-gray-200" />
              <div className="w-9 h-9 rounded-full bg-gray-200" />
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1500px] mx-auto px-4 py-6 lg:py-10">
        {/* Columna izquierda: identidad + chips */}
        <div className="lg:col-span-7">
          <div className="text-center mt-4 flex flex-col items-center">
            {/* Nombre (2 líneas) */}
            <div className="h-7 lg:h-9 w-56 bg-gray-200 rounded mb-3" />
            <div className="h-7 lg:h-9 w-40 bg-gray-200 rounded" />

            {/* Email / Teléfono / Color */}
            <div className="mt-6 space-y-3 w-full max-w-xs">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="h-4 w-48 bg-gray-200 rounded" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="w-[18px] h-[18px] rounded-full bg-gray-200" />
              </div>
            </div>
          </div>

          {/* Chips de especialidades */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <div className="h-9 w-36 rounded-full bg-gray-200" />
            <div className="h-9 w-28 rounded-full bg-gray-200" />
            <div className="h-9 w-32 rounded-full bg-gray-200" />
          </div>
        </div>

        {/* Columna derecha: card de Precios */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <div className="px-6 pt-5 pb-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="h-5 w-24 bg-gray-200 rounded" />
            </div>

            <div className="px-4 pb-5 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="p-4 border border-neutral-200 rounded-lg">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerfilEspecialistaSkeleton;
