'use client';

import type { Attachment } from './types';
import type { ClarifyingProfile } from './clarifyingEngine';
import {
  IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
  isImageGenerationRequest,
  toOpenRouterMessages,
} from './clarifyingEngine';
import { getCustomInstructions, getOpenRouterKey } from './storage';
import { getSelectedModelId } from './openRouterModels';

/**
 * Direct-to-OpenRouter chat client — local-first.
 *
 * - Supabase stores ONLY profiles(name, age, email).
 * - OpenRouter key lives ONLY in browser localStorage
 *   (`understoodchat:openrouter_key`), read here and sent ONLY to
 *   `https://openrouter.ai/api/v1/chat/completions` over HTTPS.
 * - History lives ONLY in localStorage (see lib/storage.ts).
 * - Laravel `POST /api/chat` remains an OPTIONAL disabled fallback only.
 */

export const MISSING_KEY_ERROR =
  'No OpenRouter API key found. Please add one in Settings → API key.';

export const OPEN_MODEL_PICKER_EVENT = 'understoodchat:open-model-picker';

/** Heuristic: does this error message warrant offering a "Switch model" action? */
export function isModelSwitchRecommended(message: string): boolean {
  if (!message) return false;
  return /switch models|no endpoints|rate.?limit|overloaded|failed to respond|empty response|unavailable|provider error|try a different model/i.test(
    message
  );
}

function isFreeModel(modelId: string): boolean {
  return /:free$/i.test(modelId.trim()) || /free/i.test(modelId.trim());
}

export type ChatRoleMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** User attachments: images are sent as vision parts, other files as context text. */
  attachments?: Attachment[];
};

export type StreamChatOptions = {
  onToken?: (fullText: string) => void;
  signal?: AbortSignal;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function model(): string {
  // Dynamic choice: ModelPicker persists to localStorage; env is the default.
  try {
    return getSelectedModelId();
  } catch {
    return process.env.NEXT_PUBLIC_OPENROUTER_MODEL || 'openrouter/auto';
  }
}

function extractProviderMessage(body: string): string {
  const raw = (body || '').trim();
  if (!raw) return '';
  // OpenRouter errors are usually { error: { message, code } }.
  try {
    const json = JSON.parse(raw) as {
      error?: { message?: unknown; code?: unknown };
      message?: unknown;
    };
    const msg =
      (typeof json?.error?.message === 'string' && json.error.message) ||
      (typeof json?.message === 'string' && json.message) ||
      '';
    if (msg) return msg.slice(0, 300);
  } catch {
    // Not JSON — fall through to raw snippet.
  }
  // Strip HTML tags from gateway error pages, collapse whitespace.
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function switchHint(modelId: string): string {
  return `Please switch models using the Model picker and try again (current: ${modelId}).`;
}

function friendlyOpenRouterError(status: number, body: string, modelId: string): string {
  const providerMsg = extractProviderMessage(body);
  const text = `${status} ${providerMsg} ${body || ''}`.toLowerCase();
  const modelLabel = `The model “${modelId}”`;
  const freeNote = isFreeModel(modelId)
    ? ' Free models go offline, rate-limit aggressively, and lose providers without notice.'
    : '';

  if (status === 401 || status === 403 || /invalid.*key|unauthorized|user not found/i.test(text)) {
    return 'Invalid OpenRouter key. Check it in Settings → API key and try again.';
  }
  if (status === 402 || /credits|payment|requires more credits/i.test(text)) {
    return (
      `OpenRouter refused the request: out of credits (402).${providerMsg ? ` Details: ${providerMsg}.` : ''} ` +
      `Top up at openrouter.ai/credits or switch to a free model. ${switchHint(modelId)}`
    );
  }
  if (
    status === 404 ||
    /no endpoints|model not found|does not exist|no available provider/i.test(text)
  ) {
    return (
      `${modelLabel} is unavailable (error ${status || '404'}: ${providerMsg || 'no active endpoints'}).` +
      ` It may have been removed or has no healthy providers right now — common with free models.${freeNote} ${switchHint(modelId)}`
    );
  }
  if (status === 429 || /rate.?limit|rate.?limited|quota/i.test(text)) {
    return (
      `${modelLabel} is rate-limited (429).${freeNote || ' Free-tier models are heavily rate-limited.'}` +
      `${providerMsg ? ` Details: ${providerMsg}.` : ''} Wait 30s and retry, or switch models. ${switchHint(modelId)}`
    );
  }
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    /overloaded|overload|provider error|temporarily|timeout|timed out|bad gateway|service unavailable/i.test(
      text
    )
  ) {
    return (
      `${modelLabel} failed to respond (error ${status || 'provider'}: ${providerMsg || 'provider error'}).` +
      `${freeNote} This usually clears on retry with a different model. ${switchHint(modelId)}`
    );
  }
  if (status === 400 || /invalid.*model|context length|tool_choice|unsupported/i.test(text)) {
    return (
      `${modelLabel} rejected the request (400: ${providerMsg || 'bad request'}). ` +
      `${switchHint(modelId)}`
    );
  }
  if (providerMsg) return `OpenRouter error ${status}: ${providerMsg}. ${switchHint(modelId)}`;
  return `OpenRouter error ${status || 'unknown'}. ${switchHint(modelId)}`;
}

export function emptyResponseError(modelId: string): string {
  return (
    `The model “${modelId}” returned an empty response. ` +
    `Free models do this when overloaded or out of capacity. Please switch models using the Model picker and try again.`
  );
}

/** Normalize any thrown error to user-friendly copies. */
export function getFriendlyErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
  // Preserve explicit model-failure messages verbatim — they already name
  // the model and prompt a switch. Never collapse them to a generic copy.
  if (isModelSwitchRecommended(raw)) return raw;
  if (/invalid.*openrouter|invalid.*key|401|402/i.test(raw)) {
    if (/session expired/i.test(raw)) return 'Session expired. Please log in again.';
    if (/no openrouter api key found/i.test(raw)) return raw;
    return 'Invalid OpenRouter key. Check it in Settings → API key and try again.';
  }
  if (/429|rate.?limit/i.test(raw)) {
    return `${raw} Wait 30s and retry, or switch models using the Model picker.`;
  }
  if (/no internet|network|failed to fetch|offline/i.test(raw)) {
    return 'No internet connection. Check your network and try again.';
  }
  return raw;
}

