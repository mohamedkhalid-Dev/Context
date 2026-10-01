'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { emailSchema, passwordSchema } from '@/lib/validation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorAlert from '@/components/ui/ErrorAlert';

/**
 * AUTH SECURITY NOTES (Agent 3 — Passwords & Authentication)
 * - Password storage: Supabase Auth (GoTrue) only — bcrypt server-side.
 *   No plaintext / MD5 / SHA1 / custom hashing anywhere (verified:
 *   `public.profiles` has NO password column; backend never touches passwords).
 * - Brute force: login goes frontend -> Supabase Auth directly, so Laravel
 *   `throttle:60,1` in api.php does NOT protect it. Protection = Supabase
 *   Auth server rate limits (429 "Too many attempts" mapped below) + this
 *   client-side lockout (5 fails -> 60s, exponential) as defense-in-depth.
 * - Error messages: sign-in is generic "Invalid email or password".
 *   Sign-up is deliberately generic too (no "already registered" oracle).
 * - Password reset: Supabase recovery flow only — cryptographically random,
 *   expiring (~1h, configurable), single-use tokens via PKCE email link.
 *   No custom/guessable tokens anywhere. Forgot mode below always shows the
 *   same generic notice so it cannot enumerate accounts.
 * - Leaked-password protection: enable in Dashboard > Authentication >
 *   Settings > "Leaked password protection" (currently WARN per advisors).
 * - 2FA/MFA: Supabase MFA (TOTP) is available via `supabase.auth.mfa.*`
 *   once enabled in Dashboard > Authentication > MFA. See MfaEnroll.tsx stub.
 */

type Notice = { kind: 'info' | 'success'; message: string } | null;

// --- Client-side brute-force lockout (defense-in-depth; server limits apply too) ---
const LOGIN_ATTEMPT_KEY = 'understoodchat:login_attempts';
const MAX_FAILED_ATTEMPTS = 5;
const BASE_LOCKOUT_SECONDS = 60;

type AttemptState = { count: number; lockedUntil: number };

