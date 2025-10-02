'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Usuario {
  id: string;
  email: string;
  id_usuario?: string;
  nombre?: string;
  apellido?: string;
  esAdmin?: boolean;
  esEspecialista?: boolean; // Agregar esta propiedad
  rol?: {
    id: number;
    nombre: string;
    jerarquia: number;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Usuario | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true
  });

  useEffect(() => {
    const supabase = createClient();

    // Verificar estado inicial
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && user.email) {
          // Obtener información del usuario y su rol
          const { data: userProfile, error } = await supabase
            .from('usuario')
            .select(`
              id_usuario, 
              nombre, 
              apellido, 
              email, 
              activo,
              rol (
                id,
                nombre,
                jerarquia
              )
            `)
            .eq('email', user.email)
            .single();

          if (userProfile && !error) {
            // Verificar roles
            const esAdmin = userProfile.rol?.nombre === 'Administrador';
            const esEspecialista = userProfile.rol?.nombre === 'Especialista';

            setAuthState({
              isAuthenticated: true,
              user: {
                id: user.id,
                email: user.email,
                id_usuario: userProfile.id_usuario,
                nombre: userProfile.nombre,
                apellido: userProfile.apellido,
                esAdmin,
                esEspecialista,
                rol: userProfile.rol
              },
              loading: false
            });
          } else {
            // Si no encuentra el perfil, crear usuario básico sin permisos de admin
            setAuthState({
              isAuthenticated: true,
              user: {
                id: user.id,
                email: user.email,
                esAdmin: false,
                esEspecialista: false
              },
              loading: false
            });
          }
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false
          });
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false
        });
      }
    };

    checkAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user && session.user.email) {
          // Obtener información del perfil cuando cambia la sesión
          const { data: userProfile } = await supabase
            .from('usuario')
            .select(`
              id_usuario, 
              nombre, 
              apellido, 
              email, 
              activo,
              rol (
                id,
                nombre,
                jerarquia
              )
            `)
            .eq('email', session.user.email)
            .single();

          const esAdmin = userProfile?.rol?.nombre === 'Administrador';
          const esEspecialista = userProfile?.rol?.nombre === 'Especialista';

          setAuthState({
            isAuthenticated: true,
            user: {
              id: session.user.id,
              email: session.user.email,
              id_usuario: userProfile?.id_usuario,
              nombre: userProfile?.nombre,
              apellido: userProfile?.apellido,
              esAdmin,
              esEspecialista,
              rol: userProfile?.rol
            },
            loading: false
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return authState;
}