-- ============================================================
-- RECONCILIACIÓN PROD → DEV (Fisiopasteur)
-- Fecha: 2026-06-15
-- ============================================================
-- Esta migration consolida en una sola operación todos los
-- cambios necesarios para que prod alcance el estado del schema
-- de dev. Se generó con `migra` comparando ambas BDs y luego se
-- filtró el ruido del schema `realtime.*` (particiones diarias
-- que Supabase administra automáticamente).
--
-- Contenido:
--   1. Updates de extensiones (pg_cron, pg_stat_statements)
--   2. Drop de la signature vieja de buscar_pacientes_smart (multi-org)
--   3. Indexes nuevos de performance en public.turno
--   4. Recreate de check constraints en turno (dificultad, tipo_plan)
--   5. CREATE OR REPLACE de RPCs nuevas/actualizadas
--
-- Notas:
-- - Se incluye una redefinición de pgbouncer.get_auth, idéntica
--   al cuerpo estándar de Supabase. Es CREATE OR REPLACE → safe.
-- - Después de aplicar, se sella el historial insertando las 30
--   migrations previas + esta como "ya aplicadas" en
--   supabase_migrations.schema_migrations.
-- ============================================================

-- Actualización de extensiones removida: la imagen de Postgres de prod
-- no tiene el upgrade path disponible (pg_cron 1.6 → 1.6.4 falla).
-- Se actualizarán automáticamente cuando Supabase haga upgrade de la imagen.
-- alter extension "pg_cron" update to '1.6.4';
-- alter extension "pg_stat_statements" update to '1.11';

alter table "public"."turno" drop constraint "turno_dificultad_check";

alter table "public"."turno" drop constraint "turno_tipo_plan_check";

drop function if exists "public"."buscar_pacientes_smart"(search_term text, org_id uuid, max_rows integer);















CREATE INDEX idx_turno_fecha_especialista ON public.turno USING btree (fecha, id_especialista);

CREATE INDEX idx_turno_fecha_estado ON public.turno USING btree (fecha, estado);

CREATE INDEX idx_turno_id_box_fecha ON public.turno USING btree (id_box, fecha) WHERE (id_box IS NOT NULL);




































alter table "public"."turno" add constraint "turno_dificultad_check" CHECK (((dificultad)::text = ANY (ARRAY[('principiante'::character varying)::text, ('intermedio'::character varying)::text, ('avanzado'::character varying)::text]))) not valid;

alter table "public"."turno" validate constraint "turno_dificultad_check";

alter table "public"."turno" add constraint "turno_tipo_plan_check" CHECK (((tipo_plan)::text = ANY (ARRAY[('particular'::character varying)::text, ('obra_social'::character varying)::text]))) not valid;

alter table "public"."turno" validate constraint "turno_tipo_plan_check";

set check_function_bodies = off;

-- pgbouncer.get_auth: removida.
-- El usuario "postgres" usado por el pooler no tiene permisos sobre el
-- schema pgbouncer (lo administra Supabase internamente). Esta función
-- se va a mantener al día por Supabase, no por nosotros.

CREATE OR REPLACE FUNCTION public.actualizar_clase_pilates_rpc(p_turno_ids integer[], p_pacientes_finales jsonb, p_fecha_destino date, p_hora_destino time without time zone, p_id_especialista uuid, p_id_especialidad integer, p_dificultad text DEFAULT 'principiante'::text)
 RETURNS TABLE(accion text, id_turno integer, fecha date, hora time without time zone, id_paciente integer, id_especialista uuid, paciente_nombre text, paciente_apellido text, paciente_telefono text, especialista_nombre text, especialista_apellido text, fecha_anterior date, hora_anterior time without time zone, id_especialista_anterior uuid, especialista_anterior_nombre text, especialista_anterior_apellido text)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
declare
  v_capacidad_max constant integer := 4;
  v_dificultad text;
  v_pacientes_finales integer[];
  v_pacientes_actuales integer[];
  v_pacientes_eliminar integer[];
  v_pacientes_mantener integer[];
  v_pacientes_crear integer[];
  v_fecha_actual date;
  v_hora_actual time;
  v_mueve boolean;
  v_conflictos text;
  v_especialista_nombre text;
  v_especialista_apellido text;
  v_paciente_id integer;
  v_paciente_nombre text;
  v_paciente_apellido text;
  v_paciente_telefono text;
  v_turno_id integer;
  v_turno_anterior record;
  v_esp_anterior_nombre text;
  v_esp_anterior_apellido text;
