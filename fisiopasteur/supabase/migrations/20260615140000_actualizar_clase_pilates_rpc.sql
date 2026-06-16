-- =====================================================================
-- actualizar_clase_pilates_rpc
--
-- Edita atómicamente una clase de Pilates (un slot fecha+hora con N
-- participantes) en una sola transacción. Reemplaza la orquestación
-- cliente-side de detalleClaseModal.handleGuardarCambios — antes hacía
-- 4 acciones separadas (mover, eliminar, modificar, crear), sin rollback
-- si una fallaba a mitad.
--
-- Operaciones que realiza (todas atómicas):
--   1. Mueve los turnos a fecha/hora destino si difieren.
--   2. Soft-delete (estado='eliminado') de turnos cuyo paciente ya no
--      está en p_pacientes_finales + borra sus notificaciones pendientes.
--   3. Update de id_especialista / dificultad / id_especialidad en los
--      turnos cuyo paciente permanece.
--   4. Insert de turnos para pacientes nuevos.
--
-- Devuelve una fila por turno afectado con la accion realizada,
-- para que el caller pueda disparar notificaciones agrupadas.
-- =====================================================================

create or replace function public.actualizar_clase_pilates_rpc(
  p_turno_ids integer[],
  p_pacientes_finales jsonb,
  p_fecha_destino date,
  p_hora_destino time,
  p_id_especialista uuid,
  p_id_especialidad integer,
  p_dificultad text default 'principiante'
)
returns table(
  accion text,                -- 'eliminado' | 'actualizado' | 'creado'
  id_turno integer,
  fecha date,
  hora time,
  id_paciente integer,
  id_especialista uuid,
  paciente_nombre text,
  paciente_apellido text,
  paciente_telefono text,
  especialista_nombre text,
  especialista_apellido text,
  -- Para notificaciones de modificación: estado anterior antes del move.
  fecha_anterior date,
  hora_anterior time,
  id_especialista_anterior uuid,
  especialista_anterior_nombre text,
  especialista_anterior_apellido text
)
language plpgsql
as $$
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
$$;

grant execute on function public.actualizar_clase_pilates_rpc(integer[], jsonb, date, time, uuid, integer, text) to authenticated;
grant execute on function public.actualizar_clase_pilates_rpc(integer[], jsonb, date, time, uuid, integer, text) to service_role;
