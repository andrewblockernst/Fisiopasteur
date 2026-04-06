"use server";

// import { WhatsAppService } from './whatsapp.service';
import { createClient } from "../supabase/server";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { dayjs } from "@/lib/dayjs";
import { mapearTurnoParaBot } from "@/lib/utils/whatsapp.utils";
import { getBrandingConfig } from './branding.service';

// Configuración del bot
const BOT_URL =
  process.env.WHATSAPP_BOT_URL ||
  "https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com";

// Interfaces para los datos del bot
interface TurnoDataForBot {
  pacienteNombre: string;
  pacienteApellido: string;
  telefono: string;
  fecha: string; // DD/MM/YYYY
  hora: string; // HH:MM
  profesional: string;
  especialidad: string;
  turnoId: string;
  centroMedico?: string;
}

interface BotResponse {
  status: "success" | "error";
  message: string;
  turnoId?: string;
}

// =====================================
// 🔧 FUNCIONES AUXILIARES
// =====================================

/**
 * Realizar petición HTTP al bot
 */
async function realizarPeticionBot(
  endpoint: string,
  data: any,
): Promise<BotResponse> {
  try {
    const response = await fetch(`${BOT_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage += ` - ${errorData.message}`;
        }
      } catch {
        // Si no se puede parsear el error, usar el mensaje básico
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result as BotResponse;
  } catch (error) {
    console.error(`Error en petición al bot (${endpoint}):`, error);

    if (error instanceof Error) {
      if (error.message.includes("fetch")) {
        return {
          status: "error",
          message:
            "No se pudo conectar con el bot de WhatsApp. Verifique la conexión.",
        };
      }
      if (error.message.includes("500")) {
        return {
          status: "error",
          message:
            "El bot de WhatsApp no está autenticado. Escanee el código QR.",
        };
      }
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "error",
      message: "Error desconocido al comunicarse con el bot",
    };
  }
}

// =====================================
// 📱 FUNCIONES PRINCIPALES DEL BOT
// =====================================

/**
 * Enviar confirmación de turno por WhatsApp
 */
export async function enviarConfirmacionTurno(
  turnoOrTelefono: TurnoConDetalles | string,
  nombrePaciente?: string,
  nombreEspecialista?: string,
  fecha?: string,
  hora?: string,
): Promise<BotResponse> {
  // Si el primer parámetro es un string, es la sobrecarga simple
  if (typeof turnoOrTelefono === "string") {
    console.log("📱 Enviando confirmación individual por WhatsApp...");

    const telefono = turnoOrTelefono;
    if (
      !telefono ||
      !nombrePaciente ||
      !nombreEspecialista ||
      !fecha ||
      !hora
    ) {
      return {
        status: "error",
        message: "Faltan datos requeridos para enviar la confirmación",
      };
    }

    const datosBot = {
      pacienteNombre: nombrePaciente.split(" ")[0] || nombrePaciente,
      pacienteApellido: nombrePaciente.split(" ").slice(1).join(" ") || "",
      telefono,
      fecha,
      hora,
      profesional: nombreEspecialista,
      especialidad: "Fisioterapia",
      turnoId: `temp_${Date.now()}`,
      centroMedico: "Fisiopasteur",
    };

    const resultado = await realizarPeticionBot(
      "/api/turno/confirmar",
      datosBot,
    );

    if (resultado.status === "success") {
      console.log(`✅ Confirmación individual enviada a ${telefono}`);
    } else {
      console.error(
        `❌ Error enviando confirmación individual: ${resultado.message}`,
      );
    }

    return resultado;
  }

  // Si es un objeto TurnoConDetalles, usar la función original
  const turno = turnoOrTelefono;
  console.log("📱 Enviando confirmación de turno por WhatsApp...");

  // Validar datos básicos
  if (!turno.paciente?.telefono) {
    return {
      status: "error",
      message: "El paciente no tiene número de teléfono registrado",
    };
  }

  // Obtener branding de la clínica
  let nombreOrganizacion = 'Centro Médico';
  try {
    const brandingResult = await getBrandingConfig();
    if (brandingResult.success && brandingResult.data) {
      nombreOrganizacion = brandingResult.data.nombre;
    }
  } catch (error) {
    console.warn('No se pudo obtener branding, usando nombre por defecto');
  }

  const datosBot = mapearTurnoParaBot(turno, nombreOrganizacion);
  const resultado = await realizarPeticionBot("/api/turno/confirmar", datosBot);

  if (resultado.status === "success") {
    console.log(
      `✅ Confirmación enviada a ${turno.paciente.telefono} para turno ${turno.id_turno}`,
    );
  } else {
    console.error(`❌ Error enviando confirmación: ${resultado.message}`);
  }

  return resultado;
}

/**
 * Enviar recordatorio de turno por WhatsApp
 * ✅ MULTI-ORG: Incluye branding de la organización
 */
export async function enviarRecordatorioTurno(
  turno: TurnoConDetalles,
): Promise<BotResponse> {
  console.log("⏰ Enviando recordatorio de turno por WhatsApp...");

  // Validar datos básicos
  if (!turno.paciente?.telefono) {
    return {
      status: "error",
      message: "El paciente no tiene número de teléfono registrado",
    };
  }

  // Obtener branding de la clínica
  let nombreOrganizacion = 'Centro Médico';
  try {
    const brandingResult = await getBrandingConfig();
    if (brandingResult.success && brandingResult.data) {
      nombreOrganizacion = brandingResult.data.nombre;
    }
  } catch (error) {
    console.warn('No se pudo obtener branding, usando nombre por defecto');
  }

  const datosBot = mapearTurnoParaBot(turno, nombreOrganizacion);
  const resultado = await realizarPeticionBot(
    "/api/turno/recordatorio",
    datosBot,
  );

  if (resultado.status === "success") {
    console.log(
      `✅ Recordatorio enviado a ${turno.paciente.telefono} para turno ${turno.id_turno}`,
    );
  } else {
    console.error(`❌ Error enviando recordatorio: ${resultado.message}`);
  }

  return resultado;
}

/**
 * Enviar mensaje personalizado por WhatsApp
 */
export async function enviarMensajePersonalizado(
  telefono: string,
  mensaje: string,
  media?: string,
): Promise<BotResponse> {
  console.log("💬 Enviando mensaje personalizado por WhatsApp...");

  const data = { telefono, mensaje, media };
  const resultado = await realizarPeticionBot("/api/mensaje/enviar", data);

  if (resultado.status === "success") {
    console.log(`✅ Mensaje enviado a ${telefono}`);
  } else {
    console.error(`❌ Error enviando mensaje: ${resultado.message}`);
  }

  return resultado;
}

/**
 * Verificar estado del bot de WhatsApp
 */
export async function verificarEstadoBot(): Promise<boolean> {
  try {
    const response = await fetch(`${BOT_URL}/api/health`);

    if (!response.ok) return false;

    const result = await response.json();
    return result.status === "ok";
  } catch (error) {
    console.error("Error verificando estado del bot:", error);
    return false;
  }
}

/**
 * ✅ ÚNICA FUNCIÓN QUE ANALIZA PATRONES DE TURNOS
 * Si quieres cambiar la lógica de análisis, solo modifica AQUÍ
 */
function analizarPatronesTurnos(turnos: any[]) {
  const diasSemanaPorId: Record<number, string> = {
    0: "domingo",
    1: "lunes",
    2: "martes",
    3: "miércoles",
    4: "jueves",
    5: "viernes",
    6: "sábado",
  };

  const patronesPorDiaYHora: Record<string, Set<string>> = {};

  turnos.forEach((turno) => {
    const fecha = dayjs(turno.fecha, "YYYY-MM-DD");
    const diaNumero = fecha.day();
    const diaSemana = diasSemanaPorId[diaNumero] || "desconocido";

    const hora = turno.hora || turno.hora_inicio;
    const horaFormateada = hora.substring(0, 5);

    const key = `${diaSemana}_${horaFormateada}`;
    if (!patronesPorDiaYHora[key]) {
      patronesPorDiaYHora[key] = new Set();
    }
    patronesPorDiaYHora[key].add(turno.fecha);
  });

  const patronesTexto: string[] = [];
  Object.keys(patronesPorDiaYHora).forEach((key) => {
    const [dia, hora] = key.split("_");

    const plurales: Record<string, string> = {
      domingo: "domingos",
      lunes: "lunes",
      martes: "martes",
      miércoles: "miércoles",
      jueves: "jueves",
      viernes: "viernes",
      sábado: "sábados",
    };

    const diaPlural = plurales[dia] || dia;
    patronesTexto.push(`${diaPlural} a las ${hora}`);
  });

  // Obtener fecha del último turno
  const fechas = turnos
    .map((t) => dayjs(t.fecha, "YYYY-MM-DD"))
    .sort((a, b) => b.valueOf() - a.valueOf());
  const ultimaFecha = fechas[0];

  return {
    patronesTexto,
    totalTurnos: turnos.length,
    ultimaFecha,
  };
}

/**
 * ✅ ÚNICA FUNCIÓN QUE GENERA MENSAJES AGRUPADOS PARA PILATES
 * Si quieres cambiar el texto del mensaje, solo modifica AQUÍ
 */
export async function enviarNotificacionGrupal(
  telefono: string,
  nombrePaciente: string,
  turnos: any[],
): Promise<BotResponse> {
  console.log("📱 Enviando notificación agrupada por WhatsApp...");

  if (!telefono || !nombrePaciente || !turnos || turnos.length === 0) {
    return {
      status: "error",
      message: "Faltan datos requeridos para enviar la notificación agrupada",
    };
  }

  try {
    // Analizar patrones
    const analisis = analizarPatronesTurnos(turnos);

    // Obtener el mes de los turnos (usar el primer turno)
    const nombreMes = dayjs(turnos[0].fecha, "YYYY-MM-DD").format("MMMM");
    const nombreMesCapitalizado =
      nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    // ✅ MENSAJE FORMATO CLIENTE - Con mes especificado
    const mensaje = `¡Hola ${nombrePaciente}! 🌟

Se han confirmado tus turnos de Pilates por el mes de ${nombreMesCapitalizado}:

${analisis.patronesTexto.map((p) => `• ${p}`).join("\n")}

Te esperamos en Fisiopasteur. ¡Nos vemos pronto! 💪

_Recibirás recordatorios antes de cada clase._`;

    console.log("📱 [WhatsApp Bot] Mensaje generado:", mensaje);

    // Enviar mensaje
    const resultado = await enviarMensajePersonalizado(telefono, mensaje);

    if (resultado.status === "success") {
      console.log(
        `✅ Notificación agrupada enviada a ${telefono} para ${turnos.length} turnos`,
      );
    } else {
      console.error(
        `❌ Error enviando notificación agrupada: ${resultado.message}`,
      );
    }

    return resultado;
  } catch (error) {
    console.error("Error preparando notificación agrupada:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * ✅ FUNCIÓN PARA ENVIAR NOTIFICACIÓN AGRUPADA DE TURNOS NORMALES (NO PILATES)
 * Envía un mensaje con el listado de fechas y horarios
 */
export async function enviarNotificacionGrupalTurnos(
  telefono: string,
  nombrePaciente: string,
  turnos: any[],
  nombreEspecialista?: string,
): Promise<BotResponse> {
  console.log("📱 Enviando notificación agrupada de turnos por WhatsApp...");

  if (!telefono || !nombrePaciente || !turnos || turnos.length === 0) {
    return {
      status: "error",
      message: "Faltan datos requeridos para enviar la notificación agrupada",
    };
  }

  try {
    // Ordenar turnos por fecha y hora
    const turnosOrdenados = [...turnos].sort((a, b) => {
      const fechaA = dayjs(`${a.fecha} ${a.hora}`, "YYYY-MM-DD HH:mm:ss");
      const fechaB = dayjs(`${b.fecha} ${b.hora}`, "YYYY-MM-DD HH:mm:ss");
      return fechaA.valueOf() - fechaB.valueOf();
    });

    // Formatear cada turno con día, fecha DD/MM y hora en formato 24h
    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    const listaTurnos = turnosOrdenados
      .map((turno) => {
        const fecha = dayjs(turno.fecha, "YYYY-MM-DD");

        // Obtener diminutivo del día
        const diaSemana = diasSemana[fecha.day()];

        const fechaFormateada = fecha.format("DD/MM");

        // Extraer hora en formato 24h (HH:MM)
        const hora =
          turno.hora?.substring(0, 5) ||
          turno.hora_inicio?.substring(0, 5) ||
          "";

        return `• ${diaSemana} ${fechaFormateada} a las ${hora}hs`;
      })
      .join("\n");

    // Obtener nombre de especialidad si existe
    const especialidadNombre =
      turnos[0]?.especialidad?.nombre || "Fisioterapia";

    // Construir mensaje
    const mensaje = `¡Hola ${nombrePaciente}! 👋

Se han confirmado tus ${turnos.length} turno${turnos.length > 1 ? "s" : ""} de ${especialidadNombre}${nombreEspecialista ? ` con ${nombreEspecialista}` : ""}:

${listaTurnos}

📍 Fisiopasteur
⏰ Te enviaremos recordatorios antes de cada turno.

¡Nos vemos pronto!`;

    console.log("📱 [WhatsApp Bot] Mensaje de turnos generado:", mensaje);

    // Enviar mensaje
    const resultado = await enviarMensajePersonalizado(telefono, mensaje);

    if (resultado.status === "success") {
      console.log(
        `✅ Notificación agrupada de turnos enviada a ${telefono} para ${turnos.length} turnos`,
      );
    } else {
      console.error(
        `❌ Error enviando notificación agrupada de turnos: ${resultado.message}`,
      );
    }

    return resultado;
  } catch (error) {
    console.error("Error preparando notificación agrupada de turnos:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
