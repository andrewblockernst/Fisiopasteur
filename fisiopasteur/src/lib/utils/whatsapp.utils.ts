// Funciones utilitarias para WhatsApp (NO son server actions)
import type { TurnoWithRelations } from "@/types/database.types";

// =====================================
// 🔧 FUNCIONES AUXILIARES
// =====================================

/**
 * Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
 */
export function formatearFechaParaBot(fecha: string): string {
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Formatear hora de HH:MM:SS a HH:MM
 */
export function formatearHoraParaBot(hora: string): string {
  return hora.substring(0, 5); // Toma solo HH:MM
}

/**
 * Convertir datos del turno al formato esperado por el bot
 */
export function mapearTurnoParaBot(turno: TurnoWithRelations) {
  return {
    pacienteNombre: turno.paciente?.nombre || 'Paciente',
    pacienteApellido: turno.paciente?.apellido || '',
    telefono: turno.paciente?.telefono || '',
    fecha: formatearFechaParaBot(turno.fecha),
    hora: formatearHoraParaBot(turno.hora),
    profesional: turno.especialista ? 
      `${turno.especialista.nombre} ${turno.especialista.apellido}` : 
      'Profesional',
    especialidad: turno.especialidad?.nombre || 'Consulta',
    turnoId: turno.id_turno.toString(),
    centroMedico: 'Fisiopasteur'
  };
}

/**
 * Opciones de recordatorio disponibles
 */
export const OPCIONES_RECORDATORIO = {
  '1h': { label: '1 hora antes', minutos: 60 },
  '2h': { label: '2 horas antes', minutos: 120 },
  '3h': { label: '3 horas antes', minutos: 180 },
  '1d': { label: '1 día antes', minutos: 1440 },
  '2d': { label: '2 días antes', minutos: 2880 }
} as const;

export type TipoRecordatorio = keyof typeof OPCIONES_RECORDATORIO;

/**
 * Calcular cuándo enviar recordatorios basado en fecha/hora del turno
 */
export function calcularTiemposRecordatorio(
  fecha: string, 
  hora: string,
  tiposRecordatorio: TipoRecordatorio[] = ['1d', '2h']
): Record<TipoRecordatorio, Date | null> {
  try {
    // Crear fecha/hora del turno en zona horaria de Argentina (UTC-3)
    // Formato ISO: YYYY-MM-DDTHH:mm:ss-03:00
    const [year, month, day] = fecha.split('-');
    const [hours, minutes] = hora.split(':');
    const fechaTurno = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00-03:00`);
    const ahora = new Date();
    
    const recordatorios: Record<TipoRecordatorio, Date | null> = {
      '1h': null,
      '2h': null,
      '3h': null,
      '1d': null,
      '2d': null
    };
    
    // Calcular cada tipo de recordatorio solicitado
    for (const tipo of tiposRecordatorio) {
      const opcion = OPCIONES_RECORDATORIO[tipo];
      if (opcion) {
        const tiempoRecordatorio = new Date(fechaTurno.getTime() - (opcion.minutos * 60 * 1000));
        recordatorios[tipo] = tiempoRecordatorio > ahora ? tiempoRecordatorio : null;
      }
    }
    
    return recordatorios;
  } catch (error) {
    console.error('Error calculando tiempos de recordatorio:', error);
    return {
      '1h': null,
      '2h': null,
      '3h': null,
      '1d': null,
      '2d': null
    };
  }
}

/**
 * Función de compatibilidad con el código existente
 */
export function calcularTiemposRecordatorioLegacy(fecha: string, hora: string): {
  recordatorio24h: Date | null;
  recordatorio2h: Date | null;
} {
  const recordatorios = calcularTiemposRecordatorio(fecha, hora, ['1d', '2h']);
  return {
    recordatorio24h: recordatorios['1d'],
    recordatorio2h: recordatorios['2h']
  };
}