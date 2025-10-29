import type { Tables } from './database.types';

// ========================================
// TIPOS CONSOLIDADOS PARA COMPONENTES
// ========================================

/**
 * Tipo para turnos con relaciones completas
 * Usado en listados, detalles y componentes de turnos
 */
export type TurnoWithRelations = {
  id_turno: number;
  fecha: string;
  hora: string;
  estado: string | null;
  observaciones: string | null;
  notas: string | null;
  precio: number | null;
  tipo_plan: string | null;
  created_at: string | null;
  updated_at: string | null;
  id_box: number | null;
  id_especialidad: number | null;
  id_especialista: string | null;
  id_paciente: number | null;
  dificultad: 'principiante' | 'intermedio' | 'avanzado' | null;
  paciente: {
    id_paciente: number;
    nombre: string;
    apellido: string;
    telefono: string;
    dni: string | null;
    email: string | null;
  } | null;
  especialista: {
    id_usuario: string;
    nombre: string;
    apellido: string;
    color: string | null;
  } | null;
  especialidad: {
    id_especialidad: number;
    nombre: string;
  } | null;
  box: {
    id_box: number;
    numero: number;
  } | null;
};

/**
 * Tipo para especialistas con sus especialidades asignadas
 * Usado en formularios y selects de especialistas
 */
export type EspecialistaWithSpecialties = {
  id_usuario: string;
  nombre: string;
  apellido: string;
  color: string | null;
  email: string;
  telefono: string | null;
  activo: boolean | null;
  especialidad: { 
    id_especialidad: number; 
    nombre: string; 
  } | null;
  usuario_especialidad: { 
    especialidad: { 
      id_especialidad: number; 
      nombre: string; 
    }; 
  }[];
};

/**
 * Tipo para opciones de select/dropdown
 * Estructura genérica para componentes de selección
 */
export type SelectOption = { 
  label: string; 
  value: string; 
};

/**
 * Tipos de estado válidos para turnos
 */
export type EstadoTurno = 'programado' | 'en_curso' | 'atendido' | 'cancelado' | 'no_asistio';

/**
 * Tipos de plan de pago para turnos
 */
export type TipoPlan = 'particular' | 'obra_social';

// ========================================
// ALIASES DE TIPOS BASE (Para conveniencia)
// ========================================

/**
 * Tipos base de tablas de Supabase
 * Re-exportados para acceso rápido
 */
export type Turno = Tables<'turno'>;
export type Paciente = Tables<'paciente'>;
export type Usuario = Tables<'usuario'>;
export type Especialidad = Tables<'especialidad'>;
export type Box = Tables<'box'>;
export type Rol = Tables<'rol'>;
export type UsuarioEspecialidad = Tables<'usuario_especialidad'>;
export type Notificacion = Tables<'notificacion'>;
export type EvolucionClinica = Tables<'evolucion_clinica'>;

// ========================================
// RE-EXPORTACIONES DE SUPABASE
// ========================================

/**
 * Re-exportar utilidades de tipos de Supabase
 * para acceso centralizado desde este archivo
 */
export type { 
  Tables, 
  TablesInsert, 
  TablesUpdate, 
  Enums,
  Database 
} from './database.types';
