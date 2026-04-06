// Funciones utilitarias para WhatsApp (NO son server actions)
import type { TurnoConDetalles } from "@/stores/turno-store";
import { now, parseYmdHm } from "@/lib/dayjs";

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
 * ✅ MULTI-ORG: Ahora recibe brandingConfig para personalización
 */
export function mapearTurnoParaBot(
  turno: TurnoConDetalles, 
  centroMedico?: string
) {
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
    centroMedico: centroMedico || 'Centro Médico' // ✅ Personalizable
  };
}

/** Datos legibles para el mensaje de “turno modificado” (no va en archivos "use server") */
export type SnapshotTurnoParaAviso = {
  fecha: string;
  hora: string;
  profesional: string;
  especialidad: string;
  boxLabel: string | null;
};

/**
 * Arma el snapshot desde un turno con relaciones Supabase (paciente/especialista/box).
 */
export function snapshotDesdeTurnoRelacionado(turno: {
  fecha: string;
  hora: string;
  especialista?: { nombre?: string | null; apellido?: string | null } | null;
  especialidad?: { nombre?: string | null } | null;
  box?: { numero?: number | null } | null;
}): SnapshotTurnoParaAviso {
  const prof = turno.especialista
    ? `${turno.especialista.nombre ?? ""} ${turno.especialista.apellido ?? ""}`.trim()
    : "Profesional";
  const esp = turno.especialidad?.nombre?.trim() || "Consulta";
  const boxNum = turno.box?.numero;
  return {
    fecha: formatearFechaParaBot(turno.fecha),
    hora: formatearHoraParaBot(turno.hora || ""),
    profesional: prof || "Profesional",
    especialidad: esp,
    boxLabel:
      boxNum !== undefined && boxNum !== null ? `Box ${boxNum}` : null,
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
 * ✅ Usa zona horaria LOCAL del servidor (no hardcoded)
 */
export function calcularTiemposRecordatorio(
  fecha: string, 
  hora: string,
  tiposRecordatorio: TipoRecordatorio[] = ['1d', '2h']
): Record<TipoRecordatorio, Date | null> {
  try {
    const fechaTurno = parseYmdHm(fecha, hora);
    const ahora = now();

    if (!fechaTurno.isValid()) {
      console.warn(`⚠️ Fecha/hora de turno inválida para recordatorios: fecha='${fecha}', hora='${hora}'`);
      return {
        '1h': null,
        '2h': null,
        '3h': null,
        '1d': null,
        '2d': null
      };
    }
    
    console.log(`📅 Calculando recordatorios para turno: ${fecha} ${hora}`);
    console.log(`   Fecha turno (local): ${fechaTurno.toISOString()}`);
    console.log(`   Ahora (local): ${ahora.toISOString()}`);
    
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
        const tiempoRecordatorio = fechaTurno.subtract(opcion.minutos, 'minute');
        const esValido = tiempoRecordatorio.isAfter(ahora);
        recordatorios[tipo] = esValido ? tiempoRecordatorio.toDate() : null;
        console.log(`   ${tipo}: ${esValido ? tiempoRecordatorio.toISOString() : 'Ya pasó (no se programará)'}`);
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

//A VER QUE ONDA