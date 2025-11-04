-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- SISTEMA MULTI-ORGANIZACIÓN
-- =====================================================
-- 
-- IMPORTANTE: Ejecutar estos scripts en Supabase SQL Editor
-- Estas políticas aseguran que los usuarios solo vean
-- datos de su(s) organización(es)
--
-- =====================================================

-- =====================================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE public.turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucion_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_especialidad ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. ELIMINAR POLÍTICAS VIEJAS (SI EXISTEN)
-- =====================================================

-- Turno
DROP POLICY IF EXISTS "allow_all_turnos" ON public.turno;
DROP POLICY IF EXISTS "especialistas_ven_turnos" ON public.turno;

-- Paciente
DROP POLICY IF EXISTS "allow_all_pacientes" ON public.paciente;
DROP POLICY IF EXISTS "especialistas_ven_pacientes" ON public.paciente;

-- Notificacion
DROP POLICY IF EXISTS "allow_all_notificaciones" ON public.notificacion;

-- Evolucion Clinica
DROP POLICY IF EXISTS "allow_all_evoluciones" ON public.evolucion_clinica;

-- Box
DROP POLICY IF EXISTS "allow_all_boxes" ON public.box;

-- Usuario Organizacion
DROP POLICY IF EXISTS "allow_all_usuario_organizacion" ON public.usuario_organizacion;

-- Usuario Especialidad
DROP POLICY IF EXISTS "allow_all_usuario_especialidad" ON public.usuario_especialidad;

-- =====================================================
-- 3. POLÍTICAS PARA TABLA: turno
-- =====================================================

-- SELECT: Ver turnos de su organización
CREATE POLICY "usuarios_ven_turnos_de_su_org"
ON public.turno
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = turno.id_organizacion
      AND uo.activo = true
  )
);

-- INSERT: Crear turnos en su organización
CREATE POLICY "usuarios_crean_turnos_en_su_org"
ON public.turno
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = turno.id_organizacion
      AND uo.activo = true
  )
);

-- UPDATE: Actualizar turnos de su organización
CREATE POLICY "usuarios_actualizan_turnos_de_su_org"
ON public.turno
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = turno.id_organizacion
      AND uo.activo = true
  )
);

-- DELETE: Solo administradores pueden eliminar turnos
CREATE POLICY "admins_eliminan_turnos_de_su_org"
ON public.turno
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = turno.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1 -- 1 = Administrador
  )
);

-- =====================================================
-- 4. POLÍTICAS PARA TABLA: paciente
-- =====================================================

-- SELECT: Ver pacientes de su organización
CREATE POLICY "usuarios_ven_pacientes_de_su_org"
ON public.paciente
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = paciente.id_organizacion
      AND uo.activo = true
  )
);

-- INSERT: Crear pacientes en su organización
CREATE POLICY "usuarios_crean_pacientes_en_su_org"
ON public.paciente
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = paciente.id_organizacion
      AND uo.activo = true
  )
);

-- UPDATE: Actualizar pacientes de su organización
CREATE POLICY "usuarios_actualizan_pacientes_de_su_org"
ON public.paciente
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = paciente.id_organizacion
      AND uo.activo = true
  )
);

-- DELETE: Solo administradores pueden eliminar pacientes
CREATE POLICY "admins_eliminan_pacientes_de_su_org"
ON public.paciente
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = paciente.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- =====================================================
-- 5. POLÍTICAS PARA TABLA: notificacion
-- =====================================================

-- SELECT: Ver notificaciones de su organización
CREATE POLICY "usuarios_ven_notificaciones_de_su_org"
ON public.notificacion
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = notificacion.id_organizacion
      AND uo.activo = true
  )
);

-- INSERT: Crear notificaciones en su organización
CREATE POLICY "usuarios_crean_notificaciones_en_su_org"
ON public.notificacion
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = notificacion.id_organizacion
      AND uo.activo = true
  )
);

-- UPDATE: Actualizar notificaciones de su organización
CREATE POLICY "usuarios_actualizan_notificaciones_de_su_org"
ON public.notificacion
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = notificacion.id_organizacion
      AND uo.activo = true
  )
);

