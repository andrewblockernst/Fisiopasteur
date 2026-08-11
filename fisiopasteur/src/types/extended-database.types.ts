/**
 * Tipos derivados de los tipos generados por Supabase.
 *
 * Regla: NUNCA repetir a mano columnas que ya existen en `Tables<'x'>`.
 * Componer con `Pick<>`, `Omit<>` y unions. Si una columna cambia en la DB,
 * `npm run types:generate` la propaga y estos alias siguen alineados solos.
 */

import type { Tables } from '@/lib/database.types';

// ========================================
// ALIASES DE TABLAS
// ========================================

export type Turno = Tables<'turno'>;
export type Paciente = Tables<'paciente'>;
export type Usuario = Tables<'usuario'>;
export type Especialidad = Tables<'especialidad'>;
export type Box = Tables<'box'>;
export type Rol = Tables<'rol'>;
export type UsuarioEspecialidad = Tables<'usuario_especialidad'>;
export type Notificacion = Tables<'notificacion'>;
export type EvolucionClinica = Tables<'evolucion_clinica'>;
export type GrupoTratamiento = Tables<'grupo_tratamiento'>;

// ========================================
// ENUMS DE APLICACIÓN (no representados en DB como enum)
// ========================================

/**
 * Estados válidos para un turno.
 * - programado: agendado (azul)
 * - pendiente:  pasado sin actualizar (amarillo) — asignado automáticamente
 * - atendido:   confirmado por especialista (verde)
 * - cancelado:  marcado como cancelado (rojo)
 * - eliminado:  soft-delete, oculto en todas las vistas
 */
export type EstadoTurno = 'programado' | 'pendiente' | 'atendido' | 'cancelado' | 'eliminado';

/** Planes de pago para turnos. */
export type TipoPlan = 'particular' | 'obra_social';

/** Niveles de dificultad para clases de Pilates. */
export type Dificultad = 'principiante' | 'intermedio' | 'avanzado';

// ========================================
// SHAPES DE JOINS (relaciones traídas por .select("...,rel(...)") )
// ========================================
//
// Estos tipos modelan la forma que devuelve PostgREST cuando se piden
// relaciones anidadas. Se derivan con Pick<> de los Row generados para
// que cualquier cambio en la DB se propague automáticamente.

export type TurnoWithRelations = Turno & {
  paciente:
    | Pick<Paciente, 'id_paciente' | 'nombre' | 'apellido' | 'telefono' | 'dni' | 'email'>
    | null;
  especialista:
    | Pick<Usuario, 'id_usuario' | 'nombre' | 'apellido' | 'color'>
    | null;
  especialidad: Pick<Especialidad, 'id_especialidad' | 'nombre'> | null;
  box: Pick<Box, 'id_box' | 'numero'> | null;
  grupo_tratamiento:
    | Pick<GrupoTratamiento, 'id_grupo' | 'cantidad_turnos_planificados'>
    | null;
};

export type EspecialistaWithSpecialties = Pick<
  Usuario,
  'id_usuario' | 'nombre' | 'apellido' | 'color' | 'email' | 'telefono' | 'activo'
> & {
  especialidad: Pick<Especialidad, 'id_especialidad' | 'nombre'> | null;
  usuario_especialidad: {
    especialidad: Pick<Especialidad, 'id_especialidad' | 'nombre'>;
  }[];
};

// ========================================
// UTILIDADES GENÉRICAS DE UI
// ========================================

export type SelectOption = {
  label: string;
  value: string;
};

// ========================================
// RE-EXPORTACIONES
// ========================================

export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Database,
} from '@/lib/database.types';
