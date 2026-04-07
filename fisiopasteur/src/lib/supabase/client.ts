import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types'

// ✅ Instancia singleton del cliente Supabase
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Función que retorna la instancia única del cliente
export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    supabaseInstance = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey
    );
  }

  return supabaseInstance;
};

export const createClient = getSupabaseClient; // Alias