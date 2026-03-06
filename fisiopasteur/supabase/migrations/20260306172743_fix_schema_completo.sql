alter table "public"."box" drop constraint "box_numero_key";

drop index if exists "public"."box_numero_key";

alter table "public"."grupo_tratamiento" disable row level security;

CREATE UNIQUE INDEX box_numero_activo_idx ON public.box USING btree (numero) WHERE (estado = 'activo'::text);

CREATE UNIQUE INDEX especialidad_nombre_unique_idx ON public.especialidad USING btree (lower(TRIM(BOTH FROM nombre)));

CREATE UNIQUE INDEX paciente_email_key ON public.paciente USING btree (email);

alter table "public"."paciente" add constraint "paciente_email_key" UNIQUE using index "paciente_email_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.buscar_pacientes_smart(search_term text, max_rows integer)
 RETURNS SETOF public.paciente
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM paciente
  WHERE 
    (
      -- Opción A: Concatenación simple (resuelve tu problema "Julio Roca")
      (nombre || ' ' || apellido) ILIKE '%' || search_term || '%'
      OR
      -- Opción B: También busca si escriben primero el apellido "Roca Julio"
      (apellido || ' ' || nombre) ILIKE '%' || search_term || '%'
      OR
      -- Opción C: DNI
      dni ILIKE search_term || '%'
    )
  ORDER BY apellido, nombre
  LIMIT max_rows;
END;
$function$
;


  create policy "authenticated users can insert grupo_tratamiento"
  on "public"."grupo_tratamiento"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "usuarios autenticados pueden actualizar grupos"
  on "public"."grupo_tratamiento"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "usuarios autenticados pueden crear grupos"
  on "public"."grupo_tratamiento"
  as permissive
  for insert
  to authenticated
with check (true);



