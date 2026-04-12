# Migración de permisos de navegación: Cliente → Servidor

## Contexto

El sistema tiene distintos tipos de usuarios (Admin, Especialista, Programador) y dentro de los especialistas, algunos trabajan exclusivamente con Pilates. Cada tipo de usuario debe ver solo los módulos que le corresponden en la barra de herramientas y la barra inferior del celular.

**Antes:** esta lógica corría 100% en el cliente, lo que implicaba una query adicional a Supabase desde el navegador en cada sesión.  
**Ahora:** los permisos se calculan en el servidor al momento de renderizar el layout, y se pasan al cliente como valores ya resueltos.

---

## Qué se modificó

### 1. `src/lib/actions/perfil.action.ts` — Acción de servidor

Se agregaron:

- **Interfaz `PerfilNavFlags`**: define los cuatro flags de navegación que el servidor computa.

```ts
export interface PerfilNavFlags {
  verTurnos: boolean;
  verCalendario: boolean;
  verPilates: boolean;
  puedeGestionar: boolean;
}
```

- **Función `obtenerPermisosNav()`**: acción de servidor (`'use server'`) que:
  1. Verifica si el usuario tiene sesión activa.
  2. Consulta su `id_rol` de la tabla `usuario`.
  3. Consulta sus especialidades activas de `usuario_especialidad`.
  4. Calcula los flags y los devuelve.
  5. **No redirige** si falla — devuelve `null` para que el layout use valores por defecto.

**Lógica de los flags:**

| Flag | Cuándo es `true` |
|---|---|
| `verTurnos` | Admin / Programador, **o** no tiene Pilates como especialidad |
| `verCalendario` | Igual que `verTurnos` |
| `verPilates` | Admin / Programador, **o** tiene Pilates como especialidad |
| `puedeGestionar` | Admin o Programador (puede ver todo) |

---

### 2. `src/hooks/PerfilNavContext.tsx` — Contexto cliente (nuevo archivo)

Contexto React minimalista que recibe los flags calculados por el servidor y los expone a los componentes cliente.

- **`PerfilNavProvider`**: envuelve la aplicación con los flags como valor del contexto.
- **`usePerfilNav()`**: hook para leer los flags desde cualquier componente cliente.
- Si no hay flags disponibles, el contexto tiene valores por defecto que muestran todo (fallback seguro; el middleware de Next.js protege las rutas de todos modos).

---

### 3. `src/app/(main)/layout.tsx` — Layout principal

**Antes:**
```tsx
"use client"
export default function MainLayout({ children }) { ... }
```

**Después:**
```tsx
// Sin "use client" — es un Server Component async
export default async function MainLayout({ children }) {
  const flags = (await obtenerPermisosNav()) ?? defaultFlags;
  return (
    <PerfilNavProvider flags={flags}>
      ...
    </PerfilNavProvider>
  );
}
```

Al quitar `"use client"` y hacerlo `async`, el layout puede llamar directamente a funciones de servidor (Supabase, DB) antes de enviar cualquier HTML al navegador. Los componentes hijos que necesitan ser cliente (`Herramientas`, `BarraCelular`) siguen funcionando porque en Next.js App Router un Server Component puede renderizar Client Components sin problema.

---

### 4. `src/componentes/herramientas/herramientas.tsx` — Barra lateral desktop

**Antes:** usaba `useAuth()` y leía `user.esPilates` para decidir qué mostrar.

**Después:** usa `usePerfilNav()` y lee los flags calculados por el servidor.

Cambios de visibilidad:
- `Turnos` → visible solo si `verTurnos`
- `Pilates` → visible solo si `verPilates` *(nuevo)*
- `Calendario` → visible solo si `verCalendario` *(nuevo)*

---

### 5. `src/componentes/barra/barra.tsx` — Barra inferior mobile

Misma lógica que `herramientas.tsx` pero para la navbar del celular. Se agregó `usePerfilNav()` para ocultar condicionalmente Pilates y Calendario según el rol.

---

### 6. `src/componentes/barra/agregar-boton.tsx` — Botón "Agregar"

**Antes:** leía `user.esPilates` desde `useAuth()` para filtrar la opción "Turnos" del menú.

**Después:** lee `verTurnos` y `puedeGestionar` desde `usePerfilNav()`. La lógica es la misma pero los datos ya vienen resueltos del servidor.

---

### 7. `src/hooks/AuthContext.tsx` — Contexto de autenticación

Se eliminaron:
- El campo `esPilates` de la interfaz `Usuario`.
- La query a `usuario_especialidad` que se hacía en el cliente para detectar Pilates.

El contexto de auth ahora solo maneja identidad y rol del usuario. La detección de especialidades, que es responsabilidad de la navegación, se movió al servidor.

---

## Por qué es mejor

### Antes (todo en el cliente)

```
Navegador carga → React hydration → useAuth() corre →
query auth → query usuario → query usuario_especialidad →
setState → re-render de herramientas/barra
```

Esto significaba:
- **Tres queries** a Supabase desde el navegador al iniciar sesión.
- **Flash de contenido**: los ítems del menú aparecían y desaparecían mientras se resolvían las queries (el menú se veía completo hasta que llegaba la respuesta de `usuario_especialidad`).
- **Lógica de negocio en el cliente**: las reglas de "qué puede ver cada rol" vivían en el front, accesibles e inspeccionables por el usuario.

### Ahora (servidor)

```
Request → servidor calcula flags → HTML con menú correcto →
Navegador recibe página ya renderizada
```

- **Una sola roundtrip del servidor**: las dos queries (`usuario` + `usuario_especialidad`) corren en el servidor antes de devolver el HTML.
- **Sin flash de UI**: el menú llega ya con los ítems correctos desde el primer render.
- **Menos carga en el cliente**: `AuthContext` dejó de hacer una query extra, su responsabilidad es solo la autenticación.
- **Lógica centralizada**: las reglas de visibilidad viven en `obtenerPermisosNav()` en el servidor, no dispersas entre componentes cliente.

---

## Diagrama de flujo simplificado

```
Request a cualquier página en /(main)
        │
        ▼
  layout.tsx (Server Component async)
        │
        ├─ obtenerPermisosNav()
        │       │
        │       ├─ query: usuario (id_rol)
        │       └─ query: usuario_especialidad (nombres)
        │               │
        │               └─ calcula flags → { verTurnos, verCalendario, verPilates, puedeGestionar }
        │
        ▼
  <PerfilNavProvider flags={flags}>
        │
        ├─ <Herramientas />  ← lee flags via usePerfilNav()
        ├─ <BarraCelular />  ← lee flags via usePerfilNav()
        │       └─ <AgregarBoton /> ← lee flags via usePerfilNav()
        └─ {children}
```
