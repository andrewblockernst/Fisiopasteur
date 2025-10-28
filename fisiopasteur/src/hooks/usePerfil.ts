'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLES, puedeGestionarSistema, puedeGestionarTurnos } from '@/lib/constants/roles';

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
  puedeGestionarTurnos?: boolean; // Nuevo: Admin y Programadores pueden gestionar turnos
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
              id_rol,
              rol:id_rol (
                id,
                nombre,
                jerarquia
              )
            `)
            .eq('email', user.email)
            .single();

          if (userProfile && !error) {
            // Verificar roles usando las constantes
            const idRol = userProfile.id_rol;
            const esAdmin = idRol === ROLES.ADMIN;
            const esEspecialista = idRol === ROLES.ESPECIALISTA;
            const esProgramador = idRol === ROLES.PROGRAMADOR;
            const puedeGestionarTurnosPermiso = puedeGestionarTurnos(idRol);

            setAuthState({
              isAuthenticated: true,
              user: {
                id: user.id,
                email: user.email,
                id_usuario: userProfile.id_usuario,
                nombre: userProfile.nombre,
                apellido: userProfile.apellido,
                id_rol: idRol,
                esAdmin,
                esEspecialista,
                esProgramador,
                puedeGestionarTurnos: puedeGestionarTurnosPermiso,
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
                esEspecialista: false,
                esProgramador: false,
                puedeGestionarTurnos: false
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
              id_rol,
              rol:id_rol (
                id,
                nombre,
                jerarquia
              )
            `)
            .eq('email', session.user.email)
            .single();

          const idRol = userProfile?.id_rol;
          const esAdmin = idRol === ROLES.ADMIN;
          const esEspecialista = idRol === ROLES.ESPECIALISTA;
          const esProgramador = idRol === ROLES.PROGRAMADOR;
          const puedeGestionarTurnosPermiso = puedeGestionarTurnos(idRol);

          setAuthState({
            isAuthenticated: true,
            user: {
              id: session.user.id,
              email: session.user.email,
              id_usuario: userProfile?.id_usuario,
              nombre: userProfile?.nombre,
              apellido: userProfile?.apellido,
              id_rol: idRol,
              esAdmin,
              esEspecialista,
              esProgramador,
              puedeGestionarTurnos: puedeGestionarTurnosPermiso,
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