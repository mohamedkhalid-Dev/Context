import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Vercel safety: fail open when env is missing (build/preview without
  // env). Page-level server guards handle routing in that case.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
        // Enforce Secure + HttpOnly + SameSite=lax on Supabase Auth cookies.
        // Secure only on https/production so http://localhost dev still works
        // (localhost is a secure context; Vercel preview/prod is always https).
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

  // Use getUser() (validated) instead of getSession() per @supabase/ssr docs.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Normalize trailing slash for guard comparisons (/login/ -> /login).
  const rawPath = req.nextUrl.pathname;
  const path = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;

  // Unauthenticated guards: /chat and /onboarding require login.
  if (!user && (path.startsWith('/chat') || path.startsWith('/onboarding'))) {
    const url = new URL('/login', req.url);
    const fresh = NextResponse.redirect(url, { headers: { 'x-middleware-cache': 'no-cache' } });
    // Preserve refreshed auth cookies on redirect.
    res.cookies.getAll().forEach((c) => fresh.cookies.set(c.name, c.value, c));
    return fresh;
  }
  // Authenticated users should not see the login page — route by profile.
  if (user && path === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, onboarding_complete')
      .eq('user_id', user.id)
      .maybeSingle();
    const complete =
      profile !== null &&
      (profile as { onboarding_complete: boolean }).onboarding_complete === true;
    const dest = complete ? '/chat' : '/onboarding';
    const url = new URL(dest, req.url);
    const fresh = NextResponse.redirect(url);
    res.cookies.getAll().forEach((c) => fresh.cookies.set(c.name, c.value, c));
    return fresh;
  }

  // Authenticated users never see the landing page — route by profile.
  // Unauthenticated visitors (and bots) fall through and get the full SEO page.
  if (user && path === '/') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, onboarding_complete')
      .eq('user_id', user.id)
      .maybeSingle();
    const complete =
      profile !== null &&
      (profile as { onboarding_complete: boolean }).onboarding_complete === true;
    const dest = complete ? '/chat' : '/onboarding';
    const url = new URL(dest, req.url);
    const fresh = NextResponse.redirect(url);
    res.cookies.getAll().forEach((c) => fresh.cookies.set(c.name, c.value, c));
    return fresh;
  }

  // Authenticated: route by profile completeness (profiles keyed by user_id).
  if (user && (path.startsWith('/chat') || path.startsWith('/onboarding'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, onboarding_complete')
      .eq('user_id', user.id)
      .maybeSingle();
    const complete =
      profile !== null &&
      (profile as { onboarding_complete: boolean }).onboarding_complete === true;
    if (!complete && path.startsWith('/chat')) {
      const url = new URL('/onboarding', req.url);
      const fresh = NextResponse.redirect(url);
      res.cookies.getAll().forEach((c) => fresh.cookies.set(c.name, c.value, c));
      return fresh;
    }
    if (complete && path.startsWith('/onboarding')) {
      const url = new URL('/chat', req.url);
      const fresh = NextResponse.redirect(url);
      res.cookies.getAll().forEach((c) => fresh.cookies.set(c.name, c.value, c));
      return fresh;
    }
  }
  return res;
}

export const config = {
  matcher: ['/', '/login', '/chat', '/chat/:path*', '/onboarding', '/onboarding/:path*'],
};
