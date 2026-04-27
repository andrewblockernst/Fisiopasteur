-- RPC de busqueda inteligente de especialistas con filtros/orden/paginacion opcionales
-- Mantiene compatibilidad con la firma legacy de 2 parametros.

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.buscar_especialistas_general(
  search_term text,
  max_rows integer,
  p_status text DEFAULT 'activos',
  p_order_by text DEFAULT 'nombre',
  p_order_direction text DEFAULT 'asc',
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.usuario
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
    'SELECT *
     FROM usuario
     WHERE id_rol IN (1, 2)
       AND (
         (nombre || '' '' || apellido) ILIKE ''%%'' || $1 || ''%%''
         OR (apellido || '' '' || nombre) ILIKE ''%%'' || $1 || ''%%''
         OR coalesce(telefono, '''') ILIKE $1 || ''%%''
       )
       AND (
         $2 = ''todos''
         OR ($2 = ''activos'' AND activo = true)
         OR ($2 = ''inactivos'' AND activo = false)
       )
     ORDER BY %I %s, id_usuario ASC
     LIMIT $3 OFFSET $4',
    v_order_by,
    v_order_direction
  )
  USING search_term, v_status, v_limit, v_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.buscar_especialistas_smart(
  search_term text,
  max_rows integer
)
RETURNS SETOF public.usuario
LANGUAGE sql
STABLE
AS $function$
  SELECT *
  FROM public.buscar_especialistas_general(
    search_term,
    max_rows,
    'activos',
    'nombre',
    'asc',
    0
  );
$function$;
