"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    // Evita que dos eventos simultáneos lancen fetchUserProfile en paralelo.
    // A diferencia del ref anterior, este flag se resetea correctamente en cada evento nuevo.
    let profileLoadId = 0;

    // El timeout solo detiene el spinner de carga. NO resetea isAuthenticated ni user,
    // porque esos pueden haberse seteado correctamente por INITIAL_SESSION antes de
    // que las queries de la DB terminen (ej: Supabase free tier con DB durmiendo).
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn("⚠️ Auth loading timeout - forzando loading=false");
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
    }, 20000);

    const fetchUserProfile = async (sessionUser: any, loadId: number) => {
      console.log('🔍 useAuth: Cargando perfil para', sessionUser?.email);

      try {
        if (!sessionUser?.email) {
          if (mounted && loadId === profileLoadId) {
            setAuthState({ isAuthenticated: false, user: null, loading: false });
          }
          return;
        }

        // Consultar usuario directamente por id
        let { data: usuario, error: usuarioError } = await supabase
          .from('usuario')
          .select('id_usuario, nombre, apellido, email, activo, id_rol')
          .eq('id_usuario', sessionUser.id)
          .eq('activo', true)
          .maybeSingle();

        // Fallback: buscar por email si no encontró por ID
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
            console.log('✅ useAuth: Usuario encontrado por email:', (usuario as any).id_usuario);
          }
        }

        // Si hay error de DB, mantener autenticado con info básica (ya seteada arriba)
        if (usuarioError) {
          console.error('❌ useAuth: Error obteniendo usuario:', usuarioError);
          if (mounted && loadId === profileLoadId) {
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
          if (mounted && loadId === profileLoadId) {
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

        if (mounted && loadId === profileLoadId) {
          setAuthState({
            isAuthenticated: true,
            user: {
              id: sessionUser.id,
              email: sessionUser.email,
              id_usuario: (usuario as any).id_usuario,
              nombre: (usuario as any).nombre,
              apellido: (usuario as any).apellido,
              id_rol: idRol ?? undefined,
              esAdmin: idRol === ROLES.ADMIN,
              esEspecialista: idRol === ROLES.ESPECIALISTA,
              esProgramador: idRol === ROLES.PROGRAMADOR,
              puedeGestionarTurnos: puedeGestionarTurnos(idRol ?? undefined),
              rol: rolData,
            },
            loading: false,
          });
        }
      } catch (error) {
        console.error('❌ useAuth: Error en fetchUserProfile:', error);
        // Mantener isAuthenticated si ya estaba en true (sesión válida), solo detener loading
        if (mounted && loadId === profileLoadId) {
          setAuthState(prev => ({
            ...prev,
            loading: false,
            // Si no había user todavía (error antes de cualquier set), marcar como no autenticado
            isAuthenticated: prev.isAuthenticated,
            user: prev.user,
          }));
        }
      }
    };

    // ✅ NUEVO: Failsafe manual. Si INITIAL_SESSION se pierde, esto destraba el loading.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error || !session) {
        clearTimeout(safetyTimeout);
        // Si no hay sesión, asegurarnos de que quite el loading
        setAuthState(prev => prev.loading ? { isAuthenticated: false, user: null, loading: false } : prev);
      } else {
        // Si hay sesión y el usuario aún no está seteado, disparamos la carga
        setAuthState(prev => {
          if (!prev.user) {
            const currentLoadId = ++profileLoadId;
            fetchUserProfile(session.user, currentLoadId);
            return { isAuthenticated: true, user: { id: session.user.id, email: session.user.email! }, loading: true };
          }
          return prev;
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'INITIAL_SESSION') {
          clearTimeout(safetyTimeout);
          if (session?.user) {
            // ✅ CRÍTICO: Setear isAuthenticated:true INMEDIATAMENTE con datos básicos
            // de la sesión (sin esperar las queries de DB). Esto evita que el safetyTimeout
            // o cualquier otra condición de carrera marque al usuario como no autenticado
            // mientras las queries de la DB (que pueden tardar en Supabase free tier) corren.
            const currentLoadId = ++profileLoadId;
            setAuthState({
              isAuthenticated: true,
              user: { id: session.user.id, email: session.user.email! },
              loading: true
            });
            await fetchUserProfile(session.user, currentLoadId);
          } else {
            setAuthState({ isAuthenticated: false, user: null, loading: false });
          }
        } else if (event === 'SIGNED_OUT') {
          profileLoadId++;
          setAuthState({ isAuthenticated: false, user: null, loading: false });
        } else if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          if (session?.user) {
            
            // Para login (SIGNED_IN), si aún no hay user, mostrar estado de carga autenticado
            setAuthState(prev => {
              // ✅ Si ya tenemos a este usuario cargado, NO pongas loading en true
              // ni vuelvas a consultar la DB por su perfil. El token se refrescó por debajo.
              if (prev.user && prev.user.id === session.user.id) {
                return prev; 
              }

              // Solo cargamos el perfil si es un usuario nuevo (ej. Login inicial)
              const currentLoadId = ++profileLoadId;
              fetchUserProfile(session.user, currentLoadId);
              
              return { 
                isAuthenticated: true, 
                user: { id: session.user.id, email: session.user.email! }, 
                loading: true 
              };
            });        
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

// Hook para usar el contexto de autenticación
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
