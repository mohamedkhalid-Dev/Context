'use client';

/**
 * Dynamic OpenRouter Model List — single source of truth.
 *
 * Uses the public Models API (`GET https://openrouter.ai/api/v1/models`,
 * no API key required) so the app never hard-codes model names. Models are
 * added/removed constantly — the picker fetches the live list when opened
 * instead of maintaining a static list in code.
 *
 * - Selected model persists in localStorage (`understoodchat:openrouter_model`).
 * - List response is cached in localStorage for 24h to stay fast + offline-friendly.
 * - `chatApi.ts` reads `getSelectedModelId()` at send-time, so picking a new
 *   model applies to the next message with no reload.
 */

export type OpenRouterModel = {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  top_provider?: { context_length?: number; max_completion_tokens?: number | null };
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] };
  per_request_limits?: Record<string, unknown> | null;
  supported_parameters?: string[];
};

export const MODELS_API_URL = 'https://openrouter.ai/api/v1/models';
export const MODEL_STORAGE_KEY = 'understoodchat:openrouter_model';
export const MODELS_CACHE_KEY = 'understoodchat:openrouter_models_cache';
export const MODELS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const MODEL_CHANGED_EVENT = 'understoodchat:model-changed';

export function getDefaultModelId(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_OPENROUTER_MODEL) {
    return process.env.NEXT_PUBLIC_OPENROUTER_MODEL;
  }
  return 'openrouter/auto';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Currently selected model id (localStorage → env default). */
export function getSelectedModelId(): string {
  if (isBrowser()) {
    try {
      const saved = window.localStorage.getItem(MODEL_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch {
      // Ignore — fall through to default.
    }
  }
  return getDefaultModelId();
}

/** Persist the user's model choice and notify listeners (chat header, etc.). */
export function setSelectedModelId(id: string): void {
  if (!isBrowser() || !id) return;
  try {
    window.localStorage.setItem(MODEL_STORAGE_KEY, id.trim());
    window.dispatchEvent(new CustomEvent(MODEL_CHANGED_EVENT, { detail: { id: id.trim() } }));
  } catch {
    // Storage unavailable — selection simply won't persist.
  }
}

type CachedModels = { fetchedAt: number; models: OpenRouterModel[] };

function readCache(): CachedModels | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(MODELS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedModels;
    if (!parsed || !Array.isArray(parsed.models) || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(models: OpenRouterModel[]): void {
  if (!isBrowser()) return;
  try {
    const payload: CachedModels = { fetchedAt: Date.now(), models };
    window.localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Best-effort cache.
  }
}

function normalizeModels(data: unknown): OpenRouterModel[] {
  const list = (data as { data?: unknown })?.data;
  if (!Array.isArray(list)) return [];
  return list
    .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
    .map((m) => ({
      id: String(m.id ?? ''),
      name: String(m.name ?? m.id ?? 'Unnamed model'),
      description: typeof m.description === 'string' ? m.description : undefined,
      context_length: typeof m.context_length === 'number' ? m.context_length : undefined,
      pricing: (m.pricing as OpenRouterModel['pricing']) ?? undefined,
      top_provider: (m.top_provider as OpenRouterModel['top_provider']) ?? undefined,
      architecture: (m.architecture as OpenRouterModel['architecture']) ?? undefined,
    }))
    .filter((m) => Boolean(m.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Fetch the live model list from OpenRouter.
 * - Returns the 24h cache immediately when fresh (unless `forceRefresh`).
 * - Falls back to stale cache when offline / API fails.
 * - Throws a user-friendly error when nothing is available.
 */
export async function fetchOpenRouterModels(
  opts?: { signal?: AbortSignal; forceRefresh?: boolean }
): Promise<OpenRouterModel[]> {
  const cached = readCache();
  const fresh = cached && Date.now() - cached.fetchedAt < MODELS_CACHE_TTL_MS;

  if (cached && fresh && !opts?.forceRefresh) return cached.models;

  let res: Response;
  try {
    res = await fetch(MODELS_API_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: opts?.signal,
    });
  } catch (err: unknown) {
    if (cached) return cached.models; // Offline — use stale list.
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new Error('No internet connection. Check your network and try again.');
  }

  if (!res.ok) {
    if (cached) return cached.models;
    if (res.status === 429) throw new Error('Rate limit — try again in 30s.');
    throw new Error('Could not load the model list. Check your connection and try again.');
  }

  const json = (await res.json().catch(() => null)) as { data?: unknown } | null;
  const models = normalizeModels(json);
  if (models.length === 0) {
    if (cached) return cached.models;
    throw new Error('The model list came back empty. Please try again.');
  }
  writeCache(models);
  return models;
}

/** Case-insensitive filter by id or name. */
export function filterModels(models: OpenRouterModel[], query: string): OpenRouterModel[] {
  const q = query.trim().toLowerCase();
  if (!q) return models;
  return models.filter(
    (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
  );
}

/** "$x.xx / 1M tokens" helper — OpenRouter prices are per-token strings. */
export function formatPricePerMillion(price?: string): string | null {
  if (price == null || price === '') return null;
  const n = Number(price);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return 'Free';
  return `$${(n * 1_000_000).toFixed(2)}/1M`;
}

export function formatContext(n?: number): string | null {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return null;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

/** Short label for the picker button, e.g. "claude-sonnet-4". */
export function shortModelLabel(id: string): string {
  if (!id) return 'Select model';
  const parts = id.split('/');
  return parts[parts.length - 1] || id;
}
