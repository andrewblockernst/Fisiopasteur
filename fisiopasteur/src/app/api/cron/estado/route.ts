import { NextRequest, NextResponse } from 'next/server';
import { verificarEstadoSistemaNotificaciones } from '@/lib/services/cron-recordatorios.service';
import { obtenerEstadisticasNotificaciones } from '@/lib/services/notificacion.service';

export async function GET() {
  try {
    // Verificar estado del sistema
    const estadoSistema = await verificarEstadoSistemaNotificaciones();
    
    // Obtener estadísticas recientes (últimos 7 días)
    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - 7);
    
    const estadisticas = await obtenerEstadisticasNotificaciones(
      fechaDesde.toISOString().split('T')[0]
    );
    
    return NextResponse.json({
      success: true,
      data: {
        sistema: estadoSistema,
        estadisticas: estadisticas.success ? estadisticas.data : null
      }
    });
    
  } catch (error) {
    console.error('Error en endpoint de estado:', error);
    return NextResponse.json({
      success: false,
      message: 'Error obteniendo estado del sistema',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}