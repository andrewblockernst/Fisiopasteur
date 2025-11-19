# 🏢 GUÍA COMPLETA: MIGRACIÓN A SISTEMA MULTI-ORGANIZACIÓN

## 📋 RESUMEN EJECUTIVO

Este documento detalla todos los cambios necesarios para migrar Fisiopasteur de un sistema mono-organización a multi-organización, permitiendo que múltiples clínicas usen la misma plataforma con datos completamente segregados.

---

## ✅ CAMBIOS YA IMPLEMENTADOS

### 1. **Tipos TypeScript** (`src/types/extended-database.types.ts`)
- ✅ `OrganizacionContext`: Contexto de org actual
- ✅ `UsuarioConOrganizaciones`: Usuario con sus orgs y roles
- ✅ `EspecialistaWithOrganization`: Especialista en contexto de org
- ✅ `TurnoWithRelations`: Actualizado con `id_organizacion`

### 2. **Servicio de Organización** (`src/lib/services/organizacion.service.ts`)
- ✅ `getOrganizacionesUsuario()`: Obtiene todas las orgs del usuario
- ✅ `getOrganizacionActual()`: Obtiene org activa desde cookie
- ✅ `setOrganizacionActual()`: Establece org en cookie
- ✅ `clearOrganizacionActual()`: Limpia cookie de org
- ✅ `verificarAccesoOrganizacion()`: Valida acceso a org específica

### 3. **Helpers de Autenticación** (`src/lib/utils/auth-context.ts`)
- ✅ `getAuthContext()`: Obtiene userId + orgId validado
- ✅ `getCurrentOrgId()`: Obtiene solo orgId rápidamente

### 4. **Middleware** (`src/middleware.ts`)
- ✅ Detecta si usuario tiene org seleccionada
- ✅ Auto-setea org si tiene una sola
- ✅ Redirige a selector si tiene múltiples
- ✅ Valida que org_actual sigue siendo válida

### 5. **Servicio de Branding** (`src/lib/services/branding.service.ts`)
- ✅ `getBrandingConfig()`: Obtiene config visual de la org
- ✅ `getOrganizacion()`: Datos completos de org
- ✅ `getNombreOrganizacion()`: Nombre para mensajes

### 6. **Componente Selector** (`src/componentes/organizacion/organizacion-selector.tsx`)
- ✅ UI para seleccionar organización
- ✅ Muestra rol y color de cada org
- ✅ Manejo de errores y estados

### 7. **API de Selección** (`src/app/api/organizacion/seleccionar/route.ts`)
- ✅ POST endpoint para setear org_actual

### 8. **Página de Selección** (`src/app/seleccionar-organizacion/page.tsx`)
- ✅ Página protegida para usuarios multi-org

### 9. **API de Onboarding** (`src/app/api/onboarding/crear-organizacion/route.ts`)
- ✅ Crea organización + usuario fundador
- ✅ Asigna rol de administrador
- ✅ Maneja rollback en caso de error
- ✅ Flujo SaaS completo

### 10. **Actualizaciones Parciales en Actions**
- ✅ `obtenerTurnos()`: Filtra por orgId
- ✅ `obtenerTurno()`: Verifica orgId
- ✅ `crearTurno()`: Inyecta orgId

### 11. **Servicio de Notificaciones** (Parcial)
- ✅ `crearNotificacion()`: Incluye orgId
- ✅ `registrarNotificacionConfirmacion()`: Incluye orgId
- ✅ `registrarNotificacionesRecordatorioFlexible()`: Incluye orgId
- ✅ `registrarNotificacionesRecordatorio()`: Incluye orgId

---

## 🔴 ACCIONES PENDIENTES CRÍTICAS

### 1. **ACTUALIZAR TODAS LAS SERVER ACTIONS**

#### `src/lib/actions/turno.action.ts` (Completar)
Funciones que NECESITAN actualización:

```typescript
// ✅ YA ACTUALIZADAS:
// - obtenerTurno()
// - obtenerTurnos()
// - crearTurno()

// 🔴 PENDIENTES:
export async function obtenerTurnosConFiltros() {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId)
}

export async function actualizarTurno(id: number, datos: TurnoUpdate) {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId) al WHERE
}

export async function eliminarTurno(id: number) {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId) al WHERE
}

export async function verificarDisponibilidad() {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId)
}

export async function obtenerTurnosPilates() {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId)
}

export async function crearTurnosEnLote() {
  // Agregar: const { orgId } = await getAuthContext();
  // Inyectar orgId en cada turno del lote
}

// ... y todas las demás funciones que consulten/modifiquen turnos
```

#### `src/lib/actions/paciente.action.ts` (TODO)
Funciones que NECESITAN actualización:

