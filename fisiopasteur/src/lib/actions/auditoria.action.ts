'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUsuario } from '@/lib/auth/guards';
import { reducirEstampa, type Estampa, type FilaAuditoria } from '@/lib/auditoria/estampa';
import type { ActionResult } from '@/lib/actions/action-result';

const entrada = z.object({
  tabla: z.enum(['turno', 'evolucion_clinica', 'paciente', 'evaluacion_inicial']),
  registroId: z.string().min(1).max(64),
});

const SELECT = 'operacion, fecha, usuario:actor(nombre, apellido)';

/** Quien creo y quien edito por ultima vez un registro (lee `public.auditoria`). */
export async function obtenerEstampaAuditoria(
  tabla: string,
  registroId: string,
): Promise<ActionResult<Estampa>> {
  const autorizado = await requireUsuario();
  if (!autorizado) return { success: false, error: 'No autorizado' };

  const parsed = entrada.safeParse({ tabla, registroId });
  if (!parsed.success) return { success: false, error: 'Datos inválidos' };

  const supabase = await createClient();
  // ponytail: types not regenerated, see T4 (auditoria no esta en database.types.ts)
  const auditoria = () =>
    (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from('auditoria');
  const base = () =>
    auditoria()
      .select(SELECT)
      .eq('tabla', parsed.data.tabla)
      .eq('registro_id', parsed.data.registroId);

  const [creado, editado] = await Promise.all([
    base().eq('operacion', 'INSERT').order('fecha', { ascending: true }).order('id', { ascending: true }).limit(1),
    base().eq('operacion', 'UPDATE').order('fecha', { ascending: false }).order('id', { ascending: false }).limit(1),
  ]);
  if (creado.error || editado.error) return { success: false, error: 'No se pudo leer la auditoría' };

  const filas = [...(creado.data ?? []), ...(editado.data ?? [])] as unknown as FilaAuditoria[];
  return { success: true, data: reducirEstampa(filas) };
}