-- DELETE: Administradores eliminan notificaciones
CREATE POLICY "admins_eliminan_notificaciones_de_su_org"
ON public.notificacion
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = notificacion.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- =====================================================
-- 6. POLÍTICAS PARA TABLA: evolucion_clinica
-- =====================================================

-- SELECT: Ver evoluciones de su organización
CREATE POLICY "usuarios_ven_evoluciones_de_su_org"
ON public.evolucion_clinica
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = evolucion_clinica.id_organizacion
      AND uo.activo = true
  )
);

-- INSERT: Crear evoluciones en su organización
CREATE POLICY "usuarios_crean_evoluciones_en_su_org"
ON public.evolucion_clinica
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = evolucion_clinica.id_organizacion
      AND uo.activo = true
  )
);

-- UPDATE: Actualizar evoluciones propias o si es admin
CREATE POLICY "usuarios_actualizan_evoluciones_propias"
ON public.evolucion_clinica
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = evolucion_clinica.id_organizacion
      AND uo.activo = true
      AND (
        evolucion_clinica.id_usuario = auth.uid() -- Su propia evolución
        OR uo.id_rol = 1 -- O es administrador
      )
  )
);

-- DELETE: Solo administradores
CREATE POLICY "admins_eliminan_evoluciones_de_su_org"
ON public.evolucion_clinica
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = evolucion_clinica.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- =====================================================
-- 7. POLÍTICAS PARA TABLA: box
-- =====================================================

-- SELECT: Ver boxes de su organización
CREATE POLICY "usuarios_ven_boxes_de_su_org"
ON public.box
FOR SELECT
USING (
  -- Si la tabla box tiene id_organizacion
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = box.id_organizacion
      AND uo.activo = true
  )
  -- Si la tabla box NO tiene id_organizacion, todos pueden ver:
  -- USING (true);
);

-- INSERT: Solo administradores crean boxes
CREATE POLICY "admins_crean_boxes_en_su_org"
ON public.box
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = box.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- UPDATE: Solo administradores actualizan boxes
CREATE POLICY "admins_actualizan_boxes_de_su_org"
ON public.box
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = box.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- DELETE: Solo administradores eliminan boxes
CREATE POLICY "admins_eliminan_boxes_de_su_org"
ON public.box
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = box.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- =====================================================
-- 8. POLÍTICAS PARA TABLA: organizacion
-- =====================================================

-- SELECT: Ver solo organizaciones donde estoy asignado
CREATE POLICY "usuarios_ven_sus_organizaciones"
ON public.organizacion
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = organizacion.id_organizacion
      AND uo.activo = true
  )
);

-- UPDATE: Solo administradores pueden actualizar datos de la org
CREATE POLICY "admins_actualizan_su_organizacion"
ON public.organizacion
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = organizacion.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- =====================================================
-- 9. POLÍTICAS PARA TABLA: usuario_organizacion
-- =====================================================

-- SELECT: Ver usuarios de mis organizaciones
CREATE POLICY "usuarios_ven_miembros_de_sus_orgs"
ON public.usuario_organizacion
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = usuario_organizacion.id_organizacion
      AND uo.activo = true
  )
);

-- INSERT: Solo administradores pueden agregar usuarios a la org
CREATE POLICY "admins_agregan_usuarios_a_su_org"
ON public.usuario_organizacion
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = usuario_organizacion.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- UPDATE: Solo administradores pueden actualizar roles/permisos
CREATE POLICY "admins_actualizan_miembros_de_su_org"
ON public.usuario_organizacion
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = usuario_organizacion.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- DELETE: Solo administradores pueden remover usuarios
CREATE POLICY "admins_remueven_miembros_de_su_org"
ON public.usuario_organizacion
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = usuario_organizacion.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- =====================================================
-- 10. POLÍTICAS PARA TABLA: usuario_especialidad
-- =====================================================

-- SELECT: Ver especialidades de usuarios de mi org
CREATE POLICY "usuarios_ven_especialidades_de_su_org"
ON public.usuario_especialidad
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo_self
    JOIN public.usuario_organizacion uo_target 
      ON uo_target.id_usuario_organizacion = usuario_especialidad.id_usuario_organizacion
    WHERE uo_self.id_usuario = auth.uid()
      AND uo_self.id_organizacion = uo_target.id_organizacion
      AND uo_self.activo = true
  )
);

