"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Turno = Database["public"]["Tables"]["turno"]["Row"];
type Box = Database["public"]["Tables"]["box"]["Row"];
type Notificacion = Database["public"]["Tables"]["notificacion"]["Row"];

export interface KPIsDashboard {
  // turnosHoy: number;
  Programados: number;
  Atendidos: number;
  Cancelaciones: number;
  Ingresos: number;
}

export interface KPIHistorico {
  fecha: string;
  hora?: string; // Para cuando se agrupa por hora (filtro "hoy")
  Programados: number;
  Atendidos: number;
  Cancelaciones: number;
  Ingresos: number;
}

export type PeriodoFiltro = "hoy" | "semana" | "mes";

export interface ProximoTurno {
  id_turno: number;
  hora: string;
  nombrePaciente: string;
  apellidoPaciente: string;
  especialista: string;
  especialidad: string;
  colorEspecialista: string;
  box: number | null;
  // estado: string; LOS PROXIMOS TURNOS SOLO PUEDEN ESTAR EN ESTADO PROGRAMADO
  telefono: string;
}

export interface OcupacionBox {
  id_box: number;
  numeroBox: number;
  porcentajeUso: number;
  turnosHoy: number;
  maxTurnosEstimados: number;
}

// ✅ Obtener KPIs por periodo con historial
export async function obtenerKPIsConHistorial(
  periodo: PeriodoFiltro
): Promise<{ datos: KPIHistorico[]; total: KPIsDashboard }> {
  const supabase = await createClient();

  try {
    const hoy = new Date();
    let fechaInicio = new Date();
    let fechaFin = new Date(hoy);
    let daysToGet = 1;

    // Calcular rango según período
    if (periodo === "semana") {
      // Obtener el domingo de la semana actual (0 = Sunday)
      const dayOfWeek = hoy.getDay();
      fechaInicio.setDate(hoy.getDate() - dayOfWeek);
      // Fin es el sábado de la misma semana
      fechaFin.setDate(fechaInicio.getDate() + 6);
      daysToGet = 7;
    } else if (periodo === "mes") {
      // Primer día del mes actual
      fechaInicio.setDate(1);
      // Último día del mes actual
      fechaFin.setDate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate());
      daysToGet = fechaFin.getDate();
    }

    const fechaInicioStr = fechaInicio.toISOString().split("T")[0];
    const fechaFinStr = fechaFin.toISOString().split("T")[0];

    // Para "hoy", obtener también la hora
    let selectFields = "fecha, estado, id_turno, precio"; // tipo_plan, id_especialista, id_especialidad, 
    if (periodo === "hoy") {
      selectFields = "fecha, hora, estado, id_turno, precio"; // tipo_plan, id_especialista, id_especialidad,
    }

    // Obtener turnos en el rango (con precio)
    const { data: turnos, error: errorTurnos } = await supabase
      .from("turno")
      .select(selectFields)
      .gte("fecha", fechaInicioStr)
      .lte("fecha", fechaFinStr)
      .neq("id_especialidad", 4); // EXCLUYE PILATES

    if (errorTurnos) {
      throw new Error("Error al obtener datos históricos");
    }

    // Agrupar por fecha o por hora (si es "hoy")
    const datosMap = new Map<string, KPIHistorico>();

    if (periodo === "hoy") {
      // Inicializar 24 horas del día
      for (let hora = 0; hora < 24; hora++) {
        const horaStr = String(hora).padStart(2, "0");
        const clave = `${fechaInicioStr}T${horaStr}`;
        datosMap.set(clave, {
          fecha: horaStr,
          hora: `${horaStr}:00`,
          Programados: 0,
          Atendidos: 0,
          Cancelaciones: 0,
          Ingresos: 0,
        });
      }

      // Procesar turnos agrupados por hora
      for (const turno of turnos as any[] || []) {
        if (turno.hora) {
          const hora = turno.hora.split(":")[0];
          const clave = `${turno.fecha}T${hora}`;
          const dato = datosMap.get(clave);
          if (dato) {
            if (turno.estado === "atendido") {
              dato.Atendidos++;
            } else if (turno.estado === "cancelado") {
              dato.Cancelaciones++;
            } else if (turno.estado === "programado") {
              dato.Programados++;
            }

            if (turno.precio) {
              dato.Ingresos += turno.precio;
            }
            
            // await asignarIngresos(dato, turno, supabase);

          }
        }
      }
    } else {
      // Inicializar todas las fechas del rango con 0
      for (let i = 0; i < daysToGet; i++) {
        const fecha = new Date(fechaInicio);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = fecha.toISOString().split("T")[0];
        datosMap.set(fechaStr, {
          fecha: fechaStr,
          Programados: 0,
          Atendidos: 0,
          Cancelaciones: 0,
          Ingresos: 0,
        });
      }

      // Procesar turnos agrupados por fecha
      for (const turno of turnos as any[] || []) {
        const fechaStr = turno.fecha;
        const dato = datosMap.get(fechaStr);
        if (dato) {
          if (turno.estado === "atendido") {
            dato.Atendidos++;
          } else if (turno.estado === "cancelado") {
            dato.Cancelaciones++;
          } else if (turno.estado === "programado") {
            dato.Programados++;
          }

          if (turno.precio) {
            dato.Ingresos += turno.precio;
          }

          // await asignarIngresos(dato, turno, supabase);

          console.log(`Ingresos asignados para turno ${turno.id_turno}: $${dato.Ingresos}`);

          console.log(dato)

        }
      };
    }

    // Convertir a array y calcular totales
    const datos = Array.from(datosMap.values()).sort(
      (a, b) => a.fecha.localeCompare(b.fecha)
    );

    const total: KPIsDashboard = {
      // turnosHoy: datos.reduce((sum, d) => sum + d.turnosHoy, 0),
      Programados: datos.reduce((sum, d) => sum + d.Programados, 0),
      Atendidos: datos.reduce((sum, d) => sum + d.Atendidos, 0),
      Cancelaciones: datos.reduce((sum, d) => sum + d.Cancelaciones, 0),
      Ingresos: datos.reduce((sum, d) => sum + d.Ingresos, 0),
    };

    return { datos, total };
  } catch (error) {
    console.error("❌ Error en obtenerKPIsConHistorial:", error);
    return {
      datos: [],
      total: {
        // turnosHoy: 0,
        Programados: 0,
        Atendidos: 0,
        Cancelaciones: 0,
        Ingresos: 0,
      },
    };
  }
}

