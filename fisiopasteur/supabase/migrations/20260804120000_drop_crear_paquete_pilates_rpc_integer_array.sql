-- Fix "Could not choose the best candidate function": en producción quedaron
-- dos overloads de crear_paquete_pilates_rpc (p_id_pacientes integer[] y jsonb).
-- La app llama con jsonb; el overload integer[] es el viejo y sobra. Lo borramos
-- para que PostgREST no tenga ambigüedad al resolver la función.
drop function if exists public.crear_paquete_pilates_rpc(
  integer[],
  uuid,
  integer,
  text,
  jsonb
);
