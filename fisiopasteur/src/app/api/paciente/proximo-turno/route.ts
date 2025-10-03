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
    
    // Formatear la respuesta
    return NextResponse.json({
      success: true,
      hasTurno: true,
      turno: {
        id: turno.id_turno,
        fecha: turno.fecha,
        hora: turno.hora,
        estado: turno.estado,
        paciente: {
          nombre: turno.paciente?.nombre,
          apellido: turno.paciente?.apellido
        },
        especialista: {
          nombre: turno.especialista?.nombre,
          apellido: turno.especialista?.apellido
        },
        especialidad: {
          nombre: turno.especialidad?.nombre
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