// async function asignarIngresos(dato: KPIHistorico, turno: any, supabase: any) {
  

//   try {

//     console.log(turno)

//     if (turno.tipo_plan && 
//     turno.id_especialidad && 
//     turno.id_especialista && 
//     turno.estado !== "cancelado") {

//       console.log("Asignando ingresos para turno:", turno.id_turno);
    
//     const { data: precioData, error: errorPrecio } = await supabase
//       .from("usuario_especialidad")
//       .select("precio_particular, precio_obra_social")
//       .eq("id_usuario", turno.id_especialista)
//       .eq("id_especialidad", turno.id_especialidad)
//       .single();

//     if (errorPrecio) {
//       console.warn("Error al obtener precios:", errorPrecio);
//       return;
//     }

//     let precio = 0
//     if (turno.tipo_plan === "particular" && precioData?.precio_particular) {
//       precio = precioData.precio_particular;
//     } else if (turno.tipo_plan === "obra_social" && precioData?.precio_obra_social) {
//       precio = precioData.precio_obra_social;
//     }

//     dato.Ingresos += precio;

//     console.log(
//       `✅ Ingreso asignado: $${precio} para turno ${turno.id_turno} (${turno.tipo_plan})`
//     );
//   }
//   } catch (error) {
//     console.error("Error al asignar ingresos:", error);
//   }
// }

// ✅ Obtener KPIs principales del dashboard
// export async function obtenerKPIsDashboard(): Promise<KPIsDashboard> {
//   const supabase = await createClient();

//   try {
//     const hoy = new Date().toISOString().split("T")[0];
//     const inicioSemana = new Date();
//     inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
//     const finSemana = new Date();

//     const inicioMes = new Date();
//     inicioMes.setDate(1);

//     // 1️⃣ Turnos de hoy
//     const { data: programadosData, error: errorProgramados } = await supabase
//       .from("turno")
//       .select("id_turno", { count: "exact" })
//       .eq("fecha", hoy);

//     // 2️⃣ Turnos atendidos esta semana
//     const { data: atendidosData, error: errorAtendidos } = await supabase
//       .from("turno")
//       .select("id_turno", { count: "exact" })
//       .gte("fecha", inicioSemana.toISOString().split("T")[0])
//       .lte("fecha", finSemana.toISOString().split("T")[0])
//       .eq("estado", "atendido");

//     // 3️⃣ Cancelaciones del mes
//     const { data: cancelacionesData, error: errorCancelaciones } = await supabase
//       .from("turno")
//       .select("id_turno", { count: "exact" })
//       .gte("fecha", inicioMes.toISOString().split("T")[0])
//       .eq("estado", "cancelado");

