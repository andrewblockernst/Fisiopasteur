begin;
select plan(7);

-- Columnas de notificación del paciente
select col_not_null('public', 'paciente', 'notif_confirmacion', 'notif_confirmacion not null');
select col_default_is('public', 'paciente', 'notif_confirmacion', 'true', 'notif_confirmacion default true');
select col_not_null('public', 'paciente', 'notif_recordatorios', 'notif_recordatorios not null');
select col_default_is('public', 'paciente', 'notif_recordatorios', 'true', 'notif_recordatorios default true');

-- Ninguna función propia de public es ejecutable por anon
select is(
  (select array_agg(p.oid::regprocedure::text order by 1)
     from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and has_function_privilege('anon', p.oid, 'execute')),
  null::text[],
  'anon no ejecuta ninguna función de public');

select ok(
  has_function_privilege('authenticated', 'public.actualizar_turnos_pendientes()', 'execute'),
  'authenticated conserva execute');

-- Una función nueva no vuelve a abrir el hueco (default privileges)
create function public.tmp_rpc_anon_probe() returns int language sql as 'select 1';
select ok(
  not has_function_privilege('anon', 'public.tmp_rpc_anon_probe()', 'execute')
  and has_function_privilege('authenticated', 'public.tmp_rpc_anon_probe()', 'execute'),
  'función nueva: sin anon, con authenticated');

select * from finish();
rollback;
