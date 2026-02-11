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
  orgId?: string;
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

  // ✅ Ref para evitar llamadas concurrentes a fetchUserProfile
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    // ✅ UNA SOLA instancia del cliente para toda la aplicación
    const supabase = getSupabaseClient();

    // ✅ Timeout de seguridad: Si después de 15s no se cargó, forzar loading = false
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ Auth loading timeout - forzando loading=false');
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    }, 15000);

    // Función para cargar el perfil del usuario
    const fetchUserProfile = async (sessionUser: any) => {
      // ✅ Evitar llamadas concurrentes
      if (fetchInProgressRef.current) {
        console.log('⏳ useAuth: fetchUserProfile ya en progreso, ignorando llamada duplicada');
        return;
      }
      fetchInProgressRef.current = true;
      try {
        if (!sessionUser?.email) {
          console.warn('⚠️ useAuth: No email en sessionUser');
          setAuthState({ isAuthenticated: false, user: null, loading: false });
          return;
        }

        console.log('🔍 useAuth: Cargando perfil para', sessionUser.email);

        // ✅ Leemos el ID directamente del JWT (user_metadata)
        const currentOrgId = sessionUser.user_metadata?.org_actual;
        console.log('🏢 useAuth: Org actual:', currentOrgId || 'no definida');

        // ✅ ESTRATEGIA SIMPLIFICADA: Query en dos pasos para evitar problemas con !inner
        let usuarioOrg: any = null;
        let error: any = null;

        try {
          // PASO 1: Buscar en usuario_organizacion
          console.log('📡 useAuth: Consultando usuario_organizacion...');

          let queryOrg = supabase
            .from('usuario_organizacion')
            .select('id_usuario_organizacion, id_rol, id_organizacion, id_usuario, activo')
            .eq('activo', true);

          // Filtrar por org si existe
          if (currentOrgId) {
            queryOrg = queryOrg.eq('id_organizacion', currentOrgId);
          }

          let { data: orgData, error: orgError } = await queryOrg.limit(1);

          if (orgError) {
            console.error('❌ useAuth: Error en query usuario_organizacion:', orgError);
            error = orgError;
          } else if (!orgData || orgData.length === 0) {
            console.warn('⚠️ useAuth: No se encontró usuario_organizacion');

            // FALLBACK: Si no hay org_actual, buscar por email del usuario
            console.log('🔄 useAuth: Buscando usuario por email...');
            const { data: usuarioData, error: usuarioError } = await supabase
              .from('usuario')
              .select('id_usuario')
              .eq('email', sessionUser.email)
              .eq('activo', true)
              .single();

            if (usuarioError) {
              console.error('❌ useAuth: Error buscando usuario:', usuarioError);
            } else if (usuarioData && 'id_usuario' in usuarioData) {
              console.log('👤 useAuth: Usuario encontrado, buscando org activa...');
              const { data: orgFallback, error: orgFallbackError } = await supabase
                .from('usuario_organizacion')
                .select('id_usuario_organizacion, id_rol, id_organizacion, id_usuario, activo')
                .eq('id_usuario', (usuarioData as any).id_usuario)
                .eq('activo', true)
                .limit(1);

              if (orgFallbackError) {
                console.error('❌ useAuth: Error en fallback usuario_organizacion:', orgFallbackError);
                error = orgFallbackError;
              } else if (orgFallback && orgFallback.length > 0) {
                // Reemplazar orgData con el fallback encontrado
                orgData = orgFallback;
                console.log('✅ useAuth: Org encontrada en fallback');
              }
            }
          }

          if (orgData && orgData.length > 0) {
            const org = orgData[0] as any; // Type assertion para evitar errores de TypeScript
            console.log('📋 useAuth: Datos org:', org);

            // PASO 2: Obtener datos del usuario
            const { data: userData, error: userError } = await supabase
              .from('usuario')
              .select('id_usuario, nombre, apellido, email, activo')
              .eq('id_usuario', org.id_usuario)
              .single();

            if (userError) {
              console.error('❌ useAuth: Error obteniendo usuario:', userError);
              error = userError;
            } else {
              console.log('👤 useAuth: Datos usuario:', userData);

              // PASO 3: Obtener datos del rol
              const { data: rolData, error: rolError } = await supabase
                .from('rol')
                .select('id, nombre, jerarquia')
                .eq('id', org.id_rol)
                .single();

              if (rolError) {
                console.error('❌ useAuth: Error obteniendo rol:', rolError);
                error = rolError;
              } else {
                console.log('🎭 useAuth: Datos rol:', rolData);
              }

              // Construir objeto usuarioOrg
              usuarioOrg = {
                id_usuario_organizacion: org.id_usuario_organizacion,
                id_rol: org.id_rol,
                id_organizacion: org.id_organizacion,
                activo: org.activo,
                usuario: userData,
                rol: rolData
              };
            }
          }
        } catch (queryError: any) {
          console.error('❌ useAuth: Error ejecutando queries:', queryError);
          error = queryError;
        }

        if (error) {
          console.error("❌ useAuth: Error en query:", error);
          // ✅ En caso de error, establecer estado básico
          if (mounted) {
            setAuthState({
              isAuthenticated: true,
              user: {
                id: sessionUser.id,
                email: sessionUser.email,
                esAdmin: false,
                esEspecialista: false,
                esProgramador: false,
                puedeGestionarTurnos: false,
                orgId: currentOrgId
              },
              loading: false
            });
          }
          return;
        }

        // ✅ CRÍTICO: Verificar si no se encontraron datos
        if (!usuarioOrg) {
          console.warn('⚠️ useAuth: No se encontró usuario_organizacion para', sessionUser.email);
          console.warn('   Esto puede significar:');
          console.warn('   1. Usuario no tiene asignación a ninguna org');
          console.warn('   2. El filtro de org_actual no coincide');
          console.warn('   3. El usuario no está activo en la org');

          if (mounted) {
            setAuthState({
              isAuthenticated: true,
              user: {
                id: sessionUser.id,
                email: sessionUser.email,
                esAdmin: false,
                esEspecialista: false,
                esProgramador: false,
                puedeGestionarTurnos: false,
                orgId: currentOrgId
              },
              loading: false
            });
          }
          return;
        }

        // Mapeo de datos (simplificado)
        if (usuarioOrg && usuarioOrg.usuario && mounted) {
          const userData = usuarioOrg.usuario;
          const rolData = usuarioOrg.rol;
          const idRol = usuarioOrg.id_rol;

          console.log('✅ useAuth: Usuario cargado exitosamente');
          console.log('   ID Usuario:', userData.id_usuario);
          console.log('   Rol:', rolData?.nombre || 'Sin rol');
          console.log('   Permisos gestión turnos:', puedeGestionarTurnos(idRol));

          setAuthState({
            isAuthenticated: true,
            user: {
              id: sessionUser.id,
              email: sessionUser.email,
              id_usuario: userData.id_usuario,
              nombre: userData.nombre,
              apellido: userData.apellido,
              id_rol: idRol,
              esAdmin: idRol === ROLES.ADMIN,
              esEspecialista: idRol === ROLES.ESPECIALISTA,
              esProgramador: idRol === ROLES.PROGRAMADOR,
              puedeGestionarTurnos: puedeGestionarTurnos(idRol),
              rol: rolData,
              orgId: usuarioOrg.id_organizacion || currentOrgId
            },
            loading: false
          });
        } else if (mounted) {
          console.warn('⚠️ useAuth: No se pudo cargar datos completos del usuario');
          // Caso: Usuario autenticado pero sin rol en esta org (o org no seleccionada)
          setAuthState({
            isAuthenticated: true,
            user: {
              id: sessionUser.id,
              email: sessionUser.email,
              esAdmin: false,
              esEspecialista: false,
              esProgramador: false,
              puedeGestionarTurnos: false,
              orgId: currentOrgId
            },
            loading: false
          });
        }
      } catch (error) {
        console.error('❌ useAuth: Error en fetchUserProfile:', error);
        // ✅ SIEMPRE establecer loading en false, incluso en errores
        if (mounted) {
          setAuthState({ isAuthenticated: false, user: null, loading: false });
        }
      } finally {
        fetchInProgressRef.current = false;
      }
    };

    // Inicialización de autenticación
    const initAuth = async () => {
      try {
        console.log('🔐 useAuth: Iniciando verificación de autenticación...');

        // getSession() ya recupera el token del almacenamiento local y lo decodifica
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ useAuth: Error obteniendo sesión:', sessionError);
          if (mounted) {
            setAuthState({ isAuthenticated: false, user: null, loading: false });
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('✅ useAuth: Sesión encontrada para', session.user.email);
          await fetchUserProfile(session.user);
        } else if (mounted) {
          console.log('ℹ️ useAuth: No hay sesión activa');
          setAuthState({ isAuthenticated: false, user: null, loading: false });
        }
      } catch (error) {
        console.error('❌ Error en initAuth:', error);
        if (mounted) {
          setAuthState({ isAuthenticated: false, user: null, loading: false });
        }
      } finally {
        // Limpiar timeout si se completó antes
        clearTimeout(safetyTimeout);
      }
    };
    
    
    initAuth();
    

    // ✅ UNA SOLA suscripción para toda la aplicación
    console.log('📡 Registrando suscripción a onAuthStateChange...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) {
          console.log('⚠️ Evento de auth recibido pero componente desmontado:', event);
          return;
        }

        console.log('🔄 useAuth: Auth state change:', event);
        console.log('   Session:', session ? 'presente' : 'null');

        // Escuchamos 'USER_UPDATED' por si cambias de org con updateUser()
        if (event === 'SIGNED_OUT') {
          console.log('👋 useAuth: Usuario deslogueado - actualizando estado');
          setAuthState({ isAuthenticated: false, user: null, loading: false });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            console.log('👤 useAuth: Actualizando perfil de usuario');
            await fetchUserProfile(session.user);
          }
        } else if (event === 'INITIAL_SESSION') {
          // Manejar sesión inicial
          if (session?.user) {
            console.log('🔐 useAuth: Sesión inicial detectada');
            await fetchUserProfile(session.user);
          } else {
            console.log('ℹ️ useAuth: INITIAL_SESSION sin sesión activa');
            setAuthState({ isAuthenticated: false, user: null, loading: false });
          }
        }
      }
    );
    
    console.log('✅ Suscripción registrada exitosamente');

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // ✅ Sin dependencias - se ejecuta una sola vez

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
