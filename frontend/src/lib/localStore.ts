'use client';

/**
 * Local-first persistence (canonical store is `./storage.ts`).
 * - Supabase holds ONLY profiles(name, age, email).
 * - OpenRouter key + conversations/messages live ONLY in browser localStorage.
 * New code should import from `@/lib/storage` directly.
 */

import type { Conversation, Message } from './types';
import {
  clearCustomInstructions as clearCustom,
  clearOpenRouterKey as clearKey,
  getConversation,
  getCustomInstructions as getCustom,
  getOpenRouterKey as getKey,
  loadConversations,
  saveConversation,
  saveConversations,
  setCustomInstructions as setCustom,
  setOpenRouterKey as setKey,
} from './storage';

// --- Device-local key (primary: stored only in localStorage, sent only to OpenRouter) ---
export function getOpenRouterKey(): string | null {
  return getKey();
}

export function setOpenRouterKey(key: string): void {
  setKey(key);
}

export function clearOpenRouterKey(): void {
  clearKey();
}

export function hasOpenRouterKey(): boolean {
  return getKey() !== null;
}

// --- Custom Instructions (local only, injected into the system prompt) ---
export function getCustomInstructions(): string | null {
  return getCustom();
}

export function setCustomInstructions(instructions: string): void {
  setCustom(instructions);
}

export function clearCustomInstructions(): void {
  clearCustom();
}

// --- Conversations (local only, backed by `understoodchat:conversations`) ---
export function getConversations(): Conversation[] {
  return loadConversations().map((c) => ({
    id: c.id,
    user_id: 'local',
    title: c.title,
    created_at: c.updatedAt,
  }));
}

export function setConversations(conversations: Conversation[]): void {
  const previous = new Map(loadConversations().map((c) => [c.id, c]));
  saveConversations(
    conversations.map((c) => {
      const kept = previous.get(c.id);
      return {
        id: c.id,
        title: c.title,
        messages: kept?.messages ?? [],
        updatedAt: kept?.updatedAt ?? new Date().toISOString(),
      };
    })
  );
}

// --- Messages per conversation (local only) ---
export function getMessages(conversationId: string): Message[] {
  if (!conversationId) return [];
  return getConversation(conversationId)?.messages ?? [];
}

export function setMessages(conversationId: string, messages: Message[]): void {
  if (!conversationId) return;
  const existing = getConversation(conversationId);
  saveConversation({
    id: conversationId,
    title: existing?.title ?? 'New chat',
    messages,
    updatedAt: new Date().toISOString(),
  });
}

export function clearConversation(conversationId: string): void {
  saveConversations(loadConversations().filter((c) => c.id !== conversationId));
}
