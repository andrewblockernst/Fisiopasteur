# 🏢 FISIOPASTEUR - SISTEMA MULTI-ORGANIZACIÓN

## 🎯 INICIO RÁPIDO

¡Hola! Si estás leyendo esto, significa que estás listo para implementar el sistema multi-organización en Fisiopasteur. Aquí está todo lo que necesitas saber para empezar.

---

## 📚 DOCUMENTACIÓN DISPONIBLE

### 1. **RESUMEN-EJECUTIVO.md** ⭐ EMPIEZA AQUÍ
**Lee esto primero** - Resumen completo de lo que se hizo y lo que falta.
- ✅ Qué está implementado (70%)
- 🔴 Qué falta por hacer
- 📋 Plan de implementación
- ⚠️ Advertencias importantes

### 2. **GUIA-MULTI-ORGANIZACION.md** 📖 REFERENCIA TÉCNICA
Guía técnica exhaustiva con:
- Arquitectura del sistema
- Checklist completo de tareas
- Ejemplos de código
- Políticas RLS necesarias
- Script de migración de datos
- Consideraciones de performance

### 3. **EJEMPLOS-MULTI-ORG.md** 💡 APRENDE CON EJEMPLOS
Ejemplos prácticos de:
- Server Actions actualizadas
- Server Components con contexto org
- Client Components
- API Routes
- Servicios
- Patrones comunes
- Errores a evitar

### 4. **RLS-POLICIES.sql** 🔐 SEGURIDAD
Script SQL listo para ejecutar con:
- Políticas RLS para todas las tablas
- Índices de performance
- Scripts de verificación
- **CRÍTICO**: Sin esto, hay riesgo de data leak

### 5. **CHECKLIST.md** ✅ TRACKING
Checklist interactivo para:
- Seguir tu progreso
- Identificar próximos pasos
- Validar que nada se olvida
- Ver progreso por área

---

## 🚀 CÓMO EMPEZAR

### Paso 1: Entender el Estado Actual (15 min)
```bash
# Lee en este orden:
1. RESUMEN-EJECUTIVO.md        # Panorama general
2. Revisa el código generado:
   - src/lib/services/organizacion.service.ts
   - src/lib/utils/auth-context.ts
   - src/middleware.ts
```

### Paso 2: Configurar Entorno de Staging (30 min)
```bash
# 1. Crear base de datos de staging
# 2. Copiar datos de producción (opcional)
# 3. Ejecutar RLS-POLICIES.sql en staging
# 4. Crear 2 organizaciones de prueba
```

### Paso 3: Completar Backend Core (2-3 días)
```bash
# Lee EJEMPLOS-MULTI-ORG.md para ver patrones
# Actualiza en este orden:

1. turno.action.ts          # Empezar aquí (ya 30% hecho)
2. paciente.action.ts        # Más simple
3. especialista.action.ts    # Más complejo, ver ejemplos
```

### Paso 4: Testing Continuo
```bash
# Mientras desarrollas, SIEMPRE testea:

1. Crear 2 orgs: "Clinica A" y "Clinica B"
2. Crear usuarios en cada org
3. Crear datos en cada org
4. Validar que usuario A NO ve datos de B
```

### Paso 5: Completar Servicios (1-2 días)
```bash
# Actualizar:
1. whatsapp-bot.service.ts
2. cron-recordatorios.service.ts
3. fisio-bot/ (iteración por orgs)
```

### Paso 6: Frontend (2-3 días)
```bash
# Actualizar componentes:
1. Componentes de turnos
2. Componentes de pacientes
3. Componentes de especialistas
```

### Paso 7: Testing Final (1-2 días)
```bash
# Testing exhaustivo:
1. Funcional completo
2. Seguridad (intentar bypass)
3. Performance
4. RLS policies
```

### Paso 8: Migración y Despliegue (1 día)
```bash
# Pre-despliegue:
1. Backup completo
2. Script de migración listo
3. RLS policies listas

# Despliegue:
1. Ejecutar RLS en producción
2. Migrar datos
3. Deploy código
4. Validar
5. Monitorear
```

---

## 🎨 ARQUITECTURA IMPLEMENTADA

### Flujo de Autenticación y Organización

```
Usuario inicia sesión
       ↓
Middleware detecta sus organizaciones
       ↓
¿Cuántas organizaciones tiene?
       ↓
┌──────┴──────┐
│             │
1 org       2+ orgs
│             │
Auto-setea  Redirige a selector
en cookie      ↓
│           Usuario elige org
│             │
└──────┬──────┘
       ↓
Cookie: org_actual = {orgId}
       ↓
Todas las requests filtran por orgId
```

### Patrón de Server Actions

