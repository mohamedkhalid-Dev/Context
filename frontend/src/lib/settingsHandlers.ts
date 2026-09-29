'use client';

import { supabase } from './supabaseClient';
import {
  ACTIVE_CONVERSATION_STORAGE_KEY,
  clearCustomInstructions as clearCustom,
  clearOpenRouterKey,
  CONVERSATIONS_STORAGE_KEY,
  getCustomInstructions,
  setCustomInstructions as persistCustom,
  setOpenRouterKey,
} from './storage';
import {
  customInstructionsSchema,
  MAX_CUSTOM_INSTRUCTIONS_LENGTH,
  openRouterKeySchema,
  profileSchema,
  STORAGE_KEYS,
} from './validation';

export const SETTINGS_CHANGED_EVENT = 'understoodchat:settings-changed';

function notifySettingsChanged(detail: Record<string, unknown> = {}) {
  try {
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail }));
  } catch {
    // Non-browser or dispatch failure — ignore.
  }
}

// --- Sub-handler: OpenRouter API key ---

export function validateApiKeyInput(raw: string): string {
  const key = raw.trim();
  const parsed = openRouterKeySchema.safeParse(key);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'That API key looks invalid.');
  }
  return parsed.data;
}

/** Sub-handler: persist a new OpenRouter key (device-local only). */
export function handleApiKeyChange(rawKey: string): string {
  const key = validateApiKeyInput(rawKey);
  // Never send to Supabase/Laravel — localStorage only, sent only to OpenRouter.
  setOpenRouterKey(key);
  notifySettingsChanged({ apiKey: true });
  try {
    window.dispatchEvent(new Event('storage'));
  } catch {
    // Best-effort cross-component refresh.
  }
  return 'API key saved on this device.';
}

/** Sub-handler: remove the device-local OpenRouter key. */
export function handleApiKeyRemove(): string {
  clearOpenRouterKey();
  notifySettingsChanged({ apiKey: false });
  return 'API key removed from this device.';
}

// --- Sub-handler: username (Supabase profile) ---

export function validateUsernameInput(raw: string): string {
  const name = raw.trim();
  const parsed = profileSchema.shape.name.safeParse(name);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Name must be at least 2 characters.');
  }
  return parsed.data;
}

/**
 * Sub-handler: update the username in Supabase `profiles` + local cache.
 * Throws a user-friendly error on RLS/network failures.
 */
export async function handleUsernameUpdate(rawName: string): Promise<string> {
  const name = validateUsernameInput(rawName);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Session expired. Please log in again.');

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      name,
      email: user.email ?? null,
      onboarding_complete: true,
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    const msg = error.message ?? '';
    if (/row-level security|rls|permission|policy/i.test(msg)) {
      throw new Error('We could not save your name due to permissions. Please log in again and retry.');
    }
    if (/network|fetch|failed/i.test(msg)) {
      throw new Error('No internet connection. Check your network and try again.');
    }
    throw new Error(msg || 'Could not save your name. Please try again.');
  }

  try {
    const cached = window.localStorage.getItem(STORAGE_KEYS.profileCache);
    const parsed = cached ? (JSON.parse(cached) as Record<string, unknown>) : {};
    window.localStorage.setItem(
      STORAGE_KEYS.profileCache,
      JSON.stringify({ ...parsed, name, display_name: name })
    );
  } catch {
    // Profile cache is best-effort.
  }
  notifySettingsChanged({ username: name });
  return 'Username updated.';
}

// --- Sub-handler: Custom Instructions (local-only) ---

export function getCustomInstructionsValue(): string {
  try {
    return getCustomInstructions() ?? '';
  } catch {
    return '';
  }
}

export function validateCustomInstructionsInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const parsed = customInstructionsSchema.safeParse(trimmed);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        `Custom instructions must be under ${MAX_CUSTOM_INSTRUCTIONS_LENGTH} characters.`
    );
  }
  return parsed.data.trim();
}

/** Sub-handler: save Custom Instructions (device-local, injected into system prompt). */
export function handleCustomInstructionsSave(raw: string): string {
  const clean = validateCustomInstructionsInput(raw);
  if (!clean) {
    clearCustom();
    notifySettingsChanged({ customInstructions: '' });
    return 'Custom instructions cleared.';
  }
  persistCustom(clean);
  notifySettingsChanged({ customInstructions: clean });
  return 'Custom instructions saved on this device.';
}

/** Sub-handler: clear Custom Instructions. */
export function handleCustomInstructionsClear(): string {
  clearCustom();
  notifySettingsChanged({ customInstructions: '' });
  return 'Custom instructions cleared.';
}

// --- Sub-handler: log out + device cleanup ---

/**
 * Sub-handler: sign out and wipe device-held PII + chat history.
 * Safe on shared devices. Never touches other users' data.
 */
export async function handleLogout(): Promise<string> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Continue with local cleanup even if sign-out fails.
  }
  try {
    window.localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEYS.profileCache);
    clearOpenRouterKey();
    // Keep Custom Instructions? They are device preferences, but on logout
    // (shared device) the safest default is to keep them — they contain no
    // secrets. Callers that want a full wipe can call
    // handleCustomInstructionsClear() explicitly.
  } catch {
    // Best-effort cleanup.
  }
  notifySettingsChanged({ logout: true });
  return 'Logged out. Device key and chat history cleared.';
}
