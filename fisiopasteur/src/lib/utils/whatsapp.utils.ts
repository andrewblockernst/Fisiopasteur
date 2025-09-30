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
 * Calcular cuándo enviar recordatorios basado en fecha/hora del turno
 */
export function calcularTiemposRecordatorio(fecha: string, hora: string): {
  recordatorio24h: Date | null;
  recordatorio2h: Date | null;
} {
  try {
    // Crear fecha/hora del turno
    const fechaTurno = new Date(`${fecha} ${hora}`);
    const ahora = new Date();
    
    // Recordatorio 24 horas antes
    const tiempo24h = new Date(fechaTurno.getTime() - (24 * 60 * 60 * 1000));
    const recordatorio24h = tiempo24h > ahora ? tiempo24h : null;
    
    // Recordatorio 2 horas antes
    const tiempo2h = new Date(fechaTurno.getTime() - (2 * 60 * 60 * 1000));
    const recordatorio2h = tiempo2h > ahora ? tiempo2h : null;
    
    return { recordatorio24h, recordatorio2h };
  } catch (error) {
    console.error('Error calculando tiempos de recordatorio:', error);
    return { recordatorio24h: null, recordatorio2h: null };
  }
}