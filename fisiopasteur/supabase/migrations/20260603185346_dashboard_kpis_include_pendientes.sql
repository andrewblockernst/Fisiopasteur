-- Actualiza la RPC dashboard_kpis_snapshot para que el bucket "programados"
-- incluya también el estado 'pendiente' (turnos con hora pasada que el cron
-- pasó de 'programado' → 'pendiente' por falta de marcado).
create or replace function public.dashboard_kpis_snapshot(
  p_inicio date,
  p_fin date,
  p_inicio_prev date,
  p_fin_prev date,
  p_id_especialista uuid default null
)
returns table (
  scope text,
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
    count(*) filter (where t.estado in ('programado','pendiente'))::bigint as programados,
    count(*) filter (where t.estado = 'atendido')::bigint                  as atendidos,
    count(*) filter (where t.estado = 'cancelado')::bigint                 as cancelaciones,
    coalesce(sum(t.precio) filter (where t.estado = 'atendido'), 0)::numeric as ingresos
  from rangos r
  left join public.turno t
    on t.fecha between r.ini and r.fin
   and (p_id_especialista is null or t.id_especialista = p_id_especialista)
  group by r.scope;
$$;
