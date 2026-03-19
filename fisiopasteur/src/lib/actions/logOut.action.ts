'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function cerrarSesionServer() {
  try {
    const supabase = await createClient();
    
    console.log('🔄 Ejecutando signOut en servidor...');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      if (error.message.includes('session not found')) {
        return { success: true };
      }

      console.error('❌ Error en signOut servidor:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error al cerrar sesión en servidor:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}