begin
  -- ============= VALIDACIONES DE INPUT =============
  if p_turno_ids is null or array_length(p_turno_ids, 1) is null then
    raise exception 'p_turno_ids no puede ser vacio';
  end if;

  if p_pacientes_finales is null or jsonb_typeof(p_pacientes_finales) is distinct from 'array' then
    raise exception 'p_pacientes_finales debe ser un array jsonb';
  end if;

  if jsonb_array_length(p_pacientes_finales) = 0 then
    raise exception 'p_pacientes_finales no puede ser vacio (eliminá la clase entera en su lugar)';
  end if;

  if p_id_especialista is null then
    raise exception 'p_id_especialista no puede ser nulo';
  end if;

  if p_id_especialidad is null then
    raise exception 'p_id_especialidad no puede ser nulo';
  end if;

  v_dificultad := coalesce(nullif(p_dificultad, ''), 'principiante');

  select array_agg((value)::integer)
    into v_pacientes_finales
  from jsonb_array_elements(p_pacientes_finales);

  if array_length(v_pacientes_finales, 1) > v_capacidad_max then
    raise exception 'CONFLICTOS_CLASE: la clase no puede tener mas de % participantes.', v_capacidad_max
      using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('clase_pilates_' || p_id_especialista::text));

  -- ============= CARGAR ESTADO ACTUAL DEL SLOT =============
  -- Verificamos que todos los turnos pertenezcan al mismo slot y a Pilates.
  select fecha, hora
    into v_fecha_actual, v_hora_actual
  from public.turno
  where id_turno = any(p_turno_ids)
    and id_especialidad = p_id_especialidad
    and estado not in ('cancelado','eliminado')
  group by fecha, hora;

  if not found then
    raise exception 'CONFLICTOS_CLASE: ningun turno valido encontrado para el slot.';
  end if;

  -- Si el query agrupado devuelve mas de una fila, los turnos no son de un mismo slot.
  if (select count(*) from (
        select fecha, hora
        from public.turno
        where id_turno = any(p_turno_ids)
          and id_especialidad = p_id_especialidad
          and estado not in ('cancelado','eliminado')
        group by fecha, hora
      ) s) > 1 then
    raise exception 'CONFLICTOS_CLASE: los turnos no pertenecen al mismo slot.';
  end if;

  v_mueve := (v_fecha_actual <> p_fecha_destino) or (v_hora_actual <> p_hora_destino);

  -- Pacientes que actualmente componen la clase
  select array_agg(distinct id_paciente)
    into v_pacientes_actuales
  from public.turno
  where id_turno = any(p_turno_ids)
    and estado not in ('cancelado','eliminado');

  v_pacientes_actuales := coalesce(v_pacientes_actuales, array[]::integer[]);

  -- Diferencias
  select array(select unnest(v_pacientes_actuales) except select unnest(v_pacientes_finales))
    into v_pacientes_eliminar;
  select array(select unnest(v_pacientes_actuales) intersect select unnest(v_pacientes_finales))
    into v_pacientes_mantener;
  select array(select unnest(v_pacientes_finales) except select unnest(v_pacientes_actuales))
    into v_pacientes_crear;

  -- ============= VALIDACIONES EN EL SLOT DESTINO =============

  -- Solape de 30 min en el destino (excluyendo turnos del propio slot que se mueven).
  -- Misma lógica que en crear_paquete_pilates_rpc: excluir mismo H, validar vecinos.
  select string_agg(distinct slot, ', ')
    into v_conflictos
  from (
    select to_char(p_fecha_destino, 'DD/MM/YYYY') || ' ' || to_char(p_hora_destino, 'HH24:MI') as slot
    from public.turno tr
    where tr.fecha = p_fecha_destino
      and tr.id_especialidad = p_id_especialidad
      and tr.estado not in ('cancelado','eliminado')
      and tr.hora <> p_hora_destino
      and abs(extract(epoch from (tr.hora - p_hora_destino))) < 3600
      and not (tr.id_turno = any(p_turno_ids))
  ) s;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_CLASE: hay clases de Pilates superpuestas en (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Capacidad en destino: existentes (no nuestros) + total finales ≤ 4
  declare
    v_existentes integer;
  begin
    select count(*) into v_existentes
    from public.turno
    where fecha = p_fecha_destino
      and hora = p_hora_destino
      and id_especialidad = p_id_especialidad
      and estado not in ('cancelado','eliminado')
      and not (id_turno = any(p_turno_ids));

    if v_existentes + array_length(v_pacientes_finales, 1) > v_capacidad_max then
      raise exception 'CONFLICTOS_CLASE: el slot destino supera la capacidad (% + %/%).',
        v_existentes, array_length(v_pacientes_finales, 1), v_capacidad_max
        using errcode = 'P0001';
    end if;
  end;

  -- Conflictos por paciente en destino: cualquier paciente final que ya tenga
  -- un turno en (fecha_destino, hora_destino) que NO sea uno de los nuestros.
  select string_agg(distinct
    to_char(p_fecha_destino, 'DD/MM/YYYY') || ' ' || to_char(p_hora_destino, 'HH24:MI')
    || ' (paciente ' || tr.id_paciente || ')'
  , ', ')
  into v_conflictos
  from public.turno tr
  where tr.fecha = p_fecha_destino
    and tr.hora = p_hora_destino
    and tr.id_paciente = any(v_pacientes_finales)
    and tr.estado not in ('cancelado','eliminado')
    and not (tr.id_turno = any(p_turno_ids));

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_CLASE: paciente ya tiene turno en (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- ============= DATOS DEL ESPECIALISTA NUEVO =============
  select u.nombre, u.apellido
    into v_especialista_nombre, v_especialista_apellido
  from public.usuario u
  where u.id_usuario = p_id_especialista;

  -- ============= APLICAR CAMBIOS =============

  -- 1. Soft-delete de pacientes eliminados (devolvemos info para notificaciones)
  if v_pacientes_eliminar is not null and array_length(v_pacientes_eliminar, 1) > 0 then
    for v_turno_anterior in
      select t.id_turno, t.fecha, t.hora, t.id_paciente, t.id_especialista,
             p.nombre as p_nombre, p.apellido as p_apellido, p.telefono as p_telefono,
             ue.nombre as e_nombre, ue.apellido as e_apellido
      from public.turno t
      join public.paciente p on p.id_paciente = t.id_paciente
      left join public.usuario ue on ue.id_usuario = t.id_especialista
      where t.id_turno = any(p_turno_ids)
        and t.id_paciente = any(v_pacientes_eliminar)
        and t.estado not in ('cancelado','eliminado')
    loop
      update public.turno
        set estado = 'eliminado',
            updated_at = now()
      where id_turno = v_turno_anterior.id_turno;

      delete from public.notificacion
       where id_turno = v_turno_anterior.id_turno
         and estado = 'pendiente';

      accion := 'eliminado';
      id_turno := v_turno_anterior.id_turno;
      fecha := v_turno_anterior.fecha;
      hora := v_turno_anterior.hora;
      id_paciente := v_turno_anterior.id_paciente;
      id_especialista := v_turno_anterior.id_especialista;
      paciente_nombre := v_turno_anterior.p_nombre;
      paciente_apellido := v_turno_anterior.p_apellido;
      paciente_telefono := v_turno_anterior.p_telefono;
      especialista_nombre := v_especialista_nombre;
      especialista_apellido := v_especialista_apellido;
      fecha_anterior := v_turno_anterior.fecha;
      hora_anterior := v_turno_anterior.hora;
      id_especialista_anterior := v_turno_anterior.id_especialista;
      especialista_anterior_nombre := v_turno_anterior.e_nombre;
      especialista_anterior_apellido := v_turno_anterior.e_apellido;
      return next;
    end loop;
  end if;

  -- 2. Update de turnos cuyos pacientes se mantienen (mueve + cambia especialista/dificultad)
  if v_pacientes_mantener is not null and array_length(v_pacientes_mantener, 1) > 0 then
    for v_turno_anterior in
      select t.id_turno, t.fecha, t.hora, t.id_paciente, t.id_especialista,
             p.nombre as p_nombre, p.apellido as p_apellido, p.telefono as p_telefono,
             ue.nombre as e_nombre, ue.apellido as e_apellido
      from public.turno t
      join public.paciente p on p.id_paciente = t.id_paciente
      left join public.usuario ue on ue.id_usuario = t.id_especialista
      where t.id_turno = any(p_turno_ids)
        and t.id_paciente = any(v_pacientes_mantener)
        and t.estado not in ('cancelado','eliminado')
    loop
      update public.turno
        set fecha = p_fecha_destino,
            hora = p_hora_destino,
            id_especialista = p_id_especialista,
            id_especialidad = p_id_especialidad,
            dificultad = v_dificultad,
            updated_at = now()
      where id_turno = v_turno_anterior.id_turno;

      accion := 'actualizado';
      id_turno := v_turno_anterior.id_turno;
      fecha := p_fecha_destino;
      hora := p_hora_destino;
      id_paciente := v_turno_anterior.id_paciente;
      id_especialista := p_id_especialista;
      paciente_nombre := v_turno_anterior.p_nombre;
      paciente_apellido := v_turno_anterior.p_apellido;
      paciente_telefono := v_turno_anterior.p_telefono;
      especialista_nombre := v_especialista_nombre;
      especialista_apellido := v_especialista_apellido;
      fecha_anterior := v_turno_anterior.fecha;
      hora_anterior := v_turno_anterior.hora;
      id_especialista_anterior := v_turno_anterior.id_especialista;
      especialista_anterior_nombre := v_turno_anterior.e_nombre;
      especialista_anterior_apellido := v_turno_anterior.e_apellido;
      return next;
    end loop;
  end if;

  -- 3. Insert de turnos para pacientes nuevos
  if v_pacientes_crear is not null and array_length(v_pacientes_crear, 1) > 0 then
    foreach v_paciente_id in array v_pacientes_crear loop
      select p.nombre, p.apellido, p.telefono
        into v_paciente_nombre, v_paciente_apellido, v_paciente_telefono
      from public.paciente p
      where p.id_paciente = v_paciente_id;

      insert into public.turno (
        fecha,
        hora,
        id_especialista,
        id_paciente,
        id_especialidad,
        estado,
        tipo_plan,
        dificultad
      )
      values (
        p_fecha_destino,
        p_hora_destino,
        p_id_especialista,
        v_paciente_id,
        p_id_especialidad,
        'programado',
        'particular',
        v_dificultad
      )
      returning turno.id_turno into v_turno_id;

      accion := 'creado';
      id_turno := v_turno_id;
      fecha := p_fecha_destino;
      hora := p_hora_destino;
      id_paciente := v_paciente_id;
      id_especialista := p_id_especialista;
      paciente_nombre := v_paciente_nombre;
      paciente_apellido := v_paciente_apellido;
      paciente_telefono := v_paciente_telefono;
      especialista_nombre := v_especialista_nombre;
      especialista_apellido := v_especialista_apellido;
      fecha_anterior := null;
      hora_anterior := null;
      id_especialista_anterior := null;
      especialista_anterior_nombre := null;
      especialista_anterior_apellido := null;
      return next;
    end loop;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.actualizar_turnos_pendientes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  filas_pendiente integer := 0;
  filas_atendido  integer := 0;
  ahora timestamp;
  fecha_actual date;
  hora_actual time;
  id_pilates integer;
begin
  -- Usar hora local de Argentina (las columnas fecha/hora no llevan TZ)
  ahora := (now() at time zone 'America/Argentina/Buenos_Aires');
  fecha_actual := ahora::date;
  hora_actual  := ahora::time;

  -- Resolver el id de la especialidad "Pilates" por nombre (case-insensitive)
  select e.id_especialidad
    into id_pilates
    from public.especialidad e
   where lower(e.nombre) = 'pilates'
   limit 1;

  -- Turnos de Pilates vencidos → "atendido"
  if id_pilates is not null then
    update public.turno
       set estado = 'atendido',
           updated_at = now()
     where estado = 'programado'
       and id_especialidad = id_pilates
       and (
         fecha < fecha_actual
         or (fecha = fecha_actual and hora < hora_actual)
       );

    get diagnostics filas_atendido = row_count;
  end if;

  -- Resto de turnos vencidos → "pendiente"
  update public.turno
     set estado = 'pendiente',
         updated_at = now()
   where estado = 'programado'
     and (id_pilates is null or id_especialidad is distinct from id_pilates)
     and (
       fecha < fecha_actual
       or (fecha = fecha_actual and hora < hora_actual)
     );

  get diagnostics filas_pendiente = row_count;

  raise notice 'actualizar_turnos_pendientes: % pendiente, % atendido (pilates) (fecha=%, hora=%)',
    filas_pendiente, filas_atendido, fecha_actual, hora_actual;

  return filas_pendiente + filas_atendido;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.auth_bcrypt_hash(pass text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT crypt(pass, gen_salt('bf'));
$function$
;

CREATE OR REPLACE FUNCTION public.bulk_actualizar_estado_turnos(p_ids integer[], p_nuevo_estado text)
 RETURNS TABLE(id_turno integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_estados_origen text[];
  v_ids_actualizados integer[];
begin
  if p_nuevo_estado = 'cancelado' then
    v_estados_origen := array['programado','pendiente','atendido'];
  elsif p_nuevo_estado = 'atendido' then
    v_estados_origen := array['programado','pendiente','cancelado'];
  elsif p_nuevo_estado = 'eliminado' then
    v_estados_origen := array['programado','pendiente','atendido','cancelado'];
  else
    raise exception 'Estado destino no permitido: %', p_nuevo_estado
      using errcode = '22023';
  end if;

  if p_ids is null or array_length(p_ids, 1) is null then
    return;
  end if;

  with actualizados as (
    update public.turno t
       set estado = p_nuevo_estado,
           updated_at = now()
     where t.id_turno = any(p_ids)
       and t.estado = any(v_estados_origen)
    returning t.id_turno
  )
  select array_agg(a.id_turno) into v_ids_actualizados from actualizados a;

  -- Cancelados y eliminados liberan slot — borrar notificaciones pendientes
  if (p_nuevo_estado in ('cancelado','eliminado'))
     and v_ids_actualizados is not null
     and array_length(v_ids_actualizados, 1) > 0 then
    delete from public.notificacion n
     where n.id_turno = any(v_ids_actualizados)
       and n.estado = 'pendiente';
  end if;

  return query
    select i::integer from unnest(coalesce(v_ids_actualizados, array[]::integer[])) as i;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.buscar_especialistas_smart(search_term text, max_rows integer)
 RETURNS SETOF usuario
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

$function$
;

CREATE OR REPLACE FUNCTION public.buscar_especialistas_smart(search_term text, max_rows integer, p_status text DEFAULT 'activos'::text, p_order_by text DEFAULT 'nombre'::text, p_order_direction text DEFAULT 'asc'::text, p_offset integer DEFAULT 0)
 RETURNS TABLE(data usuario, total_count bigint)
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

$function$
;

CREATE OR REPLACE FUNCTION public.crear_paquete_pilates_rpc(p_id_pacientes jsonb, p_id_especialista uuid, p_id_especialidad integer, p_dificultad text DEFAULT 'principiante'::text, p_turnos jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(id_turno integer, fecha date, hora time without time zone, id_paciente integer, id_especialista uuid, id_especialidad integer, estado text, dificultad text, tipo_plan text, paciente_nombre text, paciente_apellido text, paciente_telefono text, especialista_nombre text, especialista_apellido text)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
declare
  v_turno jsonb;
  v_turno_id integer;
  v_fecha date;
  v_hora time;
  v_paciente_id integer;
  v_pacientes integer[];
  v_conflictos text;
  v_capacidad_max constant integer := 4;
  v_nuevos_por_slot integer;
  v_especialista_nombre text;
  v_especialista_apellido text;
  v_paciente_nombre text;
  v_paciente_apellido text;
  v_paciente_telefono text;
  v_dificultad text;
begin
  if jsonb_typeof(p_turnos) is distinct from 'array' then
    raise exception 'p_turnos debe ser un array jsonb';
  end if;

  if jsonb_array_length(p_turnos) = 0 then
    raise exception 'p_turnos no puede ser vacio';
  end if;

  if p_id_pacientes is null or jsonb_typeof(p_id_pacientes) is distinct from 'array' then
    raise exception 'p_id_pacientes debe ser un array jsonb';
  end if;

  if jsonb_array_length(p_id_pacientes) = 0 then
    raise exception 'p_id_pacientes no puede ser vacio';
  end if;

  if p_id_especialidad is null then
    raise exception 'p_id_especialidad no puede ser nulo';
  end if;

  select array_agg((value)::integer)
    into v_pacientes
  from jsonb_array_elements(p_id_pacientes);

  v_dificultad := coalesce(nullif(p_dificultad, ''), 'principiante');
  v_nuevos_por_slot := array_length(v_pacientes, 1);

  if v_nuevos_por_slot > v_capacidad_max then
    raise exception 'CONFLICTOS_PAQUETE: la cantidad de pacientes (%) supera la capacidad maxima (% por clase).', v_nuevos_por_slot, v_capacidad_max
      using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('paquete_pilates_' || p_id_especialista::text));

  select u.nombre, u.apellido
    into v_especialista_nombre, v_especialista_apellido
  from public.usuario u
  where u.id_usuario = p_id_especialista;

  -- Slots duplicados dentro del payload
  with payload as (
    select
      row_number() over () as rid,
      (t ->> 'fecha')::date as p_fecha,
      (t ->> 'hora')::time as p_hora
    from jsonb_array_elements(p_turnos) as t
  ),
  duplicados as (
    select to_char(p1.p_fecha, 'DD/MM/YYYY') || ' ' || to_char(p1.p_hora, 'HH24:MI') as slot
    from payload p1
    join payload p2 on p1.rid < p2.rid and p1.p_fecha = p2.p_fecha and p1.p_hora = p2.p_hora
  )
  select string_agg(distinct slot, ', ')
  into v_conflictos
  from duplicados;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: hay slots repetidos en la solicitud (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Solape de 30 min con clases de Pilates ya existentes.
  -- IMPORTANTE: excluimos el mismo slot (tr.hora = p_hora) — ese caso lo
  -- valida la check de capacidad de abajo. Acá solo bloqueamos vecinos
  -- (H-30 y H+30).
  with payload as (
    select
      (t ->> 'fecha')::date as p_fecha,
      (t ->> 'hora')::time as p_hora
    from jsonb_array_elements(p_turnos) as t
  ),
  solapes as (
    select distinct
      to_char(p.p_fecha, 'DD/MM/YYYY') || ' ' || to_char(p.p_hora, 'HH24:MI') as slot
    from payload p
    join public.turno tr
      on tr.fecha = p.p_fecha
     and tr.id_especialidad = p_id_especialidad
     and tr.estado not in ('cancelado','eliminado')
     and tr.hora <> p.p_hora
     and abs(extract(epoch from (tr.hora - p.p_hora))) < 3600
  )
  select string_agg(slot, ', ')
  into v_conflictos
  from solapes;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: hay clases de Pilates superpuestas en (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Capacidad por slot (existentes + nuevos ≤ 4)
  with payload as (
    select
      (t ->> 'fecha')::date as p_fecha,
      (t ->> 'hora')::time as p_hora
    from jsonb_array_elements(p_turnos) as t
  ),
  ocupacion as (
    select
      p.p_fecha,
      p.p_hora,
      count(tr.id_turno) as existentes
    from payload p
    left join public.turno tr
      on tr.fecha = p.p_fecha
     and tr.hora = p.p_hora
     and tr.id_especialidad = p_id_especialidad
     and tr.estado not in ('cancelado','eliminado')
    group by p.p_fecha, p.p_hora
  )
  select string_agg(
           to_char(p_fecha, 'DD/MM/YYYY') || ' ' || to_char(p_hora, 'HH24:MI')
           || ' (' || existentes || '+' || v_nuevos_por_slot || '/' || v_capacidad_max || ')'
         , ', ')
  into v_conflictos
  from ocupacion
  where existentes + v_nuevos_por_slot > v_capacidad_max;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: clases superan capacidad (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Conflictos por paciente (mismo paciente ya tiene turno en ese slot)
  with payload as (
    select
      (t ->> 'fecha')::date as p_fecha,
      (t ->> 'hora')::time as p_hora
    from jsonb_array_elements(p_turnos) as t
  ),
  pacientes_t as (
    select unnest(v_pacientes) as id_paciente
  ),
  expandido as (
    select pa.id_paciente as e_paciente, p.p_fecha, p.p_hora
    from pacientes_t pa cross join payload p
  ),
  ya_tienen as (
    select
      to_char(e.p_fecha, 'DD/MM/YYYY') || ' ' || to_char(e.p_hora, 'HH24:MI')
      || ' (paciente ' || e.e_paciente || ')' as slot
    from expandido e
    join public.turno tr
      on tr.id_paciente = e.e_paciente
     and tr.fecha = e.p_fecha
     and tr.hora = e.p_hora
     and tr.estado not in ('cancelado','eliminado')
  )
  select string_agg(slot, ', ')
  into v_conflictos
  from ya_tienen;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: un paciente ya tiene turno en (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Crear todos los turnos atómicamente
  for v_turno in
    select value from jsonb_array_elements(p_turnos)
  loop
    v_fecha := (v_turno ->> 'fecha')::date;
    v_hora := (v_turno ->> 'hora')::time;

    foreach v_paciente_id in array v_pacientes loop
      select p.nombre, p.apellido, p.telefono
        into v_paciente_nombre, v_paciente_apellido, v_paciente_telefono
      from public.paciente p
      where p.id_paciente = v_paciente_id;

      insert into public.turno (
        fecha,
        hora,
        id_especialista,
        id_paciente,
        id_especialidad,
        estado,
        tipo_plan,
        dificultad
      )
      values (
        v_fecha,
        v_hora,
        p_id_especialista,
        v_paciente_id,
        p_id_especialidad,
        'programado',
        'particular',
        v_dificultad
      )
      returning turno.id_turno into v_turno_id;

      id_turno := v_turno_id;
      fecha := v_fecha;
      hora := v_hora;
      id_paciente := v_paciente_id;
      id_especialista := p_id_especialista;
      id_especialidad := p_id_especialidad;
      estado := 'programado';
      dificultad := v_dificultad;
      tipo_plan := 'particular';
      paciente_nombre := v_paciente_nombre;
      paciente_apellido := v_paciente_apellido;
      especialista_nombre := v_especialista_nombre;
      especialista_apellido := v_especialista_apellido;
      paciente_telefono := v_paciente_telefono;
      return next;
    end loop;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dashboard_kpis_snapshot(p_inicio date, p_fin date, p_inicio_prev date, p_fin_prev date, p_id_especialista uuid DEFAULT NULL::uuid)
 RETURNS TABLE(scope text, programados bigint, atendidos bigint, cancelaciones bigint, ingresos numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with rangos as (
    select 'actual'::text as scope, p_inicio as ini, p_fin as fin
    union all
    select 'previo', p_inicio_prev, p_fin_prev
  )
  select
    r.scope,
    count(*) filter (where t.estado in ('programado','pendiente'))::bigint as programados,
    count(*) filter (where t.estado = 'atendido')::bigint                  as atendidos,
    count(*) filter (where t.estado = 'cancelado')::bigint                 as cancelaciones,
    coalesce(sum(t.precio) filter (where t.estado = 'atendido'), 0)::numeric as ingresos
  from rangos r
  left join public.turno t
    on t.fecha between r.ini and r.fin
   and (p_id_especialista is null or t.id_especialista = p_id_especialista)
  group by r.scope;
$function$
;

CREATE OR REPLACE FUNCTION public.crear_paquete_sesiones_rpc(p_id_paciente integer, p_id_especialista uuid, p_id_especialidad integer, p_fecha_inicio date, p_tipo_plan text, p_titulo_tratamiento text DEFAULT NULL::text, p_turnos jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(id_turno integer, id_grupo_tratamiento uuid, fecha date, hora time without time zone, id_paciente integer, id_especialista uuid, id_especialidad integer, id_box integer, observaciones text, estado text, tipo_plan text, paciente_nombre text, paciente_apellido text, paciente_telefono text, especialista_nombre text, especialista_apellido text)
 LANGUAGE plpgsql
AS $function$
declare
  v_id_grupo uuid;
  v_turno jsonb;
  v_turno_id integer;
  v_conflictos text;
  v_paciente_nombre text;
  v_paciente_apellido text;
  v_paciente_telefono text;
  v_especialista_nombre text;
  v_especialista_apellido text;
  v_fecha date;
  v_hora time;
  v_id_box integer;
  v_observaciones text;
  v_estado text;
  v_tipo_plan text;
  v_titulo text;
begin
  if jsonb_typeof(p_turnos) is distinct from 'array' then
    raise exception 'p_turnos debe ser un array jsonb';
  end if;

  if jsonb_array_length(p_turnos) = 0 then
    raise exception 'p_turnos no puede ser vacio';
  end if;

  select p.nombre, p.apellido, p.telefono
    into v_paciente_nombre, v_paciente_apellido, v_paciente_telefono
  from public.paciente p
  where p.id_paciente = p_id_paciente;

  select u.nombre, u.apellido
    into v_especialista_nombre, v_especialista_apellido
  from public.usuario u
  where u.id_usuario = p_id_especialista;

  -- Validación de conflictos (preservada del RPC anterior)
  with turnos_data as (
    select
      coalesce(((value ->> 'fecha')::date), p_fecha_inicio) as fecha,
      ((value ->> 'hora')::time) as hora
    from jsonb_array_elements(p_turnos)
  )
  select string_agg(distinct to_char(td.fecha, 'YYYY-MM-DD') || ' ' || to_char(td.hora, 'HH24:MI'), ', ')
    into v_conflictos
  from turnos_data td
  join public.turno t
    on t.fecha = td.fecha
   and t.hora = td.hora
   and t.estado <> 'cancelado'
   and t.estado <> 'eliminado'
   and (
     t.id_especialista = p_id_especialista
     or (t.id_paciente = p_id_paciente)
   );

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: los siguientes horarios ya estan ocupados (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Siempre crear el grupo_tratamiento (antes era condicional).
  -- Si el caller no manda título, usamos un fallback descriptivo.
  v_titulo := nullif(btrim(p_titulo_tratamiento), '');
  if v_titulo is null then
    v_titulo := 'Paquete de sesiones - ' || to_char(p_fecha_inicio, 'DD/MM/YYYY');
  end if;

  insert into public.grupo_tratamiento (
    id_paciente,
    id_especialista,
    id_especialidad,
    nombre,
    fecha_inicio,
    tipo_plan,
    cantidad_turnos_planificados
  )
  values (
    p_id_paciente,
    p_id_especialista,
    p_id_especialidad,
    v_titulo,
    p_fecha_inicio,
    p_tipo_plan,
    jsonb_array_length(p_turnos)
  )
  returning id_grupo into v_id_grupo;

  for v_turno in
    select value from jsonb_array_elements(p_turnos)
  loop
    v_fecha := coalesce((v_turno ->> 'fecha')::date, p_fecha_inicio);
    v_hora := (v_turno ->> 'hora')::time;
    v_id_box := nullif(v_turno ->> 'id_box', '')::integer;
    v_observaciones := nullif(v_turno ->> 'observaciones', '');
    v_estado := coalesce(nullif(v_turno ->> 'estado', ''), 'programado');
    v_tipo_plan := coalesce(nullif(v_turno ->> 'tipo_plan', ''), p_tipo_plan);

    insert into public.turno (
      fecha,
      hora,
      id_especialista,
      id_paciente,
      id_especialidad,
      id_box,
      observaciones,
      estado,
      tipo_plan,
      id_grupo_tratamiento
    )
    values (
      v_fecha,
      v_hora,
      p_id_especialista,
      p_id_paciente,
      p_id_especialidad,
      v_id_box,
      v_observaciones,
      v_estado,
      v_tipo_plan,
      v_id_grupo
    )
    returning turno.id_turno into v_turno_id;

    id_turno := v_turno_id;
    id_grupo_tratamiento := v_id_grupo;
    fecha := v_fecha;
    hora := v_hora;
    id_paciente := p_id_paciente;
    id_especialista := p_id_especialista;
    id_especialidad := p_id_especialidad;
    id_box := v_id_box;
    observaciones := v_observaciones;
    estado := v_estado;
    tipo_plan := v_tipo_plan;
    paciente_nombre := v_paciente_nombre;
    paciente_apellido := v_paciente_apellido;
    paciente_telefono := v_paciente_telefono;
    especialista_nombre := v_especialista_nombre;
    especialista_apellido := v_especialista_apellido;
    return next;
  end loop;
end;
$function$
;


