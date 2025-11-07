"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function obtenerEvaluacionInicial(idGrupo: string) {
  const supabase = await createClient();
  
  try {
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // ✅ Usar filtro directo en lugar de RLS
    const { data, error } = await supabase
      .from('evaluacion_inicial')
      .select('*')
      .eq('id_grupo', idGrupo)
      .eq('id_organizacion', orgId)
      .maybeSingle(); // ✅ maybeSingle() no lanza error si no encuentra resultados

    if (error) {
      console.error('❌ Error al obtener evaluación:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export async function guardarEvaluacionInicial(idGrupo: string, datos: any) {
  const supabase = await createClient();
  
  try {
    const { getAuthContext } = await import("@/lib/utils/auth-context");
    const { orgId } = await getAuthContext();

    // Verificar si ya existe una evaluación
    const { data: existente } = await supabase
      .from('evaluacion_inicial')
      .select('id_evaluacion')
      .eq('id_grupo', idGrupo)
      .eq('id_organizacion', orgId)
      .maybeSingle();

    if (existente) {
      // Actualizar
      const { error } = await supabase
        .from('evaluacion_inicial')
        .update({
          ...datos,
          updated_at: new Date().toISOString()
        })
        .eq('id_grupo', idGrupo)
        .eq('id_organizacion', orgId);

      if (error) {
        console.error('❌ Error al actualizar evaluación:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Evaluación actualizada para grupo ${idGrupo}`);
    } else {
      // Crear
      const { error } = await supabase
        .from('evaluacion_inicial')
        .insert({
          id_grupo: idGrupo,
          id_organizacion: orgId,
          ...datos
        });

      if (error) {
        console.error('❌ Error al crear evaluación:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Evaluación creada para grupo ${idGrupo}`);
    }

    revalidatePath('/pacientes');
    revalidatePath('/pacientes/HistorialClinico');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}