//     // 4️⃣ Ingresos del mes (suma de precios de turnos atendidos)
//     const { data: ingresosData, error: errorIngresos } = await supabase
//       .from("turno")
//       .select("precio")
//       .gte("fecha", inicioMes.toISOString().split("T")[0])
//       .in("estado", ["atendido", "programado"])
//       .not("precio", "is", null);

//     if (errorProgramados || errorAtendidos || errorCancelaciones || errorIngresos) {
//       console.error("Error al obtener KPIs:", {
//         errorProgramados,
//         errorAtendidos,
//         errorCancelaciones,
//         errorIngresos,
//       });
//       throw new Error("Error al obtener KPIs");
//     }

//     // Calcular ingresos totales
//     const ingresosTotal = (ingresosData || []).reduce((sum: number, item: any) => sum + (item.precio || 0), 0);

//     return {
//       Programados: programadosData?.length || 0,
//       Atendidos: atendidosData?.length || 0,
//       Cancelaciones: cancelacionesData?.length || 0,
//       Ingresos: ingresosTotal,
//     };
//   } catch (error) {
//     console.error("❌ Error en obtenerKPIsDashboard:", error);
//     return {
//       Programados: 0,
//       Atendidos: 0,
//       Cancelaciones: 0,
//       Ingresos: 0,
//     };
//   }
// }

// ✅ Obtener próximos turnos del día
export async function obtenerProximosTurnos(): Promise<ProximoTurno[]> {
  const supabase = await createClient();

  try {
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("turno")
      .select(
        `
        id_turno,
        hora,
        paciente:id_paciente(nombre, apellido, telefono),
        especialista:id_especialista(nombre, apellido, color),
        especialidad:id_especialidad(nombre),
        box:id_box(numero)
      `
      )
      .eq("fecha", hoy)
      .eq("estado", "programado")
      .gt("hora", new Date().toLocaleTimeString("en-US", { hour12: false }))
    //   .neq("id_especialidad", 4) // Excluir Pilates
      .order("hora", { ascending: true });

    if (error) {
      console.error("Error al obtener próximos turnos:", error);
      return [];
    }

    return (data || []).map((turno: any) => ({
      id_turno: turno.id_turno,
      hora: turno.hora.slice(0, 5), // Extraer solo HH:MM
      nombrePaciente: turno.paciente?.nombre || "Desconocido",
      apellidoPaciente: turno.paciente?.apellido || "",
      especialista: `${turno.especialista?.nombre || ""} ${turno.especialista?.apellido || ""}`,
      especialidad: turno.especialidad?.nombre || "Desconocida",
      colorEspecialista: turno.especialista?.color || "#6B7280", // Color por defecto gris
      box: turno.box?.numero || null,
      // estado: turno.estado,
      telefono: turno.paciente?.telefono || "",
    }));
  } catch (error) {
    console.error("❌ Error en obtenerProximosTurnos:", error);
    return [];
  }
}

// ✅ Obtener ocupación de boxes
export async function obtenerOcupacionBoxes(): Promise<OcupacionBox[]> {
  const supabase = await createClient();

  try {
    const hoy = new Date().toISOString().split("T")[0];

    // 1️⃣ Obtener todos los boxes
    const { data: boxes, error: errorBoxes } = await supabase
      .from("box")
      .select("id_box, numero");

    if (errorBoxes) throw errorBoxes;

    // 2️⃣ Obtener turnos de hoy por box
    const { data: turnos, error: errorTurnos } = await supabase
      .from("turno")
      .select("id_box, id_turno")
      .eq("fecha", hoy)
    //   .neq("id_especialidad", 4)
      .in("estado", ["programado", "atendido"]);

    if (errorTurnos) throw errorTurnos;

    // 3️⃣ Contar turnos por box
    const turnosPorBox = new Map<number, number>();
    (turnos || []).forEach((turno: any) => {
      if (turno.id_box) {
        turnosPorBox.set(turno.id_box, (turnosPorBox.get(turno.id_box) || 0) + 1);
      }
    });

    // 4️⃣ Calcular porcentaje (asumiendo max 8 turnos por box por día)
    const maxTurnosEstimados = 8;

    return (boxes || []).map((box: any) => {
      const turnosBox = turnosPorBox.get(box.id_box) || 0;
      const porcentaje = (turnosBox / maxTurnosEstimados) * 100;

      return {
        id_box: box.id_box,
        numeroBox: box.numero,
        porcentajeUso: Math.min(porcentaje, 100), // Cap at 100%
        turnosHoy: turnosBox,
        maxTurnosEstimados,
      };
    });
  } catch (error) {
    console.error("❌ Error en obtenerOcupacionBoxes:", error);
    return [];
  }
}
