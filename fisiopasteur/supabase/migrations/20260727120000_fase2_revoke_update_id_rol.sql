-- =============================================================================
-- FASE 2 (A2) — Bloquear escalada de privilegios vía usuario.id_rol
-- =============================================================================
-- La autorización de la app deriva de `usuario.id_rol`. Con RLS permisivo
-- (`to authenticated using(true)`, Fase 0), un usuario autenticado todavía
-- podría hacer `UPDATE usuario SET id_rol = 1` sobre su propia fila y
-- autopromoverse a admin. Esto revoca el privilegio de UPDATE sobre esa
-- columna a nivel de Postgres (column-level privilege).
--
-- Los cambios de rol legítimos se hacen server-side con la SERVICE-ROLE key
-- (createEspecialista), que bypassa RLS y los privilegios de columna.
--
-- SEGURO: ningún código de la app hace UPDATE seteando id_rol por el client
-- autenticado (verificado). Los INSERT de id_rol (sincronizar, createEspecialista)
-- NO se ven afectados: esto solo revoca UPDATE de la columna.
--
-- NOTA: `activo` tiene un vector similar pero `toggleEspecialistaActivo` la
-- actualiza con el client autenticado (ya protegido por requireAdmin a nivel
-- de app); revocarla a nivel DB requeriría mover esa action a service-role.
-- Queda pendiente si se quiere endurecer.
--
-- Idempotente.
-- =============================================================================

revoke update (id_rol) on public.usuario from authenticated;
revoke update (id_rol) on public.usuario from anon;
