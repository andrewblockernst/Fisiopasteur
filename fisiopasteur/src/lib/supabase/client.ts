import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

// Crear cliente de Supabase para el navegador
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// Agregar esta línea para que funcione el import en login
export const supabase = createClient()