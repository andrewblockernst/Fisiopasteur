import { createClient } from '@/lib/supabase/client';

export async function cerrarSesion() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return { success: false, error };
  }
}

// Función alternativa con redirección automática (opcional)
export async function logOut() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error al cerrar sesión:', error);
      return { success: false, error: error.message };
    }
    
    // Limpiar cualquier dato local si es necesario
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    return { success: true, message: 'Sesión cerrada correctamente' };
  } catch (error) {
    console.error('Error inesperado al cerrar sesión:', error);
    return { success: false, error: 'Error inesperado al cerrar sesión' };
  }
}

// Handler completo que maneja cerrar sesión y redirección
export async function handleCerrarSesion(router: any) {
  try {
    const result = await cerrarSesion();
    
    if (result.success) {
      // Redirigir al login
      router.push('/login');
      return { success: true, message: 'Sesión cerrada correctamente' };
    } else {
      console.error('Error al cerrar sesión:', result.error);
      return { success: false, error: 'No se pudo cerrar la sesión' };
    }
  } catch (error) {
    console.error('Error en el handler:', error);
    return { success: false, error: 'Error inesperado' };
  }
}