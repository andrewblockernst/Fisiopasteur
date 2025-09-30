import { NextRequest, NextResponse } from 'next/server';
import { 
  obtenerNotificacionesPendientes, 
  marcarNotificacionEnviada,
  marcarNotificacionFallida 
} from '@/lib/services/notificacion.service';
import { enviarMensajePersonalizado, verificarEstadoBot } from '@/lib/services/whatsapp-bot.service';

export async function GET(request: NextRequest) {
  try {
    // Verificar que el bot esté disponible
    const botDisponible = await verificarEstadoBot();
    if (!botDisponible) {
      return NextResponse.json({
        success: false,
        error: 'Bot de WhatsApp no disponible'
      }, { status: 503 });
    }

    // Obtener notificaciones pendientes
    const notificacionesResult = await obtenerNotificacionesPendientes();
    
    if (!notificacionesResult.success || !notificacionesResult.data) {
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo notificaciones pendientes'
      }, { status: 500 });
    }

    const notificaciones = notificacionesResult.data;
    console.log(`📋 Procesando ${notificaciones.length} notificaciones pendientes...`);

    let enviadas = 0;
    let fallidas = 0;

    // Procesar cada notificación pendiente
    for (const notificacion of notificaciones) {
      try {
        if (!notificacion.telefono || !notificacion.mensaje) {
          console.log(`⚠️ Notificación ${notificacion.id_notificacion} sin teléfono o mensaje`);
          await marcarNotificacionFallida(notificacion.id_notificacion);
          fallidas++;
          continue;
        }

        // Enviar mensaje por WhatsApp
        const resultadoEnvio = await enviarMensajePersonalizado(
          notificacion.telefono,
          notificacion.mensaje
        );

        if (resultadoEnvio.status === 'success') {
          await marcarNotificacionEnviada(notificacion.id_notificacion);
          enviadas++;
          console.log(`✅ Notificación ${notificacion.id_notificacion} enviada exitosamente`);
        } else {
          await marcarNotificacionFallida(notificacion.id_notificacion);
          fallidas++;
          console.log(`❌ Error enviando notificación ${notificacion.id_notificacion}: ${resultadoEnvio.message}`);
        }

        // Pequeña pausa entre envíos para no saturar el bot
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        await marcarNotificacionFallida(notificacion.id_notificacion);
        fallidas++;
        console.error(`❌ Error procesando notificación ${notificacion.id_notificacion}:`, error);
      }
    }

    const resultado = {
      success: true,
      procesadas: notificaciones.length,
      enviadas,
      fallidas,
      timestamp: new Date().toISOString()
    };

    console.log(`🎯 Proceso completado: ${enviadas} enviadas, ${fallidas} fallidas de ${notificaciones.length} total`);

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('Error en procesamiento de notificaciones:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'test-bot':
        const botDisponible = await verificarEstadoBot();
        return NextResponse.json({
          success: true,
          botDisponible,
          timestamp: new Date().toISOString()
        });
        
      case 'send-test-message':
        const { telefono, mensaje } = await request.json();
        
        if (!telefono || !mensaje) {
          return NextResponse.json({
            success: false,
            error: 'Teléfono y mensaje son requeridos'
          }, { status: 400 });
        }
        
        const resultado = await enviarMensajePersonalizado(telefono, mensaje);
        return NextResponse.json(resultado);
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no reconocida'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error en endpoint de notificaciones:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}