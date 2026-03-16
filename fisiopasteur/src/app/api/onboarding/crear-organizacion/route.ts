import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service-role";

/**
 * API para crear un nuevo usuario administrador
 * Flujo: Landing → Onboarding automático
 *
 * POST /api/onboarding/crear-organizacion
 * Body: {
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
    const { usuario } = body;

    if (!usuario?.email || !usuario?.password || !usuario?.nombre || !usuario?.apellido) {
      return NextResponse.json(
        { error: "Datos de usuario incompletos" },
        { status: 400 }
      );
    }

    // 1. CREAR USUARIO EN AUTH
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: usuario.email,
      password: usuario.password,
      email_confirm: true,
      user_metadata: {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: "administrador",
      },
    });

    if (authError || !authUser.user) {
      console.error("Error creando usuario en Auth:", authError);
      return NextResponse.json(
        { error: "Error al crear usuario. El email puede estar ya registrado." },
        { status: 500 }
      );
    }

    // 2. CREAR REGISTRO EN TABLA USUARIO
    const { data: nuevoUsuario, error: usuarioError } = await supabaseAdmin
      .from("usuario")
      .insert({
        id_usuario: authUser.user.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono || null,
        activo: true,
        id_rol: 1,
        contrasena: "**AUTH**",
      })
      .select()
      .single();

    if (usuarioError || !nuevoUsuario) {
      console.error("Error creando registro de usuario:", usuarioError);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: "Error al crear registro de usuario" },
        { status: 500 }
      );
    }

    // 3. CREAR SESION PARA EL USUARIO
    const { data: session, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: usuario.email,
      password: usuario.password,
    });

    if (sessionError || !session) {
      return NextResponse.json({
        success: true,
        message: "Usuario creado. Por favor inicia sesion.",
        requiresLogin: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Usuario creado exitosamente",
      data: {
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