```typescript
export async function getPacientes() {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId)
}

export async function getPaciente(id: number) {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId)
}

export async function createPaciente(formData: FormData) {
  // Agregar: const { orgId } = await getAuthContext();
  // Inyectar orgId en el INSERT
}

export async function updatePaciente(id: number, formData: FormData) {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId) al WHERE
}

export async function deletePaciente(id: number) {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId) al WHERE
}

export async function searchPacientes(searchTerm: string) {
  // Agregar: const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId)
}
```

#### `src/lib/actions/especialista.action.ts` (REFACTORIZACIÓN COMPLETA)
**ESTE ES EL MÁS COMPLEJO** porque ahora los especialistas están en `usuario_organizacion`:

```typescript
// 🔴 ANTES: consultabas tabla 'usuario'
// ✅ AHORA: debes consultar 'usuario_organizacion'

export async function getEspecialistas() {
  const { orgId } = await getAuthContext();
  
  // Cambiar de:
  // .from("usuario")
  // .eq("activo", true)
  
  // A:
  const { data } = await supabase
    .from("usuario_organizacion")
    .select(`
      id_usuario_organizacion,
      id_usuario,
      id_rol,
      color_calendario,
      activo,
      usuario:id_usuario(
        id_usuario,
        nombre,
        apellido,
        email,
        telefono
      ),
      usuario_especialidad:id_usuario_organizacion(
        id_usuario_especialidad,
        id_especialidad,
        precio_particular,
        precio_obra_social,
        especialidad:id_especialidad(
          id_especialidad,
          nombre
        )
      )
    `)
    .eq("id_organizacion", orgId)
    .eq("activo", true)
    .in("id_rol", [1, 2]); // Admin y Especialistas
}

export async function createEspecialista(formData: FormData) {
  const { orgId } = await getAuthContext();
  
  // 1. Crear usuario en Auth (igual)
  // 2. Crear en tabla usuario (igual)
  // 3. ✅ NUEVO: Crear en usuario_organizacion
  const { data: usuarioOrg } = await supabase
    .from("usuario_organizacion")
    .insert({
      id_usuario: authUser.user.id,
      id_organizacion: orgId,
      id_rol: 2, // Especialista
      color_calendario: formData.get("color"),
      activo: true,
    })
    .select()
    .single();
  
  // 4. ✅ CAMBIO: Asignar especialidades referenciando usuario_organizacion
  const especialidades = formData.getAll("especialidades");
  for (const espId of especialidades) {
    await supabase
      .from("usuario_especialidad")
      .insert({
        id_usuario_organizacion: usuarioOrg.id_usuario_organizacion, // ✅ NO id_usuario
        id_especialidad: espId,
        precio_particular: formData.get(`precio_${espId}_particular`),
        precio_obra_social: formData.get(`precio_${espId}_obra_social`),
      });
  }
}

// Similar para updateEspecialista() y deleteEspecialista()
```

#### Otras Actions a Actualizar:
- `src/lib/actions/perfil.action.ts`: Filtrar por orgId
- `src/lib/actions/pilates.action.ts`: Filtrar por orgId  
- `src/lib/actions/evolucion-clinica.action.ts` (si existe): Filtrar por orgId

---

### 2. **ACTUALIZAR SERVICIOS**

#### `src/lib/services/notificacion.service.ts` (Parcialmente hecho)
```typescript
// ✅ YA ACTUALIZADAS las funciones de registro

// 🔴 PENDIENTES:
export async function obtenerNotificacionesTurno(idTurno: number) {
  const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId)
}

export async function obtenerNotificacionesPendientes() {
  const { orgId } = await getAuthContext();
  // Agregar: .eq("id_organizacion", orgId)
}

export async function actualizarEstadoNotificacion() {
  const { orgId } = await getAuthContext();
  // Verificar que la notificación pertenece a la org antes de actualizar
}
```

#### `src/lib/services/whatsapp-bot.service.ts` (TODO)
```typescript
// Actualizar para usar getBrandingConfig() en mensajes
export async function enviarConfirmacionTurno(turno) {
  const { nombre } = await getBrandingConfig();
  const mensaje = `Hola, te escribimos de ${nombre}...`;
  // ...
}
```

