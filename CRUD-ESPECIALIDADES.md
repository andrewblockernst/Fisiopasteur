# CRUD de Especialidades - Implementación Completa

## 📋 Resumen

Se implementó un sistema completo de gestión (CRUD) de especialidades para cada organización. Ahora los administradores pueden crear, editar y eliminar las especialidades disponibles en su organización sin necesidad de acceder directamente a la base de datos.

## 🎯 Funcionalidades Implementadas

### 1. **Crear Especialidad**
- ✅ Validación de nombre no vacío
- ✅ Verificación de duplicados (por nombre e id_organizacion)
- ✅ Filtrado por organización (multi-tenant)
- ✅ Feedback visual con toasts

### 2. **Editar Especialidad**
- ✅ Edición inline en el dialog
- ✅ Validación de nombre no vacío
- ✅ Verificación de duplicados (excluyendo la especialidad actual)
- ✅ Solo especialidades de la organización actual
- ✅ Teclas rápidas: Enter para guardar, Escape para cancelar

### 3. **Eliminar Especialidad**
- ✅ Validación de permisos (solo de la organización actual)
- ✅ Verificación de uso en especialistas (no permite eliminar si está en uso)
- ✅ Verificación de uso en turnos (no permite eliminar si hay turnos asociados)
- ✅ Confirmación antes de eliminar
- ✅ Feedback visual con toasts

### 4. **Listar Especialidades**
- ✅ Filtrado automático por organización
- ✅ Ordenamiento alfabético
- ✅ Visualización en dialog modal
- ✅ Contador de especialidades

## 📁 Archivos Creados/Modificados

### Nuevos Archivos

1. **`/src/lib/actions/especialidad.action.ts`** (344 líneas)
   - `getEspecialidades()` - Obtener todas las especialidades de la organización
   - `createEspecialidad(nombre)` - Crear nueva especialidad
   - `updateEspecialidad(id, nombre)` - Actualizar especialidad existente
   - `deleteEspecialidad(id)` - Eliminar especialidad (con validaciones)

2. **`/src/componentes/especialista/gestion-especialidades-dialog.tsx`** (243 líneas)
   - Dialog modal para gestión completa de especialidades
   - Formulario de creación inline
   - Lista de especialidades con edición inline
   - Botones de acción (editar, eliminar)
   - Estados de loading y validaciones
   - Integración con toasts para feedback

### Archivos Modificados

3. **`/src/app/(main)/especialistas/page.tsx`**
   - ✅ Agregado import de `getEspecialidades` desde `especialidad.action.ts`
   - ✅ Agregado import de `GestionEspecialidadesDialog`
   - ✅ Agregado estado `showEspecialidadesDialog`
   - ✅ Agregado botón "Especialidades" con ícono `GraduationCap`
   - ✅ Agregados handlers para actualizar especialidades
   - ✅ Agregado dialog de gestión de especialidades

4. **`/src/lib/actions/especialista.action.ts`**
   - ✅ Función `getEspecialidades` renombrada a `getEspecialidadesLegacy`
   - ✅ Agregado filtrado por organización
   - ✅ Marcada como deprecada en favor de la nueva en `especialidad.action.ts`

## 🎨 UI/UX

### Ubicación del Botón
- **Desktop**: Botón "Especialidades" con ícono de birrete académico (`GraduationCap`) al lado izquierdo del botón "Nuevo Especialista"
- **Color**: Variante secundaria (gris) para diferenciarlo del botón primario
- **Ícono**: `GraduationCap` de lucide-react

### Dialog Modal
- **Tamaño**: Large (lg)
- **Estructura**:
  1. **Header**: Título "Gestionar Especialidades" con descripción
  2. **Formulario de Creación**: Input + Botón "Agregar" en panel destacado (bg-gray-50)
  3. **Lista de Especialidades**: Scroll vertical con max-height, items editables inline
  4. **Footer**: Botón "Cerrar"

### Interacciones
- **Crear**: Enter en el input o clic en "Agregar"
- **Editar**: Clic en ícono de lápiz → modo edición inline → Enter para guardar / Escape para cancelar
- **Eliminar**: Clic en ícono de papelera → confirmación → eliminación con validaciones

## 🔒 Validaciones y Seguridad

### Server-Side (actions)
1. ✅ **Autenticación**: Todas las acciones verifican contexto organizacional
2. ✅ **Multi-tenant**: Filtrado estricto por `id_organizacion`
3. ✅ **Validación de Nombres**: No permite nombres vacíos
4. ✅ **Duplicados**: Verifica que no exista otra especialidad con el mismo nombre
5. ✅ **Integridad Referencial**:
   - No permite eliminar si está en uso en `usuario_especialidad`
   - No permite eliminar si hay turnos con esa especialidad
6. ✅ **Permisos**: Solo usuarios que `puedeGestionarTurnos` (Admin/Programador)

