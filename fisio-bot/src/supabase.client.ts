import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
    console.error('❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas como config vars de Heroku')
    process.exit(1)
}

export const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
})
console.log('🔌 Cliente Supabase inicializado (service-role)')