function getAttemptState(): AttemptState {
  if (typeof window === 'undefined') return { count: 0, lockedUntil: 0 };
  try {
    const raw = window.localStorage.getItem(LOGIN_ATTEMPT_KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<AttemptState>;
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : 0,
    };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function setAttemptState(s: AttemptState) {
  try {
    window.localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(s));
  } catch {
    // Best-effort only.
  }
}

/** Exponential backoff: 60s, 120s, 240s, ... after the 5th failure. */
function lockoutSecondsFor(count: number): number {
  const extra = Math.max(0, count - MAX_FAILED_ATTEMPTS);
  return BASE_LOCKOUT_SECONDS * Math.pow(2, extra);
}

function recordFailedAttempt(): AttemptState {
  const prev = getAttemptState();
  const count = prev.count + 1;
  let lockedUntil = prev.lockedUntil;
  if (count >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = Date.now() + lockoutSecondsFor(count) * 1000;
  }
  const next = { count, lockedUntil };
  setAttemptState(next);
  return next;
}

function clearAttempts() {
  try {
    window.localStorage.removeItem(LOGIN_ATTEMPT_KEY);
  } catch {
    // Ignore.
  }
}

function formatWait(ms: number): string {
  const s = Math.max(1, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

/**
 * Map raw Supabase/Auth errors to clear, actionable user messages.
 * Never surface raw "Error 500" / stack traces. Unknown messages fall back
 * to a generic notice so internals never leak (and sign-in never enumerates).
 */
function friendlyAuthError(message: string): string {
  const msg = (message || '').trim();
  if (!msg) return 'Something went wrong. Please try again.';
  if (/invalid login credentials|invalid email or password/i.test(msg)) {
    return 'Invalid email or password. Please check your entries and try again.';
  }
  if (/user already registered|user already exists|already registered|email.*already.*(in use|exists|taken)/i.test(msg)) {
    // Generic on purpose: must not confirm whether the email exists.
    return 'If this email is new, a confirmation email has been sent. If it is already registered, try logging in instead.';
  }
  if (/email not confirmed|email.*not.*(verified|confirmed)|confirm.*email.*before/i.test(msg)) {
    return 'Your email is not confirmed yet. Check your inbox for the confirmation email, then try again.';
  }
  if (/expired|link.*invalid|token.*invalid|otp/i.test(msg)) {
    return 'Your confirmation link has expired or is invalid. Request a new one below and try again.';
  }
  if (/password.*(weak|short|least|too short|6 characters|8 characters)|weak password/i.test(msg)) {
    return 'Password is too weak. Use at least 8 characters.';
  }
  if (/password should be different|same password|new password/i.test(msg)) {
    return 'Please choose a different password than your current one.';
  }
  if (/invalid.*email|email.*invalid|valid email/i.test(msg)) {
    return 'Please enter a valid email address (e.g. you@example.com).';
  }
  if (/email.*required|missing email/i.test(msg)) {
    return 'Please enter your email address.';
  }
  if (/password.*required|missing password/i.test(msg)) {
    return 'Please enter your password.';
  }
  if (/too many requests|rate.?limit|email rate limit|over.*limit/i.test(msg)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (/signup.*disabled|signups.*disabled|registration.*disabled/i.test(msg)) {
    return 'New registrations are currently disabled. Please try again later.';
  }
  if (/network|failed to fetch|fetch failed|offline|connection/i.test(msg)) {
    return 'No internet connection. Check your network and try again.';
  }
  if (/session.*expired|jwt.*expired|refresh token/i.test(msg)) {
    return 'Your session expired. Please log in again.';
  }
  // Default: generic (do not echo raw provider internals).
  return 'Something went wrong. Please check your entries and try again.';
}

async function routeByProfile(userId: string, router: ReturnType<typeof useRouter>) {
  // Minimal profile fetch: only the columns Supabase stores (name/age/email + flag).
  const { data } = await supabase
    .from('profiles')
    .select('user_id, onboarding_complete')
    .eq('user_id', userId)
    .maybeSingle();
  if (data && (data as { onboarding_complete: boolean }).onboarding_complete) {
    router.push('/chat');
  } else {
    router.push('/onboarding');
  }
  router.refresh();
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [lockoutRemainingMs, setLockoutRemainingMs] = useState(0);

  // Hydrate lockout state on mount + tick countdown.
  useEffect(() => {
    const sync = () => {
      const st = getAttemptState();
      setLockoutRemainingMs(Math.max(0, st.lockedUntil - Date.now()));
    };
    sync();
    const t = setInterval(sync, 1000);
    return () => clearInterval(t);
  }, []);

  const locked = lockoutRemainingMs > 0;

  async function handleResend() {
    const target = email.trim();
    if (!target) {
      setError('Enter your email above first, then request a new confirmation email.');
      return;
    }
    if (locked) {
      setError(`Too many attempts. Try again in ${formatWait(lockoutRemainingMs)}.`);
      return;
    }
    setError('');
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: target });
      if (error) throw error;
      setShowResend(false);
      setNotice({
        kind: 'info',
        message: `If an account exists for ${target}, a confirmation email has been sent. Check your inbox (and spam folder), click the link, then log in.`,
      });
    } catch (err: unknown) {
      setError(friendlyAuthError(err instanceof Error ? err.message : 'Something went wrong.'));
    } finally {
      setResending(false);
    }
  }

  function switchMode(next: 'signin' | 'signup' | 'forgot') {
    setMode(next);
    setError('');
    setNotice(null);
    setShowResend(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice(null);
    setShowResend(false);

    const cleanEmail = email.trim();

    // Shared email validation (Zod single source of truth).
    const emailCheck = emailSchema.safeParse(cleanEmail);
    if (!emailCheck.success) {
      setError(emailCheck.error.issues[0]?.message ?? 'Please enter a valid email address.');
      return;
    }

    // --- Forgot-password path: Supabase recovery (random, expiring, single-use). ---
    if (mode === 'forgot') {
      if (locked) {
        setError(`Too many attempts. Try again in ${formatWait(lockoutRemainingMs)}.`);
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/callback?next=/chat`,
        });
        if (error) throw error;
        // Generic on purpose — identical whether or not the email exists.
        setNotice({
          kind: 'info',
          message: `If an account exists for ${cleanEmail}, a password reset email has been sent. Check your inbox (and spam folder), click the link within an hour, then choose a new password.`,
        });
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : '';
        if (/too many requests|rate.?limit|over.*limit/i.test(raw)) {
          recordFailedAttempt();
          setLockoutRemainingMs(Math.max(0, getAttemptState().lockedUntil - Date.now()));
        }
        setError(friendlyAuthError(raw));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (mode === 'signup') {
      const pwCheck = passwordSchema.safeParse(password);
      if (!pwCheck.success) {
        setError(pwCheck.error.issues[0]?.message ?? 'Password is too weak. Use at least 8 characters.');
        return;
      }
    }

    if (locked) {
      setError(`Too many attempts. Try again in ${formatWait(lockoutRemainingMs)}.`);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
        });
        if (error) {
          // "Already registered" is mapped to a generic notice — not an oracle.
          if (/already registered|already exists|already in use/i.test(error.message)) {
            setNotice({
              kind: 'info',
              message: `If this email is new, we sent a confirmation email to ${cleanEmail}. Check your inbox (and spam folder), click the link, then log in. If already registered, try logging in instead.`,
            });
            setShowResend(true);
            return;
          }
          const friendly = friendlyAuthError(error.message);
          setError(friendly);
          if (/not confirmed|expired|invalid/i.test(error.message)) setShowResend(true);
          return;
        }
        const userId = data.user?.id;
        const hasSession = Boolean(data.session);
        if (!userId || !hasSession) {
          // Email confirmation required — no session yet. This is NOT an
          // error: tell the user exactly what to do next.
          setNotice({
            kind: 'info',
            message: `Account created — we sent a confirmation email to ${cleanEmail}. Check your inbox (and spam folder), click the link, then log in here.`,
          });
          setShowResend(true);
          setMode('signin');
          return;
        }
        clearAttempts();
        setNotice({
          kind: 'success',
          message: 'Account created — welcome! Taking you to onboarding…',
        });
        await routeByProfile(userId, router);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          const next = recordFailedAttempt();
          setLockoutRemainingMs(Math.max(0, next.lockedUntil - Date.now()));
          const friendly = friendlyAuthError(error.message);
          const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - next.count);
          setError(
            next.lockedUntil > Date.now()
              ? `Too many attempts. Try again in ${formatWait(next.lockedUntil - Date.now())}.`
              : remaining <= 2 && remaining > 0
                ? `${friendly} (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left before a temporary lockout.)`
                : friendly
          );
          if (/not confirmed|expired|invalid.*token|otp/i.test(error.message)) {
            setShowResend(true);
          }
          return;
        }
        clearAttempts();
        const userId = data.user?.id;
        if (!userId) {
          router.push('/onboarding');
          return;
        }
        await routeByProfile(userId, router);
      }
    } catch (err: unknown) {
      setError(friendlyAuthError(err instanceof Error ? err.message : 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  }

  const isForgot = mode === 'forgot';

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm" noValidate>
      {notice && <ErrorAlert message={notice.message} variant={notice.kind} onDismiss={() => setNotice(null)} />}
      {error && (
        <div>
          <ErrorAlert message={error} onDismiss={() => { setError(''); setShowResend(false); }} />
          {showResend && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mb-4 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm hover:border-black disabled:opacity-50"
            >
              {resending ? 'Re-sending…' : 'Resend confirmation email'}
            </button>
          )}
        </div>
      )}
      <div className="space-y-4">
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        {!isForgot && (
          <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
        )}
        <Button type="submit" className="w-full" disabled={loading || locked}>
          <LogIn size={16} />{' '}
          {loading ? 'Please wait…' : locked ? `Locked — try in ${formatWait(lockoutRemainingMs)}` : mode === 'signin' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
        </Button>
        {mode === 'signin' && (
          <button type="button" onClick={() => switchMode('forgot')} className="w-full text-center text-sm text-neutral-500 hover:text-black">
            Forgot password?
          </button>
        )}
        <p className="text-center text-xs text-neutral-500">
          {mode === 'signup' ? 'By creating an account, you agree to our ' : 'By continuing, you agree to our '}
          <Link href="/terms" className="underline hover:text-black">
            Terms of Service
          </Link>
          {' and '}
          <Link href="/privacy" className="underline hover:text-black">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      <button
        type="button"
        onClick={() => switchMode(isForgot ? 'signin' : mode === 'signin' ? 'signup' : 'signin')}
        className="mt-4 w-full text-center text-sm text-neutral-500 hover:text-black"
      >
        {isForgot ? 'Back to log in' : mode === 'signin' ? 'No account? Create one' : 'Have an account? Log in'}
      </button>
      {isForgot && (
        <p className="mt-2 text-center text-xs text-neutral-400">
          Reset links are single-use and expire in about an hour. If yours expired, request a new one.
        </p>
      )}
    </form>
  );
}
