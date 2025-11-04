"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Obtiene el usuario autenticado y su organización actual
 * Esta función debe ser llamada al inicio de cada server action
 * para establecer el contexto organizacional del request
 * 
 * @returns Usuario autenticado con su organización actual
 * @throws Error si no hay usuario o no tiene organización
 */
export async function getAuthContext(): Promise<{
  userId: string;
  orgId: string;
  email: string;
}> {
  const supabase = await createClient();

  // 1. Obtener usuario autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("No autenticado. Por favor inicia sesión.");
  }

  // 2. Obtener organización actual desde cookie
  const cookieStore = await cookies();
  const orgId = cookieStore.get("org_actual")?.value;

  if (!orgId) {
    throw new Error("No hay organización seleccionada. Por favor selecciona una organización.");
  }

  // 3. Verificar que el usuario tiene acceso a esta organización
  const { data: orgAccess, error: orgError } = await supabase
    .from("usuario_organizacion")
    .select("activo")
    .eq("id_usuario", user.id)
    .eq("id_organizacion", orgId)
    .eq("activo", true)
    .single();

  if (orgError || !orgAccess) {
    throw new Error("No tienes acceso a esta organización.");
  }

  return {
    userId: user.id,
    orgId: orgId,
    email: user.email || "",
  };
}

/**
 * Obtiene SOLO el orgId actual sin validaciones adicionales
 * Útil para casos donde ya sabemos que el usuario está autenticado
 * 
 * @returns ID de la organización actual
 * @throws Error si no hay organización seleccionada
 */
export async function getCurrentOrgId(): Promise<string> {
  const cookieStore = await cookies();
  const orgId = cookieStore.get("org_actual")?.value;

  if (!orgId) {
    throw new Error("No hay organización seleccionada.");
  }

  return orgId;
}
