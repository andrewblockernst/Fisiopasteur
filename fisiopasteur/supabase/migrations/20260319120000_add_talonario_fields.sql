-- Campos persistidos para numeracion de talonario
alter table public.grupo_tratamiento
  add column if not exists cantidad_turnos_planificados integer;

alter table public.turno
  add column if not exists numero_en_grupo integer;

-- Validaciones basicas
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'grupo_tratamiento_cantidad_turnos_planificados_check'
      and conrelid = 'public.grupo_tratamiento'::regclass
  ) then
    alter table public.grupo_tratamiento
      add constraint grupo_tratamiento_cantidad_turnos_planificados_check
      check (
        cantidad_turnos_planificados is null
        or cantidad_turnos_planificados > 0
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'turno_numero_en_grupo_check'
      and conrelid = 'public.turno'::regclass
  ) then
    alter table public.turno
      add constraint turno_numero_en_grupo_check
      check (
        numero_en_grupo is null
        or numero_en_grupo > 0
      );
  end if;
end $$;

-- Unicidad por grupo para evitar duplicados de numeracion
create unique index if not exists turno_grupo_numero_unique_idx
  on public.turno (id_grupo_tratamiento, numero_en_grupo)
  where id_grupo_tratamiento is not null
    and numero_en_grupo is not null;

-- Backfill de numero_en_grupo para turnos existentes con grupo
with ordenados as (
  select
    t.id_turno,
    row_number() over (
      partition by t.id_grupo_tratamiento
      order by t.fecha asc, t.hora asc, t.id_turno asc
    ) as numero
  from public.turno t
  where t.id_grupo_tratamiento is not null
    and t.numero_en_grupo is null
)
update public.turno t
set numero_en_grupo = o.numero
from ordenados o
where t.id_turno = o.id_turno;

-- Backfill de cantidad_turnos_planificados en grupos existentes
with conteo as (
  select
    t.id_grupo_tratamiento as id_grupo,
    count(*)::integer as total
  from public.turno t
  where t.id_grupo_tratamiento is not null
    and t.estado is distinct from 'eliminado'
  group by t.id_grupo_tratamiento
)
update public.grupo_tratamiento g
set cantidad_turnos_planificados = c.total
from conteo c
where g.id_grupo = c.id_grupo
  and (
    g.cantidad_turnos_planificados is null
    or g.cantidad_turnos_planificados < c.total
  );

-- Trigger: asignar numero_en_grupo automaticamente
create or replace function public.asignar_numero_en_grupo_turno()
returns trigger
language plpgsql
as $$
declare
  ultimo_numero integer;
begin
  if new.id_grupo_tratamiento is null then
    return new;
  end if;

  -- Bloqueo por grupo para evitar colisiones concurrentes
  perform 1
  from public.grupo_tratamiento g
  where g.id_grupo = new.id_grupo_tratamiento
  for update;

  if new.numero_en_grupo is null then
    select coalesce(max(t.numero_en_grupo), 0)
    into ultimo_numero
    from public.turno t
    where t.id_grupo_tratamiento = new.id_grupo_tratamiento;

    new.numero_en_grupo := ultimo_numero + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_asignar_numero_en_grupo_turno on public.turno;
create trigger trg_asignar_numero_en_grupo_turno
before insert on public.turno
for each row
execute function public.asignar_numero_en_grupo_turno();

-- Trigger: sincronizar cantidad_turnos_planificados automaticamente
create or replace function public.sincronizar_total_turnos_grupo()
returns trigger
language plpgsql
as $$
declare
  grupo_objetivo text;
  total_actual integer;
begin
  if tg_op = 'DELETE' then
    grupo_objetivo := old.id_grupo_tratamiento;
  else
    grupo_objetivo := new.id_grupo_tratamiento;
  end if;

  if grupo_objetivo is not null then
    select max(t.numero_en_grupo)
    into total_actual
    from public.turno t
    where t.id_grupo_tratamiento = grupo_objetivo
      and t.estado is distinct from 'eliminado';

    update public.grupo_tratamiento g
    set cantidad_turnos_planificados = total_actual
    where g.id_grupo = grupo_objetivo;
  end if;

  -- Si el turno cambio de grupo, sincronizar tambien el grupo anterior
  if tg_op = 'UPDATE'
     and old.id_grupo_tratamiento is distinct from new.id_grupo_tratamiento
     and old.id_grupo_tratamiento is not null then
    select max(t.numero_en_grupo)
    into total_actual
    from public.turno t
    where t.id_grupo_tratamiento = old.id_grupo_tratamiento
      and t.estado is distinct from 'eliminado';

    update public.grupo_tratamiento g
    set cantidad_turnos_planificados = total_actual
    where g.id_grupo = old.id_grupo_tratamiento;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sincronizar_total_turnos_grupo on public.turno;
create trigger trg_sincronizar_total_turnos_grupo
after insert or update of id_grupo_tratamiento, numero_en_grupo, estado or delete
on public.turno
for each row
execute function public.sincronizar_total_turnos_grupo();