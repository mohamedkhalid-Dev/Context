'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFriendlyErrorMessage, streamChatMessage } from '@/lib/chatApi';
import {
  IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
  detectStage,
  isImageGenerationRequest,
  type ClarifyingProfile,
} from '@/lib/clarifyingEngine';
import { attachmentSummary } from '@/lib/attachments';
import { chatMessageSchema, MAX_ATTACHMENTS_PER_MESSAGE, MAX_MESSAGE_LENGTH } from '@/lib/validation';
import {
  createConversation,
  getActiveConversationId,
  getConversation,
  getOpenRouterKey,
  saveConversation,
  sanitizeContent,
  setActiveConversationId,
} from '@/lib/storage';
import type { Attachment, Message } from '@/lib/types';

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function titleFrom(text: string): string {
  return text.trim().slice(0, 40) || 'New chat';
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to textarea fallback.
  }
  try {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/**
 * Local-first chat state with streaming.
 * - History persists to browser localStorage only (never Supabase).
 * - OpenRouter key read from localStorage only, sent only to OpenRouter.
 * - Supabase holds ONLY profiles(name, age, email) for personalization.
 * Exposes messages, loading, streaming, error, sendMessage (streams tokens
 * via onToken for <2s first-token), regenerate, copyMessage, clearChat, hasKey.
 */
export function useChat(conversationId?: string, profile?: ClarifyingProfile) {
  const [activeId, setActiveId] = useState<string>(conversationId ?? '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load (or auto-create) the active conversation from localStorage.
  useEffect(() => {
    const id = conversationId ?? getActiveConversationId() ?? createConversation().id;
    setActiveConversationId(id);
    setActiveId(id);
    setMessages(getConversation(id)?.messages ?? []);
    setHasKey(getOpenRouterKey() !== null);
  }, [conversationId]);

  // Keep hasKey fresh when the key changes (Settings dialog, other tabs).
  useEffect(() => {
    const refresh = () => setHasKey(getOpenRouterKey() !== null);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('understoodchat:settings-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('understoodchat:settings-changed', refresh);
    };
  }, []);

  const persist = useCallback(
    (id: string, next: Message[], title?: string) => {
      const existing = getConversation(id);
      saveConversation({
        id,
        title: title ?? existing?.title ?? 'New chat',
        messages: next,
        updatedAt: new Date().toISOString(),
      });
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  /** Stream a completion into a placeholder assistant message. */
  const streamInto = useCallback(
    async (base: Message[], active: string, clarifyingProfile?: ClarifyingProfile) => {
      const assistantId = uid();
      const placeholder: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        stage: 'confirmed',
        conversation_id: active,
      };
      const withPlaceholder = [...base, placeholder];
      setMessages(withPlaceholder);
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const full = await streamChatMessage(
          base.map((m) => ({
            role: m.role,
            content: m.content,
            // Only user messages carry attachments; forwards images as
            // vision parts and other files as context text (see clarifyingEngine).
            attachments: m.role === 'user' ? m.attachments : undefined,
          })),
          active,
          {
            profile: clarifyingProfile,
            signal: controller.signal,
            onToken: (chunk) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: chunk } : m))
              );
            },
          }
        );
        const stage = detectStage(full);
        const finalMsg: Message = {
          id: assistantId,
          role: 'assistant',
          content: full,
          stage,
          conversation_id: active,
        };
        const withReply = [...base, finalMsg];
        setMessages(withReply);
        persist(active, withReply);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          const partial = getConversation(active)?.messages ?? base;
          setMessages(partial);
          return;
        }
        const friendly = getFriendlyErrorMessage(err);
        setError(friendly);
        const errMsg: Message = {
          id: assistantId,
          role: 'assistant',
          content: friendly,
          stage: 'confirmed',
          conversation_id: active,
        };
        const withError = [...base, errMsg];
        setMessages(withError);
        persist(active, withError);
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [persist]
  );

  const sendMessage = useCallback(
    async (text: string, attachments: Attachment[] = []) => {
      const trimmed = text.trim();
      const files = attachments.slice(0, MAX_ATTACHMENTS_PER_MESSAGE);
      if ((!trimmed && files.length === 0) || loading) return;
      setError(null);
      // Text may be empty when files are attached; otherwise enforce the schema.
      const contentForValidation = trimmed || attachmentSummary(files);
      const parsed = chatMessageSchema.safeParse({ content: contentForValidation });
      if (!parsed.success) {
        const msg =
          parsed.error.issues[0]?.message ??
          `Message too long — keep it under ${MAX_MESSAGE_LENGTH} characters.`;
        setError(msg);
        const errMsg: Message = {
          id: uid(),
          role: 'assistant',
          content: msg,
          stage: 'confirmed',
          conversation_id: activeId,
        };
        setMessages((prev) => [...prev, errMsg]);
        return;
      }

      // Rule: image generation is prohibited (text-only assistant).
      // Short-circuit locally with a clear unavailable message — no API cost.
      if (isImageGenerationRequest(trimmed)) {
        const userMsg: Message = {
          id: uid(),
          role: 'user',
          content: sanitizeContent(trimmed),
          stage: 'confirmed',
          conversation_id: activeId,
          attachments: files.length > 0 ? files : undefined,
        };
        const blockedMsg: Message = {
          id: uid(),
          role: 'assistant',
          content: IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
          stage: 'confirmed',
          conversation_id: activeId,
        };
        const isFirstUserMessage = messages.every((m) => m.role !== 'user');
        const next = [...messages, userMsg, blockedMsg];
        setMessages(next);
        persist(
          activeId,
          next,
          isFirstUserMessage ? titleFrom(trimmed) : undefined
        );
        return;
      }

      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: sanitizeContent(trimmed || attachmentSummary(files)),
        stage: 'confirmed',
        conversation_id: activeId,
        attachments: files.length > 0 ? files : undefined,
      };
      const isFirstUserMessage = messages.every((m) => m.role !== 'user');
      const next = [...messages, userMsg];
      setMessages(next);
      persist(
        activeId,
        next,
        isFirstUserMessage ? titleFrom(trimmed || attachmentSummary(files)) : undefined
      );
      setLoading(true);
      try {
        await streamInto(next, activeId, profile);
      } finally {
        setLoading(false);
        setHasKey(getOpenRouterKey() !== null);
      }
    },
    [messages, loading, activeId, profile, persist, streamInto]
  );

  /** Resend the last user message and replace the trailing reply (if any). */
  const regenerate = useCallback(async () => {
    if (loading) return;
    const lastUserIdx = [...messages].map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx < 0) return;
    setError(null);
    const base = messages.slice(0, lastUserIdx + 1);
    // Image-generation requests stay blocked on regenerate too.
    if (isImageGenerationRequest(base[lastUserIdx]?.content ?? '')) {
      const blockedMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
        stage: 'confirmed',
        conversation_id: activeId,
      };
      const withBlocked = [...base, blockedMsg];
      setMessages(withBlocked);
      persist(activeId, withBlocked);
      return;
    }
    setMessages(base);
    setLoading(true);
    try {
      await streamInto(base, activeId, profile);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, activeId, profile, streamInto]);

  const copyMessage = useCallback(async (text: string) => copyText(text), []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    const fresh = createConversation();
    setActiveId(fresh.id);
    setMessages([]);
    setError(null);
  }, []);

  const refreshKey = useCallback(() => {
    setHasKey(getOpenRouterKey() !== null);
  }, []);

  return {
    messages,
    loading,
    streaming,
    error,
    clearError,
    sendMessage,
    regenerate,
    stop,
    copyMessage,
    conversationId: activeId,
    clearChat,
    hasKey,
    refreshKey,
  };
}
