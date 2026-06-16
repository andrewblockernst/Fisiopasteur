import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type UsuarioActual = Tables<"usuario">;

export const obtenerUsuarioActual = cache(async (): Promise<UsuarioActual | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuario")
    .select("*")
    .eq("id_usuario", user.id)
    .single();

  return {
    ...(data as UsuarioActual),
  };
});
