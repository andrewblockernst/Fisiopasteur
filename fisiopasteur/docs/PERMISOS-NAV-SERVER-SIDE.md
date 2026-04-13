# Permisos de navegación: Server-side

## Contexto

El sistema tiene distintos tipos de usuarios (Admin, Especialista, Programador). Dentro de los especialistas, algunos trabajan exclusivamente con Pilates. Cada perfil debe ver solo los módulos que le corresponden en la barra de herramientas (desktop) y la barra inferior (mobile).

La lógica corre en el servidor al momento de renderizar el layout principal, y los datos se pasan al cliente como valores ya resueltos — sin queries desde el navegador.

---

## Datos que el servidor computa

La interfaz `PerfilNavFlags` contiene **dos datos reales**:

```ts
export interface PerfilNavFlags {
  tienePilates: boolean;   // tiene Pilates entre sus especialidades activas
  puedeGestionar: boolean; // Admin o Programador (acceso completo)
}
```

De estos dos se deriva todo lo demás en cada componente:

```ts
const verTurnos     = puedeGestionar || !tienePilates;
const verPilates    = puedeGestionar || tienePilates;
const verCalendario = verTurnos; // siempre igual a verTurnos
const esSoloPilates = tienePilates && !puedeGestionar;
```

### Tabla de visibilidad por perfil

| Perfil | `tienePilates` | `puedeGestionar` | Turnos | Pilates | Calendario |
|---|---|---|---|---|---|
| Especialista no-Pilates | `false` | `false` | ✓ | — | ✓ |
| Especialista Pilates | `true` | `false` | — | ✓ | — |
| Admin / Programador | cualquiera | `true` | ✓ | ✓ | ✓ |

---

## Archivos modificados

### `src/lib/actions/perfil.action.ts`

Contiene la interfaz `PerfilNavFlags` y la función `obtenerPermisosNav()`.

`obtenerPermisosNav()` es una acción de servidor que:
1. Verifica si hay sesión activa — devuelve `null` si no hay (sin redirect).
2. Consulta `id_rol` del usuario en la tabla `usuario`.
3. Consulta sus especialidades activas en `usuario_especialidad`.
4. Devuelve `{ tienePilates, puedeGestionar }`.

---

### `src/hooks/PerfilNavContext.tsx`

Contexto React (`'use client'`) que recibe los flags del servidor y los expone con `usePerfilNav()`.

- Sin estado de carga — los valores llegan resueltos desde el servidor.
- Default: `{ tienePilates: false, puedeGestionar: false }` (fallback si el layout no puede computar los flags; el middleware protege las rutas de todos modos).

---

### `src/app/(main)/layout.tsx`

Convertido de `"use client"` a **Server Component async**.

```tsx
export default async function MainLayout({ children }) {
  const flags = (await obtenerPermisosNav()) ?? defaultFlags;
  return (
    <PerfilNavProvider flags={flags}>
      ...
    </PerfilNavProvider>
  );
}
```

Llama a `obtenerPermisosNav()` antes de enviar HTML al navegador. Los componentes cliente hijos reciben el menú ya con los ítems correctos desde el primer render.

---

### `src/componentes/herramientas/herramientas.tsx`

Barra lateral desktop. Usa `usePerfilNav()` y deriva la visibilidad localmente:

```ts
const { tienePilates, puedeGestionar } = usePerfilNav();
const verTurnos     = puedeGestionar || !tienePilates;
const verPilates    = puedeGestionar || tienePilates;
const verCalendario = verTurnos;
```

---

### `src/componentes/barra/barra.tsx`

Barra inferior mobile. Tiene dos layouts según el perfil:

- **Especialista Pilates** (`tienePilates && !puedeGestionar`): `Inicio · Pilates · Pacientes · Perfil`
- **Resto**: `Inicio · [Pilates] · Agregar · [Calendario] · Perfil`

---

### `src/componentes/barra/agregar-boton.tsx`

Botón "Agregar" en la navbar mobile. Usa `usePerfilNav()` para excluir la opción "Turnos" cuando `!verTurnos`.

---

### `src/lib/actions/turno.action.ts`

- `obtenerEspecialistas()` y `obtenerEspecialistasParaTurnos()` excluyen especialistas cuya única especialidad es Pilates (para el módulo de Turnos normal).
- `obtenerEspecialistasPilates()` devuelve **solo** especialistas con Pilates entre sus especialidades. Usada en el módulo de Pilates.

---

### `src/hooks/AuthContext.tsx`

Se eliminó la query a `usuario_especialidad` y el campo `esPilates` del contexto de autenticación. La detección de especialidades quedó en el servidor (`obtenerPermisosNav`). El contexto de auth ahora solo maneja identidad y rol.

---

## Flujo completo

```
Request a cualquier página en /(main)
        │
        ▼
  layout.tsx (Server Component async)
        │
        ├─ obtenerPermisosNav()
        │       ├─ query: usuario (id_rol)
        │       └─ query: usuario_especialidad (nombres)
        │               └─ devuelve { tienePilates, puedeGestionar }
        │
        ▼
  <PerfilNavProvider flags={flags}>
        │
        ├─ <Herramientas />   — deriva verTurnos / verPilates / verCalendario
        ├─ <BarraCelular />   — deriva esSoloPilates, elige layout de navbar
        │       └─ <AgregarBoton /> — deriva verTurnos
        └─ {children}
```

---

## Por qué es mejor que el enfoque anterior

**Antes (client-side):**
- `AuthContext` hacía una query extra a `usuario_especialidad` desde el navegador.
- Los ítems del menú podían aparecer y desaparecer mientras se resolvía la query (flash de UI).
- Lógica de negocio dispersa en componentes cliente.

**Ahora (server-side):**
- Las dos queries corren en el servidor antes de devolver el HTML.
- El menú llega correcto desde el primer render, sin flash.
- Un solo lugar (`obtenerPermisosNav`) concentra las reglas de visibilidad.
- El cliente recibe solo dos booleanos y deriva el resto localmente.
