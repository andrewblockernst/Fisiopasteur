import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/types/database.types";

type Especialista = {
  id_usuario: number;
  nombre: string;
  apellido: string;
  color?: string;
  email?: string;
};

export async function obtenerEspecialistasPilates(): Promise<{ success: boolean; data: Especialista[] }> {
  const supabase = createClient();

  try {
    // Buscar en usuario_especialidad los especialistas con especialidad 4 (Pilates)
    const { data, error } = await supabase
      .from("usuario_especialidad")
      .select(`
        usuario: id_usuario (
          id_usuario,
          nombre,
          apellido,
          color,
          email
        )
      `)
      .eq("id_especialidad", 4);

    if (error) {
      console.error("Error al obtener especialistas de pilates:", error);
      return { success: false, data: [] };
    }

    // Mapear para obtener el usuario plano
    const especialistas = (data ?? [])
      .map((row: any) => row.usuario)
      .filter(Boolean);

    return { success: true, data: especialistas as Especialista[] };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, data: [] };
  }
}