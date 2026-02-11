import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

// ✅ Instancia singleton del cliente Supabase
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Función que retorna la instancia única del cliente
export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseInstance;
};

// Export para compatibilidad con código existente
export const supabase = getSupabaseClient();
export const createClient = getSupabaseClient; // Alias