```typescript
export async function miAction(datos) {
  // 1. Obtener contexto (valida auth + org)
  const { orgId, userId } = await getAuthContext();
  
  // 2. Query con filtro de organización
  const { data } = await supabase
    .from("tabla")
    .select("*")
    .eq("id_organizacion", orgId); // 🔑 CLAVE
  
  // 3. Insertar inyectando orgId
  await supabase
    .from("tabla")
    .insert({
      ...datos,
      id_organizacion: orgId, // 🔑 CLAVE
    });
}
```

### Estructura de Base de Datos

```
organizacion
    ↓
usuario_organizacion ←─ Conecta usuarios con orgs
    ↓                   (con rol y color)
usuario_especialidad ←─ Conecta especialidades
    ↓
Datos aislados por org:
    - turno
    - paciente
    - notificacion
    - evolucion_clinica
```

---

## 🔑 CONCEPTOS CLAVE

### 1. Contexto Organizacional
```typescript
// SIEMPRE obtener al inicio de cada action:
const { orgId, userId } = await getAuthContext();

// Esto valida:
// ✅ Usuario está autenticado
// ✅ Tiene una organización seleccionada
// ✅ Tiene acceso a esa organización
```

### 2. Filtrado por Organización
```typescript
// ❌ NUNCA hacer esto:
const { data } = await supabase
  .from("turno")
  .select("*");

// ✅ SIEMPRE hacer esto:
const { orgId } = await getAuthContext();
const { data } = await supabase
  .from("turno")
  .select("*")
  .eq("id_organizacion", orgId);
```

### 3. Inyección de OrgId
```typescript
// ❌ NUNCA hacer esto:
await supabase
  .from("turno")
  .insert({ fecha, hora, paciente_id });

// ✅ SIEMPRE hacer esto:
const { orgId } = await getAuthContext();
await supabase
  .from("turno")
  .insert({ 
    fecha, 
    hora, 
    paciente_id,
    id_organizacion: orgId, // 🔑 CRUCIAL
  });
```

### 4. RLS (Row Level Security)
```sql
-- Las políticas RLS son tu MURALLA de seguridad
-- Sin ellas, cualquier usuario podría ver datos de otras orgs

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
```

---

## ⚠️ ERRORES COMUNES A EVITAR

### ❌ ERROR #1: Olvidar filtrar por orgId
```typescript
// MAL
const { data } = await supabase.from("turno").select("*");

// BIEN
const { orgId } = await getAuthContext();
const { data } = await supabase
  .from("turno")
  .select("*")
  .eq("id_organizacion", orgId);
```

### ❌ ERROR #2: No inyectar orgId en inserts
```typescript
// MAL
await supabase.from("turno").insert(datos);

// BIEN
const { orgId } = await getAuthContext();
await supabase.from("turno").insert({ ...datos, id_organizacion: orgId });
```

### ❌ ERROR #3: Usar id_usuario en lugar de id_usuario_organizacion
```typescript
// MAL (modelo viejo)
await supabase
  .from("usuario_especialidad")
  .insert({ id_usuario: userId, id_especialidad: espId });

// BIEN (modelo nuevo)
await supabase
  .from("usuario_especialidad")
  .insert({ 
    id_usuario_organizacion: usuarioOrgId, // ✅
    id_especialidad: espId 
  });
```

### ❌ ERROR #4: No validar org en updates/deletes
```typescript
// MAL
await supabase
  .from("turno")
  .delete()
  .eq("id_turno", id);

// BIEN
const { orgId } = await getAuthContext();
await supabase
  .from("turno")
  .delete()
  .eq("id_turno", id)
  .eq("id_organizacion", orgId); // ✅ Evita eliminar de otra org
```

---

## 🧪 TESTING ESENCIAL

### Test de Aislamiento (CRÍTICO)
```typescript
// 1. Crear 2 organizaciones
const orgA = await crearOrg({ nombre: "Clinica A" });
const orgB = await crearOrg({ nombre: "Clinica B" });

// 2. Crear usuarios en cada org
const userA = await crearUsuario({ email: "a@clinica.com", org: orgA.id });
const userB = await crearUsuario({ email: "b@clinica.com", org: orgB.id });

// 3. Crear datos en cada org
await crearTurno({ org: orgA.id, paciente: "Juan" });
await crearTurno({ org: orgB.id, paciente: "María" });

// 4. VALIDAR AISLAMIENTO
const turnosA = await obtenerTurnos({ userId: userA.id });
const turnosB = await obtenerTurnos({ userId: userB.id });

// ✅ Usuario A solo ve 1 turno (Juan)
// ✅ Usuario B solo ve 1 turno (María)
// ✅ Ninguno ve el turno del otro
```

---

## 📊 ARCHIVOS CREADOS/MODIFICADOS

