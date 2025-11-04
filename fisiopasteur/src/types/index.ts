/**
 * Archivo índice centralizado para todos los tipos del proyecto
 * 
 * Este archivo combina:
 * - Tipos generados automáticamente por Supabase (database.types.ts)
 * - Tipos personalizados y extendidos (extended-database.types.ts)
 * 
 * Uso recomendado:
 * import { TurnoWithRelations, Tables, Paciente } from '@/types';
 * 
 * Nota: Este archivo NO debe modificarse manualmente.
 * Los tipos personalizados se agregan en extended-database.types.ts
 */

// Re-exportar TODOS los tipos de Supabase
export * from './database.types';

// Re-exportar TODOS los tipos personalizados y extendidos
export * from './extended-database.types';
