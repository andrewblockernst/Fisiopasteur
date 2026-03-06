"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Obtiene el usuario autenticado actual.
 * Sin lógica multi-organizacional — un único contexto global.
 */
export async function getAuthContext(): Promise<{
  userId: string;
  email: string;
}> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("No autenticado. Por favor inicia sesión.");
  }

  return {
    userId: user.id,
    email: user.email || "",
  };
}
