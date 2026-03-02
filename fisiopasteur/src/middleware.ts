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
    '/_next/static', '/_next/image', '/favicon.ico', '/favicon.svg', '/_vercel', '/api',
    // Archivos estáticos comunes
    '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'
  ];

  if (staticPaths.some(path => request.nextUrl.pathname.startsWith(path)) || 
      request.nextUrl.pathname.match(/\.(?:css|js|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$/)) {
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

  // // ✅ Si es ruta pública, permitir acceso SIN autenticación
  // if (isPublicPath) {
  //   return response;
  // }

  // // ✅ Si es la raíz /, redirigir a /login
  // if (request.nextUrl.pathname === '/') {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user;

  try {
    // ✅ getUser() verifica el token contra el servidor de Supabase Auth,
    // a diferencia de getSession() que solo lee cookies sin validarlas.
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[Middleware] Error obteniendo usuario:', error);
    }

    user = currentUser;
  } catch (err) {
    console.error('[Middleware] Error en auth.getUser():', err);
  }


  // Ruta raiz - redirigir según estado de autenticación
  if (request.nextUrl.pathname === '/') {
    if (user) {
      console.log('[Middleware] Ruta / con usuario autenticado → Redirigiendo a /inicio');
      return NextResponse.redirect(new URL('/inicio', request.url));
    } else {
      console.log('[Middleware] Ruta / sin usuario → Redirigiendo a /login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
  }

  // Usuario NO autenticado
  if (!user) {
    if (isPublicPath) {
      console.log('[Middleware] Ruta pública sin autenticación → Permitir acceso');
      return response;
    }
    
    console.log('[Middleware] Ruta protegida sin autenticación → Redirigir a login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect_to', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // CASO C: Usuario Autenticado intentando acceder a login/landing
  // A veces queremos redirigirlos al dashboard si ya están logueados
  if (['/login', '/landing', '/recuperarContra'].includes(request.nextUrl.pathname)) {
    console.log('[Middleware] Usuario autenticado en ruta de auth → Redirigir a /inicio');
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  // ========================================
  // 🏢 CONTEXTO ORGANIZACIONAL (OPTIMIZADO)
  // ========================================
  
  if (user) {
    // 1. Leer org_id del JWT (SIN consultas a DB)
    const orgIdFromToken = user.user_metadata?.org_actual;
    const orgCookie = request.cookies.get('org_actual')?.value;

    // 2. Si hay org_id en el token, confiar en él (0 consultas a DB)
    if (orgIdFromToken) {
      // Solo actualizar cookie si no coincide con el token
      if (orgCookie !== orgIdFromToken) {
        response.cookies.set('org_actual', orgIdFromToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        });
      }
    } else {
      // 3. Solo consultar DB si NO hay org_id en el token (primera vez o sin org asignada)
      try {
        const { data: userOrgs } = await supabase
          .from('usuario_organizacion')
          .select('id_organizacion')
          .eq('id_usuario', user.id)
          .eq('activo', true);

        if (userOrgs && userOrgs.length > 0) {
          if (userOrgs.length === 1) {
            // Una sola organización: setear cookie y actualizar JWT
            const orgId = userOrgs[0].id_organizacion;
            
            response.cookies.set('org_actual', orgId, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30,
              path: '/',
            });

            // Actualizar JWT para futuras requests (fire and forget)
            supabase.auth.updateUser({
              data: { org_actual: orgId }
            }).catch(err => console.error('Error actualizando JWT:', err));
          

          } else {
            // Múltiples organizaciones: redirigir a selector
            if (request.nextUrl.pathname !== '/seleccionar-organizacion') {
              return NextResponse.redirect(new URL('/seleccionar-organizacion', request.url));
            }
          }
        } else {
          console.error(`Usuario ${user.id} no tiene organizaciones asignadas`);
        }
      } catch (err) {
        console.error('Error obteniendo organizaciones del usuario:', err);
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