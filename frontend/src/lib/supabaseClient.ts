import { createBrowserClient } from '@supabase/ssr';

// Vercel-safe: fall back to placeholders at build time so `next build`
// never crashes when env vars are missing. At runtime Vercel MUST provide
// the real NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// (see .env.example). Auth calls with placeholders simply fail gracefully.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
