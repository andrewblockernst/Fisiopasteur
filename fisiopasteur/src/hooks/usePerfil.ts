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
          // ✅ MULTI-ORG: Obtener usuario y su rol desde usuario_organizacion
          // Primero obtener el usuario
          const { data: usuario } = await supabase
            .from('usuario')
            .select('id_usuario, nombre, apellido, email, activo')
            .eq('email', user.email)
            .single();

          if (!usuario) {
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
            return;
          }

          // Obtener el rol desde usuario_organizacion (primera org activa del usuario)
          const { data: usuarioOrg, error } = await supabase
            .from('usuario_organizacion')
            .select(`
              id_usuario_organizacion,
              id_rol,
              activo,
              rol:id_rol (
                id,
                nombre,
                jerarquia
              )
            `)
            .eq('id_usuario', usuario.id_usuario)
            .eq('activo', true)
            .limit(1)
            .single();

          if (usuarioOrg && !error) {
            // Verificar roles usando las constantes
            const idRol = usuarioOrg.id_rol;
            const esAdmin = idRol === ROLES.ADMIN;
            const esEspecialista = idRol === ROLES.ESPECIALISTA;
            const esProgramador = idRol === ROLES.PROGRAMADOR;
            const puedeGestionarTurnosPermiso = puedeGestionarTurnos(idRol);

            setAuthState({
              isAuthenticated: true,
              user: {
                id: user.id,
                email: user.email,
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                id_rol: idRol,
                esAdmin,
                esEspecialista,
                esProgramador,
                puedeGestionarTurnos: puedeGestionarTurnosPermiso,
                rol: usuarioOrg.rol
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
          // ✅ MULTI-ORG: Obtener usuario y su rol desde usuario_organizacion
          const { data: usuario } = await supabase
            .from('usuario')
            .select('id_usuario, nombre, apellido, email, activo')
            .eq('email', session.user.email)
            .single();

          if (!usuario) {
            setAuthState({
              isAuthenticated: true,
              user: {
                id: session.user.id,
                email: session.user.email,
                esAdmin: false,
                esEspecialista: false,
                esProgramador: false,
                puedeGestionarTurnos: false
              },
              loading: false
            });
            return;
          }

          // Obtener el rol desde usuario_organizacion
          const { data: usuarioOrg } = await supabase
            .from('usuario_organizacion')
            .select(`
              id_usuario_organizacion,
              id_rol,
              activo,
              rol:id_rol (
                id,
                nombre,
                jerarquia
              )
            `)
            .eq('id_usuario', usuario.id_usuario)
            .eq('activo', true)
            .limit(1)
            .single();

          const idRol = usuarioOrg?.id_rol;
          const esAdmin = idRol === ROLES.ADMIN;
          const esEspecialista = idRol === ROLES.ESPECIALISTA;
          const esProgramador = idRol === ROLES.PROGRAMADOR;
          const puedeGestionarTurnosPermiso = puedeGestionarTurnos(idRol);

          setAuthState({
            isAuthenticated: true,
            user: {
              id: session.user.id,
              email: session.user.email,
              id_usuario: usuario.id_usuario,
              nombre: usuario.nombre,
              apellido: usuario.apellido,
              id_rol: idRol,
              esAdmin,
              esEspecialista,
              esProgramador,
              puedeGestionarTurnos: puedeGestionarTurnosPermiso,
              rol: usuarioOrg?.rol
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