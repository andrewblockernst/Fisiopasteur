-- =====================================================================
-- Extiende `bulk_actualizar_estado_turnos` para soportar
-- nuevo_estado='eliminado' (soft delete masivo).
--
-- Origenes permitidos: cualquier estado activo (programado, pendiente,
-- atendido, cancelado). Side effect: borra notificaciones pendientes
-- de los turnos eliminados.
-- =====================================================================

create or replace function public.bulk_actualizar_estado_turnos(
  p_ids integer[],
  p_nuevo_estado text
)
returns table(id_turno integer)
language plpgsql
security invoker
set search_path = public
as $$
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
$$;

grant execute on function public.bulk_actualizar_estado_turnos(integer[], text) to authenticated;
grant execute on function public.bulk_actualizar_estado_turnos(integer[], text) to service_role;
