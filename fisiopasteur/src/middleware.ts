import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ✅ Rutas que NUNCA deben ser interceptadas
  const staticPaths = [
    '/_next/static',
    '/_next/image', 
    '/favicon.ico',
    '/favicon.svg',
    '/_vercel',
    '/api',
  ];

  if (staticPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return response;
  }

  // ✅ Rutas públicas (landing + auth)
  const publicPaths = [
    '/landing',      
    '/login',
    '/not-found',
    '/centro-de-ayuda',
    '/recuperarContra',
    '/restablecerContra',
    '/seleccionar-organizacion',
    '/success',
    '/failure',
    '/pending',
  ];

  // ✅ Verificar si la ruta es pública
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // ✅ Si es ruta pública, permitir acceso SIN autenticación
  if (isPublicPath) {
    return response;
  }

  // ✅ Si es la raíz /, redirigir a /login
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // ✅ Si no hay usuario autenticado, redirigir a LOGIN
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // VIVA PERON
  // ========================================
  // 🏢 CONTEXTO ORGANIZACIONAL (MULTI-ORG)
  // ========================================
  
  if (user) {
    const orgCookie = request.cookies.get('org_actual')?.value;

    if (!orgCookie) {
      const { data: userOrgs } = await supabase
        .from('usuario_organizacion')
        .select('id_organizacion, organizacion:id_organizacion(nombre, activo)')
        .eq('id_usuario', user.id)
        .eq('activo', true);

      if (userOrgs && userOrgs.length > 0) {
        if (userOrgs.length === 1) {
          response.cookies.set('org_actual', userOrgs[0].id_organizacion, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
            path: '/',
          });
        } else {
          if (request.nextUrl.pathname !== '/seleccionar-organizacion') {
            return NextResponse.redirect(new URL('/seleccionar-organizacion', request.url));
          }
        }
      } else {
        console.error(`Usuario ${user.id} no tiene organizaciones asignadas`);
      }
    } else {
      const { data: orgAccess } = await supabase
        .from('usuario_organizacion')
        .select('activo')
        .eq('id_usuario', user.id)
        .eq('id_organizacion', orgCookie)
        .eq('activo', true)
        .single();

      if (!orgAccess) {
        response.cookies.delete('org_actual');
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|favicon\\.svg|api|.*\\.(?:css|js|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$).*)',
  ],
}