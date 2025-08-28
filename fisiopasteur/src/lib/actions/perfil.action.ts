'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Database } from '@/types/database.types';

// Tipos específicos para el perfil
type Usuario = Database['public']['Tables']['usuario']['Row'];
type Rol = Database['public']['Tables']['rol']['Row'];
type Especialidad = Database['public']['Tables']['especialidad']['Row'];
type UsuarioEspecialidad = Database['public']['Tables']['usuario_especialidad']['Row'];

export interface PerfilCompleto {
  id_usuario: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  usuario: string;
  color: string | null;
  rol: {
    id: number;
    nombre: string;
    jerarquia: number;
  };
  especialidad_principal: {
    id_especialidad: number;
    nombre: string;
  } | null;
  especialidades_adicionales: Array<{
    id_especialidad: number;
    nombre: string;
  }>;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
  } | null;
}

// Obtener precios por especialidad del usuario autenticado
export async function obtenerPreciosUsuarioEspecialidades() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const { data, error } = await supabase
      .from('usuario_especialidad')
      .select(`
        id_especialidad,
        precio_particular,
        precio_obra_social,
        activo,
        updated_at,
        especialidad:id_especialidad(id_especialidad, nombre)
      `)
      .eq('id_usuario', user.id)
      .order('id_especialidad');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (e) {
    return { success: false, error: 'Error inesperado' };
  }
}

// Crear/actualizar precios de una especialidad del usuario autenticado
export async function guardarPrecioUsuarioEspecialidad(
  id_especialidad: number,
  valores: { precio_particular?: number | null; precio_obra_social?: number | null; activo?: boolean | null }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar si existe la fila
    const { data: existente } = await supabase
      .from('usuario_especialidad')
      .select('id_usuario, id_especialidad')
      .eq('id_usuario', user.id)
      .eq('id_especialidad', id_especialidad)
      .maybeSingle();

    const payload = {
      id_usuario: user.id,
      id_especialidad,
      ...valores,
      updated_at: new Date().toISOString(),
    } as any;

    if (existente) {
      const { error } = await supabase
        .from('usuario_especialidad')
        .update(payload)
        .eq('id_usuario', user.id)
        .eq('id_especialidad', id_especialidad);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('usuario_especialidad')
        .insert(payload);
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: 'Error inesperado' };
  }
}

export async function obtenerPerfilUsuario(): Promise<PerfilCompleto | null> {
  try {
    const supabase = await createClient();
    
    // 1. Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Error de autenticación:', authError);
      redirect('/login');
    }

    // 1.5. Verificar si el usuario existe por ID
    const { data: existeUsuarioPorId, error: checkIdError } = await supabase
      .from('usuario')
      .select('id_usuario, nombre, apellido, email')
      .eq('id_usuario', user.id);

    // 1.6. Si no existe por ID, buscar por email
    if (!existeUsuarioPorId || existeUsuarioPorId.length === 0) {
      const { data: existeUsuarioPorEmail, error: checkEmailError } = await supabase
        .from('usuario')
        .select('id_usuario, nombre, apellido, email')
        .eq('email', user.email || '');

      if (existeUsuarioPorEmail && existeUsuarioPorEmail.length > 0) {
        // El usuario existe con el mismo email pero diferente id_usuario
        // Actualizar el id_usuario para vincularlo con Auth
        
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
          console.error('❌ Error actualizando usuario:', updateError);
          throw new Error(`Error vinculando usuario: ${updateError.message}`);
        }

      } else {
        // No existe el usuario, crear uno nuevo
        
        const { data: nuevoUsuario, error: createError } = await supabase
          .from('usuario')
          .insert({
            id_usuario: user.id,
            nombre: user.user_metadata?.nombre || 'Usuario',
            apellido: user.user_metadata?.apellido || 'Nuevo',
            email: user.email || '',
            usuario: user.email?.split('@')[0] || 'usuario',
            // Usar la columna real 'contraseña' (U+00F1) en la DB
            contraseña: '',
            id_rol: 1, // Rol por defecto
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creando usuario:', createError);
          throw new Error(`Error creando usuario: ${createError.message}`);
        }

      }
    }

    // 2. Obtener datos del usuario con joins
    const { data: userData, error: userError } = await supabase
      .from('usuario')
      .select(`
        id_usuario,
        nombre,
        apellido,
        email,
        telefono,
        usuario,
        color,
        rol:id_rol (
          id,
          nombre,
          jerarquia
        ),
        especialidad:id_especialidad (
          id_especialidad,
          nombre
        )
      `)
      .eq('id_usuario', user.id)
      .single();


    if (userError) {
      console.error('Error consultando usuario:', userError);
      throw new Error(`No se pudo obtener el perfil: ${userError.message}`);
    }

    if (!userData) {
      throw new Error('Usuario no encontrado en la base de datos');
    }

    // 3. Obtener especialidades adicionales
    const { data: especialidadesData, error: especialidadesError } = await supabase
      .from('usuario_especialidad')
      .select(`
        especialidad:id_especialidad (
          id_especialidad,
          nombre
        )
      `)
      .eq('id_usuario', user.id);

    // 4. Construir perfil completo
    const especialidadesAdicionales = especialidadesError 
      ? [] 
      : (especialidadesData || [])
          .map(item => item.especialidad)
          .filter(Boolean)
          .map(esp => ({
            id_especialidad: esp.id_especialidad,
            nombre: esp.nombre
          }));

    const perfil: PerfilCompleto = {
      id_usuario: userData.id_usuario,
      nombre: userData.nombre,
      apellido: userData.apellido,
      email: userData.email,
      telefono: userData.telefono,
      usuario: userData.usuario,
      color: userData.color,
      rol: {
        id: userData.rol?.id || 1,
        nombre: userData.rol?.nombre || 'Usuario',
        jerarquia: userData.rol?.jerarquia || 1
      },
      especialidad_principal: userData.especialidad ? {
        id_especialidad: userData.especialidad.id_especialidad,
        nombre: userData.especialidad.nombre
      } : null,
      especialidades_adicionales: especialidadesAdicionales
    };

    return perfil;

  } catch (error) {
    console.error('Error en obtenerPerfilUsuario:', error);
    return null;
  }
}

export async function actualizarPerfil(formData: FormData) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('No autenticado');
    }

    // Extraer datos del formulario
    const nombre = formData.get('nombre') as string;
    const apellido = formData.get('apellido') as string;
    const telefono = formData.get('telefono') as string;
    const color = formData.get('color') as string;

    // Actualizar usuario
    const { error: updateError } = await supabase
      .from('usuario')
      .update({
        nombre,
        apellido,
        telefono: telefono || null,
        color: color || null,
        updated_at: new Date().toISOString()
      })
      .eq('id_usuario', user.id);

    if (updateError) {
      throw new Error(`Error al actualizar: ${updateError.message}`);
    }

    return { success: true, message: 'Perfil actualizado correctamente' };

  } catch (error) {
    console.error('Error en actualizarPerfil:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}
