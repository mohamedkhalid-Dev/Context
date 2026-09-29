'use client';

import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { getOpenRouterKey } from '@/lib/storage';
import { OPEN_SETTINGS_EVENT } from './SettingsDialog';

/**
 * Device-local key indicator.
 * The OpenRouter key lives ONLY in browser localStorage
 * (`understoodchat:openrouter_key`) — never in Supabase.
 * History is also device-local (`understoodchat:conversations`).
 */
export default function ApiKeyStatus({ compact = false }: { compact?: boolean }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const refresh = () => setHasKey(getOpenRouterKey() !== null);
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('understoodchat:settings-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('understoodchat:settings-changed', refresh);
    };
  }, []);

  function openSettings() {
    window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
  }

  return (
    <div
      role="status"
      className={
        compact
          ? 'flex items-center gap-1.5 text-xs text-neutral-600'
          : 'flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-xs text-neutral-700'
      }
    >
      {hasKey ? (
        <ShieldCheck size={14} className="shrink-0 text-black" aria-hidden="true" />
      ) : (
        <KeyRound size={14} className="shrink-0 text-black" aria-hidden="true" />
      )}
      <span>{hasKey === false ? 'No device key — add one' : hasKey ? 'Key stored on this device' : 'Checking device key…'}</span>
      {!compact ? (
        <button
          type="button"
          onClick={openSettings}
          aria-haspopup="dialog"
          className="ml-auto font-medium text-black underline underline-offset-2"
        >
          Manage
        </button>
      ) : (
        <button
          type="button"
          onClick={openSettings}
          aria-haspopup="dialog"
          aria-label="Add API key in settings"
          title="Add API key in settings"
          className="ml-1 font-medium text-black underline underline-offset-2"
        >
          Add
        </button>
      )}
    </div>
  );
}
