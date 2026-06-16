-- Índices que aceleran las queries del dashboard (filtros por fecha + estado + especialista).
create index if not exists idx_turno_fecha_estado on public.turno (fecha, estado);
create index if not exists idx_turno_fecha_especialista on public.turno (fecha, id_especialista);
create index if not exists idx_turno_id_box_fecha on public.turno (id_box, fecha) where id_box is not null;

-- RPC que devuelve los totales agregados de un rango (actual + período anterior en una sola llamada).
-- Reemplaza el agregado en JS de obtenerKPIsConHistorial.
create or replace function public.dashboard_kpis_snapshot(
  p_inicio date,
  p_fin date,
  p_inicio_prev date,
  p_fin_prev date,
  p_id_especialista uuid default null
)
returns table (
  scope text,                    -- 'actual' | 'previo'
  programados bigint,
  atendidos bigint,
  cancelaciones bigint,
  ingresos numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with rangos as (
    select 'actual'::text as scope, p_inicio as ini, p_fin as fin
    union all
    select 'previo', p_inicio_prev, p_fin_prev
  )
  select
    r.scope,
    count(*) filter (where t.estado = 'programado')::bigint as programados,
    count(*) filter (where t.estado = 'atendido')::bigint   as atendidos,
    count(*) filter (where t.estado = 'cancelado')::bigint  as cancelaciones,
    coalesce(sum(t.precio) filter (where t.estado = 'atendido'), 0)::numeric as ingresos
  from rangos r
  left join public.turno t
    on t.fecha between r.ini and r.fin
   and (p_id_especialista is null or t.id_especialista = p_id_especialista)
  group by r.scope;
$$;

grant execute on function public.dashboard_kpis_snapshot(date, date, date, date, uuid) to authenticated;

-- Habilita Realtime para la tabla `turno` (usado por useTurnoRealtime).
alter publication supabase_realtime add table public.turno;
