'use client';

import { useMemo, useState } from 'react';
import { Brain, SendHorizontal, Check, SkipForward, X } from 'lucide-react';
import { extractClarifyingQuestions } from '@/lib/clarifyingEngine';
import { chatMessageSchema, MAX_MESSAGE_LENGTH } from '@/lib/validation';

const JUST_ANSWER_TEXT = 'Just answer - proceed with best guess';
const MAX_CHIP_LENGTH = 24;
const MAX_OPTIONS_PER_QUESTION = 5;

function cleanOptionToken(raw: string): string {
  let token = raw.trim();
  token = token.replace(/^[-*•>"'“”‘’(\[]+/, '').trim();
  token = token.replace(/^or\s+/i, '').trim();
  token = token.replace(/^either\s+/i, '').trim();
  token = token.replace(/^(a|an|the)\s+/i, '').trim();
  token = token.replace(/[.?!;:'"“”‘’)\]]+$/, '').trim();
  token = token.replace(/\s+/g, ' ');
  return token;
}

function looksLikeQuestionFragment(token: string): boolean {
  const lower = token.toLowerCase();
  return /\b(what|which|when|where|who|why|how|do you|are you|would you|could you|can you|tell me|please|want to|need to|like to)\b/.test(lower);
}

/**
 * Derives short (<24 char) option chips from a full clarifying question.
 * Handles em/en dashes, colons, commas, "or", slashes, parentheses.
 * Example: "What material ... -- cardboard, wood, plastic (3D-printed...), or metal?"
 * -> ["cardboard", "wood", "plastic", "metal"]
 */
function deriveOptions(question: string): string[] {
  if (!question) return [];
  const text = question.trim().replace(/\?+\s*$/, '').trim();
  if (!text) return [];

  // Prefer the segment after the last em/en-dash or colon (options usually live there).
  let candidate = text;
  let lastDelim = -1;
  const delims = ['—', '–', ':'];
  for (let d = 0; d < delims.length; d++) {
    const idx = text.lastIndexOf(delims[d]);
    if (idx > lastDelim) lastDelim = idx;
  }
  if (lastDelim >= 0) {
    const after = text.slice(lastDelim + 1).trim();
    if (after && /[,;/|]|\bor\b|\bvs\.?\b/i.test(after)) {
      candidate = after;
    }
  }
  const isTailMode = candidate !== text;

  // Remove parenthetical detail: "plastic (3D-printed or kit parts)" -> "plastic".
  candidate = candidate.replace(/\([^)]*\)/g, ' ');
  candidate = candidate.replace(/\s+/g, ' ').trim();
  if (!candidate) return [];

  const rawParts = candidate.split(/\s*\|\s*|\s*\/\s*|\s+vs\.?\s+|[,;]|\s+or\s+/i);
  const cleaned: string[] = [];
  const seen: Record<string, boolean> = {};

  for (let k = 0; k < rawParts.length; k++) {
    const token = cleanOptionToken(rawParts[k]);
    if (!token) continue;
    if (token.length < 2 || token.length > MAX_CHIP_LENGTH) continue;
    if (!isTailMode) {
      if (looksLikeQuestionFragment(token)) continue;
      if (token.split(' ').length > 4) continue;
    } else {
      if (token.split(' ').length > 4) continue;
    }
    if (token.split(' ').length > 2 && /\b(do|does|did|is|are|was|were|will|would|should|could|have|has)\b/i.test(token)) {
      continue;
    }
    const key = token.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    cleaned.push(token);
    if (cleaned.length >= MAX_OPTIONS_PER_QUESTION) break;
  }
  return cleaned;
}

export default function ClarifyingCard({
  content,
  onAnswer,
  disabled,
}: {
  content: string;
  onAnswer: (text: string) => void;
  disabled?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const questions = useMemo(() => extractClarifyingQuestions(content), [content]);
  const optionsPerQuestion = useMemo(() => questions.map((q) => deriveOptions(q)), [questions]);

  if (questions.length === 0) return null;

  const answeredCount = questions.filter((_, i) => (answers[i] && answers[i].trim()) || skipped[i]).length;

  const composed = questions
    .map((q, i) => {
      if (skipped[i]) return null;
      const answer = answers[i] ? answers[i].trim() : '';
      if (!answer) return null;
      return `Q${i + 1} (${q})\nA${i + 1}: ${answer}`;
    })
    .filter((line): line is string => line !== null)
    .join('\n');

  function setAnswer(index: number, value: string) {
    setSkipped((prev) => {
      if (!prev[index]) return prev;
      const next: Record<number, boolean> = { ...prev };
      delete next[index];
      return next;
    });
    setAnswers((prev) => ({ ...prev, [index]: value }));
    setError(null);
  }

  function toggleOption(index: number, option: string) {
    if (disabled || skipped[index]) return;
    setAnswers((prev) => {
      const current = prev[index] ? prev[index].trim() : '';
      if (current.toLowerCase() === option.toLowerCase()) {
        const next: Record<number, string> = { ...prev };
        delete next[index];
        return next;
      }
      return { ...prev, [index]: option };
    });
    setSkipped((prev) => {
      if (!prev[index]) return prev;
      const next: Record<number, boolean> = { ...prev };
      delete next[index];
      return next;
    });
    setError(null);
  }

  function clearAnswer(index: number) {
    setAnswers((prev) => {
      const next: Record<number, string> = { ...prev };
      delete next[index];
      return next;
    });
    setError(null);
  }

  function skipQuestion(index: number) {
    setSkipped((prev) => ({ ...prev, [index]: true }));
    setAnswers((prev) => {
      const next: Record<number, string> = { ...prev };
      delete next[index];
      return next;
    });
    setError(null);
  }

  function unskipQuestion(index: number) {
    setSkipped((prev) => {
      const next: Record<number, boolean> = { ...prev };
      delete next[index];
      return next;
    });
    setError(null);
  }

  function handleJustAnswer() {
    if (disabled) return;
    onAnswer(JUST_ANSWER_TEXT);
    setAnswers({});
    setSkipped({});
    setError(null);
  }

  function submit() {
    if (disabled) return;
    setError(null);
    if (answeredCount === 0) {
      setError('Answer at least one question, skip it, or choose Just answer.');
      return;
    }
    const text = composed.trim();
    if (!text) {
      setError('Answer at least one question, skip it, or choose Just answer.');
      return;
    }
    const parsed = chatMessageSchema.safeParse({ content: text });
    if (!parsed.success) {
      const message =
        parsed.error.issues[0] && parsed.error.issues[0].message
          ? parsed.error.issues[0].message
          : `Message is too long (max ${MAX_MESSAGE_LENGTH} chars).`;
      setError(message);
      return;
    }
    onAnswer(text);
    setAnswers({});
    setSkipped({});
    setError(null);
  }

  return (
    <section
      aria-label="Clarifying questions"
      aria-live="polite"
      className="rounded-lg border border-black bg-white p-4"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black">
          <Brain size={14} aria-hidden="true" /> Help me understand you
        </p>
        <p aria-live="polite" className="text-xs text-neutral-500">
          {answeredCount} of {questions.length} answered
        </p>
      </div>

      <ol className="mt-3 space-y-3">
        {questions.map((q, i) => {
          const value = answers[i] ?? '';
          const isSkipped = !!skipped[i];
          const isAnswered = !!value.trim() || isSkipped;
          const options = optionsPerQuestion[i] ?? [];
          return (
            <li key={`${i}-${q}`} className="rounded-md border border-neutral-200 bg-white p-3">
              <div className="flex items-start gap-2">
                <span aria-hidden="true" className="text-sm font-semibold text-black">
                  {i + 1}.
                </span>
                <p id={`clarifying-q-${i}`} className="flex-1 text-sm font-medium text-black">
                  {q}
                </p>
                {isAnswered && (
                  <span
                    aria-label={isSkipped ? `Question ${i + 1} skipped` : `Question ${i + 1} answered`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-white"
                  >
                    <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                )}
              </div>

              {options.length > 0 && (
                <div role="group" aria-label={`Suggested answers for question ${i + 1}`} className="mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                  {options.map((opt) => {
                    const isActive = value.trim().toLowerCase() === opt.toLowerCase() && !isSkipped;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleOption(i, opt)}
                        aria-pressed={isActive}
                        aria-label={`Answer question ${i + 1} with ${opt}`}
                        disabled={disabled || isSkipped}
                        className={
                          isActive
                            ? 'inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-black px-4 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-40'
                            : 'inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-black hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-40'
                        }
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setAnswer(i, e.target.value)}
                  placeholder={isSkipped ? 'Skipped' : `Answer question ${i + 1} or pick above…`}
                  aria-label={`Answer for question ${i + 1}: ${q}`}
                  aria-describedby={`clarifying-q-${i}`}
                  disabled={disabled || isSkipped}
                  maxLength={MAX_MESSAGE_LENGTH}
                  className="min-h-[44px] min-w-0 flex-1 rounded-md border border-neutral-200 px-3 py-2 text-[16px] text-black outline-none placeholder:text-neutral-500 focus:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 disabled:bg-neutral-50 disabled:opacity-60 sm:text-sm"
                />
                <div className="flex shrink-0 items-center gap-2">
                  {value && !isSkipped && (
                    <button
                      type="button"
                      onClick={() => clearAnswer(i)}
                      disabled={disabled}
                      aria-label={`Clear answer for question ${i + 1}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md border border-neutral-200 px-2 py-2 text-xs text-black hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-40"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                  {isSkipped ? (
                    <button
                      type="button"
                      onClick={() => unskipQuestion(i)}
                      disabled={disabled}
                      aria-label={`Unskip question ${i + 1}`}
                      className="flex min-h-[44px] items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-xs text-black hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-40"
                    >
                      <X size={14} aria-hidden="true" /> Unskip
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => skipQuestion(i)}
                      disabled={disabled}
                      aria-label={`Skip question ${i + 1}`}
                      className="flex min-h-[44px] items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-xs text-black hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-40"
                    >
                      <SkipForward size={14} aria-hidden="true" /> Skip
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-col gap-2 border-t border-neutral-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="text-xs text-neutral-500">
          {composed.length}/{MAX_MESSAGE_LENGTH} chars
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleJustAnswer}
            disabled={disabled}
            aria-label="Skip all questions and just answer"
            className="flex items-center justify-center gap-1 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm text-black hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-40"
          >
            <SkipForward size={14} strokeWidth={1.75} aria-hidden="true" /> Just answer
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={disabled || answeredCount === 0}
            aria-label={`Send answers, ${answeredCount} of ${questions.length} answered`}
            className="flex items-center justify-center gap-1 rounded-md bg-black px-4 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-40"
          >
            <SendHorizontal size={14} strokeWidth={1.75} aria-hidden="true" /> Send answers ({answeredCount}/{questions.length})
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-md border border-black px-3 py-2 text-xs text-black">
          {error}
        </p>
      )}
    </section>
  );
}
