begin;
select plan(16);

-- Fixtures as postgres (no JWT -> system)
insert into public.usuario (id_usuario, nombre, apellido, email, "contraseña")
values ('00000000-0000-0000-0000-0000000000a1', 'Test', 'Auditor', 'auditor@test.local', 'x');
insert into public.paciente (id_paciente, nombre, apellido, telefono)
values (990001, 'Pac', 'Sistema', '000');

select ok(to_regclass('public.auditoria') is not null, 'tabla auditoria existe');
select ok(
  (select count(*) from public.auditoria where tabla = 'paciente' and registro_id = '990001'
     and operacion = 'INSERT' and actor is null) = 1,
  'insert como postgres -> actor NULL (Sistema)');

-- Write as an authenticated user
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into public.turno (id_turno, fecha, hora, id_paciente, estado)
values (990001, '2030-01-01', '10:00', 990001, 'programado');

update public.turno set updated_at = now() + interval '1 minute' where id_turno = 990001;
update public.turno set estado = 'atendido', notas = notas where id_turno = 990001;
update public.paciente set telefono = '111' where id_paciente = 990001;

select throws_ok(
  $$insert into public.auditoria (tabla, registro_id, operacion) values ('x','1','INSERT')$$,
  '42501', null, 'authenticated no puede insertar en auditoria');

select is((select count(*)::int from public.auditoria where tabla = 'turno' and registro_id = '990001'), 2,
  'turno: INSERT + UPDATE de estado (updated_at solo no registra)');

reset role;
set local request.jwt.claims = '';

select is((select actor from public.auditoria where tabla = 'turno' and operacion = 'INSERT' and registro_id = '990001'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'INSERT turno: actor = auth.uid()');
select is((select cambios from public.auditoria where tabla = 'turno' and operacion = 'INSERT' and registro_id = '990001'),
  null::jsonb, 'INSERT: cambios NULL');
select is((select actor from public.auditoria where tabla = 'turno' and operacion = 'UPDATE' and registro_id = '990001'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'UPDATE turno: actor = auth.uid()');
select is((select cambios from public.auditoria where tabla = 'turno' and operacion = 'UPDATE' and registro_id = '990001'),
  '{"estado": {"old": "programado", "new": "atendido"}}'::jsonb, 'UPDATE: cambios solo contiene estado');
select is((select actor from public.auditoria where tabla = 'paciente' and operacion = 'UPDATE' and registro_id = '990001'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'UPDATE paciente auditado con actor');

-- System write (no JWT)
update public.turno set estado = 'cancelado' where id_turno = 990001;
select is((select count(*)::int from public.auditoria where tabla = 'turno' and operacion = 'UPDATE'
  and registro_id = '990001' and actor is null), 1, 'UPDATE sin JWT -> actor NULL');

-- evolucion_clinica
insert into public.evolucion_clinica (id_evolucion, id_turno, observaciones) values (990001, 990001, 'a');
select is((select count(*)::int from public.auditoria where tabla = 'evolucion_clinica' and registro_id = '990001' and operacion = 'INSERT'),
  1, 'evolucion_clinica auditada');

-- evaluacion_inicial (uuid PK)
insert into public.grupo_tratamiento (id_grupo, nombre, id_paciente, id_especialista, fecha_inicio, tipo_plan)
values ('00000000-0000-0000-0000-0000000000f1', 'g', 990001, '00000000-0000-0000-0000-0000000000a1', '2030-01-01', 'particular');
insert into public.evaluacion_inicial (id_evaluacion, id_grupo)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1');
select is((select count(*)::int from public.auditoria where tabla = 'evaluacion_inicial'
  and registro_id = '00000000-0000-0000-0000-0000000000e1' and operacion = 'INSERT'), 1, 'evaluacion_inicial auditada');

-- DELETE stores the old row
delete from public.evolucion_clinica where id_evolucion = 990001;
select is((select cambios->>'observaciones' from public.auditoria
  where tabla = 'evolucion_clinica' and registro_id = '990001' and operacion = 'DELETE'), 'a', 'DELETE guarda la fila vieja');

-- Grants
select ok(not has_table_privilege('authenticated', 'public.auditoria', 'INSERT, UPDATE, DELETE'), 'authenticated sin escritura');
select ok(has_table_privilege('authenticated', 'public.auditoria', 'SELECT')
  and not has_table_privilege('anon', 'public.auditoria', 'SELECT'), 'authenticated lee, anon no');
select ok(not has_function_privilege('authenticated', 'public.registrar_auditoria()', 'EXECUTE'), 'funcion no ejecutable por authenticated');

select * from finish();
rollback;
