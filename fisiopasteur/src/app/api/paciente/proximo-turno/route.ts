import { NextRequest, NextResponse } from 'next/server';
import { obtenerProximoTurnoPorTelefono } from '@/lib/actions/turno.action';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get('telefono');
    
    console.log('🌐 [API] Solicitud recibida para próximo turno');
    console.log(`📱 [API] Teléfono recibido: ${telefono}`);
    
    if (!telefono) {
      console.log('❌ [API] No se recibió teléfono');
      return NextResponse.json(
        { success: false, message: 'Teléfono es requerido' },
        { status: 400 }
      );
    }
    
    const { success, data: turno, error } = await obtenerProximoTurnoPorTelefono(telefono);
    console.log(`📊 [API] Resultado: success=${success}, turno=${turno ? 'encontrado' : 'no encontrado'}, error=${error || 'ninguno'}`);
    
    if (!success) {
      console.error('Error obteniendo turno:', error);
      return NextResponse.json(
        { success: false, message: 'Error obteniendo turno', error },
        { status: 500 }
      );
    }
    
    if (!turno) {
      return NextResponse.json({
        success: true,
        hasTurno: false,
        message: 'No tienes turnos próximos programados'
      });
    }
    
    // Formatear la respuesta con type assertion para evitar errores de tipos
    const turnoData = turno as any;
    return NextResponse.json({
      success: true,
      hasTurno: true,
      turno: {
        id: turnoData.id_turno,
        fecha: turnoData.fecha,
        hora: turnoData.hora,
        estado: turnoData.estado,
        paciente: {
          nombre: turnoData.paciente?.nombre,
          apellido: turnoData.paciente?.apellido
        },
        especialista: {
          nombre: turnoData.especialista?.nombre,
          apellido: turnoData.especialista?.apellido
        },
        especialidad: {
          nombre: turnoData.especialidad?.nombre
        }
      }
    });
    
  } catch (error) {
    console.error('Error en endpoint de próximo turno:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
