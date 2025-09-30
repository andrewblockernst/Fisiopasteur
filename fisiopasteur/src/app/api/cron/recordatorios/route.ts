import { NextRequest, NextResponse } from 'next/server';
import { ejecutarCronRecordatorios } from '@/lib/services/cron-recordatorios.service';

export async function GET() {
  try {
    console.log('🔄 Ejecutando cron de recordatorios via API...');
    
    const resultado = await ejecutarCronRecordatorios();
    
    if (resultado.success) {
      return NextResponse.json({
        success: true,
        message: 'Cron de recordatorios ejecutado exitosamente',
        data: resultado
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Error ejecutando cron de recordatorios',
        error: resultado.error
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error en endpoint de cron:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  // Permitir también POST para herramientas externas de cron
  return GET();
}