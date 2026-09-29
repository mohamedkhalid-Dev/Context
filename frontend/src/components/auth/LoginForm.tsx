'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorAlert from '@/components/ui/ErrorAlert';

type Notice = { kind: 'info' | 'success'; message: string } | null;

/**
 * Map raw Supabase/Auth errors to clear, actionable user messages.
 * Never surface raw "Error 500" / stack traces to the user.
 */
function friendlyAuthError(message: string): string {
  const msg = (message || '').trim();
  if (!msg) return 'Something went wrong. Please try again.';
  if (/invalid login credentials|invalid email or password/i.test(msg)) {
    return 'Invalid email or password. Please check your entries and try again.';
  }
  if (/user already registered|user already exists|already registered|email.*already.*(in use|exists|taken)/i.test(msg)) {
    return 'This email is already registered. Try logging in instead.';
  }
  if (/email not confirmed|email.*not.*(verified|confirmed)|confirm.*email.*before/i.test(msg)) {
    return 'Your email is not confirmed yet. Check your inbox for the confirmation email, then try again.';
  }
  if (/expired|link.*invalid|token.*invalid|otp/i.test(msg)) {
    return 'Your confirmation link has expired or is invalid. Request a new one below and try again.';
  }
  if (/password.*(weak|short|least|too short|6 characters)|weak password/i.test(msg)) {
    return 'Password is too weak. Use at least 6 characters.';
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
  return msg.length > 220 ? 'Something went wrong. Please check your entries and try again.' : msg;
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
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showResend, setShowResend] = useState(false);

  async function handleResend() {
    const target = email.trim();
    if (!target) {
      setError('Enter your email above first, then request a new confirmation email.');
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
        message: `Confirmation email re-sent to ${target}. Check your inbox (and spam folder), click the link, then log in.`,
      });
    } catch (err: unknown) {
      setError(friendlyAuthError(err instanceof Error ? err.message : 'Something went wrong.'));
    } finally {
      setResending(false);
    }
  }

  function switchMode(next: 'signin' | 'signup') {
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

    // Clear client-side validation first — friendlier than a round-trip.
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. you@example.com).');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password is too weak. Use at least 6 characters.');
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
          const friendly = friendlyAuthError(error.message);
          setError(friendly);
          if (/not confirmed|expired|invalid/i.test(error.message)) setShowResend(true);
          // If the account already exists, guide the user to sign in.
          if (/already registered|already exists|already in use/i.test(error.message)) {
            setMode('signin');
          }
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
          const friendly = friendlyAuthError(error.message);
          setError(friendly);
          if (/not confirmed|expired|invalid.*token|otp/i.test(error.message)) {
            setShowResend(true);
          }
          return;
        }
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
        <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
        <Button type="submit" className="w-full" disabled={loading}>
          <LogIn size={16} /> {loading ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Create account'}
        </Button>
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
        onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
        className="mt-4 w-full text-center text-sm text-neutral-500 hover:text-black"
      >
        {mode === 'signin' ? 'No account? Create one' : 'Have an account? Log in'}
      </button>
    </form>
  );
}
