import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Exchanges email-confirm codes for a session, then lets
// middleware route by profile (complete -> /chat, else -> /onboarding).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  // Validate `next`: same-origin path only. Blocks open-redirect payloads
  // like `//evil.com`, `/\evil.com`, `https://evil.com`, or `javascript:`.
  const rawNext = url.searchParams.get('next') ?? '/onboarding';
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
      ? rawNext
      : '/onboarding';

  const res = NextResponse.redirect(new URL(next, req.url));

  // Vercel safety: without env vars there is no session to exchange —
  // just follow the redirect and let page guards handle it.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || !supabaseUrl || !supabaseKey) return res;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
        // Harden session cookies at exchange: Secure (https/prod only) +
        // HttpOnly + SameSite=lax. Mirrors middleware.ts.
        const isSecure =
          req.url.startsWith('https://') || process.env.NODE_ENV === 'production';
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, {
            ...options,
            httpOnly: options?.httpOnly ?? true,
            secure: isSecure,
            sameSite: 'lax',
            path: options?.path ?? '/',
          })
        );
      },
    },
  });

  await supabase.auth.exchangeCodeForSession(code);

  return res;
}
