-- =============================================================================
-- FASE 2 (A3) — Sacar `contraseña` de las RPC buscar_especialistas_*
-- =============================================================================
-- Las RPC devolvían `SETOF usuario` / `TABLE(data usuario, ...)`, o sea la fila
-- COMPLETA de `usuario` incluyendo la columna `contraseña` (hashes legacy). Un
-- especialista autenticado podía llamar la RPC directo y obtener los hashes de
-- otros usuarios.
--
-- FIX: devolver `data` como jsonb construido con `to_jsonb(u) - 'contraseña'`,
-- que excluye esa columna. El resto del payload es idéntico.
--
-- SEGURO para la app: el único consumer (getEspecialistas) hace
-- `row?.data ? row.data : row` y lee id_usuario/id_rol/nombre/apellido/email/
-- telefono/color/activo — NUNCA contraseña. Los wrappers `smart` no los llama
-- nadie en la app (solo aparecen en los tipos generados); se recrean igual, sin
-- contraseña, para no romper la superficie.
--
-- Nota: no hace falta regenerar tipos ahora — el consumer usa `(supabase as any)
-- .rpc(...)`. Al aplicar en prod se puede correr `npm run types:generate`.
--
-- Idempotente (dropea todas las overloads antes de recrear).
-- =============================================================================

-- 1) Dropear TODAS las overloads existentes (firma dinámica, sin adivinar).
do $$
declare
  r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('buscar_especialistas_general', 'buscar_especialistas_smart')
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

-- 2) general: `data` = jsonb de la fila SIN contraseña + total_count.
create or replace function public.buscar_especialistas_general(
  search_term text,
  max_rows integer,
  p_status text default 'activos',
  p_order_by text default 'nombre',
  p_order_direction text default 'asc',
  p_offset integer default 0
)
returns table (data jsonb, total_count bigint)
language plpgsql
stable
as $function$
declare
  v_status text := lower(coalesce(p_status, 'activos'));
  v_order_by text := lower(coalesce(p_order_by, 'nombre'));
  v_order_direction text := lower(coalesce(p_order_direction, 'asc'));
  v_limit integer := greatest(coalesce(max_rows, 20), 1);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_status not in ('activos', 'inactivos', 'todos') then
    v_status := 'activos';
  end if;

  if v_order_by not in ('id_usuario', 'nombre', 'apellido', 'email', 'telefono', 'created_at', 'updated_at') then
    v_order_by := 'nombre';
  end if;

  if v_order_direction not in ('asc', 'desc') then
    v_order_direction := 'asc';
  end if;

  return query execute format(
    'SELECT to_jsonb(u) - ''contraseña'' AS data, count(*) OVER()::bigint AS total_count
     FROM usuario u
     WHERE u.id_rol IN (1, 2)
       AND (
         (u.nombre || '' '' || u.apellido) ILIKE ''%%'' || coalesce($1, '''') || ''%%''
         OR (u.apellido || '' '' || u.nombre) ILIKE ''%%'' || coalesce($1, '''') || ''%%''
         OR coalesce(u.telefono, '''') ILIKE coalesce($1, '''') || ''%%''
       )
       AND (
         $2 = ''todos''
         OR ($2 = ''activos'' AND u.activo = true)
         OR ($2 = ''inactivos'' AND u.activo = false)
       )
     ORDER BY u.%I %s, u.id_usuario ASC
     LIMIT $3 OFFSET $4',
    v_order_by,
    v_order_direction
  )
  USING search_term, v_status, v_limit, v_offset;
end;
$function$;

-- 3) smart (6 args): wrapper con la misma firma que general.
create or replace function public.buscar_especialistas_smart(
  search_term text,
  max_rows integer,
  p_status text default 'activos',
  p_order_by text default 'nombre',
  p_order_direction text default 'asc',
  p_offset integer default 0
)
returns table (data jsonb, total_count bigint)
language sql
stable
as $function$
  select *
  from public.buscar_especialistas_general(
    search_term, max_rows, p_status, p_order_by, p_order_direction, p_offset
  );
$function$;

-- 4) smart (2 args, legacy): devuelve solo el jsonb sin contraseña.
create or replace function public.buscar_especialistas_smart(
  search_term text,
  max_rows integer
)
returns setof jsonb
language sql
stable
as $function$
  select t.data
  from public.buscar_especialistas_general(
    search_term, max_rows, 'activos', 'nombre', 'asc', 0
  ) t;
$function$;
