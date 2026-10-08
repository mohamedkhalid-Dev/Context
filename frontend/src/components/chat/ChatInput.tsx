'use client';

import { useRef, useState } from 'react';
import { FileText, ImagePlus, Loader2, Paperclip, SendHorizontal, Square, X } from 'lucide-react';
import { MAX_ATTACHMENTS_PER_MESSAGE, MAX_MESSAGE_LENGTH } from '@/lib/validation';
import {
  formatFileSize,
  prepareAttachments,
} from '@/lib/attachments';
import type { Attachment } from '@/lib/types';
import { cn } from '@/lib/cn';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.txt,.md,.markdown,.csv,.json,.jsonl,.tsv,.log,.js,.ts,.tsx,.jsx,.py,.pdf,.doc,.docx';

export default function ChatInput({
  onSend,
  onStop,
  disabled,
  streaming,
}: {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
}) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachErrors, setAttachErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const busy = disabled || streaming;
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !reading && !streaming && !disabled;
  const showStop = streaming || disabled;
  const nearLimit = value.length > MAX_MESSAGE_LENGTH - 500;

  function focusText() {
    requestAnimationFrame(() => textRef.current?.focus());
  }

  async function addFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    if (busy) return;
    setReading(true);
    try {
      const { attachments: fresh, errors } = await prepareAttachments(attachments.length, files);
      if (fresh.length > 0) setAttachments((prev) => [...prev, ...fresh].slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
      if (errors.length > 0) setAttachErrors((prev) => [...prev, ...errors].slice(0, 3));
    } finally {
      setReading(false);
      focusText();
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    focusText();
  }

  function submit() {
    if (!canSend) return;
    onSend(value.trim(), attachments);
    setValue('');
    setAttachments([]);
    setAttachErrors([]);
    requestAnimationFrame(() => {
      if (textRef.current) textRef.current.style.height = 'auto';
    });
    focusText();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function autoGrow() {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (busy) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        void addFiles(e.dataTransfer?.files ?? null);
      }}
      className={cn(
        'rounded-2xl border bg-white shadow-sm transition-colors',
        dragging ? 'border-black border-dashed bg-neutral-50' : 'border-neutral-200 focus-within:border-black'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3" aria-label="Attached files">
          {attachments.map((att) =>
            att.kind === 'image' && att.dataUrl ? (
              <span key={att.id} className="group relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  title={`${att.name} (${formatFileSize(att.size)})`}
                  className="h-14 w-14 rounded-lg border border-neutral-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  aria-label={`Remove ${att.name}`}
                  title={`Remove ${att.name}`}
                  className="absolute -right-1.5 -top-1.5 rounded-full border border-neutral-200 bg-white p-0.5 shadow-sm hover:border-black"
                >
                  <X size={12} strokeWidth={2} aria-hidden="true" />
                </button>
              </span>
            ) : (
              <span
                key={att.id}
                title={`${att.name} (${formatFileSize(att.size)})`}
                className="flex max-w-[220px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-2 pr-1 text-xs"
              >
                <FileText size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{att.name}</span>
                <span className="shrink-0 text-neutral-400">{formatFileSize(att.size)}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  aria-label={`Remove ${att.name}`}
                  title={`Remove ${att.name}`}
                  className="shrink-0 rounded p-0.5 hover:bg-neutral-200"
                >
                  <X size={12} strokeWidth={2} aria-hidden="true" />
                </button>
              </span>
            )
          )}
        </div>
      )}

      {/* Inline attachment errors */}
      {attachErrors.length > 0 && (
        <div className="px-3 pt-2" role="alert">
          {attachErrors.map((err, i) => (
            <p key={i} className="flex items-start justify-between gap-2 py-0.5 text-xs text-neutral-500">
              <span>{err}</span>
              <button
                type="button"
                onClick={() => setAttachErrors((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Dismiss error"
                className="shrink-0 rounded p-0.5 hover:bg-neutral-100"
              >
                <X size={12} strokeWidth={2} aria-hidden="true" />
              </button>
            </p>
          ))}
        </div>
      )}

      {/* Text area */}
      <label htmlFor="chat-message-input" className="sr-only">
        Type your message
      </label>
      <textarea
        id="chat-message-input"
        ref={textRef}
        rows={1}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          autoGrow();
        }}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          const files = e.clipboardData?.files;
          if (files && files.length > 0) {
            e.preventDefault();
            void addFiles(files);
          }
        }}
        placeholder={
          dragging
            ? 'Drop files to attach…'
            : 'Type your message… (Enter to send, Shift+Enter for newline)'
        }
        aria-label="Type your message"
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={disabled && !streaming}
        autoComplete="off"
        className="max-h-[180px] min-h-[48px] w-full resize-none bg-transparent px-4 pb-1 pt-3 text-[16px] leading-relaxed outline-none placeholder:text-neutral-400 disabled:bg-transparent disabled:text-neutral-400 sm:text-sm"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 pb-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || reading || attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
          aria-label="Attach images or files"
          title={
            attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE
              ? `Up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message`
              : 'Attach images or files (or drag & drop, paste)'
          }
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-black disabled:opacity-40"
        >
          {reading ? (
            <Loader2 size={18} strokeWidth={1.75} aria-hidden="true" className="animate-spin" />
          ) : attachments.length > 0 ? (
            <ImagePlus size={18} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Paperclip size={18} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
        {attachments.length > 0 && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
            {attachments.length}/{MAX_ATTACHMENTS_PER_MESSAGE}
          </span>
        )}
        <span className="flex-1" />
        {nearLimit && value.length > 0 && (
          <span
            className={cn(
              'px-1 text-[11px tabular-nums]',
              value.length >= MAX_MESSAGE_LENGTH ? 'text-black font-medium' : 'text-neutral-400'
            )}
            aria-live="polite"
          >
            {value.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
        {showStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            title="Stop generating"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white"
          >
            <Square size={15} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              submit();
            }}
            disabled={!canSend}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white disabled:opacity-30"
            aria-label="Send message"
            title="Send message"
          >
            <SendHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
