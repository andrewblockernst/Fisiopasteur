"use server";

import { createClient } from "@/lib/supabase/server";
import { nowIso } from "@/lib/dayjs";
import { revalidatePath } from "next/cache";
import { evaluacionInicialSchema } from "@/lib/schemas/evaluacion-inicial.schema";

// Los turnos sin grupo de tratamiento llegan con un ID sintético "individual-<id_turno>"
// generado por obtenerHistorialClinicoPorPaciente. No es un UUID válido para la DB.
const ID_INDIVIDUAL_REGEX = /^individual-(\d+)$/;

function parseIdIndividual(idGrupo: string): number | null {
  const match = idGrupo.match(ID_INDIVIDUAL_REGEX);
  return match ? parseInt(match[1], 10) : null;
}

export async function obtenerEvaluacionInicial(idGrupo: string) {
  const supabase = await createClient();

  // Un ID sintético nunca tiene evaluación guardada (la DB solo referencia grupos reales)
  if (parseIdIndividual(idGrupo) !== null) {
    return { success: true, data: null };
  }

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
    // Si el ID es sintético ("individual-<id_turno>"), el turno no pertenece a ningún
    // grupo de tratamiento y la evaluación no puede referenciarlo. Se crea un grupo
    // real con los datos del turno y se lo asigna antes de guardar.
    const idTurno = parseIdIndividual(idGrupo);
    if (idTurno !== null) {
      const resultado = await crearGrupoParaTurnoIndividual(supabase, idTurno);
      if (!resultado.success) {
        return { success: false, error: resultado.error };
      }
      idGrupo = resultado.idGrupo;
    }

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

async function crearGrupoParaTurnoIndividual(
  supabase: Awaited<ReturnType<typeof createClient>>,
  idTurno: number
): Promise<{ success: true; idGrupo: string } | { success: false; error: string }> {
  const { data: turno, error: errorTurno } = await supabase
    .from('turno')
    .select('id_turno, id_grupo_tratamiento, id_especialista, id_especialidad, id_paciente, fecha, tipo_plan, especialidad:id_especialidad(nombre)')
    .eq('id_turno', idTurno)
    .single();

  if (errorTurno || !turno) {
    console.error('❌ Error al obtener turno para crear grupo:', errorTurno);
    return { success: false, error: 'No se encontró el turno asociado' };
  }

  // Puede haberse asignado un grupo entre que se cargó el historial y el guardado
  if (turno.id_grupo_tratamiento) {
    return { success: true, idGrupo: turno.id_grupo_tratamiento };
  }

  if (!turno.id_especialista || !turno.id_paciente) {
    return { success: false, error: 'El turno no tiene especialista o paciente asignado' };
  }

  const { data: grupo, error: errorGrupo } = await supabase
    .from('grupo_tratamiento')
    .insert({
      nombre: turno.especialidad?.nombre || 'Tratamiento individual',
      id_especialista: turno.id_especialista,
      id_especialidad: turno.id_especialidad,
      id_paciente: turno.id_paciente,
      fecha_inicio: turno.fecha,
      tipo_plan: turno.tipo_plan || 'particular',
      cantidad_turnos_planificados: 1
    })
    .select('id_grupo')
    .single();

  if (errorGrupo || !grupo) {
    console.error('❌ Error al crear grupo de tratamiento:', errorGrupo);
    return { success: false, error: 'No se pudo crear el grupo de tratamiento' };
  }

  const { error: errorUpdate } = await supabase
    .from('turno')
    .update({ id_grupo_tratamiento: grupo.id_grupo })
    .eq('id_turno', idTurno);

  if (errorUpdate) {
    console.error('❌ Error al asignar grupo al turno:', errorUpdate);
    return { success: false, error: 'No se pudo asignar el grupo al turno' };
  }

  console.log(`✅ Grupo ${grupo.id_grupo} creado para turno individual ${idTurno}`);
  return { success: true, idGrupo: grupo.id_grupo };
}