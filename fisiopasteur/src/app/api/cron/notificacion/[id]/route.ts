import { NextRequest, NextResponse } from 'next/server';
import {
  marcarNotificacionEnviada,
  marcarNotificacionFallida,
} from '@/lib/services/notificacion.service';

/**
 * POST /api/cron/notificacion/[id]
 * Body: { estado: "enviado" | "fallido" }
 * Llamado por el bot de Heroku luego de intentar enviar cada recordatorio.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const { estado } = await req.json();

    if (estado === 'enviado') {
      const resultado = await marcarNotificacionEnviada(id);
      return NextResponse.json(resultado);
    }

    if (estado === 'fallido') {
      const resultado = await marcarNotificacionFallida(id);
      return NextResponse.json(resultado);
    }

    return NextResponse.json(
      { success: false, error: 'Estado inválido. Usar "enviado" o "fallido".' },
      { status: 400 }
    );
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