function requireKey(): string {
  const key = getOpenRouterKey();
  if (!key) throw new Error(MISSING_KEY_ERROR);
  return key;
}

/** Merge device-local Custom Instructions into the outgoing profile. */
function withCustomInstructions(profile?: ClarifyingProfile): ClarifyingProfile | undefined {
  try {
    const local = getCustomInstructions();
    if (!local) return profile;
    if (profile?.customInstructions) return profile;
    return { ...(profile ?? {}), customInstructions: local };
  } catch {
    return profile;
  }
}

/**
 * Image-generation guard: text-only assistant, no image models.
 * Returns the unavailable message when the latest user message requests
 * image generation, so callers can short-circuit before any network call.
 */
function imageGenerationBlockMessage(messages: ChatRoleMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    if (isImageGenerationRequest(m.content || '')) return IMAGE_GENERATION_UNAVAILABLE_MESSAGE;
    // Only inspect the latest user turn — earlier turns must not block
    // a follow-up text question.
    break;
  }
  return null;
}

export async function sendChatMessage(
  messages: ChatRoleMessage[],
  conversationId?: string,
  profile?: ClarifyingProfile
): Promise<string> {
  void conversationId; // Local-only id, not sent to OpenRouter.
  const blocked = imageGenerationBlockMessage(messages);
  if (blocked) return blocked;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('No internet connection. Check your network and try again.');
  }
  const apiKey = requireKey();
  const modelId = model();
  const effectiveProfile = withCustomInstructions(profile);
  const payload = {
    model: modelId,
    messages: toOpenRouterMessages(messages, effectiveProfile),
  };

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'Context',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('No internet connection. Check your network and try again.');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(friendlyOpenRouterError(res.status, body, modelId));
  }

  const json = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    // OpenRouter may surface provider errors as 200 + { error: ... }.
    error?: { message?: string; code?: number | string };
  } | null;
  if (json?.error?.message) {
    const code =
      typeof json.error.code === 'number' ? json.error.code : 502;
    throw new Error(
      friendlyOpenRouterError(code, json.error.message, modelId)
    );
  }
  const reply = json?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error(emptyResponseError(modelId));
  }
  return reply;
}

/**
 * Streaming chat with <2s first-token target.
 * Calls OpenRouter with `stream: true` and forwards SSE tokens via `onToken`.
 * Falls back to non-streaming JSON if SSE is unavailable.
 */
export async function streamChatMessage(
  messages: ChatRoleMessage[],
  conversationId?: string,
  options?: StreamChatOptions & { profile?: ClarifyingProfile }
): Promise<string> {
  void conversationId;
  const blocked = imageGenerationBlockMessage(messages);
  if (blocked) {
    options?.onToken?.(blocked);
    return blocked;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('No internet connection. Check your network and try again.');
  }
  const apiKey = requireKey();
  const modelId = model();
  const profile = withCustomInstructions(
    (options as { profile?: ClarifyingProfile } | undefined)?.profile
  );

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/event-stream, application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'Context',
      },
      body: JSON.stringify({
        model: modelId,
        messages: toOpenRouterMessages(messages, profile),
        stream: true,
      }),
      signal: options?.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new Error('No internet connection. Check your network and try again.');
  }

  const contentType = res.headers.get('content-type') ?? '';

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(friendlyOpenRouterError(res.status, body, modelId));
  }

  // Non-streaming JSON fallback.
  if (contentType.includes('application/json') || !res.body) {
    const json = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
      reply?: string;
      text?: string;
      error?: { message?: string; code?: number | string };
    } | null;
    if (json?.error?.message) {
      const code =
        typeof json.error.code === 'number' ? json.error.code : 502;
      throw new Error(friendlyOpenRouterError(code, json.error.message, modelId));
    }
    const reply = (json?.choices?.[0]?.message?.content ?? json?.reply ?? json?.text ?? '').trim();
    if (!reply) {
      throw new Error(emptyResponseError(modelId));
    }
    options?.onToken?.(reply);
    return reply;
  }

  // SSE streaming path.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let streamError: string | null = null;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string }; message?: { content?: string } }[];
            error?: { message?: string; code?: number | string };
          };
          if (json?.error?.message) {
            streamError = json.error.message;
            continue;
          }
          const chunk =
            json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
          if (chunk) {
            full += chunk;
            options?.onToken?.(full);
          }
        } catch {
          // Ignore partial JSON frames.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (streamError) {
    throw new Error(friendlyOpenRouterError(502, streamError, modelId));
  }

  const reply = full.trim();
  if (!reply) {
    throw new Error(emptyResponseError(modelId));
  }
  return reply;
}
