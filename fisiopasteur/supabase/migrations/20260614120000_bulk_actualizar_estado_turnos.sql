-- RPC para actualización masiva del estado de turnos (cancelar / marcar atendido).
-- Reemplaza el patrón cliente-side de hacer Promise.all sobre N updates individuales,
-- bajando todo a una sola transacción server-side.
--
-- Transiciones permitidas (idénticas a las acciones individuales en turno.action.ts):
--   nuevo_estado = 'cancelado' : desde programado | pendiente | atendido
--   nuevo_estado = 'atendido'  : desde programado | pendiente | cancelado
--
-- Side effect: si nuevo_estado='cancelado', borra notificaciones pendientes
-- de los turnos efectivamente cancelados para evitar recordatorios fantasma.
--
-- Devuelve la lista de id_turno actualizados para que el caller pueda
-- distinguir successCount vs failCount sin un segundo round-trip.

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

  if p_nuevo_estado = 'cancelado'
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
