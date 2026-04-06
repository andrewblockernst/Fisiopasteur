import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY

if (!url || !key) {
    console.error('❌ SUPABASE_URL y SUPABASE_ANON_KEY son requeridas como config vars de Heroku')
    process.exit(1)
}

export const supabase = createClient(url, key)
console.log('🔌 Cliente Supabase inicializado')
