'use client';

import { useState } from 'react';
import { Brain, SendHorizontal } from 'lucide-react';
import { extractClarifyingQuestions } from '@/lib/clarifyingEngine';
import { chatMessageSchema, MAX_MESSAGE_LENGTH } from '@/lib/validation';

export default function ClarifyingCard({
  content,
  onAnswer,
  disabled,
}: {
  content: string;
  onAnswer: (text: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const questions = extractClarifyingQuestions(content);

  function toggleChip(question: string) {
    setSelected((prev) =>
      prev.includes(question) ? prev.filter((q) => q !== question) : [...prev, question]
    );
    // Prefill the draft so the user can answer inline next to each question.
    setDraft((prev) => {
      const line = `${question} `;
      if (prev.includes(question)) return prev;
      return prev ? `${prev}\n${line}` : line;
    });
  }

  function submit() {
    const text = draft.trim();
    if (!text || disabled) return;
    const parsed = chatMessageSchema.safeParse({ content: text });
    if (!parsed.success) {
      // Enforce 4000-char limit consistently with useChat/ChatInput.
      setDraft((prev) => prev.slice(0, MAX_MESSAGE_LENGTH));
      return;
    }
    onAnswer(text);
    setDraft('');
    setSelected([]);
  }

  return (
    <section
      aria-label="Clarifying questions"
      aria-live="polite"
      className="rounded-lg border border-black bg-white p-4"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <Brain size={14} aria-hidden="true" /> Help me understand you
      </p>
      {questions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Suggested follow-up questions">
          {questions.map((q) => {
            const isActive = selected.includes(q);
            return (
              <button
                key={q}
                type="button"
                onClick={() => toggleChip(q)}
                aria-pressed={isActive}
                disabled={disabled}
                className={
                  isActive
                    ? 'rounded-full bg-black px-3 py-1 text-xs text-white disabled:opacity-40'
                    : 'rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs hover:border-black disabled:opacity-40'
                }
              >
                {q}
              </button>
            );
          })}
        </div>
      )}
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Answer the questions above… (Enter to send, Shift+Enter for newline)"
          aria-label="Answer the clarifying questions"
          disabled={disabled}
          maxLength={MAX_MESSAGE_LENGTH}
          className="max-h-[120px] flex-1 resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-black disabled:bg-neutral-50"
        />
        <button
          type="submit"
          disabled={!draft.trim() || disabled}
          aria-label="Send clarifying answer"
          title="Send clarifying answer"
          className="flex items-center gap-1 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          <SendHorizontal size={14} strokeWidth={1.75} aria-hidden="true" /> Reply
        </button>
      </form>
    </section>
  );
}
