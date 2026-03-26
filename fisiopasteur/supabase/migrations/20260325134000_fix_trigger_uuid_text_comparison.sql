create or replace function public.sincronizar_total_turnos_grupo()
returns trigger
language plpgsql
as $$
declare
  grupo_objetivo uuid;
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
