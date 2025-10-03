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
export async function enviarConfirmacionTurno(turno: TurnoWithRelations): Promise<BotResponse> {
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

