"use server";

import type { TurnoWithRelations } from "@/types/database.types";
import { mapearTurnoParaBot } from "@/lib/utils/whatsapp.utils";

// Configuración del bot
const BOT_URL = process.env.WHATSAPP_BOT_URL || 'https://fisiopasteur-whatsapp-bot-df9edfb46742.herokuapp.com';

// Interfaces para los datos del bot
interface TurnoDataForBot {
  pacienteNombre: string;
  pacienteApellido: string;
  telefono: string;
  fecha: string; // DD/MM/YYYY
  hora: string;  // HH:MM
  profesional: string;
  especialidad: string;
  turnoId: string;
  centroMedico?: string;
}

interface BotResponse {
  status: 'success' | 'error';
  message: string;
  turnoId?: string;
}

// =====================================
// 🔧 FUNCIONES AUXILIARES
// =====================================

/**
 * Realizar petición HTTP al bot
 */
async function realizarPeticionBot(endpoint: string, data: any): Promise<BotResponse> {
  try {
    const response = await fetch(`${BOT_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // Intentar obtener más detalles del error
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
    
    // Manejo específico de errores comunes
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return {
          status: 'error',
          message: 'No se pudo conectar con el bot de WhatsApp. Verifique la conexión.'
        };
      }
      if (error.message.includes('500')) {
        return {
          status: 'error',
          message: 'El bot de WhatsApp no está autenticado. Escanee el código QR.'
        };
      }
      return {
        status: 'error',
        message: error.message
      };
    }
    
    return {
      status: 'error',
      message: 'Error desconocido al comunicarse con el bot'
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
  turnoOrTelefono: TurnoWithRelations | string,
  nombrePaciente?: string,
  nombreEspecialista?: string,
  fecha?: string,
  hora?: string
): Promise<BotResponse> {
  // Si el primer parámetro es un string, es la sobrecarga simple
  if (typeof turnoOrTelefono === 'string') {
    console.log('📱 Enviando confirmación individual por WhatsApp...');
    
    const telefono = turnoOrTelefono;
    if (!telefono || !nombrePaciente || !nombreEspecialista || !fecha || !hora) {
      return {
        status: 'error',
        message: 'Faltan datos requeridos para enviar la confirmación'
      };
    }

    const datosBot = {
      pacienteNombre: nombrePaciente.split(' ')[0] || nombrePaciente,
      pacienteApellido: nombrePaciente.split(' ').slice(1).join(' ') || '',
      telefono,
      fecha,
      hora,
      profesional: nombreEspecialista,
      especialidad: 'Fisioterapia',
      turnoId: `temp_${Date.now()}`,
      centroMedico: 'Fisiopasteur'
    };

    const resultado = await realizarPeticionBot('/api/turno/confirmar', datosBot);
    
    if (resultado.status === 'success') {
      console.log(`✅ Confirmación individual enviada a ${telefono}`);
    } else {
      console.error(`❌ Error enviando confirmación individual: ${resultado.message}`);
    }
    
    return resultado;
  }

  // Si es un objeto TurnoWithRelations, usar la función original
  const turno = turnoOrTelefono;
  console.log('📱 Enviando confirmación de turno por WhatsApp...');
  
  // Validar datos básicos
  if (!turno.paciente?.telefono) {
    return {
      status: 'error',
      message: 'El paciente no tiene número de teléfono registrado'
    };
  }

  const datosBot = mapearTurnoParaBot(turno);
  const resultado = await realizarPeticionBot('/api/turno/confirmar', datosBot);
  
  if (resultado.status === 'success') {
    console.log(`✅ Confirmación enviada a ${turno.paciente.telefono} para turno ${turno.id_turno}`);
  } else {
    console.error(`❌ Error enviando confirmación: ${resultado.message}`);
  }
  
  return resultado;
}

/**
 * Enviar recordatorio de turno por WhatsApp
 */
export async function enviarRecordatorioTurno(turno: TurnoWithRelations): Promise<BotResponse> {
  console.log('⏰ Enviando recordatorio de turno por WhatsApp...');
  
  // Validar datos básicos
  if (!turno.paciente?.telefono) {
    return {
      status: 'error',
      message: 'El paciente no tiene número de teléfono registrado'
    };
  }

  const datosBot = mapearTurnoParaBot(turno);
  const resultado = await realizarPeticionBot('/api/turno/recordatorio', datosBot);
  
  if (resultado.status === 'success') {
    console.log(`✅ Recordatorio enviado a ${turno.paciente.telefono} para turno ${turno.id_turno}`);
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
  media?: string
): Promise<BotResponse> {
  console.log('💬 Enviando mensaje personalizado por WhatsApp...');
  
  const data = { telefono, mensaje, media };
  const resultado = await realizarPeticionBot('/api/mensaje/enviar', data);
  
  if (resultado.status === 'success') {
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
    return result.status === 'ok';
  } catch (error) {
    console.error('Error verificando estado del bot:', error);
    return false;
  }
}

/**
 * Analizar patrones de turnos para crear mensaje inteligente
 */
function analizarPatronesTurnos(turnos: any[]) {
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  
  // Agrupar turnos por día de la semana y horario
  const patronesPorDiaYHora: Record<string, Set<string>> = {};
  
  turnos.forEach(turno => {
    const fecha = new Date(turno.fecha);
    const diaSemana = diasSemana[fecha.getDay()];
    const hora = turno.hora || turno.hora_inicio;
    const horaFormateada = hora.substring(0, 5); // "09:00:00" -> "09:00"
    
    const key = `${diaSemana}_${horaFormateada}`;
    if (!patronesPorDiaYHora[key]) {
      patronesPorDiaYHora[key] = new Set();
    }
    patronesPorDiaYHora[key].add(turno.fecha);
  });

  // Convertir a formato legible
  const patronesTexto: string[] = [];
  Object.keys(patronesPorDiaYHora).forEach(key => {
    const [dia, hora] = key.split('_');
    const cantidadTurnos = patronesPorDiaYHora[key].size;
    // Plural correcto para días de la semana
    const diaPlural = dia === 'miércoles' ? 'miércoles' : `${dia}s`;
    patronesTexto.push(`${diaPlural} a las ${hora}`);
  });

  return {
    patronesTexto,
    totalTurnos: turnos.length,
    diasUnicos: Object.keys(patronesPorDiaYHora).length
  };
}

/**
 * Enviar notificación agrupada para múltiples turnos del mismo paciente
 */
export async function enviarNotificacionGrupal(
  telefono: string,
  nombrePaciente: string,
  turnos: any[]
): Promise<BotResponse> {
  console.log('📱 Enviando notificación agrupada por WhatsApp...');
  
  if (!telefono || !nombrePaciente || !turnos || turnos.length === 0) {
    return {
      status: 'error',
      message: 'Faltan datos requeridos para enviar la notificación agrupada'
    };
  }

  try {
    // Analizar patrones de turnos
    const analisis = analizarPatronesTurnos(turnos);
    
    // Crear mensaje inteligente basado en patrones
    let mensaje: string;
    
    if (analisis.totalTurnos <= 5) {
      // Para pocos turnos, mostrar fechas específicas
      const fechasYHoras = turnos.map(turno => {
        const fecha = new Date(turno.fecha).toLocaleDateString('es-AR');
        const hora = (turno.hora || turno.hora_inicio).substring(0, 5);
        return `• ${fecha} a las ${hora}`;
      });
      
      mensaje = `¡Hola ${nombrePaciente}! 🌟

Se han confirmado ${analisis.totalTurnos} turnos para ti:

${fechasYHoras.join('\n')}

Te esperamos en Fisiopasteur. ¡Nos vemos pronto! 💪`;
    } else {
      // Para muchos turnos, mostrar patrón de días
      mensaje = `¡Hola ${nombrePaciente}! 🌟

Se han confirmado tus turnos de Pilates:

${analisis.patronesTexto.map(p => `• ${p}`).join('\n')}

Total: ${analisis.totalTurnos} clases programadas

Te esperamos en Fisiopasteur. ¡Nos vemos pronto! 💪

_Recibirás recordatorios antes de cada clase._`;
    }

    // Enviar mensaje personalizado
    const resultado = await enviarMensajePersonalizado(telefono, mensaje);
    
    if (resultado.status === 'success') {
      console.log(`✅ Notificación agrupada enviada a ${telefono} para ${turnos.length} turnos`);
    } else {
      console.error(`❌ Error enviando notificación agrupada: ${resultado.message}`);
    }
    
    return resultado;
  } catch (error) {
    console.error('Error preparando notificación agrupada:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

