'use server';

import { createClient } from '@/lib/supabase/server';
import { nowIso } from '@/lib/dayjs';
import { ROLES, esAdmin } from '@/lib/constants/roles';

export async function sincronizarUsuarioAuth() {
  try {
    const supabase = await createClient();
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'No hay usuario autenticado' };
    }

    // Verificar si existe por ID
    const { data: existeUsuarioPorId } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('id_usuario', user.id)
      .single();

    if (!existeUsuarioPorId) {
      // Buscar por email
      const { data: existeUsuarioPorEmail } = await supabase
        .from('usuario')
        .select('id_usuario, email, id_rol')
        .eq('email', user.email || '')
        .single();

      if (existeUsuarioPorEmail) {
        // Seguridad: no re-vincular automáticamente una cuenta admin por email.
        // Con el signup por email sin confirmación abierto (se cierra en Fase 2),
        // esto sería un vector de toma de cuenta / escalada de privilegios.
        if (esAdmin((existeUsuarioPorEmail as { id_rol: number | null }).id_rol)) {
          return { success: false, error: 'No se puede vincular automáticamente una cuenta administrativa.' };
        }
        // Usuario existe con el email, actualizar id_usuario
        const { data: usuarioActualizado, error: updateError } = await supabase
          .from('usuario')
          .update({ 
            id_usuario: user.id,
            updated_at: nowIso()
          })
          .eq('email', user.email || '')
          .select()
          .single();

        if (updateError) {
          return { success: false, error: `Error vinculando usuario: ${updateError.message}` };
        }

        return { success: true, message: 'Usuario vinculado correctamente' };
      } else {
        // Crear usuario nuevo
        const { data: nuevoUsuario, error: createError } = await supabase
          .from('usuario')
          .insert({
            nombre: user.user_metadata?.nombre || 'Usuario',
            apellido: user.user_metadata?.apellido || 'Nuevo',
            email: user.email || '',
            contraseña: '',
            // Default al rol de MENOR privilegio, nunca ADMIN.
            id_rol: ROLES.ESPECIALISTA,
            created_at: nowIso()
          })
          .select()
          .single();

        if (createError) {
          return { success: false, error: `Error creando usuario: ${createError.message}` };
        }

        return { success: true, message: 'Usuario sincronizado correctamente' };
      }
    }

    return { success: true, message: 'Usuario ya existe' };

  } catch (error) {
    console.error('Error sincronizando usuario:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}
