import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback del flujo PKCE de Supabase Auth.
// El link del email (recuperar contraseña) redirige acá con un `?code=...`.
// Hay que intercambiar ese code por una sesión (setea las cookies de auth)
// ANTES de mostrar el form de nueva contraseña; si no, `updateUser` corre sin
// sesión y falla con "Auth session missing".
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/login/restablecerContra";

  // Evitar open-redirect: solo aceptamos paths relativos internos.
  const next = nextParam.startsWith("/") ? nextParam : "/login/restablecerContra";

  // Detrás del proxy de Vercel, el host real viene en x-forwarded-host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const baseUrl = isLocalEnv || !forwardedHost ? origin : `https://${forwardedHost}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // Sin code, o link inválido/expirado → volver a pedir el mail con un flag.
  return NextResponse.redirect(`${baseUrl}/login/recuperarContra?error=link_invalido`);
}