### Client-Side (componentes)
1. ✅ **Validación de campos**: Deshabilita botones si nombre está vacío
2. ✅ **Confirmación**: Pide confirmación antes de eliminar
3. ✅ **Estados de loading**: Deshabilita controles durante operaciones async
4. ✅ **Feedback visual**: Toasts para todas las operaciones

## 🔄 Flujo de Datos

```
Usuario → Click "Especialidades"
       ↓
Dialog Modal se abre con lista actual
       ↓
Usuario crea/edita/elimina
       ↓
Action en servidor (validaciones + operación DB)
       ↓
Toast de resultado (éxito/error)
       ↓
Recarga automática de especialidades
       ↓
Dialog se actualiza con nueva data
```

## 🎯 Casos de Uso

### Caso 1: Crear nueva especialidad
```typescript
// Input: "Rehabilitación Deportiva"
// Output: ✅ Especialidad creada y agregada a la lista
```

### Caso 2: Editar especialidad existente
```typescript
// Input: "Kinesiologia" → "Kinesiología"
// Output: ✅ Especialidad actualizada con nombre corregido
```

### Caso 3: Eliminar especialidad sin uso
```typescript
// Input: Especialidad "Test" sin especialistas ni turnos
// Output: ✅ Especialidad eliminada correctamente
```

### Caso 4: Intento de eliminar especialidad en uso
```typescript
// Input: Especialidad "Kinesiología" con 3 especialistas
// Output: ❌ "Esta especialidad está asignada a uno o más especialistas"
```

### Caso 5: Intento de crear duplicado
```typescript
// Input: "Fisioterapia" (ya existe)
// Output: ❌ "Ya existe una especialidad con ese nombre"
```

## 🔗 Integración con Sistema Existente

### Tabla `especialidad` (Base de Datos)
```sql
CREATE TABLE especialidad (
  id_especialidad SERIAL PRIMARY KEY,
  id_organizacion UUID NOT NULL REFERENCES organizacion(id_organizacion),
  nombre VARCHAR(100) NOT NULL,
  UNIQUE(id_organizacion, nombre) -- Previene duplicados por organización
);
```

### Relaciones
1. **`usuario_especialidad`**: Especialidades asignadas a especialistas
2. **`turno`**: Turnos con especialidad específica
3. **`organizacion`**: Cada especialidad pertenece a una organización

## ✅ Checklist de Implementación

- [x] Crear archivo de acciones `especialidad.action.ts`
- [x] Implementar función `getEspecialidades()` con filtro por organización
- [x] Implementar función `createEspecialidad()` con validaciones
- [x] Implementar función `updateEspecialidad()` con validaciones
- [x] Implementar función `deleteEspecialidad()` con verificaciones de integridad
- [x] Crear componente `GestionEspecialidadesDialog.tsx`
- [x] Agregar botón "Especialidades" en página de especialistas
- [x] Integrar dialog con estado global de especialidades
- [x] Agregar handlers de actualización
- [x] Implementar feedback con toasts
- [x] Manejar estados de loading
- [x] Agregar confirmación de eliminación
- [x] Verificar permisos (solo Admin/Programador)
- [x] Probar flujo completo de CRUD
- [x] Verificar build exitoso

## 🚀 Cómo Usar

### Para Administradores:

1. **Ir a Especialistas** → Navegar a `/especialistas`
2. **Click en "Especialidades"** → Se abre el dialog modal
3. **Crear Especialidad** → Escribir nombre y click "Agregar" o Enter
4. **Editar Especialidad** → Click en ícono de lápiz → Editar → Enter o click "Guardar"
5. **Eliminar Especialidad** → Click en ícono de papelera → Confirmar

### Para Desarrolladores:

```typescript
// Importar actions
import { 
  getEspecialidades, 
  createEspecialidad, 
  updateEspecialidad, 
  deleteEspecialidad 
} from "@/lib/actions/especialidad.action";

// Usar en componentes
const especialidades = await getEspecialidades();
const result = await createEspecialidad("Nueva Especialidad");
```

## 📊 Métricas

- **Archivos creados**: 2
- **Archivos modificados**: 2
- **Líneas de código agregadas**: ~600
- **Funciones creadas**: 4 actions + 1 componente
- **Validaciones implementadas**: 8
- **Casos de uso cubiertos**: 5

## 🔮 Mejoras Futuras (Opcionales)

1. ⚪ Agregar descripción a especialidades
2. ⚪ Permitir reordenar especialidades (drag & drop)
3. ⚪ Agregar campo de color por especialidad
4. ⚪ Estadísticas de uso (cuántos especialistas por especialidad)
5. ⚪ Búsqueda/filtrado en lista de especialidades
6. ⚪ Exportar/importar especialidades entre organizaciones
7. ⚪ Historial de cambios (auditoría)

## ✨ Conclusión

Se implementó exitosamente un CRUD completo de especialidades con todas las validaciones necesarias, respetando la arquitectura multi-tenant del sistema y manteniendo la integridad referencial de la base de datos. La solución es intuitiva, segura y está lista para producción.
