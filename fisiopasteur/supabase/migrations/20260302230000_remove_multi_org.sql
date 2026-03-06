-- ============================================================
-- MIGRACIÓN: Eliminar lógica multi-organizacional
-- Fecha: 2026-03-02
-- Descripción: Elimina las tablas organizacion y usuario_organizacion,
--              mueve id_rol directamente a usuario, y limpia la columna
--              id_organizacion de todas las tablas afectadas.
-- ============================================================

-- ============================================================
-- PASO 1: Agregar id_rol directamente en la tabla usuario
-- ============================================================
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS id_rol integer REFERENCES rol(id);

-- Migrar id_rol desde usuario_organizacion (tomar el primer registro activo de cada usuario)
UPDATE usuario u
SET id_rol = uo.id_rol
FROM usuario_organizacion uo
WHERE uo.id_usuario = u.id_usuario
  AND uo.activo = true
  AND u.id_rol IS NULL;

-- Para usuarios sin registro activo, tomar cualquier registro
UPDATE usuario u
SET id_rol = uo.id_rol
FROM usuario_organizacion uo
WHERE uo.id_usuario = u.id_usuario
  AND u.id_rol IS NULL;

-- ============================================================
-- PASO 2: Limpiar usuario_especialidad
--   → Eliminar la FK a usuario_organizacion (columna id_usuario_organizacion)
--   La columna id_usuario ya existe y es la FK que debemos conservar.
-- ============================================================

-- Primero, eliminar la constraint FK si existe
ALTER TABLE usuario_especialidad
  DROP CONSTRAINT IF EXISTS usuario_especialidad_id_usuario_organizacion_fkey;

-- Luego eliminar la columna
ALTER TABLE usuario_especialidad
  DROP COLUMN IF EXISTS id_usuario_organizacion;

-- ============================================================
-- PASO 3: Eliminar id_organizacion de todas las tablas
-- ============================================================

-- box
ALTER TABLE box
  DROP CONSTRAINT IF EXISTS box_id_organizacion_fkey,
  DROP COLUMN IF EXISTS id_organizacion;

-- especialidad
ALTER TABLE especialidad
  DROP CONSTRAINT IF EXISTS especialidad_id_organizacion_fkey,
  DROP COLUMN IF EXISTS id_organizacion;

-- evaluacion_inicial
ALTER TABLE evaluacion_inicial
  DROP CONSTRAINT IF EXISTS evaluacion_inicial_id_organizacion_fkey,
  DROP COLUMN IF EXISTS id_organizacion;

-- evolucion_clinica
ALTER TABLE evolucion_clinica
  DROP CONSTRAINT IF EXISTS evolucion_clinica_id_organizacion_fkey,
  DROP COLUMN IF EXISTS id_organizacion;

-- grupo_tratamiento: primero dropear las RLS policies que dependen de id_organizacion
DROP POLICY IF EXISTS "Usuarios pueden actualizar grupos" ON grupo_tratamiento;
DROP POLICY IF EXISTS "Usuarios pueden crear grupos" ON grupo_tratamiento;
DROP POLICY IF EXISTS "Usuarios pueden ver grupos de su organización" ON grupo_tratamiento;
-- grupo_tratamiento
ALTER TABLE grupo_tratamiento
  DROP CONSTRAINT IF EXISTS grupo_tratamiento_id_organizacion_fkey,
  DROP COLUMN IF EXISTS id_organizacion;

-- notificacion
ALTER TABLE notificacion
  DROP CONSTRAINT IF EXISTS notificacion_id_organizacion_fkey,
  DROP COLUMN IF EXISTS id_organizacion;

-- paciente
ALTER TABLE paciente
  DROP CONSTRAINT IF EXISTS paciente_id_organizacion_fkey,
  DROP COLUMN IF EXISTS id_organizacion;

-- turno
ALTER TABLE turno
  DROP CONSTRAINT IF EXISTS turno_id_organizacion_fkey,
  DROP COLUMN IF EXISTS id_organizacion;

-- ============================================================
-- PASO 4: Eliminar tabla usuario_organizacion
--   (depende de que ya se hayan eliminado las FK externas)
-- ============================================================
DROP TABLE IF EXISTS usuario_organizacion CASCADE;

-- ============================================================
-- PASO 5: Eliminar tabla organizacion
-- ============================================================
DROP TABLE IF EXISTS organizacion CASCADE;

-- ============================================================
-- PASO 6: Limpiar metadata de auth.users (org_actual del JWT)
-- ============================================================
-- Limpiar el campo org_actual del user_metadata de todos los usuarios de Supabase Auth
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'org_actual'
WHERE raw_user_meta_data ? 'org_actual';

-- ============================================================
-- PASO 7: (Opcional) Actualizar RLS policies que referencias organizacion
--   Si tenés políticas RLS que usen id_organizacion o usuario_organizacion,
--   deben ser eliminadas o reemplazadas.
--   Ejemplo genérico — ajustar según las políticas actuales del proyecto:
-- ============================================================

-- DROP POLICY IF EXISTS "Acceso por organización" ON turno;
-- DROP POLICY IF EXISTS "Acceso por organización" ON paciente;
-- etc. (revisar en Supabase Dashboard > Authentication > Policies)

-- ============================================================
-- NOTAS PARA EL DEPLOY:
-- 1. Ejecutar en Supabase Dashboard > SQL Editor o via CLI
-- 2. Verificar que no haya RLS policies que referencien id_organizacion
-- 3. Regenerar tipos con: npx supabase gen types typescript --local > src/types/database.types.ts
-- ============================================================
