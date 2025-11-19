import type { Tables } from './database.types';

// ========================================
// TIPOS MULTI-ORGANIZACIÓN
// ========================================

/**
 * Contexto de organización para scoping de requests
 * Usado en middleware y server actions para filtrar datos
 */
export type OrganizacionContext = {
  id_organizacion: string;
  nombre: string;
  telefono_contacto: string | null;
  email_contacto: string | null;
  cuit_cuil: string | null;
};

/**
 * Usuario con sus organizaciones activas
 * Para selector de organización y gestión de accesos
 */
export type UsuarioConOrganizaciones = {
  id_usuario: string;
  nombre: string;
  apellido: string;
  email: string;
  organizaciones: {
    id_usuario_organizacion: string;
    id_organizacion: string;
    id_rol: number;
    activo: boolean;
    color_calendario: string | null;
    fecha_asignacion: string;
    organizacion: {
      id_organizacion: string;
      nombre: string;
      activo: boolean;
    };
    rol: {
      id: number;
      nombre: string;
      jerarquia: number;
    };
  }[];
};

/**
 * Especialista dentro del contexto de una organización
 * Reemplaza EspecialistaWithSpecialties para multi-org
 */
export type EspecialistaWithOrganization = {
  id_usuario_organizacion: string;
  id_usuario: string;
  id_organizacion: string;
  id_rol: number;
  color_calendario: string | null;
  activo: boolean;
  usuario: {
    id_usuario: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string | null;
  };
  especialidades: {
    id_usuario_especialidad: string;
    id_especialidad: number;
    precio_particular: number | null;
    precio_obra_social: number | null;
    especialidad: {
      id_especialidad: number;
      nombre: string;
    };
  }[];
};

// ========================================
// TIPOS CONSOLIDADOS PARA COMPONENTES
// ========================================

/**
 * Tipo para turnos con relaciones completas
 * Usado en listados, detalles y componentes de turnos
 * ACTUALIZADO: incluye id_organizacion
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
  id_organizacion: string | null;
  id_grupo_tratamiento?: string;
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
export type Organizacion = Tables<'organizacion'>;
export type UsuarioOrganizacion = Tables<'usuario_organizacion'>;
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