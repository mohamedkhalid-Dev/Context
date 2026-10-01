import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServer() {
  const cookieStore = cookies();
  // Vercel-safe placeholders so `next build` / prerender never crashes
  // when env vars are absent. Page guards catch auth errors and fall
  // through to the public UI; real deployments must set the env vars.
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
        try {
          // Same cookie hardening as middleware: Secure (prod/https only so
          // localhost dev works) + HttpOnly + SameSite=lax.
          const isSecure = process.env.NODE_ENV === 'production';
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              httpOnly: options?.httpOnly ?? true,
              secure: isSecure,
              sameSite: 'lax',
              path: options?.path ?? '/',
            } as CookieOptions & { path: string })
          );
        } catch {
          // Server Component: cannot set cookies — middleware refreshes the session.
        }
      },
    },
  });
}
