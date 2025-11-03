import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganizacionesUsuario } from "@/lib/services/organizacion.service";
import { OrganizacionSelector } from "@/componentes/organizacion/organizacion-selector";

export default async function SeleccionarOrganizacionPage() {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Obtener organizaciones del usuario
  const result = await getOrganizacionesUsuario(user.id);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Error
          </h1>
          <p className="text-gray-600 mb-6">
            {result.error || "No se pudieron cargar tus organizaciones"}
          </p>
          <a
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Volver al login
          </a>
        </div>
      </div>
    );
  }

  // Si tiene una sola organización, esta página no debería mostrarse
  // (el middleware debería haberla seteado automáticamente)
  if (result.data.organizaciones.length === 1) {
    redirect("/inicio");
  }

  return <OrganizacionSelector usuario={result.data} />;
}
