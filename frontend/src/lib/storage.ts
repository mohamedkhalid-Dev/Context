'use client';

import DOMPurify from 'dompurify';
import type { Attachment, Message } from './types';
import { MAX_TEXT_PREVIEW_CHARS } from './validation';

/**
 * Browser storage for Context — local-first privacy.
 *
 * ARCHITECTURE (enforced):
 * - Supabase stores ONLY `public.profiles(user_id, name, age, email,
 *   onboarding_complete)` — see supabase/migrations 001.
 * - OpenRouter API key lives ONLY in browser localStorage
 *   (`understoodchat:openrouter_key`) and is sent ONLY to OpenRouter
 *   over HTTPS — never to Supabase or Laravel, never logged.
 * - Conversation history lives ONLY in browser localStorage
 *   (`understoodchat:conversations` + `understoodchat:active_conversation`).
 *
 * Keys:
 * - `understoodchat:openrouter_key`       -> OpenRouter API key (string, sk-or-...)
 * - `understoodchat:conversations`       -> StoredConversation[]
 * - `understoodchat:active_conversation` -> active conversation id (string)
 */

export const OPENROUTER_KEY_STORAGE_KEY = 'understoodchat:openrouter_key';
export const CONVERSATIONS_STORAGE_KEY = 'understoodchat:conversations';
export const ACTIVE_CONVERSATION_STORAGE_KEY = 'understoodchat:active_conversation';
export const CUSTOM_INSTRUCTIONS_STORAGE_KEY = 'understoodchat:custom_instructions';
export const CUSTOM_INSTRUCTIONS_CHANGED_EVENT = 'understoodchat:custom-instructions-changed';

export type StoredConversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** XSS strip applied before persisting and before render.
 * Primary: DOMPurify (browser) with no allowed tags/attrs — output is plain
 * text, never HTML. Fallback: regex strip for SSR / if DOMPurify throws.
 * Drops script/iframe/object/embed/link/style tags, inline event handlers
 * (on* attributes) and javascript:/data:text/html URIs. Render stays plain
 * text (whitespace-pre-wrap, no dangerouslySetInnerHTML). If markdown
 * rendering is added later, pass HTML through DOMPurify with an explicit
 * allowlist first. */
export function sanitizeContent(content: string): string {
  if (!content) return content;
  if (typeof window !== 'undefined') {
    try {
      const clean = DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
      return fallbackStrip(typeof clean === 'string' ? clean : String(clean));
    } catch {
      // Fall through to regex fallback below.
    }
  }
  return fallbackStrip(content);
}

function fallbackStrip(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style[\s\S]*?<\/style\s*>/gi, '')
    .replace(
      /<\/?(svg|math|iframe|object|embed|link|style|base|form|button|input|textarea|select|option|meta|details|audio|video|source|track|div|span|a)[^>]*>/gi,
      ''
    )
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/data\s*:\s*image\/svg\+xml/gi, '');
}

function sanitizeMessages(messages: Message[]): Message[] {
  return messages.map((m) => ({
    ...m,
    content: sanitizeContent(m.content),
    attachments: sanitizeAttachments(m.attachments),
  }));
}

/** Keep attachment metadata + payloads safe for localStorage.
 *  `dataUrl` is machine-generated (FileReader/canvas) — keep it only when it
 *  is a genuine image data URL; drop anything else. */
function sanitizeAttachments(attachments?: Attachment[]): Attachment[] | undefined {
  if (!attachments || attachments.length === 0) return undefined;
  return attachments.slice(0, 4).map((a) => ({
    id: typeof a.id === 'string' ? a.id.slice(0, 80) : '',
    name: sanitizeContent(a.name || 'file').slice(0, 80) || 'file',
    mime: typeof a.mime === 'string' ? a.mime.slice(0, 100) : 'application/octet-stream',
    size: Number.isFinite(a.size) && a.size >= 0 ? Math.floor(a.size) : 0,
    kind: a.kind === 'image' || a.kind === 'text' ? a.kind : 'file',
    dataUrl:
      a.kind === 'image' && typeof a.dataUrl === 'string' && a.dataUrl.startsWith('data:image/')
        ? a.dataUrl
        : undefined,
    textContent:
      a.kind === 'text' && typeof a.textContent === 'string'
        ? sanitizeContent(a.textContent).slice(0, MAX_TEXT_PREVIEW_CHARS)
        : undefined,
  }));
}

/** Attachments without heavy payloads — used as a quota fallback so history
 *  itself is never lost when image data URLs exceed localStorage limits. */
