import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const baseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})

export const supabase = baseClient

export function supabaseWithAuth(accessToken?: string | null): SupabaseClient {
  if (!accessToken) return baseClient
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
