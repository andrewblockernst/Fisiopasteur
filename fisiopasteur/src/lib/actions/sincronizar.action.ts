'use server';

import { createClient } from '@/lib/supabase/server';

export async function sincronizarUsuarioAuth() {
  try {
    const supabase = await createClient();
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('No hay usuario autenticado');
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
        .select('id_usuario, email')
        .eq('email', user.email || '')
        .single();

      if (existeUsuarioPorEmail) {
        // Usuario existe con el email, actualizar id_usuario
        const { data: usuarioActualizado, error: updateError } = await supabase
          .from('usuario')
          .update({ 
            id_usuario: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('email', user.email || '')
          .select()
          .single();

        if (updateError) {
          throw new Error(`Error vinculando usuario: ${updateError.message}`);
        }

        console.log('✅ Usuario vinculado:', usuarioActualizado);
        return { success: true, message: 'Usuario vinculado correctamente' };
      } else {
        // Crear usuario nuevo
        const { data: nuevoUsuario, error: createError } = await supabase
          .from('usuario')
          .insert({
            id_usuario: user.id,
            nombre: user.user_metadata?.nombre || 'Usuario',
            apellido: user.user_metadata?.apellido || 'Nuevo',
            email: user.email || '',
            usuario: user.email?.split('@')[0] || 'usuario',
            contraseña: '',
            id_rol: 1,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Error creando usuario: ${createError.message}`);
        }

        console.log('✅ Usuario sincronizado:', nuevoUsuario);
        return { success: true, message: 'Usuario sincronizado correctamente' };
      }
    }

    return { success: true, message: 'Usuario ya existe' };

  } catch (error) {
    console.error('Error sincronizando usuario:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}