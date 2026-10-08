'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowRight, Brain, Cpu, PanelLeftOpen, RefreshCw, Settings, Square, X } from 'lucide-react';
import type { ClarifyingProfile } from '@/lib/clarifyingEngine';
import { extractClarifyingQuestions } from '@/lib/clarifyingEngine';
import type { Message } from '@/lib/types';
import MessageBubble from './MessageBubble';
import ClarifyingCard from './ClarifyingCard';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ApiKeyStatus from './ApiKeyStatus';
import ModelPicker from './ModelPicker';
import SettingsDialog, { OPEN_SETTINGS_EVENT } from './SettingsDialog';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { isModelSwitchRecommended, OPEN_MODEL_PICKER_EVENT } from '@/lib/chatApi';
import { TOGGLE_SIDEBAR_EVENT } from './Sidebar';
import { useChat } from '@/hooks/useChat';

const EXAMPLE_PROMPTS = [
  'Help me with my diet',
  'Plan a weekend trip on a tight budget',
  'Explain quantum computing simply',
];

export default function ChatWindow({
  conversationId,
  profile,
}: {
  conversationId?: string;
  profile?: ClarifyingProfile;
}) {
  const router = useRouter();
  const {
    messages,
    loading,
    streaming,
    error,
    clearError,
    sendMessage,
    regenerate,
    stop,
    copyMessage,
    clearChat,
    conversationId: activeId,
    hasKey,
  } = useChat(conversationId, profile);
  const scrollRef = useRef<HTMLDivElement>(null);
  const clarifyingRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Local dismissal for the clarifying card (per assistant message id).
  const [dismissedForId, setDismissedForId] = useState<string | null>(null);
  const busy = loading || streaming;
  const showSwitchModel = error ? isModelSwitchRecommended(error) : false;

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  function openModelPicker() {
    window.dispatchEvent(new CustomEvent(OPEN_MODEL_PICKER_EVENT));
  }

  function openSettings() {
    setSettingsOpen(true);
  }

  // Smart auto-scroll: stick to bottom only if already near bottom,
  // but always jump when the user sends a new message.
  const prevCountRef = useRef(messages.length);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    const last = messages[messages.length - 1];
    const force = grew && last?.role === 'user';
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (force || nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages, loading, streaming]);

  // Mobile keyboard: when visualViewport resizes (keyboard opens),
  // keep the scroll pinned so the latest message stays visible.
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const onResize = () => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  }

  function jumpToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }

  function handleNew() {
    clearChat();
    // clearChat creates a fresh local conversation; navigate to its URL.
    if (activeId) router.push(`/chat/${activeId}`);
    else router.push('/chat');
  }

  // Cap rendered bubbles for long histories (perf); show a note when capped.
  const RENDER_CAP = 100;
  const cappedCount = messages.length > RENDER_CAP ? messages.length - RENDER_CAP : 0;
  const visibleMessages = cappedCount > 0 ? messages.slice(-RENDER_CAP) : messages;
  const lastAssistant = [...messages].reverse().find((m: Message) => m.role === 'assistant');
  const lastMessage = messages[messages.length - 1];
  const hasUserMessage = messages.some((m) => m.role === 'user');
  // Only show the clarifying card for a settled (non-streaming) clarifying
  // reply that the user hasn't dismissed. `busy` covers both loading and
  // streaming, so the card never duplicates the in-progress bubble.
  const showClarifying =
    lastAssistant?.stage === 'clarifying' && !busy && dismissedForId !== lastAssistant.id;
  const clarifyingQuestionCount =
    showClarifying && lastAssistant
      ? extractClarifyingQuestions(lastAssistant.content).length
      : 0;

  // A new assistant reply clears a previous dismissal.
  useEffect(() => {
    setDismissedForId(null);
  }, [lastAssistant?.id]);

  // Scroll the card into view when it appears.
  useEffect(() => {
    if (showClarifying) {
      clarifyingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showClarifying]);

  // Esc dismisses the card without sending anything.
  useEffect(() => {
    if (!showClarifying || !lastAssistant) return;
    const id = lastAssistant.id;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDismissedForId(id);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showClarifying, lastAssistant]);

  function handleDismissClarifying() {
    if (lastAssistant) setDismissedForId(lastAssistant.id);
  }

  function handleJustAnswer() {
    sendMessage('Just answer with best guess');
  }
  // Show the spinner only while waiting for the first token; once streaming
  // content arrives the bubble itself shows a pulsing cursor.
  const awaitingFirstToken =
    loading && (!lastMessage || lastMessage.role === 'user' || lastMessage.content === '');

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-b border-neutral-200 bg-white px-4 py-3 pl-28 lg:pl-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(TOGGLE_SIDEBAR_EVENT))}
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
              className="shrink-0 rounded-md p-1.5 hover:bg-neutral-100"
            >
              <PanelLeftOpen size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display truncate text-sm font-semibold">Clarifying Chat</h2>
              <p className="truncate text-xs text-neutral-500">
                I ask specifics first — then answer precisely.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={openSettings}
              title="Open settings (API key, username, instructions, log out)"
              aria-label="Open settings"
              aria-haspopup="dialog"
              className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:border-black"
            >
              <span className="flex items-center gap-1">
                <Settings size={13} strokeWidth={1.75} aria-hidden="true" /> Settings
              </span>
            </button>
            {messages.length > 0 && (
              <>
                {busy ? (
                  <button
                    type="button"
                    onClick={stop}
                    title="Stop generating"
                    aria-label="Stop generating"
                    className="flex items-center gap-1 rounded-md bg-black px-2 py-1.5 text-xs text-white"
                  >
                    <Square size={13} strokeWidth={1.75} fill="currentColor" aria-hidden="true" /> Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={regenerate}
                    disabled={!hasUserMessage}
                    title="Regenerate last answer"
                    aria-label="Regenerate last answer"
                    className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:border-black disabled:opacity-40"
                  >
                    <RefreshCw size={13} strokeWidth={1.75} aria-hidden="true" /> Regenerate
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNew}
                  disabled={busy}
                  title="Start a new chat"
                  aria-label="Start a new chat"
                  className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:border-black disabled:opacity-40"
                >
                  New
                </button>
              </>
            )}
          </div>
        </div>
        {!hasKey && (
          <div className="mt-2">
            <ApiKeyStatus compact />
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-neutral-400">Model</span>
          <ModelPicker compact />
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-neutral-50">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full space-y-3 overflow-y-auto px-3 py-4 sm:px-4"
        >
          {messages.length === 0 && !loading && (
            <div className="mx-auto mt-6 w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-center sm:mt-10">
              <p className="font-display font-semibold">Try something vague</p>
              <p className="mt-1 text-sm text-neutral-500">
                e.g. “Help me with my diet” — I will ask goal, restrictions and budget before
                answering.
              </p>
              <div className="mt-4 flex flex-col gap-2" role="group" aria-label="Example prompts">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => sendMessage(ex)}
                    disabled={busy}
                    className="min-h-[44px] rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-sm hover:border-black disabled:opacity-40"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-neutral-400">
                History + API key stay in this browser only.
              </p>
            </div>
          )}
          {cappedCount > 0 && (
            <p className="mx-auto w-fit rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] text-neutral-500">
              Showing last {RENDER_CAP} of {messages.length} messages
            </p>
          )}
          {visibleMessages.map((m: Message, idx) => (
            <MessageBubble
              key={m.id}
              message={m}
              onCopy={copyMessage}
              streaming={Boolean(streaming && loading && idx === visibleMessages.length - 1 && m.role === 'assistant')}
            />
          ))}
          {awaitingFirstToken && <TypingIndicator />}
          {showClarifying && lastAssistant && (
            <div
              ref={clarifyingRef}
              tabIndex={-1}
              aria-live="polite"
              aria-label="Clarifying questions — your input needed"
              className="clarifying-enter mx-auto w-full max-w-2xl space-y-3 outline-none"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-black">
                  <Brain size={13} strokeWidth={1.75} aria-hidden="true" />
                  {clarifyingQuestionCount > 0
                    ? `Needs your input \u2022 ${clarifyingQuestionCount} question${clarifyingQuestionCount === 1 ? '' : 's'}`
                    : 'Needs your input'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDismissClarifying}
                    title="Dismiss clarifying questions (Esc)"
                    aria-label="Dismiss clarifying questions"
                    className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs hover:border-black"
                  >
                    <X size={13} strokeWidth={1.75} aria-hidden="true" /> Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={handleJustAnswer}
                    title="Skip the questions and answer with best guess"
                    aria-label="Just answer with best guess"
                    className="flex items-center gap-1 rounded-md bg-black px-2 py-1.5 text-xs text-white"
                  >
                    <ArrowRight size={13} strokeWidth={1.75} aria-hidden="true" /> Just answer
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white shadow-sm transition-colors focus-within:border-black [&>section]:rounded-xl [&>section]:border-0 [&>section]:bg-transparent [&>section]:shadow-none max-sm:[&_form]:flex-col max-sm:[&_form]:items-stretch max-sm:[&_form>button]:justify-center">
                <ClarifyingCard
                  content={lastAssistant.content}
                  onAnswer={sendMessage}
                  disabled={busy}
                />
              </div>
            </div>
          )}
        </div>
        {showJump && (
          <button
            type="button"
            onClick={jumpToBottom}
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-neutral-200 bg-white p-2 shadow-sm hover:border-black"
          >
            <ArrowDown size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className="sticky bottom-0 border-t border-neutral-200 bg-white p-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {error && (
          <div className="mx-auto mb-2 w-full max-w-2xl">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ErrorAlert message={error} onDismiss={clearError} />
              </div>
              {hasUserMessage && (
                <button
                  type="button"
                  onClick={regenerate}
                  disabled={busy}
                  title="Retry last message"
                  aria-label="Retry last message"
                  className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:border-black disabled:opacity-40"
                >
                  <RefreshCw size={13} strokeWidth={1.75} aria-hidden="true" /> Retry
                </button>
              )}
            </div>
            {showSwitchModel && (
              <div className="mb-4 flex flex-wrap items-center gap-2 pl-0.5">
                <button
                  type="button"
                  onClick={openModelPicker}
                  className="flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs text-white"
                  title="Open the model picker and choose a different model"
                  aria-label="Switch model"
                >
                  <Cpu size={13} strokeWidth={1.75} aria-hidden="true" /> Switch model
                </button>
                <button
                  type="button"
                  onClick={openSettings}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs hover:border-black"
                  title="Check your OpenRouter API key in Settings"
                  aria-label="Check API key in settings"
                >
                  Check API key
                </button>
              </div>
            )}
          </div>
        )}
        <div className="mx-auto w-full max-w-2xl">
          <ChatInput onSend={sendMessage} onStop={stop} disabled={busy} streaming={streaming} />
          <p className="mt-1.5 text-center text-[11px] text-neutral-400">
            Press Enter to send · Shift+Enter for newline · Attach images or files with the paperclip (or drag &amp; drop, paste)
          </p>
        </div>
      </div>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialUsername={profile?.name ?? profile?.display_name ?? null}
      />
    </div>
  );
}
