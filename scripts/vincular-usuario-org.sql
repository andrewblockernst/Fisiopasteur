-- Script para vincular usuario dueño de Fisiopasteur con su organización
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que existe la organización Fisiopasteur
SELECT id_organizacion, nombre, activo 
FROM organizacion 
WHERE nombre = 'Fisiopasteur';

-- 2. Verificar usuarios existentes (buscar admin/dueño)
SELECT id_usuario, email, nombre, apellido 
FROM usuario 
WHERE email ILIKE '%fisiopasteur%' OR email ILIKE '%admin%'
ORDER BY email;

-- 3. VINCULAR USUARIO CON ORGANIZACIÓN
-- Reemplazar estos valores con los IDs reales:
-- - <USER_ID>: ID del usuario dueño (obtenido del paso 2)
-- - <ORG_ID>: ID de la organización Fisiopasteur (obtenido del paso 1)

INSERT INTO usuario_organizacion (
  id_usuario,
  id_organizacion,
  id_rol,
  activo,
  color_calendario
) VALUES (
  '<USER_ID>', -- Reemplazar con ID real del usuario
  '<ORG_ID>',  -- Reemplazar con ID real de organización Fisiopasteur
  1,           -- Rol Admin (id_rol = 1)
  true,
  '#3b82f6'    -- Color azul por defecto
)
ON CONFLICT (id_usuario, id_organizacion) 
DO UPDATE SET
  activo = true,
  id_rol = 1;

-- 4. Verificar que se creó correctamente
SELECT 
  uo.id_usuario_organizacion,
  u.email,
  u.nombre,
  u.apellido,
  o.nombre as organizacion,
  r.nombre as rol,
  uo.activo,
  uo.color_calendario
FROM usuario_organizacion uo
JOIN usuario u ON uo.id_usuario = u.id_usuario
JOIN organizacion o ON uo.id_organizacion = o.id_organizacion
JOIN rol r ON uo.id_rol = r.id
WHERE o.nombre = 'Fisiopasteur'
ORDER BY u.email;

-- 5. Si el usuario tiene especialidades, migrarlas a usuario_especialidad
-- (Solo ejecutar si el usuario es especialista, no admin puro)
/*
INSERT INTO usuario_especialidad (
  id_usuario,
  id_usuario_organizacion,
  id_especialidad,
  activo
)
SELECT 
  uo.id_usuario,
  uo.id_usuario_organizacion,
  <ESPECIALIDAD_ID>, -- Reemplazar con ID de especialidad
  true
FROM usuario_organizacion uo
WHERE uo.id_usuario = '<USER_ID>' 
  AND uo.id_organizacion = '<ORG_ID>'
ON CONFLICT (id_usuario_organizacion, id_especialidad) DO NOTHING;
*/
