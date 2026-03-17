import { NextResponse } from 'next/server';
import { obtenerNotificacionesPendientes } from '@/lib/services/notificacion.service';

/**
 * GET /api/cron/recordatorios/pendientes
 * Retorna notificaciones de tipo [RECORDATORIO] pendientes de enviar.
 * El bot de Heroku las consume, las envía directamente a WaSender con su
 * propio rate limiting, y luego llama a /api/cron/notificacion/[id] para
 * marcar cada una como enviada o fallida.
 */
export async function GET() {
  try {
    const resultado = await obtenerNotificacionesPendientes();

    if (!resultado.success) {
      return NextResponse.json(
        { success: false, error: resultado.error },
        { status: 500 }
      );
    }

    const todas = (resultado.data as any[]) || [];
    const recordatorios = todas.filter((n: any) =>
      n.mensaje?.includes('[RECORDATORIO')
    );

    return NextResponse.json({ success: true, data: recordatorios });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
