'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { onboardingSchema, STORAGE_KEYS } from '@/lib/validation';
import { setOpenRouterKey } from '@/lib/storage';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorAlert from '@/components/ui/ErrorAlert';

export default function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const parsed = onboardingSchema.safeParse({
      name: name.trim(),
      age: Number(age),
      openrouter_api_key: apiKey.trim(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your entries and try again.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const displayName = parsed.data.name.trim();
      const numericAge = Number(parsed.data.age);
      const rawKey = parsed.data.openrouter_api_key.trim();

      // Local-first: Supabase stores ONLY name/age/email (+ onboarding flag).
      // Never send the OpenRouter key to Supabase or Laravel.
      const { error: upsertError } = await supabase.from('profiles').upsert({
        user_id: user.id,
        name: displayName,
        age: numericAge,
        email: user.email ?? null,
        onboarding_complete: true,
      });
      if (upsertError) throw upsertError;

      // Device-local: OpenRouter key lives ONLY in browser localStorage,
      // sent ONLY to OpenRouter over HTTPS — never logged.
      setOpenRouterKey(rawKey);
      try {
        localStorage.setItem(
          STORAGE_KEYS.profileCache,
          JSON.stringify({ display_name: displayName, name: displayName, age: numericAge, email: user.email ?? null })
        );
      } catch {
        // Profile cache is best-effort; onboarding already succeeded.
      }
      router.push('/chat');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (/row-level security|rls|permission|policy/i.test(message)) {
        setError('We could not save your profile due to permissions. Please log in again and retry.');
      } else if (/network|fetch|failed/i.test(message)) {
        setError('No internet connection. Check your network and try again.');
      } else if (/duplicate|already exists/i.test(message)) {
        setError('A profile already exists for this account. Please continue to chat.');
      } else if (message) {
        setError(message);
      } else {
        setError('Could not save your profile. Check your name and age, then try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-lg border border-neutral-200 bg-white p-4 shadow-sm sm:p-6" noValidate>
      {error && <ErrorAlert message={error} onDismiss={() => setError('')} />}
      <div className="space-y-4">
        <Input
          label="Your name"
          name="name"
          icon={<User size={16} />}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          maxLength={80}
        />
        <Input
          label="Your age"
          name="age"
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={13}
          max={120}
          required
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="25"
          autoComplete="off"
          enterKeyHint="next"
        />
        <Input
          label="OpenRouter API key"
          name="openrouter_api_key"
          icon={<KeyRound size={16} />}
          type={showKey ? 'text' : 'password'}
          required
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-or-..."
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="done"
          endAdornment={
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
              aria-pressed={showKey}
              className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded text-neutral-500 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {showKey ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          }
        />
        <p className="flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Your name, age and email are stored in Supabase. Your OpenRouter key stays in
            this browser only (localStorage) and is sent only to OpenRouter — we never
            see or store it. Get a key at{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center font-medium text-black underline underline-offset-2"
            >
              openrouter.ai/keys
            </a>
            .
          </span>
        </p>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Saving…' : 'Continue to chat'}
        </Button>
      </div>
    </form>
  );
}
