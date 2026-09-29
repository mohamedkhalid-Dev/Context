'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, LogOut, SlidersHorizontal, User, X } from 'lucide-react';
import {
  getCustomInstructionsValue,
  handleApiKeyChange,
  handleApiKeyRemove,
  handleCustomInstructionsClear,
  handleCustomInstructionsSave,
  handleLogout,
  handleUsernameUpdate,
} from '@/lib/settingsHandlers';
import { getOpenRouterKey } from '@/lib/storage';
import { MAX_CUSTOM_INSTRUCTIONS_LENGTH } from '@/lib/validation';
import ErrorAlert from '@/components/ui/ErrorAlert';

export const OPEN_SETTINGS_EVENT = 'understoodchat:open-settings';

type SectionMsg = { ok?: string; err?: string };

/**
 * Chat-page Settings — one dialog, four sub-handlers.
 * - API key → handleApiKeyChange / handleApiKeyRemove (device-local only)
 * - Username → handleUsernameUpdate (Supabase profiles)
 * - Custom Instructions → handleCustomInstructionsSave / Clear (device-local)
 * - Log out → handleLogout (sign-out + wipe device data)
 */
export default function SettingsDialog({
  open,
  onClose,
  initialUsername,
}: {
  open: boolean;
  onClose: () => void;
  initialUsername?: string | null;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [username, setUsername] = useState(initialUsername ?? '');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState<'key' | 'name' | 'instructions' | 'logout' | null>(null);
  const [keyMsg, setKeyMsg] = useState<SectionMsg>({});
  const [nameMsg, setNameMsg] = useState<SectionMsg>({});
  const [instrMsg, setInstrMsg] = useState<SectionMsg>({});

  // Load current device values each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setKeyMsg({});
    setNameMsg({});
    setInstrMsg({});
    setBusy(null);
    setApiKey(getOpenRouterKey() ?? '');
    setHasKey(getOpenRouterKey() !== null);
    setUsername(initialUsername ?? '');
    setCustomFromStore();
  }, [open, initialUsername]);

  function setCustomFromStore() {
    setInstructions(getCustomInstructionsValue());
  }

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onSaveKey() {
    setKeyMsg({});
    setBusy('key');
    try {
      const msg = handleApiKeyChange(apiKey);
      setHasKey(true);
      setKeyMsg({ ok: msg });
    } catch (err) {
      setKeyMsg({ err: err instanceof Error ? err.message : 'Could not save the API key.' });
    } finally {
      setBusy(null);
    }
  }

  function onRemoveKey() {
    setKeyMsg({});
    try {
      const msg = handleApiKeyRemove();
      setApiKey('');
      setHasKey(false);
      setKeyMsg({ ok: msg });
    } catch (err) {
      setKeyMsg({ err: err instanceof Error ? err.message : 'Could not remove the API key.' });
    }
  }

  async function onSaveName() {
    setNameMsg({});
    setBusy('name');
    try {
      const msg = await handleUsernameUpdate(username);
      setNameMsg({ ok: msg });
    } catch (err) {
      setNameMsg({ err: err instanceof Error ? err.message : 'Could not save your name.' });
    } finally {
      setBusy(null);
    }
  }

  function onSaveInstructions() {
    setInstrMsg({});
    setBusy('instructions');
    try {
      const msg = handleCustomInstructionsSave(instructions);
      setInstructions(getCustomInstructionsValue());
      setInstrMsg({ ok: `${msg} They apply to your next message.` });
    } catch (err) {
      setInstrMsg({ err: err instanceof Error ? err.message : 'Could not save instructions.' });
    } finally {
      setBusy(null);
    }
  }

  function onClearInstructions() {
    setInstrMsg({});
    try {
      const msg = handleCustomInstructionsClear();
      setInstructions('');
      setInstrMsg({ ok: msg });
    } catch (err) {
      setInstrMsg({ err: err instanceof Error ? err.message : 'Could not clear instructions.' });
    }
  }

  async function onLogout() {
    setBusy('logout');
    try {
      await handleLogout();
    } finally {
      setBusy(null);
      onClose();
      router.push('/login');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chat settings"
    >
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-lg bg-white shadow-xl sm:rounded-lg">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Settings</h2>
            <p className="truncate text-xs text-neutral-500">
              API key · Username · Custom Instructions · Log out
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close settings"
            aria-label="Close settings"
            className="rounded-md p-1.5 hover:bg-neutral-100"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* 1 — OpenRouter API key (sub-handler: handleApiKeyChange) */}
          <section aria-labelledby="settings-api-key">
            <h3
              id="settings-api-key"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
            >
              <KeyRound size={14} aria-hidden="true" /> OpenRouter API key
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Stored on this device only, sent only to OpenRouter. Get one at{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-black underline underline-offset-2"
              >
                openrouter.ai/keys
              </a>
              . {hasKey ? 'A key is currently saved.' : 'No key saved yet.'}
            </p>
            {keyMsg.err && <div className="mt-2"><ErrorAlert message={keyMsg.err} /></div>}
            {keyMsg.ok && (
              <p role="status" className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
                {keyMsg.ok}
              </p>
            )}
            <label htmlFor="settings-api-key-input" className="sr-only">
              OpenRouter API key
            </label>
            <input
              id="settings-api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              autoComplete="off"
              spellCheck={false}
              className="mt-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm outline-none focus:border-black focus:bg-white"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onSaveKey}
                disabled={busy === 'key' || !apiKey.trim()}
                className="flex-1 rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-40"
              >
                {busy === 'key' ? 'Saving…' : 'Save key'}
              </button>
              {hasKey && (
                <button
                  type="button"
                  onClick={onRemoveKey}
                  disabled={busy === 'key'}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm hover:border-black disabled:opacity-40"
                >
                  Remove
                </button>
              )}
            </div>
          </section>

          {/* 2 — Username (sub-handler: handleUsernameUpdate) */}
          <section aria-labelledby="settings-username" className="border-t border-neutral-100 pt-4">
            <h3
              id="settings-username"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
            >
              <User size={14} aria-hidden="true" /> Username
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Shown in the sidebar and used to personalize replies. Saved to your Supabase profile.
            </p>
            {nameMsg.err && <div className="mt-2"><ErrorAlert message={nameMsg.err} /></div>}
            {nameMsg.ok && (
              <p role="status" className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
                {nameMsg.ok}
              </p>
            )}
            <label htmlFor="settings-username-input" className="sr-only">
              Username
            </label>
            <input
              id="settings-username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              maxLength={100}
              className="mt-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-black focus:bg-white"
            />
            <button
              type="button"
              onClick={onSaveName}
              disabled={busy === 'name' || !username.trim()}
              className="mt-2 w-full rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-40"
            >
              {busy === 'name' ? 'Saving…' : 'Save username'}
            </button>
          </section>

          {/* 3 — Custom Instructions (sub-handler: handleCustomInstructionsSave) */}
          <section aria-labelledby="settings-instructions" className="border-t border-neutral-100 pt-4">
            <h3
              id="settings-instructions"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
            >
              <SlidersHorizontal size={14} aria-hidden="true" /> Custom Instructions
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Always added to the system prompt — tone, language, verbosity. Stored on this device
              only. Example: “Always answer in French. Keep replies under 100 words.”
            </p>
            {instrMsg.err && <div className="mt-2"><ErrorAlert message={instrMsg.err} /></div>}
            {instrMsg.ok && (
              <p role="status" className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
                {instrMsg.ok}
              </p>
            )}
            <label htmlFor="settings-instructions-input" className="sr-only">
              Custom instructions
            </label>
            <textarea
              id="settings-instructions-input"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Explain like I'm 5. Always give code examples."
              rows={3}
              maxLength={MAX_CUSTOM_INSTRUCTIONS_LENGTH}
              className="mt-2 max-h-[160px] w-full resize-y rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-black focus:bg-white"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                {instructions.trim().length}/{MAX_CUSTOM_INSTRUCTIONS_LENGTH}
              </span>
              {instructions.trim() && (
                <button
                  type="button"
                  onClick={onClearInstructions}
                  className="text-[11px] text-neutral-500 underline underline-offset-2 hover:text-black"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onSaveInstructions}
              disabled={busy === 'instructions'}
              className="mt-2 w-full rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-40"
            >
              {busy === 'instructions' ? 'Saving…' : 'Save instructions'}
            </button>
          </section>

          {/* 4 — Log out (sub-handler: handleLogout) */}
          <section aria-labelledby="settings-logout" className="border-t border-neutral-100 pt-4">
            <h3
              id="settings-logout"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
            >
              <LogOut size={14} aria-hidden="true" /> Log out
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Signs you out and clears this device&apos;s key + chat history (safe on shared devices).
            </p>
            <button
              type="button"
              onClick={onLogout}
              disabled={busy === 'logout'}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm hover:border-black disabled:opacity-40"
            >
              <LogOut size={15} aria-hidden="true" /> {busy === 'logout' ? 'Logging out…' : 'Log out'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
