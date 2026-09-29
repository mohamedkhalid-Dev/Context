'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Cpu, RefreshCw, Search, X } from 'lucide-react';
import {
  MODEL_CHANGED_EVENT,
  fetchOpenRouterModels,
  filterModels,
  formatContext,
  formatPricePerMillion,
  getDefaultModelId,
  getSelectedModelId,
  setSelectedModelId,
  shortModelLabel,
  type OpenRouterModel,
} from '@/lib/openRouterModels';

/**
 * Dynamic Model Picker — fetches the live list from OpenRouter's public
 * `GET /api/v1/models` endpoint when opened (no API key needed, no
 * hard-coded model names). The choice persists locally and is read by
 * `chatApi.ts` at send-time.
 */
export default function ModelPicker({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selected, setSelected] = useState<string>(() => getSelectedModelId());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keep the button label in sync when the model changes elsewhere.
  useEffect(() => {
    const sync = () => setSelected(getSelectedModelId());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(MODEL_CHANGED_EVENT, sync as EventListener);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(MODEL_CHANGED_EVENT, sync as EventListener);
      window.removeEventListener('focus', sync);
    };
  }, []);

  // Allow error UIs to deep-link here: dispatching
  // `understoodchat:open-model-picker` opens the picker (e.g. after a
  // free-model failure: "The model X failed — please switch models").
  useEffect(() => {
    const open = () => handleOpen();
    window.addEventListener('understoodchat:open-model-picker', open);
    return () => window.removeEventListener('understoodchat:open-model-picker', open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open ]);

  async function load(forceRefresh = false) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchOpenRouterModels({ signal: controller.signal, forceRefresh });
      setModels(list);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Could not load the model list.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    setQuery('');
    // Fetch live on every open (uses 24h cache when fresh).
    void load(false);
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function handleClose() {
    abortRef.current?.abort();
    setOpen(false);
  }

  function handleSelect(id: string) {
    setSelectedModelId(id);
    setSelected(id);
    handleClose();
  }

  const filtered = filterModels(models, query);
  const defaultId = getDefaultModelId();
  const selectedModel = models.find((m) => m.id === selected);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title={`Model: ${selected} — click to change`}
        aria-label={`Current model ${selected}. Change model`}
        aria-haspopup="dialog"
        className={
          compact
            ? 'flex max-w-[220px] items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs hover:border-black'
            : 'flex w-full items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-xs text-neutral-700 hover:border-black'
        }
      >
        <Cpu size={14} className="shrink-0 text-black" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left" title={selected}>
          {shortModelLabel(selected)}
        </span>
        <ChevronDown size={14} className="shrink-0 text-neutral-400" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose an OpenRouter model"
        >
          <button
            type="button"
            aria-label="Close model picker"
            onClick={handleClose}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg bg-white shadow-xl sm:rounded-lg">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
              <Cpu size={16} className="shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">Choose a model</h2>
                <p className="truncate text-xs text-neutral-500">
                  Live list from OpenRouter · {models.length > 0 ? `${models.length} available` : 'fetching…'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={loading}
                title="Refresh model list"
                aria-label="Refresh model list"
                className="rounded-md p-1.5 hover:bg-neutral-100 disabled:opacity-40"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                title="Close"
                aria-label="Close model picker"
                className="rounded-md p-1.5 hover:bg-neutral-100"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-neutral-200 px-4 py-2">
              <div className="relative">
                <Search
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search models… (e.g. claude, llama, gpt)"
                  aria-label="Search models"
                  autoComplete="off"
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-8 text-sm outline-none focus:border-black focus:bg-white"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-black"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 truncate text-[11px] text-neutral-400">
                Current: <span className="font-mono text-neutral-600">{selected}</span>
                {selectedModel?.context_length ? ` · ${formatContext(selectedModel.context_length)} context` : ''}
              </p>
            </div>

            <div className="min-h-[200px] flex-1 overflow-y-auto px-2 py-2">
              {loading && models.length === 0 && (
                <div className="space-y-2 px-2 py-3" aria-busy="true" aria-label="Loading models">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-md bg-neutral-100" />
                  ))}
                  <p className="pt-1 text-center text-xs text-neutral-500">Fetching live models from OpenRouter…</p>
                </div>
              )}

              {error && models.length === 0 && !loading && (
                <div className="px-2 py-6 text-center">
                  <p className="text-sm font-medium">Couldn&apos;t load models</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs text-neutral-500">{error}</p>
                  <button
                    type="button"
                    onClick={() => void load(true)}
                    className="mt-3 rounded-md bg-black px-3 py-1.5 text-xs text-white"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && filtered.length === 0 && models.length > 0 && (
                <p className="px-2 py-6 text-center text-sm text-neutral-500">
                  No models match “{query.trim()}”. Try another search.
                </p>
              )}

              {filtered.length > 0 && (
                <ul className="space-y-1" aria-label="Available models">
                  {/* Pinned Auto option — always available even if the API omits it. */}
                  {(!query || 'openrouter/auto'.includes(query.trim().toLowerCase()) || 'auto'.includes(query.trim().toLowerCase())) && (
                    <li key={defaultId}>
                      <ModelRow
                        id={defaultId}
                        name="Auto (recommended)"
                        hint="Let OpenRouter pick the best model for each prompt"
                        active={selected === defaultId}
                        onSelect={handleSelect}
                      />
                    </li>
                  )}
                  {filtered.slice(0, 200).map((m) => {
                    const promptPrice = formatPricePerMillion(m.pricing?.prompt);
                    const ctx = formatContext(m.context_length ?? m.top_provider?.context_length);
                    const hintParts: string[] = [];
                    if (ctx) hintParts.push(`${ctx} ctx`);
                    if (promptPrice) hintParts.push(promptPrice === 'Free' ? 'Free' : `${promptPrice} in`);
                    return (
                      <li key={m.id}>
                        <ModelRow
                          id={m.id}
                          name={m.name}
                          hint={hintParts.join(' · ') || m.id}
                          active={selected === m.id}
                          onSelect={handleSelect}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              {filtered.length > 200 && (
                <p className="px-2 py-2 text-center text-[11px] text-neutral-400">
                  Showing first 200 of {filtered.length} — refine your search.
                </p>
              )}
            </div>

            <div className="border-t border-neutral-200 px-4 py-2">
              <p className="text-[11px] text-neutral-400">
                Source: <span className="font-mono">GET openrouter.ai/api/v1/models</span> (public, no key needed).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModelRow({
  id,
  name,
  hint,
  active,
  onSelect,
}: {
  id: string;
  name: string;
  hint: string;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={active ? 'true' : undefined}
      title={id}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-neutral-50 ${
        active ? 'bg-neutral-100 font-medium' : ''
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{name}</span>
        <span className="block truncate font-mono text-[11px] font-normal text-neutral-500" title={id}>
          {id} {hint && hint !== id ? `· ${hint}` : ''}
        </span>
      </span>
      {active && <Check size={15} className="shrink-0" aria-label="Selected" />}
    </button>
  );
}