-- INSERT: Solo administradores asignan especialidades
CREATE POLICY "admins_asignan_especialidades_en_su_org"
ON public.usuario_especialidad
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo_self
    JOIN public.usuario_organizacion uo_target 
      ON uo_target.id_usuario_organizacion = usuario_especialidad.id_usuario_organizacion
    WHERE uo_self.id_usuario = auth.uid()
      AND uo_self.id_organizacion = uo_target.id_organizacion
      AND uo_self.activo = true
      AND uo_self.id_rol = 1
  )
);

-- UPDATE: Solo administradores actualizan especialidades
CREATE POLICY "admins_actualizan_especialidades_en_su_org"
ON public.usuario_especialidad
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo_self
    JOIN public.usuario_organizacion uo_target 
      ON uo_target.id_usuario_organizacion = usuario_especialidad.id_usuario_organizacion
    WHERE uo_self.id_usuario = auth.uid()
      AND uo_self.id_organizacion = uo_target.id_organizacion
      AND uo_self.activo = true
      AND uo_self.id_rol = 1
  )
);

-- DELETE: Solo administradores eliminan especialidades
CREATE POLICY "admins_eliminan_especialidades_en_su_org"
ON public.usuario_especialidad
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo_self
    JOIN public.usuario_organizacion uo_target 
      ON uo_target.id_usuario_organizacion = usuario_especialidad.id_usuario_organizacion
    WHERE uo_self.id_usuario = auth.uid()
      AND uo_self.id_organizacion = uo_target.id_organizacion
      AND uo_self.activo = true
      AND uo_self.id_rol = 1
  )
);

-- =====================================================
-- 11. TABLAS GLOBALES (SIN FILTRO POR ORGANIZACIÓN)
-- =====================================================

-- Especialidad: Todos pueden ver, solo admins pueden modificar
CREATE POLICY "todos_ven_especialidades"
ON public.especialidad
FOR SELECT
USING (true);

CREATE POLICY "solo_admins_modifican_especialidades"
ON public.especialidad
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.activo = true
      AND uo.id_rol = 1
  )
);

-- Rol: Todos pueden ver, nadie puede modificar (solo por SQL)
CREATE POLICY "todos_ven_roles"
ON public.rol
FOR SELECT
USING (true);

-- Usuario: Puede ver su propio perfil y usuarios de su org
CREATE POLICY "usuarios_ven_su_perfil_y_compañeros"
ON public.usuario
FOR SELECT
USING (
  usuario.id_usuario = auth.uid() -- Su propio perfil
  OR
  EXISTS ( -- O usuarios de su organización
    SELECT 1
    FROM public.usuario_organizacion uo_self
    JOIN public.usuario_organizacion uo_other ON uo_other.id_usuario = usuario.id_usuario
    WHERE uo_self.id_usuario = auth.uid()
      AND uo_self.id_organizacion = uo_other.id_organizacion
      AND uo_self.activo = true
  )
);

-- =====================================================
-- 12. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices en campos de filtrado frecuente
CREATE INDEX IF NOT EXISTS idx_turno_organizacion 
  ON public.turno(id_organizacion);
  
CREATE INDEX IF NOT EXISTS idx_paciente_organizacion 
  ON public.paciente(id_organizacion);
  
CREATE INDEX IF NOT EXISTS idx_notificacion_organizacion 
  ON public.notificacion(id_organizacion);
  
CREATE INDEX IF NOT EXISTS idx_evolucion_organizacion 
  ON public.evolucion_clinica(id_organizacion);
  
CREATE INDEX IF NOT EXISTS idx_usuario_org_lookup 
  ON public.usuario_organizacion(id_usuario, id_organizacion);
  
CREATE INDEX IF NOT EXISTS idx_usuario_org_activo 
  ON public.usuario_organizacion(id_organizacion, activo);

-- =====================================================
-- 13. VERIFICACIÓN
-- =====================================================

-- Verificar que RLS está habilitado
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'turno', 
    'paciente', 
    'notificacion', 
    'evolucion_clinica',
    'box',
    'organizacion',
    'usuario_organizacion',
    'usuario_especialidad'
  );

-- Verificar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