function stripAttachmentPayloads(attachments?: Attachment[]): Attachment[] | undefined {
  if (!attachments || attachments.length === 0) return undefined;
  return attachments.map((a) => ({ ...a, dataUrl: undefined }));
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// --- OpenRouter key (local-only, primary storage).
// Lives ONLY in browser localStorage, sent ONLY to OpenRouter over HTTPS.
// Never write it to Supabase, Laravel, or logs.

export function getOpenRouterKey(): string | null {
  if (!isBrowser()) return null;
  try {
    const key = window.localStorage.getItem(OPENROUTER_KEY_STORAGE_KEY);
    return key && key.trim() ? key : null;
  } catch {
    return null;
  }
}

export function setOpenRouterKey(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(OPENROUTER_KEY_STORAGE_KEY, key.trim());
  } catch {
    // Storage full or unavailable — key simply won't persist.
  }
}

export function clearOpenRouterKey(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(OPENROUTER_KEY_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

// --- Custom Instructions (local-only, sent as part of the system prompt) ---
// Free-form user preferences, e.g. "Always answer in French" or
// "Explain like I'm 5". Stored ONLY in browser localStorage, never in
// Supabase. Injected into the clarifying system prompt (see
// lib/clarifyingEngine.ts). Sanitized + capped to avoid prompt bloat.

export const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 1000;

export function getCustomInstructions(): string | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CUSTOM_INSTRUCTIONS_STORAGE_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

export function setCustomInstructions(instructions: string): void {
  if (!isBrowser()) return;
  try {
    const clean = sanitizeContent(instructions.trim()).slice(0, MAX_CUSTOM_INSTRUCTIONS_LENGTH);
    if (!clean) {
      window.localStorage.removeItem(CUSTOM_INSTRUCTIONS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(CUSTOM_INSTRUCTIONS_STORAGE_KEY, clean);
    }
    window.dispatchEvent(
      new CustomEvent(CUSTOM_INSTRUCTIONS_CHANGED_EVENT, { detail: { instructions: clean } })
    );
  } catch {
    // Storage unavailable — instructions simply won't persist.
  }
}

export function clearCustomInstructions(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CUSTOM_INSTRUCTIONS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CUSTOM_INSTRUCTIONS_CHANGED_EVENT, { detail: { instructions: '' } }));
  } catch {
    // Ignore.
  }
}

// --- Conversations (local-only source of truth, never Supabase) ---

export function loadConversations(): StoredConversation[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    const parsed = safeParse<StoredConversation[]>(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages));
  } catch {
    return [];
  }
}

export function saveConversations(conversations: StoredConversation[]): void {
  if (!isBrowser()) return;
  try {
    const sanitized = conversations.map((c) => ({
      ...c,
      title: sanitizeContent(c.title),
      messages: sanitizeMessages(c.messages),
    }));
    try {
      window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Quota exceeded (usually image data URLs): retry with image payloads
      // stripped so the conversation history itself is never lost.
      const slim = sanitized.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({ ...m, attachments: stripAttachmentPayloads(m.attachments) })),
      }));
      window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(slim));
    }
    // Notify same-tab listeners (Sidebar, ChatWindow) that history changed.
    window.dispatchEvent(new CustomEvent('understoodchat:conversations-changed'));
  } catch {
    // Storage full or unavailable — history simply won't persist.
  }
}

export function getConversation(id: string): StoredConversation | null {
  if (!id) return null;
  return loadConversations().find((c) => c.id === id) ?? null;
}

export function saveConversation(conversation: StoredConversation): void {
  const all = loadConversations();
  const idx = all.findIndex((c) => c.id === conversation.id);
  const record: StoredConversation = {
    ...conversation,
    messages: sanitizeMessages(conversation.messages),
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  saveConversations(all);
}

export function createConversation(title = 'New chat'): StoredConversation {
  const conversation: StoredConversation = {
    id: generateId(),
    title,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
  saveConversation(conversation);
  setActiveConversationId(conversation.id);
  return conversation;
}

export function deleteConversation(id: string): void {
  if (!id || !isBrowser()) return;
  const remaining = loadConversationsRaw().filter((c) => c.id !== id);
  // Write directly to avoid re-sanitizing twice; still notify listeners.
  try {
    window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(remaining));
    window.dispatchEvent(new CustomEvent('understoodchat:conversations-changed'));
  } catch {
    // Ignore.
  }
  try {
    if (window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY) === id) {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    }
  } catch {
    // Ignore.
  }
}

// Internal raw loader used by deleteConversation (avoids re-filter cost).
function loadConversationsRaw(): StoredConversation[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    const parsed = safeParse<StoredConversation[]>(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function renameConversation(id: string, title: string): void {
  if (!id || !isBrowser()) return;
  const clean = sanitizeContent(title.trim()).slice(0, 60) || 'Untitled chat';
  const all = loadConversations().map((c) =>
    c.id === id ? { ...c, title: clean, updatedAt: new Date().toISOString() } : c
  );
  saveConversations(all);
}

// --- Active conversation pointer ---

export function getActiveConversationId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveConversationId(id: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, id);
  } catch {
    // Ignore.
  }
}

export function clearActiveConversationId(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
