-- Devuelve filas de especialista + total_count en una sola RPC para evitar query adicional de conteo.

CREATE OR REPLACE FUNCTION public.buscar_especialistas_general(
  search_term text,
  max_rows integer,
  p_status text DEFAULT 'activos',
  p_order_by text DEFAULT 'nombre',
  p_order_direction text DEFAULT 'asc',
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  data public.usuario,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_status text := lower(coalesce(p_status, 'activos'));
  v_order_by text := lower(coalesce(p_order_by, 'nombre'));
  v_order_direction text := lower(coalesce(p_order_direction, 'asc'));
  v_limit integer := greatest(coalesce(max_rows, 20), 1);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
BEGIN
  IF v_status NOT IN ('activos', 'inactivos', 'todos') THEN
    v_status := 'activos';
  END IF;

  IF v_order_by NOT IN ('id_usuario', 'nombre', 'apellido', 'email', 'telefono', 'created_at', 'updated_at') THEN
    v_order_by := 'nombre';
  END IF;

  IF v_order_direction NOT IN ('asc', 'desc') THEN
    v_order_direction := 'asc';
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT u, count(*) OVER()::bigint AS total_count
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
END;
$function$;

-- Wrapper extendido: mantiene nombre usado por la app y expone total_count.
CREATE OR REPLACE FUNCTION public.buscar_especialistas_smart(
  search_term text,
  max_rows integer,
  p_status text DEFAULT 'activos',
  p_order_by text DEFAULT 'nombre',
  p_order_direction text DEFAULT 'asc',
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  data public.usuario,
  total_count bigint
)
LANGUAGE sql
STABLE
AS $function$
  SELECT *
  FROM public.buscar_especialistas_general(
    search_term,
    max_rows,
    p_status,
    p_order_by,
    p_order_direction,
    p_offset
  );
$function$;

-- Wrapper legacy: firma historica que devuelve SETOF usuario.
CREATE OR REPLACE FUNCTION public.buscar_especialistas_smart(
  search_term text,
  max_rows integer
)
RETURNS SETOF public.usuario
LANGUAGE sql
STABLE
AS $function$
  SELECT (t.data).*
  FROM public.buscar_especialistas_general(
    search_term,
    max_rows,
    'activos',
    'nombre',
    'asc',
    0
  ) t;
$function$;
