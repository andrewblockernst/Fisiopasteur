# Fisiopasteur

SaaS de gestión para un centro de fisioterapia (turnos, pacientes, especialistas,
pilates, facturación). **Instancia única — no es multi-tenant.**

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5**
- **Supabase** (Postgres + Auth + SSR via `@supabase/ssr`)
- **TanStack Query v5** para data fetching client-side
- **Zustand** para estado global UI
- **React Hook Form + Zod** para formularios
- **Tailwind v4** + Radix UI primitives + `class-variance-authority`
- **dayjs** para fechas (NO date-fns, NO moment)
- **MercadoPago** para pagos
- Deploy: Vercel · Node >= 24

## Estructura

```
src/
├── app/
│   ├── (auth)/         # login, registro, recuperar
│   ├── (main)/         # app autenticada (inicio, turnos, pacientes, etc.)
│   ├── api/            # route handlers
│   ├── landing/        # marketing
│   └── imprimir/       # vistas de impresión
├── componentes/        # UI por dominio (calendario, turnos, paciente, ...)
│   └── ui/             # primitives compartidos
├── lib/
│   ├── actions/        # Server Actions (mutaciones + queries server-side)
│   ├── services/       # lógica de negocio reusable
│   ├── supabase/       # clients (server, browser, middleware)
│   ├── auth/           # helpers de sesión/permisos
│   ├── database.types.ts  # GENERADO — no editar a mano
│   └── dayjs.ts        # configuración de locale/timezone
├── hooks/              # custom hooks (mayormente wrappers de useQuery)
├── stores/             # zustand stores
├── types/              # tipos compartidos no derivados de DB
└── middleware.ts       # auth + routing protegido
```

## Convenciones

### Data fetching
- **Server Components por default.** Leer datos con Server Actions o el server client de Supabase directamente.
- **TanStack Query solo en client** para datos que mutan/se refrescan en el cliente (calendario, listas filtrables).
- Tras una mutación, invalidar las queries afectadas con `queryClient.invalidateQueries({ queryKey: [...] })`. Convención de query keys: `['turnos', filtros]`, `['pacientes']`, etc.

### Server Actions
- Viven en `src/lib/actions/<dominio>.action.ts`.
- Siempre validar input con Zod antes de tocar la DB.
- Devolver `{ ok: true, data }` / `{ ok: false, error }` — no tirar excepciones cruzando el límite cliente/servidor.
- Llamar `revalidatePath` en mutaciones que afectan Server Components.

### Supabase
- Tipos auto-generados con `npm run types:generate` — no editar `database.types.ts`.
- Tres clients distintos en `src/lib/supabase/`: server, browser, middleware. Usar el correcto según contexto.

### Formularios
- React Hook Form + `zodResolver`. Schemas Zod compartidos entre cliente y server action.

### Fechas
- Siempre `dayjs` desde `@/lib/dayjs` (ya viene con locale `es` y timezone configurado).
- En DB: `timestamptz`. En UI: formatear con dayjs, nunca con `toLocaleString`.

### UI
- Componentes nuevos: usar primitives de `src/componentes/ui/` (Boton, BaseDialog, etc.). No mezclar `styled-components` con Tailwind en componentes nuevos — Tailwind es el default.
- Diálogos: extender `base-dialog.tsx`. Está bien diseñado, no rehacer.
- Iconos: `lucide-react`.
- Colores/spacing: usar tokens de Tailwind, no hardcodear hex.

### Imports
- Alias `@/` apunta a `src/`. Usar siempre `@/lib/...`, `@/componentes/...`.

## Comandos

```bash
npm run dev              # dev con Turbopack
npm run build            # build de producción
npm run lint             # ESLint (next/core-web-vitals)
npm run types:generate   # regenerar tipos de Supabase
```

## Cosas que NO hacer

- No agregar nuevas dependencias de fechas (dayjs ya está).
- No usar `any` salvo en interop con libs sin tipos.
- No crear archivos `.md` en `docs/` salvo que el usuario lo pida — ya hay demasiados.
- No mezclar Server Actions con route handlers para la misma operación: elegir uno.
- No usar `Date.now()` o `new Date()` para lógica de negocio — usar dayjs.
- **No introducir lógica multi-organización / multi-tenant.** La app es de instancia única; cualquier referencia residual a "organización" debe eliminarse, no extenderse.
```

