'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return null;
      }
      // Live schema: public.profiles(user_id uuid PK, name, age, email, onboarding_complete).
      // Conversation history + OpenRouter key are localStorage-only, never in Supabase.
      // Minimal columns only — never SELECT * (would pull openrouter_key_enc
      // if the optional server-key column is ever added via migration 005).
      const { data } = await supabase.from('profiles').select('user_id, name, age, email, onboarding_complete').eq('user_id', user.id).maybeSingle();
      const next = (data as Profile | null) ?? null;
      setProfile(next);
      return next;
    } catch {
      setProfile(null);
      return null;
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchProfile();
      setLoading(false);
    })();
    // Re-fetch when Settings sub-handlers report a username change.
    const refresh = () => void fetchProfile();
    window.addEventListener('understoodchat:settings-changed', refresh);
    return () => window.removeEventListener('understoodchat:settings-changed', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { profile, loading, refresh: fetchProfile };
}
