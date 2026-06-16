-- Fix: el RPC `crear_paquete_pilates_rpc` solo chequeaba conflicto en la hora
-- exacta (`tr.hora = p.hora`). Como una clase de Pilates dura 1 hora y los
-- slots arrancan en :00 / :30, dos clases en H y H+30 se superponen 30 min
-- y el RPC actual las dejaba pasar (también ignoraba al especialista para
-- la regla de capacidad, lo cual está bien, pero no detectaba el solape).
--
-- Cambio: agregar una validación previa al chequeo de capacidad. Si ya existe
-- CUALQUIER turno de Pilates (no eliminado/cancelado) en H, H-30 o H+30 para
-- la misma fecha del payload — sin importar especialista, paciente ni
-- cantidad — el paquete se rechaza con error `CONFLICTOS_PAQUETE`.
--
-- La capacidad máxima de 4 participantes por slot sigue aplicando, pero a esta
-- altura solo afecta a turnos que se intentan apilar en el mismo (fecha, hora)
-- dentro de la misma llamada — escenario que el cliente ya cubre con el
-- chequeo de duplicados previo.

create or replace function public.crear_paquete_pilates_rpc(
  p_id_pacientes integer[],
  p_id_especialista uuid,
  p_id_especialidad integer,
  p_dificultad text default 'principiante',
  p_turnos jsonb default '[]'::jsonb
)
returns table(
  id_turno integer,
  fecha date,
  hora time,
  id_paciente integer,
  id_especialista uuid,
  id_especialidad integer,
  estado text,
  dificultad text,
  tipo_plan text,
  paciente_nombre text,
  paciente_apellido text,
  paciente_telefono text,
  especialista_nombre text,
  especialista_apellido text
)
language plpgsql
as $$
declare
  v_turno jsonb;
  v_turno_id integer;
  v_fecha date;
  v_hora time;
  v_paciente_id integer;
  v_conflictos text;
  v_capacidad_max constant integer := 4;
  v_nuevos_por_slot integer;
  v_especialista_nombre text;
  v_especialista_apellido text;
  v_paciente_nombre text;
  v_paciente_apellido text;
  v_paciente_telefono text;
