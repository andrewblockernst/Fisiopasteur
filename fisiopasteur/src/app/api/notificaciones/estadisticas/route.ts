import { NextRequest, NextResponse } from 'next/server';
import { 
  obtenerEstadisticasNotificaciones,
  limpiarNotificacionesAntiguas,
  obtenerNotificacionesTurno
} from '@/lib/services/notificacion.service';
import { verificarEstadoBot } from '@/lib/services/whatsapp-bot.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accion = searchParams.get('action') || 'estadisticas';
    const idTurno = searchParams.get('turno_id');
    const fechaDesde = searchParams.get('fecha_desde') || undefined;
    const fechaHasta = searchParams.get('fecha_hasta') || undefined;

    switch (accion) {
      case 'estadisticas':
        const estadisticas = await obtenerEstadisticasNotificaciones(fechaDesde, fechaHasta);
        const botEstado = await verificarEstadoBot();
        
        return NextResponse.json({
          success: estadisticas.success,
          data: {
            ...estadisticas.data,
            botDisponible: botEstado,
            ultimaActualizacion: new Date().toISOString()
          }
        });

      case 'turno':
        if (!idTurno) {
          return NextResponse.json({
            success: false,
            error: 'ID de turno requerido'
          }, { status: 400 });
        }
        
        const notificacionesTurno = await obtenerNotificacionesTurno(parseInt(idTurno));
        return NextResponse.json(notificacionesTurno);

      case 'health':
        const botOnline = await verificarEstadoBot();
        return NextResponse.json({
          success: true,
          data: {
            botDisponible: botOnline,
            timestamp: new Date().toISOString(),
            status: botOnline ? 'online' : 'offline'
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no reconocida'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en endpoint de estadísticas:', error);
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
      case 'limpiar':
        const resultadoLimpieza = await limpiarNotificacionesAntiguas();
        return NextResponse.json(resultadoLimpieza);

      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no reconocida'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en operación POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}