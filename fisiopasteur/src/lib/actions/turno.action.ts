// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { Database } from "@/types/database.types";
import { ROLES_ESPECIALISTAS } from "@/lib/constants/roles";
import { obtenerIdPilates } from "@/lib/utils/especialidad-utils";
import { snapshotDesdeTurnoRelacionado } from "@/lib/utils/whatsapp.utils";
import { nowIso, todayYmd } from "@/lib/dayjs";

type Turno = Database["public"]["Tables"]["turno"]["Row"];
type TurnoInsert = Database["public"]["Tables"]["turno"]["Insert"];
type TurnoUpdate = Database["public"]["Tables"]["turno"]["Update"];


export async function obtenerTurno(id: number): Promise<
  | { success: true; data: any }
  | { success: false; error: string }
> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista(id_usuario, nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(id_box, numero),
        grupo_tratamiento:id_grupo_tratamiento(id_grupo, cantidad_turnos_planificados)
      `)
      .eq("id_turno", id)
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
      .single();

    if (error) {
      console.error("Error al obtener turno:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Obtener todos los turnos (con filtros básicos)
export async function obtenerTurnos(filtros?: {
  fecha?: string;
  especialista_id?: string;
  paciente_id?: number;
  estado?: string;
}) {
  const supabase = await createClient();

  try {
    let query = supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista(id_usuario, nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(id_box, numero),
        grupo_tratamiento:id_grupo_tratamiento(id_grupo, cantidad_turnos_planificados)
      `)
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    // Aplicar filtros si existen
    if (filtros?.fecha) {
      query = query.eq("fecha", filtros.fecha);
    }
    if (typeof filtros?.especialista_id === "string" && filtros.especialista_id !== undefined) {
      query = query.eq("id_especialista", filtros.especialista_id);
    }
    if (typeof filtros?.paciente_id === "number") {
      query = query.eq("id_paciente", filtros.paciente_id);
    }
    if (typeof filtros?.estado === "string") {
      query = query.eq("estado", filtros.estado);
    }

    const idPilates = await obtenerIdPilates();

    if (idPilates) {
      query = query.neq("id_especialidad", idPilates);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener turnos:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Obtener turnos minimos para validacion de disponibilidad de boxes
export async function obtenerTurnosParaValidarBoxes(fecha: string) {
  const supabase = await createClient();

  try {
    let query = supabase
      .from("turno")
      .select("id_turno, hora, estado, id_box")
      .eq("fecha", fecha)
      .neq("estado", "eliminado")
      .neq("estado", "cancelado")
      .order("hora", { ascending: true });

    const idPilates = await obtenerIdPilates();

    if (idPilates) {
      query = query.neq("id_especialidad", idPilates);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener turnos para validar boxes:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Obtener turnos con filtros avanzados (para la página principal)
export async function obtenerTurnosConFiltros(filtros?: {
  fecha_desde?: string;
  fecha_hasta?: string;
  especialista_ids?: string[];
  especialidad_ids?: string[];
  hora_desde?: string;
  hora_hasta?: string;
  estados?: string[];
  paciente_id?: number;
  es_pilates?: boolean;
}) {
  const supabase = await createClient();

  try {
    let query = supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista!inner(
          id_usuario, 
          nombre, 
          apellido, 
          color,
          especialidad:id_especialidad(id_especialidad, nombre)
        ),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(id_box, numero),
        grupo_tratamiento:id_grupo_tratamiento(id_grupo, cantidad_turnos_planificados)
      `)
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    // Aplicar filtros de rango de fechas
    if (filtros?.fecha_desde) {
      query = query.gte("fecha", filtros.fecha_desde);
    }
    if (filtros?.fecha_hasta) {
      query = query.lte("fecha", filtros.fecha_hasta);
    }

    // Filtro por especialistas (múltiples valores)
    if (filtros?.especialista_ids && filtros.especialista_ids.length > 0) {
      query = query.in("id_especialista", filtros.especialista_ids);
    }

    const idPilates = await obtenerIdPilates();

    // Filtro por especialidades (múltiples valores)
    if (filtros?.especialidad_ids && filtros.especialidad_ids.length > 0) {
      query = query.in("id_especialidad", filtros.especialidad_ids);
    } else if (!filtros?.es_pilates && idPilates) {
      query = query.neq("id_especialidad", idPilates);
    } else if (filtros?.es_pilates === true && idPilates) {
      query = query.eq("id_especialidad", idPilates);
    }

    // Filtros de horario
    if (filtros?.hora_desde) {
      query = query.gte("hora", filtros.hora_desde);
    }
    if (filtros?.hora_hasta) {
      query = query.lte("hora", filtros.hora_hasta);
    }

    // Filtro por estados (múltiples valores)
    if (filtros?.estados && filtros.estados.length > 0) {
      query = query.in("estado", filtros.estados);
    }

    // Filtro por pacientes (múltiples IDs)
    if (filtros?.paciente_id) {
      query = query.eq("id_paciente", filtros.paciente_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener turnos con filtros:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// ✏️ CRUD DE TURNOS
// =====================================

// Crear un nuevo turno
export async function crearTurno(
  datos: TurnoInsert & { titulo_tratamiento?: string | null; es_pilates?: boolean },
  recordatorios?: ('1h' | '2h' | '3h' | '1d' | '2d')[],
  enviarNotificacion: boolean = true,
  id_grupo_tratamiento?: string,
  opciones?: { enviarConfirmacion?: boolean },
) {

  // console.log('Iniciando creación de turno con datos:', datos, 'y recordatorios:', recordatorios);

  try {
    const supabase = await createClient();
    let idPilates; // : string | null = null

    if (datos.es_pilates) {
      idPilates = await obtenerIdPilates();
    }

    // ============= CREAR GRUPO DE TRATAMIENTO SI HAY TÍTULO =============
    if (datos.titulo_tratamiento && !id_grupo_tratamiento && datos.id_paciente && datos.id_especialista) {
      const nuevoGrupo: Database["public"]["Tables"]["grupo_tratamiento"]["Insert"] = {
        id_paciente: datos.id_paciente,
        id_especialista: datos.id_especialista,
        id_especialidad: idPilates ?? datos.id_especialidad ?? undefined,
        nombre: datos.titulo_tratamiento,
        fecha_inicio: datos.fecha,
        tipo_plan: datos.tipo_plan ?? 'particular',
        cantidad_turnos_planificados: 1,
      };

      const { data: grupo, error: errorGrupo } = await supabase
        .from('grupo_tratamiento')
        .insert(nuevoGrupo as any)
        .select('id_grupo')
        .single();

      if (errorGrupo) {
        console.error('Error creando grupo de tratamiento:', errorGrupo);
      } else if (grupo) {
        id_grupo_tratamiento = (grupo as any).id_grupo;
      }
    }

    // ============= VERIFICAR DISPONIBILIDAD CON LÓGICA ESPECIAL PARA PILATES =============
    // ✅ Usar idPilates como especialidad cuando es_pilates=true, independientemente de lo que envíe el frontend
    const especialidadIdEfectiva = (idPilates && datos.es_pilates) ? idPilates : (datos.id_especialidad ?? undefined);

    if (datos.fecha && datos.hora && datos.id_especialista) {
      const disponibilidad = await verificarDisponibilidad(
        datos.fecha,
        datos.hora,
        datos.id_especialista,
        datos.id_box || undefined,
        especialidadIdEfectiva
      );

      if (!disponibilidad.success || !disponibilidad.disponible) {


        if (datos.es_pilates && idPilates) {
          return {
            success: false,
            error: `Clase de Pilates completa. Participantes: ${disponibilidad.participantes_actuales || disponibilidad.conflictos}/4`
          };
        } else {
          return {
            success: false,
            error: `Horario no disponible. Conflictos: ${disponibilidad.conflictos || 0}`
          };
        }
      }
    }    // Extraer campos que NO pertenecen a la tabla turno antes de insertar
    const { es_pilates: _esPilates, titulo_tratamiento: _tituloTratamiento, ...datosTurno } = datos;
    const turnoConOrg: TurnoInsert = {
      ...datosTurno,
      // Si es Pilates y el frontend no envió id_especialidad, usar el ID resuelto dinámicamente
      ...(especialidadIdEfectiva && { id_especialidad: especialidadIdEfectiva }),
      ...(id_grupo_tratamiento && { id_grupo_tratamiento }),
    };

    // console.log("Creando turno con datos:", turnoConOrg);

    // ✅ AHORA datos es TurnoInsert puro, sin recordatorios
    const { data, error } = await supabase
      .from("turno")
      .insert(turnoConOrg as any)
      .select(`
        *,
        paciente:id_paciente(nombre, apellido, telefono, dni),
        especialista:id_especialista(nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(numero),
        grupo_tratamiento:id_grupo_tratamiento(id_grupo, cantidad_turnos_planificados)
      `)
      .single();

    if (error) {
      console.error("Error al crear turno:", error);
      return { success: false, error: error.message };
    }

    const turnoCreado = data as any;

    // ===== 🤖 INTEGRACIÓN CON BOT DE WHATSAPP =====
    if (enviarNotificacion) {
      // ⚡ Ejecutar notificaciones en segundo plano (no blocking)
      // Esto evita que un error o timeout en WhatsApp bloquee la creación del turno
      Promise.resolve().then(async () => {
        try {
          const { registrarNotificacionConfirmacion, marcarNotificacionEnviada, marcarNotificacionFallida, registrarNotificacionesRecordatorioFlexible } = await import("@/lib/services/notificacion.service");
          const { enviarConfirmacionTurno } = await import("@/lib/services/whatsapp-bot.service");

          if (turnoCreado.paciente?.telefono) {
            const debeConfirmar = opciones?.enviarConfirmacion !== false;

            if (debeConfirmar) {
              const mensajeConfirmacion = `Turno confirmado para ${turnoCreado.fecha} a las ${turnoCreado.hora}`;

              // 1. Registrar confirmación en DB para auditoría
              const resultadoRegistro = await registrarNotificacionConfirmacion(
                turnoCreado.id_turno,
                turnoCreado.paciente.telefono,
                mensajeConfirmacion
              );

              // 2. Enviar confirmación INMEDIATAMENTE al bot (trigger único, sin reintento por cron)
              try {
                const resultadoBot = await Promise.race([
                  enviarConfirmacionTurno(turnoCreado as any),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout enviando confirmación')), 10000)
                  )
                ]);

                if (resultadoRegistro.success && resultadoRegistro.data) {
                  if (resultadoBot.status === 'success') {
                    await marcarNotificacionEnviada(resultadoRegistro.data.id_notificacion);
                  } else {
                    await marcarNotificacionFallida(resultadoRegistro.data.id_notificacion);
                  }
                }
              } catch (e) {
                console.warn('Confirmación directa falló:', e);
                if (resultadoRegistro.success && resultadoRegistro.data) {
                  await marcarNotificacionFallida(resultadoRegistro.data.id_notificacion);
                }
              }
            }

            // 4. Programar recordatorios en DB (el scheduler los enviará a su tiempo)
            const { calcularTiemposRecordatorio } = await import("@/lib/utils/whatsapp.utils");

            const tiposRecordatorio = recordatorios || ['1d', '2h'];
            const tiemposRecordatorio = calcularTiemposRecordatorio(turnoCreado.fecha, turnoCreado.hora, tiposRecordatorio);

            const recordatoriosValidos = Object.entries(tiemposRecordatorio)
              .filter(([_, fecha]) => fecha !== null)
              .reduce((acc, [tipo, fecha]) => {
                if (fecha) acc[tipo] = fecha;
                return acc;
              }, {} as Record<string, Date>);

            if (Object.keys(recordatoriosValidos).length > 0) {
              const mensajeRecordatorio = `Recordatorio: Tu turno es el ${turnoCreado.fecha} a las ${turnoCreado.hora}`;
              await registrarNotificacionesRecordatorioFlexible(
                turnoCreado.id_turno,
                turnoCreado.paciente.telefono,
                mensajeRecordatorio,
                recordatoriosValidos
              );
            }
          }
        } catch (botError) {
          // Log del error pero no afecta el resultado de la creación
          console.error("Error en notificaciones WhatsApp (turno ya creado):", botError);
        }
      }).catch(err => {
        // Catch para evitar unhandled promise rejection
        console.error("Error crítico en proceso de notificaciones:", err);
      });
    }

    return { success: true, data: turnoCreado };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}


export async function actualizarTurno(id: number, datos: TurnoUpdate, opciones?: { notificar?: boolean }) {
  const supabase = await createClient();

  

      const normalizeHora = (h: string | null | undefined) =>
    h != null && h !== "" ? String(h).substring(0, 5) : "";

  try {
    const { data: prevTurno, error: errPrev } = await supabase
      .from("turno")
      .select(
        `
        id_turno,
        fecha,
        hora,
        id_especialista,
        id_box,
        id_especialidad,
        estado,
        paciente:id_paciente(nombre, apellido, telefono),
        especialista:id_especialista(nombre, apellido),
        especialidad:id_especialidad(nombre),
        box:id_box(numero)
      `,
      )
      .eq("id_turno", id)
      .single();

    if (errPrev || !prevTurno) {
      return {
        success: false,
        error: "Turno no encontrado o no pertenece a esta organización",
      };
    }

    // Si se cambia fecha/hora/especialista/box, verificar disponibilidad
    if (
      datos.fecha !== undefined ||
      datos.hora !== undefined ||
      datos.id_especialista !== undefined ||
      datos.id_box !== undefined
    ) {
      const nuevaFecha = datos.fecha ?? prevTurno.fecha;
      const nuevaHora = datos.hora ?? prevTurno.hora;
      const nuevoEspecialista =
        datos.id_especialista ?? prevTurno.id_especialista;
      const nuevoBox =
        datos.id_box !== undefined ? datos.id_box : prevTurno.id_box;
      const especialidadId = prevTurno.id_especialidad;

      const cambioRelevante =
        (datos.fecha !== undefined && datos.fecha !== prevTurno.fecha) ||
        (datos.hora !== undefined &&
          normalizeHora(datos.hora as string) !==
            normalizeHora(prevTurno.hora)) ||
        (datos.id_especialista !== undefined &&
          datos.id_especialista !== prevTurno.id_especialista) ||
        (datos.id_box !== undefined && datos.id_box !== prevTurno.id_box);

      if (cambioRelevante && nuevoEspecialista && nuevaFecha && nuevaHora) {
        const disponibilidad = await verificarDisponibilidadParaActualizacion(
          nuevaFecha,
          String(nuevaHora),
          nuevoEspecialista,
          nuevoBox,
          id,
          especialidadId ?? undefined,
        );

        if (!disponibilidad.success || !disponibilidad.disponible) {
          const idPilates = await obtenerIdPilates();

          if (idPilates && especialidadId === idPilates) {
            return {
              success: false,
              error: `Clase de Pilates completa. Participantes: ${disponibilidad.participantes_actuales || disponibilidad.conflictos}/4`,
            };
          }
          return {
            success: false,
            error: `Horario no disponible. Conflictos: ${disponibilidad.conflictos || 0}`,
          };
        }
      }
    }

    const datosUpdate: any = {
      ...datos,
      updated_at: nowIso()
    };

    // @ts-expect-error - Supabase typing issue after merge
    const { data, error } = await supabase
      .from("turno")
      .update(datosUpdate)
      .eq("id_turno", id)
      .select(`
        *,
        paciente:id_paciente(nombre, apellido, telefono, dni),
        especialista:id_especialista(nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(numero)
      `)
      .single();

    if (error) {
      console.error("Error al actualizar turno:", error);
      return { success: false, error: error.message };
    }

    const cambioVisiblePaciente =
      prevTurno.fecha !== data.fecha ||
      normalizeHora(prevTurno.hora) !== normalizeHora(data.hora) ||
      prevTurno.id_especialista !== data.id_especialista ||
      prevTurno.id_box !== data.id_box ||
      prevTurno.id_especialidad !== data.id_especialidad;

    if (
      cambioVisiblePaciente &&
      data.paciente?.telefono &&
      data.estado !== "eliminado"
    ) {
      const telefonoAviso = String(data.paciente.telefono).trim();

      // 1. Reprogramar recordatorios: cancelar los viejos y crear nuevos con la fecha/hora actualizada
      after(async () => {
        try {
          const { data: notifAntiguas } = await supabase
            .from("notificacion")
            .select("id_notificacion, mensaje")
            .eq("id_turno", id)
            .eq("estado", "pendiente")
            .like("mensaje", "%[RECORDATORIO%");

          const tiposAntiguos: string[] = [];
          if (notifAntiguas?.length) {
            for (const n of notifAntiguas) {
              const match = (n.mensaje as string | null)?.match(/\[RECORDATORIO (\w+)\]/i);
              if (match) {
                const tipo = match[1].toLowerCase();
                if (["1h", "2h", "3h", "1d", "2d"].includes(tipo)) {
                  tiposAntiguos.push(tipo);
                }
              }
            }
            await supabase
              .from("notificacion")
              .delete()
              .in("id_notificacion", notifAntiguas.map((n: any) => n.id_notificacion));
            console.log(
              `[Recordatorios] Eliminados ${notifAntiguas.length} recordatorios viejos para turno ${id}`,
            );
          }

          if (tiposAntiguos.length > 0) {
            const { calcularTiemposRecordatorio } = await import("@/lib/utils/whatsapp.utils");
            const { registrarNotificacionesRecordatorioFlexible } = await import(
              "@/lib/services/notificacion.service"
            );
            const tiempos = calcularTiemposRecordatorio(
              data.fecha,
              String(data.hora),
              tiposAntiguos as any,
            );
            const validos = Object.fromEntries(
              Object.entries(tiempos).filter(([, v]) => v !== null),
            ) as Record<string, Date>;

            if (Object.keys(validos).length > 0) {
              const msg = `Recordatorio: Tu turno es el ${data.fecha} a las ${String(data.hora).substring(0, 5)}`;
              await registrarNotificacionesRecordatorioFlexible(id, telefonoAviso, msg, validos);
              console.log(
                `[Recordatorios] Reprogramados ${Object.keys(validos).length} recordatorios para turno ${id}`,
              );
            }
          }
        } catch (err) {
          console.error("[Recordatorios] Error reprogramando recordatorios:", err);
        }
      });

      // 2. Enviar aviso WhatsApp al paciente (solo si se solicitó)
      if (opciones?.notificar !== false) {
        const snapshotAnterior = snapshotDesdeTurnoRelacionado(prevTurno as any);
        const snapshotActual = snapshotDesdeTurnoRelacionado(data as any);
        const nombrePacienteAviso =
          `${data.paciente?.nombre ?? ""} ${data.paciente?.apellido ?? ""}`.trim() ||
          "Paciente";

        // En Vercel/serverless, `after` ejecuta el trabajo después de enviar la respuesta al cliente.
        after(async () => {
          try {
            const { enviarAvisoModificacionTurno } = await import(
              "@/lib/services/whatsapp-bot.service"
            );
            console.log(
              `[WhatsApp] Enviando aviso cambio turno id=${id} → ${telefonoAviso}`,
            );
            const resultado = await enviarAvisoModificacionTurno({
              telefono: telefonoAviso,
              nombrePaciente: nombrePacienteAviso,
              anterior: snapshotAnterior,
              actual: snapshotActual,
            });
            if (resultado.status !== "success") {
              console.error(
                "[WhatsApp] Aviso cambio turno falló:",
                resultado.message,
              );
            }
          } catch (notifyErr) {
            console.error(
              "Error enviando aviso WhatsApp por cambio de turno:",
              notifyErr,
            );
          }
        });
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// Eliminar un turno (soft delete - cambia estado a "eliminado")
export async function eliminarTurno(id: number) {
  const supabase = await createClient();

  try {    // Verificar que el turno pertenece a esta organización antes de eliminar
    const { data: turnoVerificado, error: errorVerificar } = await supabase
      .from("turno")
      .select("id_turno, estado")
      .eq("id_turno", id)
      .single();

    if (errorVerificar || !turnoVerificado) {
      return { success: false, error: "Turno no encontrado o no pertenece a esta organización" };
    }

    // ✅ SOFT DELETE: Cambiar estado a "eliminado" en lugar de borrar
    const { error: turnoError } = await supabase
      .from("turno")
      .update({
        estado: "eliminado",
        updated_at: nowIso()
      })
      .eq("id_turno", id)

    if (turnoError) {
      console.error("Error al eliminar turno:", turnoError);
      return { success: false, error: turnoError.message };
    }

    console.log(`✅ Turno ${id} marcado como eliminado (soft delete)`);

    return { success: true };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function marcarComoAtendido(id_turno: number) {
  const supabase = await createClient();

  try {
    // Verificar estado actual del turno
    const { data: turnoActual, error: errorGet } = await supabase
      .from('turno')
      .select('id_turno, estado')
      .eq('id_turno', id_turno)
      .single();

    if (errorGet || !turnoActual) {
      return {
        success: false,
        error: 'Turno no encontrado o no pertenece a esta organización'
      };
    }

    // ✅ Permitir marcar como atendido desde programado o pendiente
    const estadosPermitidos = ['programado', 'pendiente'];
    if (!turnoActual.estado || !estadosPermitidos.includes(turnoActual.estado)) {
      return {
        success: false,
        error: `No se puede marcar como atendido un turno en estado: ${turnoActual.estado || 'desconocido'}`
      };
    }

    // Actualizar a atendido
    const { error } = await supabase
      .from('turno')
      .update({
        estado: 'atendido',
        updated_at: nowIso()
      })
      .eq('id_turno', id_turno)

    if (error) {
      console.error('❌ Error al marcar turno como atendido:', error);
      return {
        success: false,
        error: error.message || 'Error al actualizar el turno'
      };
    }

    console.log(`✅ Turno ${id_turno} marcado como atendido (desde estado: ${turnoActual.estado})`);

    return { success: true };
  } catch (error) {
    console.error('❌ Error inesperado al marcar como atendido:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * ✅ Cancelar turno
 * Permite cambiar desde: programado o pendiente
 */
export async function cancelarTurno(id: number, motivo?: string) {
  const supabase = await createClient();

  try {
    // Verificar estado actual del turno
    const { data: turnoActual, error: errorGet } = await supabase
      .from('turno')
      .select('id_turno, estado')
      .eq('id_turno', id)
      .single();

    if (errorGet || !turnoActual) {
      return {
        success: false,
        error: 'Turno no encontrado o no pertenece a esta organización'
      };
    }

    // ✅ Permitir cancelar desde programado o pendiente
    const estadosPermitidos = ['programado', 'pendiente'];
    if (!turnoActual.estado || !estadosPermitidos.includes(turnoActual.estado)) {
      return {
        success: false,
        error: `No se puede cancelar un turno en estado: ${turnoActual.estado || 'desconocido'}`
      };
    }

    // Actualizar a cancelado
    const { data, error } = await supabase
      .from("turno")
      .update({
        estado: "cancelado",
        updated_at: nowIso(),
      })
      .eq("id_turno", id)
      .select("*")
      .single();

    if (error) {
      console.error('❌ Error al cancelar turno:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Turno ${id} cancelado (desde estado: ${turnoActual.estado})`);

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error inesperado al cancelar turno:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// =====================================
// 📅 FUNCIONES DE AGENDA
// =====================================

// Obtener turnos por especialista y fecha (para vista de agenda)
export async function obtenerAgendaEspecialista(
  especialista_id: string,
  fecha: string
) {
  const supabase = await createClient();

  try {
    const idPilates = await obtenerIdPilates();

    const { data, error } = await supabase
      .from("turno")
      // Campos minimos requeridos por los consumidores actuales del frontend
      .select("id_turno, hora, estado")
      .eq("id_especialista", especialista_id!)
      .eq("fecha", fecha)
      .neq("estado", "cancelado")
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
      .neq("id_especialidad", idPilates) // ✅ Excluir Pilates de la agenda normal
      .order("hora", { ascending: true });

    // let resultadoData = data;
    // if (idPilates && Array.isArray(data)) {
    //   resultadoData = data.filter((turno: any) => turno.id_especialidad !== idPilates);
    // }

    if (error) {
      console.error("Error al obtener agenda:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Obtiene slots de tiempo ocupados (en intervalos de 15 min) para un especialista en una fecha.
 * Calcula esto en el servidor para evitar lógica de cálculo innecesaria en cliente.
 * @param especialista_id ID del especialista
 * @param fecha Fecha YYYY-MM-DD
 * @param turno_id_excluir Opcional: ID de turno a excluir (útil para edición de turnos)
 */
export async function obtenerSlotsOcupados(
  especialista_id: string,
  fecha: string,
  turno_id_excluir?: number
) {
  const supabase = await createClient();

  try {
    const idPilates = await obtenerIdPilates();

    const { data, error } = await supabase
      .from("turno")
      .select("id_turno, hora")
      .eq("id_especialista", especialista_id!)
      .eq("fecha", fecha)
      .neq("estado", "cancelado")
      .neq("estado", "eliminado")
      .neq("id_especialidad", idPilates)
      .order("hora", { ascending: true });

    if (error) {
      console.error("Error al obtener slots ocupados:", error);
      return { success: false, error: error.message };
    }

    // Calcular slots de 15 minutos para cada turno (asumiendo duración de 60 min)
    const slotsOcupados = new Set<string>();

    (data || []).forEach((turno: any) => {
      // Excluir el turno específico si se indica
      if (turno_id_excluir && turno.id_turno === turno_id_excluir) {
        return;
      }

      const [horas, minutos] = turno.hora.split(":").map(Number);

      // Generar 4 slots de 15 minutos (60 minutos totales)
      for (let i = 0; i < 4; i++) {
        const slotDate = new Date();
        slotDate.setHours(horas, minutos + i * 15, 0, 0);

        const h = slotDate.getHours().toString().padStart(2, "0");
        const m = slotDate.getMinutes().toString().padStart(2, "0");

        slotsOcupados.add(`${h}:${m}`);
      }
    });

    return { success: true, data: Array.from(slotsOcupados) };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// ✅ FUNCIONES DE DISPONIBILIDAD
// =====================================

/**
 * ✅ VERIFICACIÓN ESPECIAL PARA PILATES
 * En Pilates hay una sola sala, así que si cualquier especialista tiene clase a esa hora,
 * el horario está ocupado (sin importar el especialista)
 */
export async function verificarDisponibilidadPilates(
  fecha: string,
  hora: string
) {
  const supabase = await createClient();
  try {
    const idPilates = await obtenerIdPilates();

    if (!idPilates) {
      return {
        success: true,
        disponible: true,
        conflictos: 0,
        turnosExistentes: []
      };
    }

    const { data, error } = await supabase
      .from("turno")
      .select("id_turno, id_especialista, estado, hora")
      .eq("fecha", fecha)
      .eq("hora", hora)
      .eq("id_especialidad", idPilates)
      .neq("estado", "cancelado")
      .neq("estado", "eliminado"); // ✅ Excluir turnos eliminados

    if (error) {
      console.error("Error verificando disponibilidad Pilates:", error);
      return { success: false, error: error.message };
    }

    // Si hay algún turno, el horario está ocupado
    const ocupado = data.length > 0;

    return {
      success: true,
      disponible: !ocupado,
      conflictos: data.length,
      turnosExistentes: data
    };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function verificarDisponibilidad(
  fecha: string,
  hora: string,
  especialista_id?: string,
  box_id?: number,
  especialidad_id?: number
) {
  const supabase = await createClient();

  try {
    const idPilates = await obtenerIdPilates();

    let query = supabase
      .from("turno")
      .select("id_turno, estado, hora, id_especialidad")
      .eq("fecha", fecha)
      .eq("id_especialista", especialista_id!)
      .eq("hora", hora)
      .neq("estado", "cancelado")
      .neq("estado", "eliminado"); // ✅ Excluir turnos eliminados

    if (box_id) {
      query = query.eq("id_box", box_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al verificar disponibilidad:", error);
      return { success: false, error: error.message };
    }

    // ============= LÓGICA ESPECIAL PARA PILATES =============
    if (idPilates && especialidad_id === idPilates) {
      const pilatesTurnos = data.filter(t => t.id_especialidad === idPilates);
      const disponible = pilatesTurnos.length < 4;

      return {
        success: true,
        disponible,
        conflictos: disponible ? 0 : pilatesTurnos.length,
        participantes_actuales: pilatesTurnos.length
      };
    }

    // ============= LÓGICA NORMAL PARA OTRAS ESPECIALIDADES =============
    return {
      success: true,
      disponible: data.length === 0,
      conflictos: data.length
    };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function verificarDisponibilidadPaquete(params: {
  fechaBase: string;
  horaBase: string;
  diasSeleccionados: number[];
  numeroSesiones: number;
  mantenerHorario: boolean;
  horariosPorDia: Record<number, string>;
  id_especialista: string;
  id_box?: number | null;
}) {
  const supabase = await createClient();

  try {
    const {
      fechaBase,
      horaBase,
      diasSeleccionados,
      numeroSesiones,
      mantenerHorario,
      horariosPorDia,
      id_especialista,
      id_box,
    } = params;

    if (!fechaBase || !id_especialista || diasSeleccionados.length === 0 || numeroSesiones <= 0) {
      return {
        success: true,
        data: {
          ocupados: [] as string[],
          ocupadosDetalle: [] as Array<{
            fecha: string;
            hora: string;
            diaId: number;
            texto: string;
            motivo: "especialista" | "box" | "ambos";
          }>,
          hayConflictos: false,
          conflictos: 0,
          totalEvaluados: 0,
        },
      };
    }

    const [year, month, day] = fechaBase.split("-").map(Number);
    const fechaBaseParsed = new Date(year, month - 1, day);
    const diaBaseNumeroJS = fechaBaseParsed.getDay();
    const diaBaseNumero = diaBaseNumeroJS === 0 ? 7 : diaBaseNumeroJS;

    const turnosObjetivo: Array<{ fecha: string; hora: string; diaId: number }> = [];
    let sesionesGeneradas = 0;
    let semanaActual = 0;

    while (sesionesGeneradas < numeroSesiones && semanaActual < 52) {
      for (const diaSeleccionado of diasSeleccionados) {
        if (sesionesGeneradas >= numeroSesiones) break;

        let diferenciaDias = diaSeleccionado - diaBaseNumero;
        if (diferenciaDias < 0) diferenciaDias += 7;

        const fechaTurno = new Date(fechaBaseParsed);
        fechaTurno.setDate(fechaTurno.getDate() + (semanaActual * 7) + diferenciaDias);

        const fechaFormateada = `${fechaTurno.getFullYear()}-${String(fechaTurno.getMonth() + 1).padStart(2, "0")}-${String(fechaTurno.getDate()).padStart(2, "0")}`;
        const horaTurno = mantenerHorario
          ? horaBase
          : (horariosPorDia[diaSeleccionado] || "09:00");

        if (!horaTurno) continue;

        turnosObjetivo.push({
          fecha: fechaFormateada,
          hora: horaTurno,
          diaId: diaSeleccionado,
        });
        sesionesGeneradas++;
      }

      semanaActual++;
    }

    if (turnosObjetivo.length === 0) {
      return {
        success: true,
        data: {
          ocupados: [] as string[],
          ocupadosDetalle: [] as Array<{
            fecha: string;
            hora: string;
            diaId: number;
            texto: string;
            motivo: "especialista" | "box" | "ambos";
          }>,
          hayConflictos: false,
          conflictos: 0,
          totalEvaluados: 0,
        },
      };
    }

    const toMinutes = (hora: string): number => {
      const [h, m] = hora.slice(0, 5).split(":").map(Number);
      return (h * 60) + m;
    };

    const fromMinutesToTime = (minutes: number): string => {
      const safeMinutes = Math.max(0, Math.min((23 * 60) + 59, minutes));
      const h = Math.floor(safeMinutes / 60).toString().padStart(2, "0");
      const m = (safeMinutes % 60).toString().padStart(2, "0");
      return `${h}:${m}:00`;
    };

    const fechas = turnosObjetivo.map((t) => t.fecha).sort();
    const minutosObjetivo = turnosObjetivo.map((t) => toMinutes(t.hora));
    const minMinutos = Math.min(...minutosObjetivo) - 59;
    const maxMinutos = Math.max(...minutosObjetivo) + 59;

    let query = supabase
      .from("turno")
      .select("fecha, hora, id_especialista, id_box")
      .gte("fecha", fechas[0])
      .lte("fecha", fechas[fechas.length - 1])
      .gte("hora", fromMinutesToTime(minMinutos))
      .lte("hora", fromMinutesToTime(maxMinutos))
      .neq("estado", "cancelado")
      .neq("estado", "eliminado");

    if (id_box !== null && id_box !== undefined) {
      query = query.or(`id_especialista.eq.${id_especialista},id_box.eq.${id_box}`);
    } else {
      query = query.eq("id_especialista", id_especialista);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al verificar disponibilidad por paquete:", error);
      return { success: false, error: error.message };
    }

    const turnosPorFecha = new Map<string, Array<{ inicio: number; id_especialista: string; id_box: number | null }>>();

    for (const turno of (data || [])) {
      const inicio = toMinutes(String(turno.hora));
      const fechaTurno = turno.fecha as string;
      const lista = turnosPorFecha.get(fechaTurno) || [];

      lista.push({
        inicio,
        id_especialista: turno.id_especialista,
        id_box: turno.id_box ?? null,
      });

      turnosPorFecha.set(fechaTurno, lista);
    }

    const diasCorto = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const ocupadosDetalle = turnosObjetivo
      .map((turnoObjetivo) => {
        const inicioObjetivo = toMinutes(turnoObjetivo.hora);
        const finObjetivo = inicioObjetivo + 60;
        const existentes = turnosPorFecha.get(turnoObjetivo.fecha) || [];

        let conflictoEspecialista = false;
        let conflictoBox = false;

        for (const existente of existentes) {
          const coincideEspecialista = existente.id_especialista === id_especialista;
          const coincideBox = id_box !== null && id_box !== undefined && existente.id_box === id_box;

          if (!coincideEspecialista && !coincideBox) {
            continue;
          }

          const inicioExistente = existente.inicio;
          const finExistente = inicioExistente + 60;

          const haySolapamiento = inicioExistente < finObjetivo && finExistente > inicioObjetivo;
          if (!haySolapamiento) {
            continue;
          }

          if (coincideEspecialista) conflictoEspecialista = true;
          if (coincideBox) conflictoBox = true;
        }

        if (!conflictoEspecialista && !conflictoBox) {
          return null;
        }

        const [_, mm, dd] = turnoObjetivo.fecha.split("-");
        const diaNombre = diasCorto[turnoObjetivo.diaId - 1] || "Día";
        const texto = `${diaNombre} ${dd}/${mm} a las ${turnoObjetivo.hora}`;
        const motivo = conflictoEspecialista && conflictoBox
          ? "ambos"
          : conflictoEspecialista
            ? "especialista"
            : "box";

        return {
          fecha: turnoObjetivo.fecha,
          hora: turnoObjetivo.hora,
          diaId: turnoObjetivo.diaId,
          texto,
          motivo,
        };
      });

    const conflictosFiltrados = ocupadosDetalle.filter((c): c is NonNullable<typeof c> => c !== null);
    const ocupados = conflictosFiltrados.map((c) => c.texto);

    console.log("verificarDisponibilidadPaquete - ocupados:" + ocupados +" / cantidad de conflictos:", ocupados.length);

    return {
      success: true,
      data: {
        ocupados,
        ocupadosDetalle: conflictosFiltrados,
        hayConflictos: ocupados.length > 0,
        conflictos: ocupados.length,
        totalEvaluados: turnosObjetivo.length,
      },
    };
  } catch (error) {
    console.error("Error inesperado en verificacion batch de paquete:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function verificarDisponibilidadParaActualizacion(
  fecha: string,
  hora: string,
  especialista_id: string,
  box_id: number | null | undefined,
  turno_excluir: number,
  especialidad_id?: number
) {
  const supabase = await createClient();

  try {
    const idPilates = await obtenerIdPilates();

    let query = supabase
      .from("turno")
      .select("id_turno, id_especialidad")
      .eq("fecha", fecha)
      .eq("id_especialista", especialista_id)
      .neq("estado", "cancelado")
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
      .neq("id_turno", turno_excluir)
      .eq("hora", hora);

    if (box_id !== null && box_id !== undefined) {
      query = query.eq("id_box", box_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al verificar disponibilidad para actualización:", error);
      return { success: false, error: error.message };
    }

    // ============= LÓGICA ESPECIAL PARA PILATES =============
    if (idPilates && especialidad_id === idPilates) {
      const pilatesTurnos = data.filter(t => t.id_especialidad === idPilates);
      const disponible = pilatesTurnos.length < 4;

      return {
        success: true,
        disponible,
        conflictos: disponible ? 0 : pilatesTurnos.length,
        participantes_actuales: pilatesTurnos.length
      };
    }

    // ============= LÓGICA NORMAL =============
    return {
      success: true,
      disponible: data.length === 0,
      conflictos: data.length
    };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}


export async function obtenerEspecialistas() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("usuario")
      .select(`
        id_usuario,
        nombre,
        apellido,
        email,
        telefono,
        color,
        activo,
        id_rol,
        rol:id_rol (
          id,
          nombre,
          jerarquia
        ),
        usuario_especialidad (
          id_usuario_especialidad,
          activo,
          especialidad:id_especialidad (
            id_especialidad,
            nombre
          )
        )
      `)
      .in("id_rol", ROLES_ESPECIALISTAS)
      .eq("activo", true)
      .eq("usuario_especialidad.activo", true)
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) throw error;

    const especialistas = data.map((item) => ({
      id_usuario: item.id_usuario,
      nombre: item.nombre,
      apellido: item.apellido,
      color: item.color,
      email: item.email,
      telefono: item.telefono,
      activo: item.activo,
      especialidad: null,
      usuario_especialidad: (item.usuario_especialidad || []).map((ue: any) => ({
        especialidad: {
          id_especialidad: ue.especialidad?.id_especialidad,
          nombre: ue.especialidad?.nombre
        }
      }))
    }));

    return { success: true, data: especialistas };

  } catch (error: any) {
    console.error("❌ Error en obtenerEspecialistas:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene especialistas optimizado para modales de turno
 * Devuelve solo los datos necesarios: id_usuario, nombre, apellido, color, especialidades
 * Sin datos innecesarios como email, teléfono, rol completo, etc.
 */
export async function obtenerEspecialistasParaTurnos() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("usuario")
      .select(`
        id_usuario,
        nombre,
        apellido,
        color,
        usuario_especialidad (
          especialidad:id_especialidad (
            id_especialidad,
            nombre
          )
        )
      `)
      .in("id_rol", ROLES_ESPECIALISTAS)
      .eq("activo", true)
      .eq("usuario_especialidad.activo", true)
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) throw error;

    const especialistas = data.map((item) => ({
      id_usuario: item.id_usuario,
      nombre: item.nombre,
      apellido: item.apellido,
      color: item.color,
      especialidad: null,
      usuario_especialidad: (item.usuario_especialidad || []).map((ue: any) => ({
        especialidad: {
          id_especialidad: ue.especialidad?.id_especialidad,
          nombre: ue.especialidad?.nombre
        }
      }))
    }));

    return { success: true, data: especialistas };

  } catch (error: any) {
    console.error("❌ Error en obtenerEspecialistasParaTurnos:", error.message);
    return { success: false, error: error.message };
  }
}

export async function obtenerEspecialidades() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("especialidad")
      .select("*")
      .order("nombre", { ascending: true })
      .neq("nombre", "Pilates"); // ✅ Excluir Pilates del listado general de especialidades

    if (error) {
      console.error("Error al obtener especialidades:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function obtenerBoxes() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("box")
      .select("*")
      .eq("estado", "activo")
      .order("numero");

    if (error) {
      console.error("Error al obtener boxes:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

export async function obtenerPrecioEspecialidad(
  especialista_id: string,
  especialidad_id: number,
  tipo_plan: 'particular' | 'obra_social'
) {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('usuario_especialidad')
      .select('precio_particular, precio_obra_social, activo')
      .eq('id_usuario', especialista_id)
      .eq('id_especialidad', especialidad_id)
      .maybeSingle();

    if (error) {
      const msg = error.message?.toLowerCase() || '';
      const faltanColumnas = msg.includes('column') && (msg.includes('precio_particular') || msg.includes('precio_obra_social'));
      if (faltanColumnas) {
        return {
          success: false,
          error: 'Faltan columnas precio_particular/precio_obra_social en usuario_especialidad.'
        } as const;
      }
      return { success: false, error: error.message } as const;
    }

    if (!data) return { success: true, precio: null } as const;
    const precio = tipo_plan === 'particular' ? data.precio_particular : data.precio_obra_social;
    return { success: true, precio: precio ?? null } as const;
  } catch (e) {
    return { success: false, error: 'Error inesperado al obtener precio' } as const;
  }
}

export async function obtenerPacientes(busqueda?: string, limit?: number) {
  const supabase = await createClient();

  try {
    // 1. Obtener contexto (Necesario para pasar el orgId a la función)
    let data;
    let error;

    // ⚡ ESTRATEGIA HÍBRIDA

    // CASO A: Hay búsqueda -> Usamos la función inteligente (RPC)
    if (busqueda && busqueda.length >= 2) {
      const result = await supabase.rpc('buscar_pacientes_smart', {
        search_term: busqueda,
        max_rows: limit
      });

      console.log("Resultado RPC buscar_pacientes_smart:", result);

      data = result.data;
      error = result.error;
    }


    // CASO B: No hay búsqueda -> Traemos listado normal (Simple Select)
    else {
      const query = supabase
        .from("paciente")
        .select("id_paciente, nombre, apellido, dni, telefono, email")
        .order("apellido")
        .order("nombre")

      if (limit) {
        query.limit(limit);
      }

      const result = await query;

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error al obtener pacientes:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// 📈 FUNCIONES DE ESTADÍSTICAS
// =====================================

export async function obtenerEstadisticasTurnos(fecha_desde?: string, fecha_hasta?: string) {
  const supabase = await createClient();

  try {
    let query = supabase
      .from("turno")
      .select("estado, created_at, fecha, id_especialista")
      .neq("estado", "eliminado"); // ✅ Excluir turnos eliminados

    if (fecha_desde) {
      query = query.gte("fecha", fecha_desde);
    }
    if (fecha_hasta) {
      query = query.lte("fecha", fecha_hasta);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener estadísticas:", error);
      return { success: false, error: error.message };
    }

    const total = data.length;
    const porEstado = data.reduce((acc: any, turno) => {
      acc[turno.estado || 'sin_estado'] = (acc[turno.estado || 'sin_estado'] || 0) + 1;
      return acc;
    }, {});

    const porEspecialista = data.reduce((acc: any, turno) => {
      if (turno.id_especialista) {
        acc[turno.id_especialista] = (acc[turno.id_especialista] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      success: true,
      data: {
        total,
        porEstado,
        porEspecialista,
        periodo: { fecha_desde, fecha_hasta }
      }
    };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// 📊 HISTORIAL CLÍNICO
// =====================================

/**
 * Obtener turnos de un paciente agrupados por tratamiento
 */
export async function obtenerHistorialClinicoPorPaciente(id_paciente: string | number) {
  const supabase = await createClient();

  try {
    // ✅ Normalizar a número (convertir si es string)
    const pacienteId = typeof id_paciente === 'string' ? parseInt(id_paciente, 10) : id_paciente;

    // 1️⃣ Obtener TODOS los turnos del paciente (con y sin grupo)
    const { data, error } = await supabase
      .from("turno")
      .select(`
        *,
        especialista:id_especialista(id_usuario, nombre, apellido),
        especialidad:id_especialidad(id_especialidad, nombre),
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, direccion, fecha_nacimiento)
      `)
      .eq("id_paciente", pacienteId)
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (error) {
      console.error("❌ Error obteniendo historial:", error);
      return { success: false, error: error.message };
    }

    // 2️⃣ Obtener los IDs únicos de grupos de tratamiento (filtrar nulls)
    const gruposIds = [...new Set(
      data?.map(t => t.id_grupo_tratamiento).filter((id): id is string => id !== null)
    )];

    // 3️⃣ Obtener información de los grupos de tratamiento
    const { data: gruposTratamiento, error: errorGrupos } = await supabase
      .from("grupo_tratamiento")
      .select("id_grupo, nombre")
      .in("id_grupo", gruposIds);

    if (errorGrupos) {
      console.warn("⚠️ No se pudieron obtener nombres de grupos:", errorGrupos);
    }

    // 4️⃣ Crear un mapa de grupos por ID para búsqueda rápida
    const gruposMap = new Map(
      gruposTratamiento?.map(g => [g.id_grupo, g.nombre]) || []
    );

    // 5️⃣ Agrupar turnos por id_grupo_tratamiento O generar grupos individuales
    const gruposHistorial = new Map();

    data?.forEach(turno => {
      const grupoId = turno.id_grupo_tratamiento || `individual-${turno.id_turno}`; // ✅ Crear ID único para turnos sin grupo

      if (!gruposHistorial.has(grupoId)) {
        gruposHistorial.set(grupoId, {
          id_grupo: grupoId,
          // ✅ PRIORIDAD: nombre del grupo > nombre de especialidad
          especialidad: turno.id_grupo_tratamiento
            ? (gruposMap.get(turno.id_grupo_tratamiento) || turno.especialidad?.nombre || "Sin especialidad")
            : turno.especialidad?.nombre || "Sin especialidad", // Turnos individuales usan especialidad
          especialista: turno.especialista,
          paciente: turno.paciente,
          fecha_inicio: turno.fecha,
          tipo_plan: turno.tipo_plan,
          total_sesiones: 0,
          turnos: []
        });
      }

      const grupo = gruposHistorial.get(grupoId);
      grupo.turnos.push(turno);
      grupo.total_sesiones = grupo.turnos.length;
    });

    const grupos = Array.from(gruposHistorial.values()).sort((a, b) =>
      new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
    );

    return { success: true, data: grupos };
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}


/**
 * Actualizar evolución clínica de un turno
 */
export async function actualizarEvolucionClinica(
  id_turno: number,
  evolucion_clinica: string
) {
  const supabase = await createClient();

  try {
    // ✅ Obtener turno actual para validar tiempo de edición
    const { data: turnoActual, error: errorGet } = await supabase
      .from("turno")
      .select("evolucion_completada_en")
      .eq("id_turno", id_turno)
      .single();

    if (errorGet) {
      return { success: false, error: "Turno no encontrado" };
    }

    // ✅ Validar límite de 5 minutos si ya existe evolución
    if (turnoActual.evolucion_completada_en) {
      const tiempoTranscurrido = Date.now() - new Date(turnoActual.evolucion_completada_en).getTime();
      const cincoMinutos = 5 * 60 * 1000;

      if (tiempoTranscurrido > cincoMinutos) {
        return {
          success: false,
          error: "No se puede editar la evolución después de 5 minutos"
        };
      }
    }

    // ✅ Actualizar evolución
    const { error } = await supabase
      .from("turno")
      .update({
        evolucion_clinica,
        evolucion_completada_en: nowIso()
      })
      .eq("id_turno", id_turno);

    if (error) {
      console.error("❌ Error actualizando evolución:", error);
      return { success: false, error: error.message };
    }

    // ✅ Revalidar todas las rutas donde se muestra el historial clínico
    revalidatePath("/pacientes");
    revalidatePath("/pacientes/HistorialClinico");
    revalidatePath("/imprimir/historia-clinica");

    return { success: true };
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}

// =====================================
// 🔁 CREAR TURNOS EN LOTE (PILATES)
// =====================================

export async function crearTurnosEnLote(turnos: Array<{
  id_paciente: string;
  id_especialista: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  id_clase_pilates?: string;
  descripcion?: string;
  tipo?: string;
  estado?: string;
  dificultad?: 'principiante' | 'intermedio' | 'avanzado';
  es_pilates?: boolean;
}>, opciones?: { enviarNotificacion?: boolean }) {
  try {
    const supabase = await createClient();

    // ✅ Crear turnos en lote
    const turnosCreados = [];
    const errores = [];
    const idPilates = await obtenerIdPilates();

    // Crear turnos uno por uno
    for (const turnoData of turnos) {
      try {
        const { data: turno, error } = await supabase
          .from("turno")
          .insert({
            id_paciente: parseInt(turnoData.id_paciente),
            id_especialista: turnoData.id_especialista,
            fecha: turnoData.fecha,
            hora: turnoData.hora_inicio,
            id_especialidad: idPilates ? idPilates : null, // ✅ Asignar especialidad Pilates si existe
            estado: turnoData.estado || 'programado',
            tipo_plan: 'particular',
            dificultad: turnoData.dificultad || 'principiante',
          })
          .select()
          .single();

        if (error) {
          errores.push({
            turno: turnoData,
            error: error.message
          });
          continue;
        }

        turnosCreados.push(turno);

        // Programar recordatorios individuales para cada turno
        try {
          const { calcularTiemposRecordatorio } = await import("@/lib/utils/whatsapp.utils");
          const { registrarNotificacionesRecordatorioFlexible } = await import("@/lib/services/notificacion.service");

          // ✅ Por defecto: 1 día antes, 2 horas antes Y 1 hora antes
          const tiposRecordatorio: ('1d' | '2h' | '1h')[] = ['1d', '2h', '1h'];
          const tiemposRecordatorio = calcularTiemposRecordatorio(turno.fecha, turno.hora, tiposRecordatorio);

          if (turno.id_paciente) {
            const { data: pacienteData } = await supabase
              .from("paciente")
              .select("telefono, nombre")
              .eq("id_paciente", turno.id_paciente)
              .single();

            if (pacienteData?.telefono) {
              const mensaje = `Recordatorio: Tienes un turno de Pilates programado`;
              const tiemposValidos: Record<string, Date> = {};
              Object.entries(tiemposRecordatorio).forEach(([tipo, fecha]) => {
                if (fecha) {
                  tiemposValidos[tipo] = fecha;
                }
              });

              if (Object.keys(tiemposValidos).length > 0) {
                await registrarNotificacionesRecordatorioFlexible(
                  turno.id_turno,
                  pacienteData.telefono,
                  mensaje,
                  tiemposValidos
                );
              }
            }
          }
        } catch (recordatorioError) {
          console.warn(`⚠️ No se pudieron programar recordatorios para turno ${turno.id_turno}:`, recordatorioError);
        }
      } catch (error) {
        errores.push({
          turno: turnoData,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Procesar notificaciones agrupadas de confirmación
    if (turnosCreados.length > 0 && opciones?.enviarNotificacion !== false) {
      await procesarNotificacionesRepeticion(turnosCreados);
    }

    return {
      success: true,
      data: {
        turnosCreados,
        errores,
        total: turnos.length,
        exitosos: turnosCreados.length,
        fallidos: errores.length
      }
    };
  } catch (error) {
    console.error("Error al crear turnos en lote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

// =====================================
// 📱 NOTIFICACIONES AGRUPADAS
// =====================================

async function procesarNotificacionesRepeticion(turnos: any[]) {
  try {
    // Agrupar turnos por paciente
    const turnosPorPaciente = turnos.reduce((acc: Record<string, any[]>, turno) => {
      if (!acc[turno.id_paciente]) {
        acc[turno.id_paciente] = [];
      }
      acc[turno.id_paciente].push(turno);
      return acc;
    }, {});

    // Enviar notificación agrupada por cada paciente
    for (const [id_paciente, turnosPaciente] of Object.entries(turnosPorPaciente)) {
      await enviarNotificacionGrupal(id_paciente, turnosPaciente);
    }
  } catch (error) {
    console.error("Error al procesar notificaciones de repetición:", error);
  }
}

// ✅ FUNCIÓN SIMPLIFICADA - Solo delega al servicio de WhatsApp
async function enviarNotificacionGrupal(id_paciente: string, turnos: any[]) {
  try {
    const supabase = await createClient();    // 1. Obtener datos del paciente
    const { data: paciente } = await supabase
      .from("paciente")
      .select("nombre, telefono")
      .eq("id_paciente", parseInt(id_paciente))
      .single();

    if (!paciente || !paciente.telefono) {
      console.error("No se pudieron obtener datos del paciente o no tiene teléfono");
      return;
    }

    // 2. Registrar notificación en BD - ✅ CORRECCIÓN: Agregar id_organizacion
    const { data: notificacion } = await supabase
      .from("notificacion")
      .insert({
        id_turno: turnos[0].id_turno,
        mensaje: `Confirmación de ${turnos.length} turnos de Pilates`,
        medio: "whatsapp",
        telefono: paciente.telefono,
        estado: "pendiente",
      })
      .select()
      .single();

    // 3. Importar y llamar al servicio de WhatsApp (que tiene toda la lógica)
    const whatsappService = await import('../services/whatsapp-bot.service');
    const resultado = await whatsappService.enviarNotificacionGrupal(
      paciente.telefono,
      paciente.nombre,
      turnos
    );

    // 4. Actualizar estado según resultado
    if (resultado.status === 'success') {
      if (notificacion) {
        await supabase
          .from("notificacion")
          .update({
            estado: "enviada",
            fecha_envio: nowIso()
          })
          .eq("id_notificacion", notificacion.id_notificacion);
      }
    } else {
      console.error(`❌ Error enviando notificación agrupada: ${resultado.message}`);

      if (notificacion) {
        await supabase
          .from("notificacion")
          .update({ estado: "fallida" })
          .eq("id_notificacion", notificacion.id_notificacion);
      }
    }
  } catch (error) {
    console.error("Error al enviar notificación agrupada:", error);
  }
}

// =====================================
// 📣 NOTIFICACIONES PILATES (EXPORTADAS)
// =====================================

/**
 * Enviar notificación agrupada de confirmación a los participantes de una clase de Pilates.
 * Usar después de crear turnos individuales (sin repetición) para enviar un único mensaje
 * con el formato Pilates en lugar de confirmaciones individuales.
 */
export async function notificarParticipantesPilates(turnosCreados: any[]) {
  if (!turnosCreados?.length) return { success: true };
  try {
    await procesarNotificacionesRepeticion(turnosCreados);
    return { success: true };
  } catch (error) {
    console.error("Error notificando participantes Pilates:", error);
    return { success: false, error: "Error enviando notificaciones" };
  }
}

/**
 * Notificar a un paciente que fue dado de baja de una clase de Pilates.
 * Enviar ANTES de llamar a eliminarTurno para tener los datos disponibles.
 */
export async function notificarCancelacionPilates(turnoId: number) {
  try {
    const supabase = await createClient();
    const { data: turno } = await supabase
      .from("turno")
      .select("fecha, hora, paciente:id_paciente(nombre, telefono)")
      .eq("id_turno", turnoId)
      .single();

    if (!turno || !(turno as any).paciente?.telefono) return { success: true };

    const pac = (turno as any).paciente;
    const telefono = String(pac.telefono).trim();
    const nombrePaciente = pac.nombre;
    const fecha = dayjs(turno.fecha).format("DD/MM/YYYY");
    const hora = String(turno.hora).substring(0, 5);

    after(async () => {
      try {
        const { enviarMensajePersonalizado } = await import("@/lib/services/whatsapp-bot.service");
        const mensaje = `Hola ${nombrePaciente}, tu clase de Pilates del ${fecha} a las ${hora}hs fue cancelada.\n\nSi tenés alguna duda, comunicate con nosotros.`;
        await enviarMensajePersonalizado(telefono, mensaje);
      } catch (err) {
        console.error("[Pilates] Error enviando cancelación:", err);
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error en notificarCancelacionPilates:", error);
    return { success: false, error: "Error al enviar notificación" };
  }
}

// =====================================
// 🏥 GRUPOS DE TRATAMIENTO
// =====================================

/**
 * Actualizar información de un grupo de tratamiento
 */
export async function actualizarGrupoTratamiento(
  id_grupo: string,
  datos: { nombre?: string }
) {
  const supabase = await createClient();

  try {
    console.log('📝 Actualizando grupo de tratamiento:', { id_grupo, datos });

    // Validar que el grupo existe
    const { data: grupoExistente, error: errorBusqueda } = await supabase
      .from('grupo_tratamiento')
      .select('id_grupo, nombre')
      .eq('id_grupo', id_grupo)
      .single();

    if (errorBusqueda) {
      console.error('❌ Error buscando grupo:', errorBusqueda);
      return { success: false, error: `Grupo no encontrado: ${errorBusqueda.message}` };
    }

    console.log('✅ Grupo encontrado:', grupoExistente);

    const { data, error } = await supabase
      .from('grupo_tratamiento')
      .update({
        nombre: datos.nombre,
        updated_at: nowIso()
      })
      .eq('id_grupo', id_grupo)
      .select();

    if (error) {
      console.error('❌ Error actualizando grupo de tratamiento:', error);
      return { success: false, error: error.message || 'Error al actualizar' };
    }

    console.log('✅ Grupo actualizado exitosamente:', data);

    // ✅ Revalidar todas las rutas donde se muestra el historial clínico
    revalidatePath('/pacientes');
    revalidatePath('/pacientes/HistorialClinico');
    revalidatePath('/imprimir/historia-clinica');

    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    return { success: false, error: error.message || 'Error inesperado' };
  }
}

// =====================================
// ⏰ ACTUALIZACIÓN AUTOMÁTICA DE ESTADOS
// =====================================

/**
 * Actualiza turnos programados que ya pasaron de fecha/hora a estado "pendiente"
 * Solo actualiza turnos en estado "programado"
 */
export async function actualizarTurnosPendientes() {
  const supabase = await createClient();

  try {
    const ahora = new Date();
    const fechaActual = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaActual = ahora.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    console.log(`⏰ Actualizando turnos pendientes - Fecha actual: ${fechaActual}, Hora actual: ${horaActual}`);

    // Buscar turnos programados que ya pasaron
    const { data: turnosPasados, error } = await supabase
      .from('turno')
      .select('id_turno, fecha, hora')
      .eq('estado', 'programado')
      .or(`fecha.lt.${fechaActual},and(fecha.eq.${fechaActual},hora.lt.${horaActual})`);

    if (error) {
      console.error('❌ Error buscando turnos pasados:', error);
      return { success: false, error: error.message };
    }

    if (!turnosPasados || turnosPasados.length === 0) {
      return { success: true, data: [], message: 'No hay turnos para actualizar' };
    }

    // Actualizar todos los turnos pasados a "pendiente"
    const { data: turnosActualizados, error: errorActualizar } = await supabase
      .from('turno')
      .update({ estado: 'pendiente' })
      .in('id_turno', turnosPasados.map(t => t.id_turno))
      .select();

    if (errorActualizar) {
      console.error('❌ Error actualizando turnos a pendiente:', errorActualizar);
      return { success: false, error: errorActualizar.message };
    }

    console.log(`✅ ${turnosActualizados?.length || 0} turnos actualizados a pendiente`);

    // Revalidar las rutas de turnos
    revalidatePath('/turnos');

    return {
      success: true,
      data: turnosActualizados,
      message: `${turnosActualizados?.length || 0} turnos actualizados a pendiente`
    };
  } catch (error: any) {
    console.error('❌ Error inesperado actualizando turnos pendientes:', error);
    return { success: false, error: error.message || 'Error inesperado' };
  }
}

// =====================================
// 📦 CREAR PAQUETE DE SESIONES (REPETICIÓN)
// =====================================

/**
 * Crea múltiples turnos en un patrón de repetición semanal
 * ✅ Optimizado: 1 sola llamada HTTP desde el cliente
 * ✅ Transaccional: todo o nada
 * ✅ Seguro: toda la lógica en el servidor
 */
export async function crearPaqueteSesiones(params: {
  fechaBase: string;
  horaBase: string;
  diasSeleccionados: number[]; // 1=Lunes, 2=Martes, etc.
  numeroSesiones: number;
  mantenerHorario: boolean;
  horariosPorDia: Record<number, string>;
  id_especialista: string;
  id_paciente: number;
  id_especialidad: number;
  id_box?: number;
  observaciones?: string;
  tipo_plan: 'particular' | 'obra_social';
  titulo_tratamiento?: string;
  recordatorios?: ('1h' | '2h' | '3h' | '1d' | '2d')[];
}) {
  try {
    const supabase = await createClient();
    // ============= PASO 1: GENERAR LISTA DE TURNOS =============
    const turnosParaCrear: TurnoInsert[] = [];
    const [year, month, day] = params.fechaBase.split('-').map(Number);
    const fechaBaseParsed = new Date(year, month - 1, day);
    const diaBaseNumeroJS = fechaBaseParsed.getDay();
    const diaBaseNumero = diaBaseNumeroJS === 0 ? 7 : diaBaseNumeroJS;

    // Helper: verificar si fecha/hora está en el pasado
    const esFechaHoraPasada = (fecha: string, hora: string): boolean => {
      try {
        const [y, m, d] = fecha.split('-').map(Number);
        const [h, min] = hora.split(':').map(Number);
        const fechaHoraTurno = new Date(y, m - 1, d, h, min);
        return fechaHoraTurno < new Date();
      } catch {
        return false;
      }
    };

    // PRIMERO: Agregar el turno inicial si no está en el pasado
    const esPasadoPrimerTurno = esFechaHoraPasada(params.fechaBase, params.horaBase);

    if (!esPasadoPrimerTurno) {
      turnosParaCrear.push({
        fecha: params.fechaBase,
        hora: params.horaBase + ':00',
        id_especialista: params.id_especialista,
        id_paciente: params.id_paciente,
        id_especialidad: params.id_especialidad,
        id_box: params.id_box || null,
        observaciones: params.observaciones || null,
        estado: "programado" as const,
        tipo_plan: params.tipo_plan,
      });
    }

    // SEGUNDO: Generar turnos de repetición
    let sesionesCreadas = esPasadoPrimerTurno ? 0 : 1;
    let semanaActual = 0;

    while (sesionesCreadas < params.numeroSesiones && semanaActual < 52) {
      for (const diaSeleccionado of params.diasSeleccionados) {
        if (sesionesCreadas >= params.numeroSesiones) break;

        let diferenciaDias = diaSeleccionado - diaBaseNumero;
        if (diferenciaDias < 0) diferenciaDias += 7;

        const fechaTurno = new Date(fechaBaseParsed);
        const esPrimeraSemanaYDiaBase = semanaActual === 0 && diferenciaDias === 0;

        if (esPrimeraSemanaYDiaBase) continue; // Ya lo agregamos arriba

        fechaTurno.setDate(fechaTurno.getDate() + (semanaActual * 7) + diferenciaDias);

        const fechaFormateada = `${fechaTurno.getFullYear()}-${String(fechaTurno.getMonth() + 1).padStart(2, '0')}-${String(fechaTurno.getDate()).padStart(2, '0')}`;

        const horarioTurno = params.mantenerHorario
          ? params.horaBase
          : (params.horariosPorDia[diaSeleccionado] || '09:00');

        if (!esFechaHoraPasada(fechaFormateada, horarioTurno)) {
          turnosParaCrear.push({
            fecha: fechaFormateada,
            hora: horarioTurno + ':00',
            id_especialista: params.id_especialista,
            id_paciente: params.id_paciente,
            id_especialidad: params.id_especialidad,
            id_box: params.id_box || null,
            observaciones: params.observaciones || null,
            estado: "programado" as const,
            tipo_plan: params.tipo_plan,
          });
          sesionesCreadas++;
        }
      }
      semanaActual++;
    }

    if (turnosParaCrear.length === 0) {
      return {
        success: false,
        error: 'Todos los horarios seleccionados ya pasaron'
      };
    }

    turnosParaCrear.sort((a, b) => {
      const fechaA = `${a.fecha}T${a.hora || "00:00:00"}`;
      const fechaB = `${b.fecha}T${b.hora || "00:00:00"}`;
      return fechaA.localeCompare(fechaB);
    });

    // ============= PASO 2: CREAR GRUPO + TURNOS VIA RPC TRANSACCIONAL =============
    const turnosPayload = turnosParaCrear.map((turno) => ({
      fecha: turno.fecha,
      hora: turno.hora,
      id_box: turno.id_box,
      observaciones: turno.observaciones,
      estado: turno.estado,
      tipo_plan: turno.tipo_plan,
    }));

    const { data: turnosRpc, error: errorRpc } = await supabase.rpc('crear_paquete_sesiones_rpc', {
      p_id_paciente: params.id_paciente,
      p_id_especialista: params.id_especialista,
      p_id_especialidad: params.id_especialidad,
      p_fecha_inicio: params.fechaBase,
      p_tipo_plan: params.tipo_plan,
      p_titulo_tratamiento: params.titulo_tratamiento || null,
      p_turnos: turnosPayload,
    });

    if (errorRpc) {
      console.error('Error creando paquete por RPC:', errorRpc);
      const mensajeRpc = errorRpc.message || 'No se pudieron crear los turnos';
      const mensajeUsuario = mensajeRpc.startsWith('CONFLICTOS_PAQUETE:')
        ? mensajeRpc.replace('CONFLICTOS_PAQUETE:', '').trim()
        : mensajeRpc;

      return {
        success: false,
        error: mensajeUsuario
      };
    }

    const idsTurnosCreados = (turnosRpc || [])
      .map((r: any) => r.id_turno)
      .filter((id: any): id is number => typeof id === 'number');

    if (idsTurnosCreados.length === 0) {
      return {
        success: false,
        error: 'No se pudieron crear los turnos'
      };
    }

    const id_grupo_tratamiento = (turnosRpc || []).find((r: any) => r.id_grupo_tratamiento)?.id_grupo_tratamiento as string | undefined;

    const { data: turnosCreados, error: errorTurnos } = await supabase
      .from('turno')
      .select(`
        *,
        paciente:id_paciente(nombre, apellido, telefono),
        especialista:id_especialista(nombre, apellido),
        grupo_tratamiento:id_grupo_tratamiento(id_grupo, cantidad_turnos_planificados)
      `)
      .in('id_turno', idsTurnosCreados)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (errorTurnos || !turnosCreados) {
      console.error('Error obteniendo turnos creados tras RPC:', errorTurnos);
      return {
        success: false,
        error: errorTurnos?.message || 'Se crearon turnos, pero falló la lectura posterior'
      };
    }

    // ============= PASO 3: ENVIAR NOTIFICACIÓN GRUPAL =============
    if (turnosCreados && turnosCreados.length > 0) {
      // Ejecutar en background sin bloquear
      Promise.resolve().then(async () => {
        try {
          const { enviarNotificacionGrupalTurnos } = await import('@/lib/services/whatsapp-bot.service');

          const paciente = (turnosCreados[0] as any).paciente;
          const especialista = (turnosCreados[0] as any).especialista;

          if (paciente?.telefono && especialista) {
            await enviarNotificacionGrupalTurnos(
              paciente.telefono,
              paciente.nombre,
              turnosCreados,
              especialista.nombre
            );
          }
        } catch (error) {
          console.error('Error enviando notificación agrupada:', error);
          // No fallar la operación por error en notificación
        }
      });
    }

    // ============= PASO 4: REVALIDAR Y RETORNAR =============
    revalidatePath('/turnos');
    revalidatePath('/calendario');

    return {
      success: true,
      data: {
        turnosCreados: turnosCreados.length,
        turnos: turnosCreados,
        id_grupo_tratamiento
      },
      message: `${turnosCreados.length} sesiones creadas exitosamente`
    };

  } catch (error: any) {
    console.error('Error inesperado en crearPaqueteSesiones:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado al crear el paquete de sesiones'
    };
  }
}

export async function obtenerProximoTurnoPorTelefono(telefono: string) {
  const supabase = await createClient();
  
  try {
    // Primero encontrar el paciente por teléfono
    const { data: paciente, error: pacienteError } = await supabase
      .from("paciente")
      .select("id_paciente")
      .eq("telefono", telefono)
      .single();

    if (pacienteError || !paciente) {
      return { success: true, data: null };
    }

    // Buscar el próximo turno (fecha >= hoy, ordenado por fecha y hora)
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from("turno")
      .select(`
        *,
        paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
        especialista:id_especialista(id_usuario, nombre, apellido, color),
        especialidad:id_especialidad(id_especialidad, nombre),
        box:id_box(id_box, numero)
      `)
      .eq("id_paciente", paciente.id_paciente)
      .gte("fecha", hoy)
      .neq("estado", "cancelado")
      .neq("estado", "eliminado") // ✅ Excluir turnos eliminados
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener próximo turno:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error inesperado:", error);
    return { success: false, error: "Error inesperado" };
  }
}
