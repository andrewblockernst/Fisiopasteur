/**
 * Ejemplos de uso del sistema de roles
 * 
 * Este archivo muestra diferentes patrones de uso de las constantes
 * y funciones de roles en distintos contextos del sistema.
 */

import { 
  ROLES, 
  ROLES_CON_ACCESO_ADMIN, 
  ROLES_ESPECIALISTAS,
  esAdmin,
  esEspecialista,
  esProgramador,
  puedeGestionarSistema,
  puedeAsignarTurnos
} from '@/lib/constants/roles';

// =====================================================
// Ejemplo 1: Verificación en componentes cliente
// =====================================================

/**
 * Componente que muestra diferentes opciones según el rol
 */
export function EjemploComponenteCliente({ user }: { user: { id_rol: number } }) {
  // Verificar si es admin O programador
  const tieneAccesoAdmin = puedeGestionarSistema(user.id_rol);
  
  // Verificar si es específicamente admin
  const esAdministrador = esAdmin(user.id_rol);
  
  // Verificar si es específicamente programador
  const esProg = esProgramador(user.id_rol);
  
  return (
    <div>
      {tieneAccesoAdmin && (
        <div>
          <h2>Panel de Administración</h2>
          
          {esAdministrador && (
            <p>Bienvenido, Administrador</p>
          )}
          
          {esProg && (
            <p>Bienvenido, Programador (modo debug activado)</p>
          )}
        </div>
      )}
      
      {esEspecialista(user.id_rol) && (
        <div>
          <h2>Panel de Especialista</h2>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Ejemplo 2: Server Actions con verificación de permisos
// =====================================================

/**
 * Server action que requiere permisos de admin
 */
export async function ejemploServerActionAdmin(datos: any) {
  'use server';
  
  const { verificarPuedeGestionarSistema } = await import('@/lib/utils/auth');
  
  // Verificar permisos
  const puedeGestionar = await verificarPuedeGestionarSistema();
  if (!puedeGestionar) {
    return { 
      success: false, 
      error: 'Solo administradores y programadores pueden realizar esta acción' 
    };
  }
  
  // Continuar con la lógica...
  return { success: true, message: 'Operación exitosa' };
}

/**
 * Server action que requiere ser especialista
 */
export async function ejemploServerActionEspecialista(turnoId: number) {
  'use server';
  
  const { obtenerUsuarioActual } = await import('@/lib/utils/auth');
  
  const usuario = await obtenerUsuarioActual();
  
  if (!usuario || !puedeAsignarTurnos(usuario.id_rol)) {
    return { 
      success: false, 
      error: 'Solo especialistas pueden gestionar turnos' 
    };
  }
  
  // Continuar con la lógica...
  return { success: true };
}

// =====================================================
// Ejemplo 3: Queries de Supabase
// =====================================================

/**
 * Obtener todos los usuarios con acceso administrativo
 */
export async function ejemploQueryAdmins() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .in('id_rol', ROLES_CON_ACCESO_ADMIN) // Admin (1) y Programadores (3)
    .eq('activo', true)
    .order('nombre');
  
  return { data, error };
}

/**
 * Obtener solo especialistas que pueden asignar turnos
 */
export async function ejemploQueryEspecialistas() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('usuario')
    .select(`
      *,
      usuario_especialidad(
        especialidad:id_especialidad(
          id_especialidad,
          nombre
        )
      )
    `)
    .in('id_rol', ROLES_ESPECIALISTAS) // Admin (1) y Especialistas (2), NO programadores
    .eq('activo', true)
    .order('nombre');
  
  return { data, error };
}

/**
 * Obtener solo usuarios programadores
 */
export async function ejemploQueryProgramadores() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .eq('id_rol', ROLES.PROGRAMADOR) // Solo programadores (3)
    .order('nombre');
  
  return { data, error };
}

// =====================================================
// Ejemplo 4: Middleware de protección de rutas
// =====================================================

/**
 * Ejemplo de cómo usar en middleware
 */
export async function ejemploMiddleware(userId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const { data: usuario } = await supabase
    .from('usuario')
    .select('id_rol, nombre, apellido')
    .eq('id_usuario', userId)
    .single();
  
  if (!usuario) {
    return { permitido: false, mensaje: 'Usuario no encontrado' };
  }
  
  // Verificar si puede acceder a rutas de administración
  if (!puedeGestionarSistema(usuario.id_rol)) {
    return { 
      permitido: false, 
      mensaje: 'Acceso denegado. Se requieren permisos de administrador.' 
    };
  }
  
  return { 
    permitido: true, 
    mensaje: `Bienvenido ${usuario.nombre} ${usuario.apellido}` 
  };
}

// =====================================================
// Ejemplo 5: Renderizado condicional complejo
// =====================================================

/**
 * Función que genera items de menú según el rol del usuario
 */
export function generarMenuSegunRol(user: { id_rol: number }) {
  const menuItems: Array<{ label: string; href: string }> = [];
  
  // Items para todos los usuarios autenticados
  menuItems.push({ label: 'Inicio', href: '/inicio' });
  menuItems.push({ label: 'Perfil', href: '/perfil' });
  
  // Items solo para quienes pueden asignar turnos (Admin y Especialistas)
  if (puedeAsignarTurnos(user.id_rol)) {
    menuItems.push({ label: 'Mis Turnos', href: '/turnos' });
    menuItems.push({ label: 'Pacientes', href: '/pacientes' });
  }
  
  // Items solo para administradores y programadores
  if (puedeGestionarSistema(user.id_rol)) {
    menuItems.push({ label: 'Calendario', href: '/calendario' });
    menuItems.push({ label: 'Especialistas', href: '/especialistas' });
    menuItems.push({ label: 'Reportes', href: '/reportes' });
  }
  
  // Items solo para programadores (debugging)
  if (esProgramador(user.id_rol)) {
    menuItems.push({ label: 'Debug', href: '/debug' });
    menuItems.push({ label: 'Logs', href: '/logs' });
  }
  
  return menuItems;
}

// =====================================================
// Ejemplo 6: Hook personalizado para permisos
// =====================================================

/**
 * Hook personalizado que retorna todos los permisos del usuario
 */
export function usePermisos(userId: string | null) {
  // Este sería un hook de React
  // const [permisos, setPermisos] = useState(null);
  
  // useEffect(() => {
  //   if (!userId) return;
  //   
  //   obtenerUsuarioActual().then(usuario => {
  //     if (usuario) {
  //       setPermisos({
  //         esAdmin: esAdmin(usuario.id_rol),
  //         esEspecialista: esEspecialista(usuario.id_rol),
  //         esProgramador: esProgramador(usuario.id_rol),
  //         puedeGestionarSistema: puedeGestionarSistema(usuario.id_rol),
  //         puedeAsignarTurnos: puedeAsignarTurnos(usuario.id_rol),
  //       });
  //     }
  //   });
  // }, [userId]);
  
  // return permisos;
}

// =====================================================
// Ejemplo 7: Validación de formularios según rol
// =====================================================

/**
 * Validar datos del formulario según el rol del usuario
 */
export function validarFormularioSegunRol(
  datos: any, 
  userRol: number
): { valido: boolean; errores: string[] } {
  const errores: string[] = [];
  
  // Validaciones básicas para todos
  if (!datos.nombre) errores.push('Nombre requerido');
  if (!datos.email) errores.push('Email requerido');
  
  // Solo admin y programadores pueden cambiar ciertos campos
  if (datos.cambiarPermisos && !puedeGestionarSistema(userRol)) {
    errores.push('No tienes permisos para cambiar permisos de usuarios');
  }
  
  // Solo programadores pueden acceder a ciertas configuraciones
  if (datos.configuracionAvanzada && !esProgramador(userRol)) {
    errores.push('Solo programadores pueden modificar la configuración avanzada');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

// =====================================================
// Ejemplo 8: Logging con información de rol
// =====================================================

/**
 * Función de logging que incluye información del rol
 */
export async function logAccion(accion: string, detalles: any) {
  const { obtenerUsuarioActual, obtenerNombreRol } = await import('@/lib/utils/auth');
  
  const usuario = await obtenerUsuarioActual();
  
  if (!usuario) {
    console.log(`[ANÓNIMO] ${accion}`, detalles);
    return;
  }
  
  const nombreRol = obtenerNombreRol(usuario.id_rol);
  
  console.log(
    `[${nombreRol.toUpperCase()}] ${usuario.nombre} ${usuario.apellido}: ${accion}`,
    detalles
  );
}

// =====================================================
// Ejemplo 9: Rate limiting según rol
// =====================================================

/**
 * Obtener límite de requests según el rol del usuario
 */
export function obtenerLimiteRequests(userRol: number): number {
  if (esProgramador(userRol)) {
    return 10000; // Sin límite práctico para programadores
  }
  
  if (esAdmin(userRol)) {
    return 1000; // Límite alto para admins
  }
  
  if (esEspecialista(userRol)) {
    return 500; // Límite medio para especialistas
  }
  
  return 100; // Límite bajo para otros roles
}