### ✅ Archivos Nuevos Creados
```
src/lib/services/organizacion.service.ts       ✅
src/lib/services/branding.service.ts           ✅
src/lib/utils/auth-context.ts                  ✅
src/componentes/organizacion/organizacion-selector.tsx ✅
src/app/seleccionar-organizacion/page.tsx      ✅
src/app/api/organizacion/seleccionar/route.ts  ✅
src/app/api/onboarding/crear-organizacion/route.ts ✅

GUIA-MULTI-ORGANIZACION.md                     ✅
EJEMPLOS-MULTI-ORG.md                          ✅
RLS-POLICIES.sql                               ✅
RESUMEN-EJECUTIVO.md                           ✅
CHECKLIST.md                                   ✅
INICIO-RAPIDO.md (este archivo)                ✅
```

### ✅ Archivos Modificados
```
src/types/extended-database.types.ts           ✅ Tipos actualizados
src/middleware.ts                              ✅ Lógica multi-org
src/lib/actions/turno.action.ts               ⏳ Parcialmente actualizado
src/lib/services/notificacion.service.ts      ✅ Incluye orgId
```

### 🔴 Archivos Pendientes de Actualizar
```
src/lib/actions/turno.action.ts               ⏳ Completar todas las funciones
src/lib/actions/paciente.action.ts            🔴 TODO
src/lib/actions/especialista.action.ts        🔴 TODO - REFACTORIZAR
src/lib/services/whatsapp-bot.service.ts      🔴 TODO
src/lib/services/cron-recordatorios.service.ts 🔴 TODO
fisio-bot/src/recordatorios.service.ts        🔴 TODO
+ Todos los componentes de frontend            🔴 TODO
```

---

## 🎯 CHECKLIST EXPRESS

### Antes de empezar:
- [ ] Leíste `RESUMEN-EJECUTIVO.md`
- [ ] Entendiste la arquitectura
- [ ] Tienes entorno de staging
- [ ] Ejecutaste RLS en staging

### Durante desarrollo:
- [ ] Usas `getAuthContext()` en TODAS las actions
- [ ] Filtras TODAS las queries por `orgId`
- [ ] Inyectas `orgId` en TODOS los inserts
- [ ] Testas con 2 orgs diferentes
- [ ] Validas aislamiento de datos

### Antes de desplegar:
- [ ] RLS policies ejecutadas y validadas
- [ ] Migración de datos completa
- [ ] Testing de seguridad PASADO
- [ ] Backup de producción realizado
- [ ] Plan de rollback preparado

---

## 💬 PREGUNTAS FRECUENTES

### ❓ ¿Por dónde empiezo?
1. Lee `RESUMEN-EJECUTIVO.md`
2. Crea staging y ejecuta `RLS-POLICIES.sql`
3. Empieza con `turno.action.ts` (ya 30% hecho)

### ❓ ¿Qué hago si me trabo con especialistas?
Lee `EJEMPLOS-MULTI-ORG.md` líneas 143-235.
El cambio clave: ahora `usuario_especialidad` referencia `id_usuario_organizacion`, NO `id_usuario`.

### ❓ ¿Cómo testeo el aislamiento de datos?
```typescript
// Ver sección "TESTING ESENCIAL" arriba
```

### ❓ ¿Qué pasa si no ejecuto las RLS policies?
🚨 **PELIGRO**: Cualquier usuario podría ver/modificar datos de otras organizaciones.
**Las RLS policies son OBLIGATORIAS**.

### ❓ ¿Puedo ir a producción sin completar todo?
❌ **NO**. Mínimo necesitas:
1. RLS policies activas
2. Todas las actions actualizadas
3. Testing de seguridad PASADO

---

## 🆘 AYUDA Y SOPORTE

### Si tienes dudas:
1. **Revisa la documentación**
   - `GUIA-MULTI-ORGANIZACION.md` → Detalle técnico
   - `EJEMPLOS-MULTI-ORG.md` → Código de referencia
   
2. **Busca en el código existente**
   - `organizacion.service.ts` → Ejemplo de servicio
   - `turno.action.ts` → Ejemplo de action actualizada

3. **Usa el código generado como referencia**
   - Ya tienes patrones implementados
   - Copia el estilo de los servicios creados

---

## 🎉 ¡ESTÁS LISTO!

Tienes:
- ✅ 70% del código implementado
- ✅ Arquitectura sólida y escalable
- ✅ Documentación exhaustiva
- ✅ Ejemplos prácticos
- ✅ RLS policies listas
- ✅ Flujo SaaS completo

Solo falta:
- ⏳ Completar las actions restantes
- ⏳ Actualizar frontend
- ⏳ Testing final
- ⏳ Desplegar

**El trabajo duro (arquitectura y diseño) ya está hecho. Ahora es seguir el patrón. 🚀**

---

_Última actualización: Noviembre 2, 2025_
_Estado: Fundación completa, listo para implementación_

**¡Éxito! 💪**
