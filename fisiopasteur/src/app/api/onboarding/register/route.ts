/**
 * API POST /api/onboarding/register
 * 
 * Endpoint para registrar nuevo usuario + organización desde landing page
 * Flujo completo:
 * 1. Crear usuario en Supabase Auth
 * 2. Crear registro en tabla usuario
 * 3. Crear organización
 * 4. Crear branding para la organización
 * 5. Vincular usuario como Admin de la organización
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Cliente admin de Supabase (con permisos para crear usuarios)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface OnboardingRequest {
  // Datos del usuario
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  
  // Datos de la organización
  nombreOrganizacion: string;
  
  // Datos de pago (opcional, para referencia)
  paymentId?: string;
  plan?: 'basic' | 'premium' | 'enterprise';
}

export async function POST(request: Request) {
  try {
    const body: OnboardingRequest = await request.json();

    // Validar datos requeridos
    if (!body.email || !body.password || !body.nombre || !body.apellido || !body.nombreOrganizacion) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan datos requeridos',
          details: 'Se requiere: email, password, nombre, apellido, nombreOrganizacion'
        },
        { status: 400 }
      );
    }

    console.log('📝 Iniciando registro de usuario y organización:', body.email);

    // ==========================================
    // PASO 1: Crear usuario en Supabase Auth
    // ==========================================
    console.log('🔐 Paso 1: Creando usuario en Auth...');
    
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        nombre: body.nombre,
        apellido: body.apellido,
        rol: 'admin',
        onboarding_completed: true
      }
    });

    if (authError || !authUser.user) {
      console.error('❌ Error creando usuario en Auth:', authError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al crear usuario en Auth',
          details: authError?.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ Usuario creado en Auth:', authUser.user.id);

    try {
      // ==========================================
      // PASO 2: Crear registro en tabla usuario
      // ==========================================
      console.log('👤 Paso 2: Creando registro en tabla usuario...');
      
      const { data: usuario, error: usuarioError } = await supabaseAdmin
        .from('usuario')
        .insert({
          id_usuario: authUser.user.id,
          nombre: body.nombre,
          apellido: body.apellido,
          email: body.email,
          telefono: body.telefono || null,
          contraseña: '**AUTH**' // Placeholder, la contraseña está en Auth
        })
        .select()
        .single();

      if (usuarioError) {
        throw new Error(`Error creando usuario en DB: ${usuarioError.message}`);
      }

      console.log('✅ Usuario creado en tabla:', usuario.id_usuario);

      // ==========================================
      // PASO 3: Crear organización
      // ==========================================
      console.log('🏢 Paso 3: Creando organización...');
      
      const { data: organizacion, error: orgError } = await supabaseAdmin
        .from('organizacion')
        .insert({
          nombre: body.nombreOrganizacion,
          activo: true,
          plan: body.plan || 'basic',
          fecha_registro: new Date().toISOString()
        })
        .select()
        .single();

      if (orgError) {
        throw new Error(`Error creando organización: ${orgError.message}`);
      }

      console.log('✅ Organización creada:', organizacion.id_organizacion);

      // ==========================================
      // PASO 4: Crear branding para la organización
      // ==========================================
      console.log('🎨 Paso 4: Creando branding...');
      
      const { data: branding, error: brandingError } = await supabaseAdmin
        .from('branding')
        .insert({
          id_organizacion: organizacion.id_organizacion,
          nombre: body.nombreOrganizacion,
          logo_url: null, // Se puede agregar después
          color_primario: '#3b82f6', // Azul por defecto
          color_secundario: '#1e40af',
          email_contacto: body.email,
          telefono_contacto: body.telefono || null,
          direccion: null, // Se puede agregar después
          sitio_web: null
        })
        .select()
        .single();

      if (brandingError) {
        throw new Error(`Error creando branding: ${brandingError.message}`);
      }

      console.log('✅ Branding creado:', branding.id_branding);

      // ==========================================
      // PASO 5: Vincular usuario como Admin de la organización
      // ==========================================
      console.log('🔗 Paso 5: Vinculando usuario con organización...');
      
      const { data: usuarioOrg, error: vinculoError } = await supabaseAdmin
        .from('usuario_organizacion')
        .insert({
          id_usuario: authUser.user.id,
          id_organizacion: organizacion.id_organizacion,
          id_rol: 1, // Rol Admin
          activo: true,
          color_calendario: '#3b82f6'
        })
        .select()
        .single();

      if (vinculoError) {
        throw new Error(`Error vinculando usuario con organización: ${vinculoError.message}`);
      }

      console.log('✅ Usuario vinculado a organización:', usuarioOrg.id_usuario_organizacion);

      // ==========================================
      // PASO 6: Crear sesión para el usuario
      // ==========================================
      console.log('🎫 Paso 6: Generando token de sesión...');
      
      const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: body.email,
      });

      if (sessionError) {
        console.warn('⚠️ No se pudo generar link de sesión, pero el registro fue exitoso');
      }

      // ==========================================
      // RESPUESTA EXITOSA
      // ==========================================
      console.log('✅ Registro completado exitosamente!');
      
      return NextResponse.json({
        success: true,
        message: 'Usuario y organización creados exitosamente',
        data: {
          usuario: {
            id: authUser.user.id,
            email: body.email,
            nombre: body.nombre,
            apellido: body.apellido
          },
          organizacion: {
            id: organizacion.id_organizacion,
            nombre: body.nombreOrganizacion,
            plan: organizacion.plan
          },
          // Para que el frontend pueda iniciar sesión automáticamente
          redirectUrl: `/login?email=${encodeURIComponent(body.email)}&onboarding=true`
        }
      }, { status: 201 });

    } catch (error) {
      // ==========================================
      // ROLLBACK: Si algo falla, eliminar el usuario de Auth
      // ==========================================
      console.error('❌ Error en el proceso, haciendo rollback...', error);
      
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        console.log('🔄 Usuario eliminado de Auth (rollback)');
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError);
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Error en el proceso de registro',
          details: error instanceof Error ? error.message : 'Error desconocido'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error fatal en registro:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
