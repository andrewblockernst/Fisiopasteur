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
    '/api', // ✅ Permitir todas las API routes
  ];

  // ✅ Verificar rutas estáticas/API PRIMERO
  if (staticPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return response;
  }

  // ✅ Rutas públicas (landing page)
  const publicPaths = [
    '/login',
    '/not-found',
    '/centro-de-ayuda',
    '/recuperarContra',
    '/restablecerContra',
    '/seleccionar-organizacion',
    '/', // Landing page
    '/success',
    '/failure',
    '/pending',
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

  // ========================================
  // 🏢 CONTEXTO ORGANIZACIONAL (MULTI-ORG)
  // ========================================
  
  if (user) {
    // Verificar si el usuario tiene una organización seleccionada
    const orgCookie = request.cookies.get('org_actual')?.value;

    // Si NO tiene organización seleccionada, verificar cuántas tiene
    if (!orgCookie) {
      // Consultar organizaciones del usuario
      const { data: userOrgs } = await supabase
        .from('usuario_organizacion')
        .select('id_organizacion, organizacion:id_organizacion(nombre, activo)')
        .eq('id_usuario', user.id)
        .eq('activo', true);

      if (userOrgs && userOrgs.length > 0) {
        // Si tiene una sola organización, setearla automáticamente
        if (userOrgs.length === 1) {
          response.cookies.set('org_actual', userOrgs[0].id_organizacion, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 días
            path: '/',
          });
        } else {
          // Si tiene múltiples organizaciones, redirigir al selector
          if (request.nextUrl.pathname !== '/seleccionar-organizacion') {
            return NextResponse.redirect(new URL('/seleccionar-organizacion', request.url));
          }
        }
      } else {
        // Usuario no tiene organizaciones asignadas - esto es un problema
        console.error(`Usuario ${user.id} no tiene organizaciones asignadas`);
        // Podríamos redirigir a una página de "sin acceso" o logout
      }
    } else {
      // Verificar que la org_actual sigue siendo válida para este usuario
      const { data: orgAccess } = await supabase
        .from('usuario_organizacion')
        .select('activo')
        .eq('id_usuario', user.id)
        .eq('id_organizacion', orgCookie)
        .eq('activo', true)
        .single();

      // Si ya no tiene acceso a esa organización, limpiar cookie y re-evaluar
      if (!orgAccess) {
        response.cookies.delete('org_actual');
        // En el próximo request se evaluará de nuevo
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * ✅ MEJORADO: Excluir más específicamente archivos estáticos
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|favicon\\.svg|api|.*\\.(?:css|js|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$).*)',
  ],
}

// hola como andan.