#### `src/lib/services/cron-recordatorios.service.ts` (TODO)
```typescript
// Este servicio NO debería usar getAuthContext() porque corre en background
// En su lugar, debe iterar por TODAS las organizaciones:

export async function procesarRecordatoriosPendientes() {
  // 1. Obtener TODAS las organizaciones activas
  const { data: orgs } = await supabase
    .from("organizacion")
    .select("id_organizacion, nombre")
    .eq("activo", true);
  
  // 2. Para cada org, procesar sus notificaciones
  for (const org of orgs) {
    const { data: notificaciones } = await supabase
      .from("notificacion")
      .select("*, turno(*)")
      .eq("id_organizacion", org.id_organizacion)
      .eq("estado", "pendiente")
      .lte("fecha_programada", new Date().toISOString());
    
    // 3. Obtener branding de la org para personalizar mensajes
    const branding = await getBrandingConfig(org.id_organizacion);
    
    // 4. Enviar notificaciones con el nombre de la org
    for (const notif of notificaciones) {
      await enviarWhatsApp({
        telefono: notif.telefono,
        mensaje: notif.mensaje.replace("{{organizacion}}", branding.nombre),
      });
    }
  }
}
```

---

### 3. **ACTUALIZAR COMPONENTES PRINCIPALES**

#### `src/componentes/turnos/*` (TODO)
Todos los componentes de turnos deben:
- Usar `getAuthContext()` en sus server components
- Pasar `orgId` a los client components que lo necesiten
- Filtrar datos por organización

Ejemplo:
```typescript
// src/componentes/turnos/turno-lista.tsx (Server Component)
export async function TurnoLista() {
  const { orgId } = await getAuthContext();
  const turnos = await obtenerTurnos(); // Ya filtra por orgId internamente
  
  return <TurnoListaClient turnos={turnos} />;
}
```

#### `src/componentes/paciente/*` (TODO)
Similar a turnos.

#### `src/componentes/especialista/*` (REFACTORIZACIÓN)
Deben adaptarse a la nueva estructura `usuario_organizacion`.

---

### 4. **ACTUALIZAR BOT DE WHATSAPP**

#### `fisio-bot/src/recordatorios.service.ts`
```typescript
// Modificar para iterar por todas las organizaciones
export async function procesarRecordatorios() {
  const orgs = await supabase
    .from("organizacion")
    .select("*")
    .eq("activo", true);
  
  for (const org of orgs.data) {
    console.log(`📱 Procesando org: ${org.nombre}`);
    
    const notificaciones = await supabase
      .from("notificacion")
      .select("*, turno(*)")
      .eq("id_organizacion", org.id_organizacion)
      .eq("estado", "pendiente");
    
    // Personalizar mensajes con el nombre de la org
    for (const notif of notificaciones.data) {
      await enviarMensaje({
        telefono: notif.telefono,
        mensaje: `Hola, te escribimos de ${org.nombre}. ${notif.mensaje}`,
      });
    }
  }
}
```

---

## 🔐 ROW LEVEL SECURITY (RLS) POLICIES

### **IMPORTANTÍSIMO**: Actualizar políticas de Supabase

#### Política para `turno`
```sql
-- Eliminar políticas viejas
DROP POLICY IF EXISTS "allow_all_turnos" ON public.turno;

-- Crear políticas multi-org
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

CREATE POLICY "usuarios_eliminan_turnos_de_su_org"
ON public.turno
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = turno.id_organizacion
      AND uo.activo = true
      AND uo.id_rol = 1 -- Solo administradores
  )
);
```

#### Política para `paciente`
```sql
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

-- Similar para INSERT, UPDATE, DELETE
```

#### Política para `notificacion`
```sql
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
```

#### Política para `evolucion_clinica`
```sql
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
```

#### Política para `box`
```sql
-- Los boxes también deberían tener id_organizacion
-- Si no lo tienen, agregar columna:
ALTER TABLE public.box ADD COLUMN id_organizacion uuid REFERENCES public.organizacion(id_organizacion);

CREATE POLICY "usuarios_ven_boxes_de_su_org"
ON public.box
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario_organizacion uo
    WHERE uo.id_usuario = auth.uid()
      AND uo.id_organizacion = box.id_organizacion
      AND uo.activo = true
  )
);
```

#### Política para `especialidad`
```sql
-- Las especialidades son globales (no tienen id_organizacion)
-- Todos pueden verlas
CREATE POLICY "todos_ven_especialidades"
ON public.especialidad
FOR SELECT
USING (true);
```

---

## 📝 CHECKLIST DE VERIFICACIÓN

### Base de Datos
- [ ] Tabla `organizacion` tiene todos los campos necesarios
- [ ] Tabla `usuario_organizacion` conecta users con orgs
- [ ] Tabla `usuario_especialidad` referencia a `usuario_organizacion` (NO a `usuario`)
- [ ] Tabla `turno` tiene `id_organizacion NOT NULL`
- [ ] Tabla `paciente` tiene `id_organizacion NOT NULL`
- [ ] Tabla `notificacion` tiene `id_organizacion NOT NULL`
- [ ] Tabla `evolucion_clinica` tiene `id_organizacion NOT NULL`
- [ ] Tabla `box` tiene `id_organizacion` (opcional pero recomendado)
- [ ] RLS policies actualizadas para todas las tablas

