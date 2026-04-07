import { Database } from '@/types/database.types';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let cachedAdmin: SupabaseClient<Database> | null = null;

function createAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

export function getSupabaseAdmin() {
  if (!cachedAdmin) {
    cachedAdmin = createAdmin();
  }
  return cachedAdmin;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdmin() as object, prop, receiver);
  },
});
