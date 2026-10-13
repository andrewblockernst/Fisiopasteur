-- Write audit trail: who created/changed/deleted rows of the core clinical tables.
-- actor NULL = system (pg_cron, RPCs without a user JWT).

create table if not exists public.auditoria (
  id          bigint generated always as identity primary key,
  tabla       text not null,
  registro_id text not null,
  operacion   text not null check (operacion in ('INSERT', 'UPDATE', 'DELETE')),
  actor       uuid references public.usuario(id_usuario) on delete set null,
  fecha       timestamptz not null default now(),
  cambios     jsonb  -- UPDATE: {col: {old, new}}; INSERT: null; DELETE: old row
);

create index if not exists auditoria_tabla_registro_fecha_idx
  on public.auditoria (tabla, registro_id, fecha desc);

-- Generic trigger: TG_ARGV[0] = name of the PK column.
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid;
  v_cambios jsonb;
  v_id      text;
begin
  -- Only keep the actor if it is a known usuario (FK safety); else system.
  select id_usuario into v_actor from public.usuario where id_usuario = auth.uid();

  if tg_op = 'INSERT' then
    v_id := to_jsonb(new) ->> tg_argv[0];
  elsif tg_op = 'DELETE' then
    v_id := to_jsonb(old) ->> tg_argv[0];
    v_cambios := to_jsonb(old);
  else
    v_id := to_jsonb(new) ->> tg_argv[0];
    select jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value))
      into v_cambios
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value
       and n.key <> 'updated_at';
    if v_cambios is null then
      return new; -- nothing but updated_at changed
    end if;
  end if;

  insert into public.auditoria (tabla, registro_id, operacion, actor, cambios)
  values (tg_table_name, v_id, tg_op, v_actor, v_cambios);

  return null; -- AFTER trigger: return value ignored
end;
$$;

create trigger turno_auditoria
  after insert or update or delete on public.turno
  for each row execute function public.registrar_auditoria('id_turno');
create trigger evolucion_clinica_auditoria
  after insert or update or delete on public.evolucion_clinica
  for each row execute function public.registrar_auditoria('id_evolucion');
create trigger paciente_auditoria
  after insert or update or delete on public.paciente
  for each row execute function public.registrar_auditoria('id_paciente');
create trigger evaluacion_inicial_auditoria
  after insert or update or delete on public.evaluacion_inicial
  for each row execute function public.registrar_auditoria('id_evaluacion');

-- Security: everyone logged in reads; nobody writes except the trigger.
alter table public.auditoria enable row level security;
create policy auditoria_select on public.auditoria
  for select to authenticated using (true);

revoke all on public.auditoria from anon, authenticated;
grant select on public.auditoria to authenticated;
revoke execute on function public.registrar_auditoria() from public, anon, authenticated;