### Backend
- [ ] `turno.action.ts`: TODAS las funciones actualizadas
- [ ] `paciente.action.ts`: TODAS las funciones actualizadas
- [ ] `especialista.action.ts`: REFACTORIZADO para usar `usuario_organizacion`
- [ ] `notificacion.service.ts`: Todas las funciones incluyen `orgId`
- [ ] `whatsapp-bot.service.ts`: Usa `getBrandingConfig()` en mensajes
- [ ] `cron-recordatorios.service.ts`: Itera por todas las orgs

### Frontend
- [ ] Componentes de turnos: Filtran por org
- [ ] Componentes de pacientes: Filtran por org
- [ ] Componentes de especialistas: Adaptados a nuevo modelo
- [ ] Selector de organización funciona correctamente
- [ ] Logout limpia cookie de org

### Middleware & Auth
- [ ] Middleware detecta org correctamente
- [ ] Middleware redirige a selector si múltiples orgs
- [ ] `getAuthContext()` valida org en cada request
- [ ] Cookies de org tienen la expiración correcta

### Testing
- [ ] Crear 2 organizaciones de prueba
- [ ] Crear usuarios en ambas orgs
- [ ] Verificar que usuario de Org A NO ve datos de Org B
- [ ] Verificar que usuario multi-org puede cambiar entre orgs
- [ ] Verificar que notificaciones usan el nombre correcto de la org
- [ ] Verificar que RLS policies funcionan (intentar bypass)

---

## 🚀 FLUJO DE IMPLEMENTACIÓN RECOMENDADO

1. **Fase 1: Validación de BD** (1 día)
   - Verificar esquema actualizado
   - Crear organizaciones de prueba
   - Implementar RLS policies

2. **Fase 2: Backend Core** (2-3 días)
   - Completar `turno.action.ts`
   - Completar `paciente.action.ts`
   - Refactorizar `especialista.action.ts`

3. **Fase 3: Servicios** (1 día)
   - Actualizar `notificacion.service.ts`
   - Actualizar `whatsapp-bot.service.ts`
   - Actualizar cron jobs

4. **Fase 4: Frontend** (2 días)
   - Actualizar componentes de turnos
   - Actualizar componentes de pacientes
   - Actualizar componentes de especialistas

5. **Fase 5: Testing** (1-2 días)
   - Testing funcional completo
   - Testing de seguridad (intentar ver datos de otra org)
   - Testing de performance

6. **Fase 6: Despliegue** (1 día)
   - Backup completo de BD
   - Deploy en staging
   - Pruebas finales
   - Deploy en producción

---

## ⚠️ NOTAS IMPORTANTES

### Datos Existentes
Si ya tienes datos de Fisiopasteur:
1. Crear la organización "Fisiopasteur" en BD
2. Migrar todos los datos existentes asignándoles ese `id_organizacion`
3. Asignar todos los usuarios actuales a esa organización

```sql
-- Script de migración
WITH fisiopasteur AS (
  INSERT INTO organizacion (nombre, activo)
  VALUES ('Fisiopasteur', true)
  RETURNING id_organizacion
)
UPDATE turno
SET id_organizacion = (SELECT id_organizacion FROM fisiopasteur);

UPDATE paciente
SET id_organizacion = (SELECT id_organizacion FROM fisiopasteur);

UPDATE notificacion
SET id_organizacion = (SELECT id_organizacion FROM fisiopasteur);

-- Asignar usuarios a la organización
INSERT INTO usuario_organizacion (id_usuario, id_organizacion, id_rol, activo)
SELECT 
  id_usuario,
  (SELECT id_organizacion FROM fisiopasteur),
  id_rol,
  activo
FROM usuario;
```

### Performance
- Las queries filtradas por `id_organizacion` necesitan índices:
```sql
CREATE INDEX idx_turno_organizacion ON turno(id_organizacion);
CREATE INDEX idx_paciente_organizacion ON paciente(id_organizacion);
CREATE INDEX idx_notificacion_organizacion ON notificacion(id_organizacion);
CREATE INDEX idx_usuario_organizacion_lookup ON usuario_organizacion(id_usuario, id_organizacion);
```

### Branding Futuro
Campos adicionales para `organizacion`:
- `logo_url`: URL del logo
- `color_primario`: Color principal (#RRGGBB)
- `color_secundario`: Color secundario
- `direccion`: Dirección física
- `provincia`: Provincia/Estado
- `pais`: País
- `timezone`: Zona horaria

---

## 📞 CONTACTO Y SOPORTE

Si tienes dudas durante la implementación:
1. Revisa este documento primero
2. Chequea el código ya implementado como referencia
3. Valida que las RLS policies están correctas
4. Testing exhaustivo antes de desplegar

**¡Éxito con la migración a multi-organización! 🚀**
