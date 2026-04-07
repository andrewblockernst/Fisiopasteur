/**
 * API GET /api/onboarding/check-email?email=test@example.com
 * 
 * Verifica si un email ya está registrado
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Configuracion incompleta del servidor' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requerido' },
        { status: 400 }
      );
    }

    // Verificar en Auth
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error verificando email:', error);
      return NextResponse.json(
        { success: false, error: 'Error al verificar email' },
        { status: 500 }
      );
    }

    const exists = users.users.some(user => user.email?.toLowerCase() === email.toLowerCase());

    return NextResponse.json({
      success: true,
      exists,
      available: !exists
    });

  } catch (error) {
    console.error('Error en check-email:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno' },
      { status: 500 }
    );
  }
}
