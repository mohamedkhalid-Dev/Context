'use client';

/**
 * MFA / 2FA enablement stub (Supabase TOTP).
 *
 * STATUS: not yet wired into LoginForm — guidance + ready-to-use calls.
 *
 * HOW TO ENABLE (Dashboard, no code needed):
 * 1. Supabase Dashboard > Authentication > Multi-Factor Authentication >
 *    enable TOTP (Time-based One-Time Password).
 * 2. Optionally enforce per-user: Authentication > Policies / Hooks, or call
 *    `supabase.auth.mfa.listFactors()` after login and prompt enrollment when
 *    `totp` has no verified factor.
 * 3. Also enable Authentication > Settings > "Leaked password protection"
 *    (currently WARN in advisors) + keep email confirmations ON.
 *
 * INTEGRATION SKETCH:
 * - After `signInWithPassword`, call `listFactors()`. If no verified TOTP
 *   factor and you want to force 2FA, render this component.
 * - `enroll()` returns `totp.uri` -> render as QR (e.g. `qrcode` lib) and keep
 *   `factorId`. User scans with Authenticator app, enters 6-digit code, call
 *   `verify({ factorId, code })`. On success the session is AAL2.
 * - On next logins with MFA enrolled, Supabase returns AAL1; call
 *   `challenge({ factorId })` -> `challengeId`, prompt code, then
 *   `verify({ factorId, challengeId, code })` to reach AAL2 before routing
 *   to /chat. Gate sensitive routes on `supabase.auth.getUser()` + AAL check
 *   via `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`.
 *
 * SECURITY NOTES:
 * - Never store TOTP secrets yourself — Supabase holds them; you only keep
 *   `factorId`/`challengeId` in memory for the ceremony.
 * - Recovery codes: show once after enrollment, store offline by the user.
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorAlert from '@/components/ui/ErrorAlert';

export default function MfaEnroll() {
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function enroll() {
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setFactorId(data.id);
      setTotpUri(data.totp.uri);
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: data.id });
      if (chErr) throw chErr;
      setChallengeId(ch.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start 2FA enrollment.');
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) return <p className="text-sm">Two-factor authentication is enabled for this account.</p>;

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-semibold">Enable two-factor authentication (optional)</h3>
      {error && <ErrorAlert message={error} onDismiss={() => setError('')} />}
      {!factorId ? (
        <Button type="button" onClick={enroll} disabled={loading}>
          {loading ? 'Please wait…' : 'Start 2FA enrollment'}
        </Button>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="break-all text-xs text-neutral-500">
            Scan this URI with your authenticator app (render as QR in production): {totpUri}
          </p>
          <Input label="6-digit code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={6} />
          <Button type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify & enable 2FA'}
          </Button>
        </form>
      )}
    </div>
  );
}