begin
  if jsonb_typeof(p_turnos) is distinct from 'array' then
    raise exception 'p_turnos debe ser un array jsonb';
  end if;

  if jsonb_array_length(p_turnos) = 0 then
    raise exception 'p_turnos no puede ser vacio';
  end if;

  if p_id_pacientes is null or array_length(p_id_pacientes, 1) is null then
    raise exception 'p_id_pacientes debe contener al menos un paciente';
  end if;

  v_nuevos_por_slot := array_length(p_id_pacientes, 1);

  if v_nuevos_por_slot > v_capacidad_max then
    raise exception 'CONFLICTOS_PAQUETE: una clase de Pilates admite hasta % participantes (intentaste agregar %).',
      v_capacidad_max, v_nuevos_por_slot
      using errcode = 'P0001';
  end if;

  select u.nombre, u.apellido
    into v_especialista_nombre, v_especialista_apellido
  from public.usuario u
  where u.id_usuario = p_id_especialista;

  -- Validar slots duplicados en el payload.
  with duplicados as (
    select
      (t ->> 'fecha')::date as fecha,
      (t ->> 'hora')::time as hora,
      count(*) as repeticiones,
      to_char((t ->> 'fecha')::date, 'DD/MM/YYYY') || ' ' || to_char((t ->> 'hora')::time, 'HH24:MI') as slot
    from jsonb_array_elements(p_turnos) as t
    group by 1, 2, 4
    having count(*) > 1
  )
  select string_agg(distinct slot, ', ')
  into v_conflictos
  from duplicados;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: hay slots repetidos en la solicitud (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- NUEVO: validar solape con clases de Pilates ya existentes (H-30, H, H+30).
  -- Una clase dura 1 hora; cualquier turno de Pilates en esa ventana de 30 min
  -- bloquea el slot, sin importar especialista ni pacientes.
  with payload as (
    select
      (t ->> 'fecha')::date as fecha,
      (t ->> 'hora')::time as hora
    from jsonb_array_elements(p_turnos) as t
  ),
  solapes as (
    select distinct
      p.fecha,
      p.hora,
      to_char(p.fecha, 'DD/MM/YYYY') || ' ' || to_char(p.hora, 'HH24:MI') as slot
    from payload p
    join public.turno tr
      on tr.fecha = p.fecha
     and tr.id_especialidad = p_id_especialidad
     and tr.estado not in ('cancelado','eliminado')
     and abs(extract(epoch from (tr.hora - p.hora))) < 3600
  )
  select string_agg(slot, ', ')
  into v_conflictos
  from solapes;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: hay clases de Pilates superpuestas en (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Validar capacidad: existentes en el slot exacto + nuevos <= 4.
  -- (Ahora redundante porque el chequeo de solape ya bloquearía cualquier
  -- existente en el mismo slot, pero lo dejamos como defensa en profundidad.)
  with payload as (
    select
      (t ->> 'fecha')::date as fecha,
      (t ->> 'hora')::time as hora
    from jsonb_array_elements(p_turnos) as t
  ),
  ocupacion as (
    select
      p.fecha,
      p.hora,
      count(tr.id_turno) as existentes
    from payload p
    left join public.turno tr
      on tr.fecha = p.fecha
     and tr.hora = p.hora
     and tr.id_especialidad = p_id_especialidad
     and tr.estado not in ('cancelado','eliminado')
    group by p.fecha, p.hora
  )
  select string_agg(
           to_char(fecha, 'DD/MM/YYYY') || ' ' || to_char(hora, 'HH24:MI')
           || ' (' || existentes || '+' || v_nuevos_por_slot || '/' || v_capacidad_max || ')'
         , ', ')
  into v_conflictos
  from ocupacion
  where existentes + v_nuevos_por_slot > v_capacidad_max;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: clases superan capacidad (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Validar que ningún paciente ya tenga turno en alguno de los slots solicitados.
  with payload as (
    select
      (t ->> 'fecha')::date as fecha,
      (t ->> 'hora')::time as hora
    from jsonb_array_elements(p_turnos) as t
  ),
  paciente_conflictos as (
    select distinct
      p.fecha,
      p.hora,
      tr.id_paciente,
      to_char(p.fecha, 'DD/MM/YYYY') || ' ' || to_char(p.hora, 'HH24:MI') as slot
    from payload p
    join public.turno tr
      on tr.fecha = p.fecha
     and tr.hora = p.hora
     and tr.estado not in ('cancelado','eliminado')
    where tr.id_paciente = any(p_id_pacientes)
  )
  select string_agg(distinct slot, ', ')
  into v_conflictos
  from paciente_conflictos;

  if v_conflictos is not null then
    raise exception 'CONFLICTOS_PAQUETE: un paciente ya tiene turno en (%).', v_conflictos
      using errcode = 'P0001';
  end if;

  -- Crear los turnos: 1 fila por (paciente × slot).
  for v_turno in select value from jsonb_array_elements(p_turnos)
  loop
    v_fecha := (v_turno ->> 'fecha')::date;
    v_hora := (v_turno ->> 'hora')::time;

    foreach v_paciente_id in array p_id_pacientes
    loop
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
        dificultad,
        tipo_plan
      )
      values (
        v_fecha,
        v_hora,
        p_id_especialista,
        v_paciente_id,
        p_id_especialidad,
        'programado',
        p_dificultad,
        'particular'
      )
      returning turno.id_turno into v_turno_id;

      id_turno := v_turno_id;
      fecha := v_fecha;
      hora := v_hora;
      id_paciente := v_paciente_id;
      id_especialista := p_id_especialista;
      id_especialidad := p_id_especialidad;
      estado := 'programado';
      dificultad := p_dificultad;
      tipo_plan := 'particular';
      paciente_nombre := v_paciente_nombre;
      paciente_apellido := v_paciente_apellido;
      paciente_telefono := v_paciente_telefono;
      especialista_nombre := v_especialista_nombre;
      especialista_apellido := v_especialista_apellido;
      return next;
    end loop;
  end loop;
end;
$$;

grant execute on function public.crear_paquete_pilates_rpc(integer[], uuid, integer, text, jsonb) to authenticated;
grant execute on function public.crear_paquete_pilates_rpc(integer[], uuid, integer, text, jsonb) to service_role;
