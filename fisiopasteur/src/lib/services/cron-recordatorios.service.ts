"use server";

import { 
  obtenerNotificacionesPendientes, 
  marcarNotificacionEnviada, 
  marcarNotificacionFallida 
} from "@/lib/services/notificacion.service";
import { enviarRecordatorioTurno, enviarConfirmacionTurno } from "@/lib/services/whatsapp-bot.service";
import type { TurnoConDetalles } from "@/stores/turno-store";

/**
 * Delay helper para respetar rate limits de WaSender
 * WaSender Basic plan: 1 mensaje cada 5 segundos con Account Protection
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Procesar todas las notificaciones pendientes que ya llegaron a su hora programada
 * ⏰ Incluye delay de 5 segundos entre mensajes para respetar rate limit de WaSender
 */
export async function procesarNotificacionesPendientes() {
  console.log('🕐 Iniciando procesamiento de notificaciones pendientes...');
  
  try {
    // Obtener notificaciones que deben enviarse ahora
    const resultado = await obtenerNotificacionesPendientes();
    
    if (!resultado.success || !resultado.data) {
      console.log('❌ Error obteniendo notificaciones pendientes:', resultado.error);
      return { success: false, error: resultado.error };
    }
    
    const notificacionesPendientes = resultado.data;
    console.log(`📋 Encontradas ${notificacionesPendientes.length} notificaciones pendientes`);
    
    if (notificacionesPendientes.length === 0) {
      return { success: true, procesadas: 0, enviadas: 0, fallidas: 0 };
    }
    
    let enviadas = 0;
    let fallidas = 0;
    
    // Procesar cada notificación
    for (let i = 0; i < notificacionesPendientes.length; i++) {
      const notificacion = notificacionesPendientes[i];
      
      try {
        console.log(`📤 Procesando notificación ${notificacion.id_notificacion} para turno ${notificacion.id_turno} (${i + 1}/${notificacionesPendientes.length})`);
        
        // Verificar que tenemos los datos del turno
        if (!notificacion.turno) {
          console.error(`❌ Notificación ${notificacion.id_notificacion} sin datos de turno`);
          await marcarNotificacionFallida(notificacion.id_notificacion);
          fallidas++;
          continue;
        }
        
        // Construir objeto turno completo para el bot
        const turno = notificacion.turno as any;
        const turnoParaBot = turno as unknown as TurnoConDetalles;
        
        // Detectar si es confirmación o recordatorio basándose en el mensaje
        const esConfirmacion = !notificacion.mensaje.includes('[RECORDATORIO');
        const tipoMensaje = esConfirmacion ? 'Confirmación' : 'Recordatorio';
        
        console.log(`📨 Enviando ${tipoMensaje} por WhatsApp...`);
        
        // Enviar confirmación o recordatorio según corresponda
        const resultadoBot = esConfirmacion 
          ? await enviarConfirmacionTurno(turnoParaBot)
          : await enviarRecordatorioTurno(turnoParaBot);
        
        if (resultadoBot.status === 'success') {
          await marcarNotificacionEnviada(notificacion.id_notificacion);
          enviadas++;
          console.log(`✅ ${tipoMensaje} enviado para notificación ${notificacion.id_notificacion}`);
          
          // ⏰ Esperar 5 segundos antes del siguiente mensaje (rate limit de WaSender)
          if (i < notificacionesPendientes.length - 1) {
            console.log(`⏳ Esperando 5 segundos para respetar rate limit de WaSender...`);
            await delay(5000);
          }
        } else {
          await marcarNotificacionFallida(notificacion.id_notificacion);
          fallidas++;
          console.log(`❌ Falló ${tipoMensaje.toLowerCase()} para notificación ${notificacion.id_notificacion}: ${resultadoBot.message}`);
        }
        
      } catch (error) {
        console.error(`❌ Error procesando notificación ${notificacion.id_notificacion}:`, error);
        await marcarNotificacionFallida(notificacion.id_notificacion);
        fallidas++;
      }
    }
    
    console.log(`✨ Procesamiento completado: ${enviadas} enviadas, ${fallidas} fallidas de ${notificacionesPendientes.length} total`);
    
    return { 
      success: true, 
      procesadas: notificacionesPendientes.length, 
      enviadas, 
      fallidas 
    };
    
  } catch (error) {
    console.error('❌ Error general en procesamiento de notificaciones:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Función para ser llamada manualmente o desde un endpoint
 */
export async function ejecutarCronRecordatorios() {
  const timestamp = new Date().toISOString();
  console.log(`🔄 [${timestamp}] Ejecutando cron de recordatorios...`);
  
  const resultado = await procesarNotificacionesPendientes();
  
  if (resultado.success) {
    console.log(`✅ [${timestamp}] Cron completado exitosamente`);
  } else {
    console.log(`❌ [${timestamp}] Cron falló:`, resultado.error);
  }
  
  return resultado;
}

/**
 * Verificar estado del sistema de notificaciones
 */
export async function verificarEstadoSistemaNotificaciones() {
  try {
    const resultado = await obtenerNotificacionesPendientes();
    
    if (!resultado.success) {
      return { 
        saludable: false, 
        mensaje: 'Error accediendo a la base de datos',
        error: resultado.error 
      };
    }
    
    const pendientes = resultado.data?.length || 0;
    
    return {
      saludable: true,
      mensaje: `Sistema funcionando correctamente`,
      notificacionesPendientes: pendientes,
      proximaEjecucion: 'Cada 5 minutos'
    };
    
  } catch (error) {
    return {
      saludable: false,
      mensaje: 'Error inesperado verificando sistema',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}