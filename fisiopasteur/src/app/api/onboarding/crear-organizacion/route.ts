import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

/**
 * API para crear una nueva organización con su usuario fundador
 * Flujo SaaS: Landing → Pago → Onboarding automático
 * 
 * POST /api/onboarding/crear-organizacion
 * Body: {
 *   organizacion: {
 *     nombre: string;
 *     telefono_contacto?: string;
 *     email_contacto?: string;
 *     cuit_cuil?: string;
 *   },
 *   usuario: {
 *     email: string;
 *     password: string;
 *     nombre: string;
 *     apellido: string;
 *     telefono?: string;
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizacion, usuario } = body;

    // Validaciones
    if (!organizacion?.nombre) {
      return NextResponse.json(
        { error: "Nombre de organización es requerido" },
        { status: 400 }
      );
    }

    if (!usuario?.email || !usuario?.password || !usuario?.nombre || !usuario?.apellido) {
      return NextResponse.json(
        { error: "Datos de usuario incompletos" },
        { status: 400 }
      );
    }

    // ========================================
    // 1. CREAR ORGANIZACIÓN
    // ========================================
    const supabase = await createClient();
    
    const { data: nuevaOrg, error: orgError } = await supabaseAdmin
      .from("organizacion")
      .insert({
        nombre: organizacion.nombre,
        telefono_contacto: organizacion.telefono_contacto || null,
        email_contacto: organizacion.email_contacto || usuario.email,
        cuit_cuil: organizacion.cuit_cuil || null,
        activo: true,
      })
      .select()
      .single();

    if (orgError || !nuevaOrg) {
      console.error("Error creando organización:", orgError);
      return NextResponse.json(
        { error: "Error al crear organización" },
        { status: 500 }
      );
    }

    console.log(`✅ Organización creada: ${nuevaOrg.nombre} (ID: ${nuevaOrg.id_organizacion})`);

    // ========================================
    // 2. CREAR USUARIO EN AUTH
    // ========================================
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: usuario.email,
      password: usuario.password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: "administrador",
        organizacion_inicial: nuevaOrg.id_organizacion,
      },
    });

    if (authError || !authUser.user) {
      console.error("Error creando usuario en Auth:", authError);
      
      // Rollback: eliminar organización creada
      await supabaseAdmin
        .from("organizacion")
        .delete()
        .eq("id_organizacion", nuevaOrg.id_organizacion);

      return NextResponse.json(
        { error: "Error al crear usuario. El email puede estar ya registrado." },
        { status: 500 }
      );
    }

    console.log(`✅ Usuario creado en Auth: ${authUser.user.email} (ID: ${authUser.user.id})`);

    // ========================================
    // 3. CREAR REGISTRO EN TABLA USUARIO
    // ========================================
    const { data: nuevoUsuario, error: usuarioError } = await supabaseAdmin
      .from("usuario")
      .insert({
        id_usuario: authUser.user.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono || null,
        activo: true,
        contraseña: "**AUTH**", // Placeholder ya que usamos Supabase Auth
      })
      .select()
      .single();

    if (usuarioError || !nuevoUsuario) {
      console.error("Error creando registro de usuario:", usuarioError);
      
      // Rollback: eliminar usuario de Auth y organización
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin
        .from("organizacion")
        .delete()
        .eq("id_organizacion", nuevaOrg.id_organizacion);

      return NextResponse.json(
        { error: "Error al crear registro de usuario" },
        { status: 500 }
      );
    }

    console.log(`✅ Usuario creado en tabla: ${nuevoUsuario.nombre} ${nuevoUsuario.apellido}`);

    // ========================================
    // 4. ASIGNAR USUARIO A ORGANIZACIÓN (ROL ADMINISTRADOR)
    // ========================================
    // Rol 1 = Administrador (debe existir en tu tabla 'rol')
    const { data: usuarioOrg, error: usuarioOrgError } = await supabaseAdmin
      .from("usuario_organizacion")
      .insert({
        id_usuario: authUser.user.id,
        id_organizacion: nuevaOrg.id_organizacion,
        id_rol: 1, // Administrador
        activo: true,
        color_calendario: "#3B82F6", // Color por defecto
      })
      .select()
      .single();

    if (usuarioOrgError || !usuarioOrg) {
      console.error("Error asignando usuario a organización:", usuarioOrgError);
      
      // Rollback completo
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin
        .from("usuario")
        .delete()
        .eq("id_usuario", authUser.user.id);
      await supabaseAdmin
        .from("organizacion")
        .delete()
        .eq("id_organizacion", nuevaOrg.id_organizacion);

      return NextResponse.json(
        { error: "Error al asignar usuario a organización" },
        { status: 500 }
      );
    }

    console.log(`✅ Usuario asignado a organización como Administrador`);

    // ========================================
    // 5. CREAR SESIÓN PARA EL USUARIO
    // ========================================
    // Generar link de login mágico o retornar credenciales para auto-login
    const { data: session, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: usuario.email,
      password: usuario.password,
    });

    if (sessionError || !session) {
      console.error("Error creando sesión:", sessionError);
      // No hacemos rollback aquí porque el usuario ya fue creado correctamente
      // Solo retornamos que debe hacer login manual
      return NextResponse.json({
        success: true,
        message: "Organización y usuario creados. Por favor inicia sesión.",
        organizacionId: nuevaOrg.id_organizacion,
        requiresLogin: true,
      });
    }

    // ========================================
    // ✅ TODO EXITOSO
    // ========================================
    return NextResponse.json({
      success: true,
      message: "Organización creada exitosamente",
      data: {
        organizacion: {
          id: nuevaOrg.id_organizacion,
          nombre: nuevaOrg.nombre,
        },
        usuario: {
          id: authUser.user.id,
          email: authUser.user.email,
          nombre: nuevoUsuario.nombre,
          apellido: nuevoUsuario.apellido,
        },
        session: session,
      },
    });

  } catch (error) {
    console.error("Error inesperado en onboarding:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
