import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ✅ Rutas estáticas — nunca interceptar
  const staticPaths = [
    '/_next/static', '/_next/image', '/favicon.ico', '/favicon.svg', '/_vercel', '/api',
  ];

  if (
    staticPaths.some(path => request.nextUrl.pathname.startsWith(path)) ||
    request.nextUrl.pathname.match(/\.(?:css|js|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$/)
  ) {
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
    '/success',
    '/failure',
    '/pending',
  ];

  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

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
            request: { headers: request.headers },
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


    // const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
    // if (sessionError) {
    //   console.error('[Middleware] Error obteniendo sesión:', sessionError);
    // }

    // if (currentSession && currentSession.session) {
    //   user = currentSession.session.user;
    // }

    
  } catch (err) {
    console.error('[Middleware] Error en auth.getUser():', err);
  }

  // ✅ HELPER: Redirigir copiando las cookies actualizadas
  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // Ruta raíz → redirigir según autenticación
  if (request.nextUrl.pathname === '/') {
    if (user) {
      console.log('[Middleware] Ruta / con usuario autenticado → Redirigiendo a /inicio');
      return redirectWithCookies(new URL('/inicio', request.url));
    } else {
      console.log('[Middleware] Ruta / sin usuario → Redirigiendo a /login');
      return redirectWithCookies(new URL('/login', request.url));
    }
  }

  // Usuario NO autenticado
  if (!user) {
    if (isPublicPath) {
      return response;
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect_to', request.nextUrl.pathname);
    return redirectWithCookies(loginUrl);
  }

  // Usuario autenticado intentando acceder a login/landing → redirigir al dashboard
  if (['/login', '/landing', '/recuperarContra'].includes(request.nextUrl.pathname)) {
    return redirectWithCookies(new URL('/inicio', request.url));
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|favicon\\.svg|api|.*\\.(?:css|js|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$).*)',
  ],
}