/**
 * API POST /api/onboarding/register
 *
 * Endpoint para registrar nuevo usuario desde landing page
 * Flujo:
 * 1. Crear usuario en Supabase Auth
 * 2. Crear registro en tabla usuario (con id_rol = 1 Admin)
 * 3. Generar link de sesion
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

interface OnboardingRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  paymentId?: string;
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuracion incompleta del servidor",
          details: "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: OnboardingRequest = await request.json();

    if (!body.email || !body.password || !body.nombre || !body.apellido) {
      return NextResponse.json(
        {
          success: false,
          error: "Faltan datos requeridos",
          details: "Se requiere: email, password, nombre, apellido",
        },
        { status: 400 }
      );
    }

    // PASO 1: Crear usuario en Supabase Auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          nombre: body.nombre,
          apellido: body.apellido,
          rol: "admin",
          onboarding_completed: true,
        },
      });

    if (authError || !authUser.user) {
      console.error("Error creando usuario en Auth:", authError);
      return NextResponse.json(
        {
          success: false,
          error: "Error al crear usuario en Auth",
          details: authError?.message,
        },
        { status: 500 }
      );
    }

    try {
      // PASO 2: Crear registro en tabla usuario
      const { data: usuario, error: usuarioError } = await supabaseAdmin
        .from("usuario")
        .insert({
          id_usuario: authUser.user.id,
          nombre: body.nombre,
          apellido: body.apellido,
          email: body.email,
          telefono: body.telefono || null,
          activo: true,
          id_rol: 1,
          contrasena: "**AUTH**",
        })
        .select()
        .single();

      if (usuarioError) {
        throw new Error(`Error creando usuario en DB: ${usuarioError.message}`);
      }

      // PASO 3: Generar link de sesion
      const { data: session, error: sessionError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: body.email,
        });

      if (sessionError) {
        console.warn("No se pudo generar link de sesion, pero el registro fue exitoso");
      }

      return NextResponse.json(
        {
          success: true,
          message: "Usuario creado exitosamente",
          data: {
            usuario: {
              id: authUser.user.id,
              email: body.email,
              nombre: body.nombre,
              apellido: body.apellido,
            },
            redirectUrl: `/login?email=${encodeURIComponent(body.email)}&onboarding=true`,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error en el proceso, haciendo rollback...", error);
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      } catch (rollbackError) {
        console.error("Error en rollback:", rollbackError);
      }
      return NextResponse.json(
        {
          success: false,
          error: "Error en el proceso de registro",
          details: error instanceof Error ? error.message : "Error desconocido",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fatal en registro:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
