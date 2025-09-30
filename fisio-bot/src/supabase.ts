import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://fsqqsdqtxedveuptckxj.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcXFzZHF0eGVkdmV1cHRja3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5MzIxMjIsImV4cCI6MjAxODUwODEyMn0.KJGMJEaGzT1KsCA2juDU6xQ7weF5-Xqy1fOGSWJ-jLU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔌 Cliente Supabase inicializado en el bot')