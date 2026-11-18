import { createClient } from '@supabase/supabase-js'

// These are read from the repo-root `.env` (Vite `envDir` points there — see
// vite.config.ts). Only the ANON key belongs here: it is RLS-constrained and
// safe to ship in the browser bundle. The service-role key must NEVER be
// VITE_-prefixed or imported into this app.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Add them to the repo-root .env (Vite reads it via envDir).',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true, // keep the session in localStorage
    autoRefreshToken: true, // refresh the JWT before it expires
    detectSessionInUrl: true, // finish the Google OAuth redirect automatically
  },
})
