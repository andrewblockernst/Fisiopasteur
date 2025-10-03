import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ✅ MEJORADO: Rutas que NUNCA deben ser interceptadas
  const staticPaths = [
    '/_next/static',
    '/_next/image', 
    '/favicon.ico',
    '/favicon.svg',
    '/_vercel',
    '/api',
  ];

  // ✅ Verificar archivos estáticos PRIMERO
  const isStaticPath = staticPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isStaticPath) {
    return response; // Dejar pasar sin verificar auth
  }

  // ✅ Rutas públicas que no requieren autenticación
  const publicPaths = [
    '/login',
    '/not-found',
    '/centro-de-ayuda',
    '/recuperarContra',
    '/restablecerContra'
  ];

  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname.startsWith(path) || request.nextUrl.pathname === path
  );

  // ✅ Si es ruta pública, permitir acceso
  if (isPublicPath) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // ✅ Usar las públicas
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ✅ Usar las públicas  
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ✅ Si no hay usuario autenticado, redirigir a login
  if (!user && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * ✅ MEJORADO: Excluir más específicamente archivos estáticos
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|favicon\\.svg|.*\\.(?:css|js|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$).*)',
  ],
}

// hola como andan.