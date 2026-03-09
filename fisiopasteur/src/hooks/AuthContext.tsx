'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ROLES, puedeGestionarTurnos } from '@/lib/constants/roles';

// Interfaces exportadas
export interface Usuario {
  id: string;
  email: string;
  id_usuario?: string;
  nombre?: string;
  apellido?: string;
  id_rol?: number;
  esAdmin?: boolean;
  esEspecialista?: boolean;
  esProgramador?: boolean;
  puedeGestionarTurnos?: boolean;
  rol?: { id: number; nombre: string; jerarquia: number; };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Usuario | null;
  loading: boolean;
}

// Crear contexto
const AuthContext = createContext<AuthState | undefined>(undefined);

// Provider que maneja toda la lógica de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true
  });

  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    // Timeout de seguridad
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ Auth loading timeout - forzando loading=false');
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    }, 15000);

    const fetchUserProfile = async (sessionUser: any) => {
      if (fetchInProgressRef.current) return;
      fetchInProgressRef.current = true;

      console.log('🔍 useAuth: Verificando sesión para', sessionUser);

      try {
        if (!sessionUser?.email) {
          setAuthState({ isAuthenticated: false, user: null, loading: false });
          return;
        }

        // Consultar usuario directamente por id
        let { data: usuario, error: usuarioError } = await supabase
          .from('usuario')
          .select('id_usuario, nombre, apellido, email, activo, id_rol')
          .eq('id_usuario', sessionUser.id)
          .eq('activo', true)
          .maybeSingle();

        // ✅ Fallback: buscar por email si no encontró por ID
        if (!usuario && !usuarioError) {
          console.warn('⚠️ useAuth: No encontrado por ID, buscando por email:', sessionUser.email);
          const { data: usuarioPorEmail, error: emailError } = await supabase
            .from('usuario')
            .select('id_usuario, nombre, apellido, email, activo, id_rol')
            .eq('email', sessionUser.email)
            .eq('activo', true)
            .maybeSingle();

          if (!emailError && usuarioPorEmail) {
            usuario = usuarioPorEmail;
            console.log('✅ useAuth: Usuario encontrado por email, id_usuario en BD:', usuario.id_usuario);
          }
        }

        if (usuarioError) {
          console.error('❌ useAuth: Error obteniendo usuario:', usuarioError);
          if (mounted) {
            setAuthState({
              isAuthenticated: true,
              user: { id: sessionUser.id, email: sessionUser.email },
              loading: false
            });
          }
          return;
        }

        if (!usuario) {
          console.warn('⚠️ useAuth: Usuario no encontrado en BD para', sessionUser.email);
          if (mounted) {
            setAuthState({
              isAuthenticated: true,
              user: { id: sessionUser.id, email: sessionUser.email },
              loading: false
            });
          }
          return;
        }

        const idRol: number | null = (usuario as any).id_rol ?? null;

        // Obtener datos del rol si existe
        let rolData: { id: number; nombre: string; jerarquia: number } | undefined;
        if (idRol) {
          const { data: rolResult } = await supabase
            .from('rol')
            .select('id, nombre, jerarquia')
            .eq('id', idRol)
            .single();
          if (rolResult) rolData = rolResult as any;
        }

        if (mounted) {
          setAuthState({
            isAuthenticated: true,
            user: {
              id: sessionUser.id,
              email: sessionUser.email,
              id_usuario: usuario.id_usuario,
              nombre: usuario.nombre,
              apellido: usuario.apellido,
              id_rol: idRol ?? undefined,
              esAdmin: idRol === ROLES.ADMIN,
              esEspecialista: idRol === ROLES.ESPECIALISTA,
              esProgramador: idRol === ROLES.PROGRAMADOR,
              puedeGestionarTurnos: puedeGestionarTurnos(idRol ?? undefined),
              rol: rolData,
            },
            loading: false
          });
        }
      } catch (error) {
        console.error('❌ useAuth: Error en fetchUserProfile:', error);
        if (mounted) {
          setAuthState({ isAuthenticated: false, user: null, loading: false });
        }
      } finally {
        fetchInProgressRef.current = false;
      }
    };

    const initAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          if (mounted) setAuthState({ isAuthenticated: false, user: null, loading: false });
          return;
        }
        if (user && mounted) {
          await fetchUserProfile(user);
        } else if (mounted) {
          setAuthState({ isAuthenticated: false, user: null, loading: false });
        }
      } catch (error) {
        if (mounted) setAuthState({ isAuthenticated: false, user: null, loading: false });
      } finally {
        clearTimeout(safetyTimeout);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setAuthState({ isAuthenticated: false, user: null, loading: false });
        } else if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          // Estos eventos son disparados por operaciones reales de Supabase
          // (login, refresh de token, actualización de usuario), por lo que
          // session.user es confiable en este contexto.
          if (session?.user) await fetchUserProfile(session.user);
        }
        // INITIAL_SESSION no se maneja aquí: usa session.user del localStorage
        // sin validación server-side. La inicialización segura la hace
        // initAuth() con getUser(), que valida el token contra el servidor.
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto de autenticación
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
