import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Guards de autenticación para route handlers (`/api/*`).
 *
 * IMPORTANTE: el middleware NO corre sobre `/api` (está excluido), así que cada
 * ruta DEBE autenticarse a sí misma. Todos estos helpers devuelven:
 *   - un `NextResponse` 401  → hay que hacer `return` con él (acceso denegado)
 *   - `null`                 → acceso OK, seguir con el handler
 *
 * Uso:
 *   const bloqueo = await requireSesion();
 *   if (bloqueo) return bloqueo;
 */

const noAutorizado = () =>
  NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

/** Requiere una sesión de staff logueada (rutas llamadas desde el navegador). */
export async function requireSesion(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return noAutorizado();
  return null;
}

/** Requiere el secreto de máquina `CRON_SECRET` (cron / integraciones server-to-server). */
export function requireCronSecret(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  // Falla cerrado: si no hay secreto configurado, nadie pasa.
  if (!secret || header !== `Bearer ${secret}`) return noAutorizado();
  return null;
}

/**
 * Acepta sesión de staff O el secreto de máquina.
 * Para endpoints usables por ambos (ej. lookup de turno del bot de WhatsApp).
 */
export async function requireSesionOSecreto(request: Request): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (secret && header === `Bearer ${secret}`) return null;
  return await requireSesion();
}
