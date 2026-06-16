"use server";

import { createClient } from "@/lib/supabase/server";
import { nowIso } from "@/lib/dayjs";
import { revalidatePath } from "next/cache";
import { evaluacionInicialSchema } from "@/lib/schemas/evaluacion-inicial.schema";

export async function obtenerEvaluacionInicial(idGrupo: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('evaluacion_inicial')
      .select('*')
      .eq('id_grupo', idGrupo)
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

  // Validación contra schema (textos con cota máx, TA con formato, booleans).
  const parsed = evaluacionInicialSchema.safeParse(datos);
  if (!parsed.success) {
    const mensaje = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: `Datos de la evaluación inválidos: ${mensaje}` };
  }
  const datosLimpios = parsed.data;

  try {
    // Verificar si ya existe una evaluación
    const { data: existente } = await supabase
      .from('evaluacion_inicial')
      .select('id_evaluacion')
      .eq('id_grupo', idGrupo)
      .maybeSingle();

    if (existente) {
      // Actualizar
      const { error } = await supabase
        .from('evaluacion_inicial')
        .update({
          ...datosLimpios,
          updated_at: nowIso()
        })
        .eq('id_grupo', idGrupo);

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
          ...datosLimpios
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