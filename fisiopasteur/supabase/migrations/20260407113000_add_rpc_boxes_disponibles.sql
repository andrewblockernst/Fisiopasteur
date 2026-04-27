create or replace function public.obtener_boxes_disponibles_rpc(
  p_fecha date,
  p_hora time,
  p_turno_id_excluir integer default null,
  p_minutos_rango integer default 14,
  p_id_especialidad_excluir integer default null
)
returns table(id_box integer)
language sql
stable
as $$
  with boxes_ocupados as (
    select distinct t.id_box
    from public.turno t
    where t.fecha = p_fecha
      and t.id_box is not null
      and t.estado <> 'cancelado'
      and t.estado <> 'eliminado'
      and (p_turno_id_excluir is null or t.id_turno <> p_turno_id_excluir)
      and (p_id_especialidad_excluir is null or t.id_especialidad <> p_id_especialidad_excluir)
      and (
        p_hora is null
        or abs(extract(epoch from (t.hora - p_hora))) <= (greatest(0, p_minutos_rango) * 60)
      )
  )
  select b.id_box
  from public.box b
  where b.estado = 'activo'
    and b.id_box not in (select bo.id_box from boxes_ocupados bo)
  order by b.numero;
$$;

grant execute on function public.obtener_boxes_disponibles_rpc(date, time, integer, integer, integer) to authenticated;
grant execute on function public.obtener_boxes_disponibles_rpc(date, time, integer, integer, integer) to service_role;
