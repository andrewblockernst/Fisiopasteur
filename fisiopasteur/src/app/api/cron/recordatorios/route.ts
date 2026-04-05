import { NextResponse } from 'next/server';

/**
 * Este endpoint está deshabilitado.
 * Los recordatorios son procesados exclusivamente por el bot de Heroku
 * (procesarRecordatoriosAutonomo, cada 2 minutos) consultando Supabase directamente.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Recordatorios manejados por el bot de Heroku'
  });
}

export async function POST() {
  return GET();
}