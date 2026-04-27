-- Evita turnos duplicados por paciente en la misma fecha y hora.
-- No aplica para estados cancelado/eliminado.

create or replace function public.validar_turno_unico_por_paciente()
returns trigger
language plpgsql
as $$
begin
  if new.id_paciente is null or new.fecha is null or new.hora is null then
    return new;
  end if;

  if new.estado in ('cancelado', 'eliminado') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and coalesce(old.id_paciente, -1) = coalesce(new.id_paciente, -1)
     and old.fecha = new.fecha
     and old.hora = new.hora
     and coalesce(old.estado, '') = coalesce(new.estado, '') then
    return new;
  end if;

  if exists (
    select 1
    from public.turno t
    where t.id_paciente = new.id_paciente
      and t.fecha = new.fecha
      and t.hora = new.hora
      and t.id_turno <> coalesce(new.id_turno, -1)
      and t.estado not in ('cancelado', 'eliminado')
  ) then
    raise exception 'El paciente ya tiene un turno asignado para ese día y hora'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_turno_unico_por_paciente on public.turno;

create trigger trg_validar_turno_unico_por_paciente
before insert or update on public.turno
for each row
execute function public.validar_turno_unico_por_paciente();
