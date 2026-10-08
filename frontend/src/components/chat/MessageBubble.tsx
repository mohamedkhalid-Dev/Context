'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import type { Message } from '@/lib/types';
import { sanitizeContent } from '@/lib/storage';
import { formatFileSize } from '@/lib/attachments';
import { cn } from '@/lib/cn';

export default function MessageBubble({
  message,
  onCopy,
  streaming,
}: {
  message: Message;
  onCopy?: (text: string) => Promise<boolean>;
  streaming?: boolean;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // Sanitized markdown source: strip script/event-handler payloads first,
  // then DOMPurify any embedded HTML (client-only; SSR falls back to regex).
  const cleanContent = useMemo(() => {
    const base = sanitizeContent(message.content ?? '');
    if (typeof window === 'undefined') return base;
    try {
      return DOMPurify.sanitize(base, {
        ALLOWED_TAGS: [
          'b',
          'i',
          'em',
          'strong',
          'a',
          'p',
          'ul',
          'ol',
          'li',
          'code',
          'pre',
          'blockquote',
          'h1',
          'h2',
          'h3',
          'h4',
          'hr',
          'br',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ],
        ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
      });
    } catch {
      return base;
    }
  }, [message.content]);

  // Allowlist link URLs: block javascript:/vbscript:/data: XSS vectors.
  // react-markdown emits raw href; validate before spreading props.
  function safeHref(href?: string): string {
    if (!href) return '#';
    const trimmed = href.trim();
    // Allow http(s), mailto, relative (/, #) only.
    if (/^(https?:|mailto:)/i.test(trimmed)) {
      const lower = trimmed.toLowerCase();
      // Block encoded variants: javascript:, vbscript:, data:text/html, data:image/svg+xml
      if (/^\s*(javascript|vbscript|data)\s*:/i.test(trimmed)) return '#';
      if (/&#|\x00|\\u/.test(lower)) return '#';
      return trimmed;
    }
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
    return '#';
  }

  async function handleCopy() {
    let ok = false;
    if (onCopy) {
      ok = await onCopy(message.content);
    } else {
      try {
        await navigator.clipboard.writeText(message.content);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className={cn('group flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] break-words rounded-lg px-3 py-2 text-[15px] leading-relaxed [overflow-wrap:anywhere] sm:text-sm lg:max-w-[70%]',
          isUser ? 'bg-black text-white' : 'border border-neutral-200 bg-white text-black'
        )}
      >
        {/* Attached images/files (user messages only in practice). */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5" aria-label="Attached files">
            {message.attachments.map((att, i) =>
              att.kind === 'image' && att.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={att.id || i}
                  src={att.dataUrl}
                  alt={att.name}
                  title={att.name}
                  className={cn(
                    'h-20 w-20 rounded-md border object-cover',
                    isUser ? 'border-white/20' : 'border-neutral-200'
                  )}
                />
              ) : (
                <span
                  key={att.id || i}
                  title={`${att.name} (${formatFileSize(att.size)})`}
                  className={cn(
                    'flex max-w-[200px] items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                    isUser
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-neutral-200 bg-neutral-50 text-black'
                  )}
                >
                  <FileText size={13} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{att.name}</span>
                </span>
              )
            )}
          </div>
        )}
        {message.stage === 'clarifying' && !isUser && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Clarifying
          </p>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]">{message.content}</p>
        ) : (
          <div className="markdown-body min-w-0 break-words leading-relaxed [overflow-wrap:anywhere]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={(url: string) => safeHref(url)}
              components={{
                p: (props) => <p className="mb-2 leading-relaxed last:mb-0" {...props} />,
                a: (props) => {
                  const { href, ...rest } = props as React.AnchorHTMLAttributes<HTMLAnchorElement>;
                  return (
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    <a
                      className="break-all font-medium text-black underline underline-offset-2"
                      target="_blank"
                      rel="noreferrer noopener"
                      {...rest}
                      href={safeHref(typeof href === 'string' ? href : undefined)}
                    />
                  );
                },
                strong: (props) => <strong className="font-semibold text-black" {...props} />,
                ul: (props) => <ul className="my-2 ml-5 list-disc space-y-1" {...props} />,
                ol: (props) => <ol className="my-2 ml-5 list-decimal space-y-1" {...props} />,
                li: (props) => <li className="text-sm leading-relaxed" {...props} />,
                h1: (props) => (
                  <h1 className="font-display mb-1 mt-3 text-base font-semibold" {...props} />
                ),
                h2: (props) => (
                  <h2 className="font-display mb-1 mt-3 text-[15px] font-semibold" {...props} />
                ),
                h3: (props) => (
                  <h3 className="font-display mb-1 mt-2 text-sm font-semibold" {...props} />
                ),
                h4: (props) => (
                  <h4 className="font-display mb-1 mt-2 text-sm font-semibold" {...props} />
                ),
                blockquote: (props) => (
                  <blockquote
                    className="my-2 border-l-2 border-neutral-300 pl-3 italic text-neutral-600"
                    {...props}
                  />
                ),
                code: (props) => {
                  const { className, children, ...rest } = props as {
                    className?: string;
                    children?: React.ReactNode;
                  } & React.HTMLAttributes<HTMLElement>;
                  const isBlock = (className ?? '').includes('language-');
                  if (isBlock) {
                    return (
                      <code className="font-mono text-[13px] leading-relaxed" {...rest}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className="break-words rounded bg-neutral-100 px-1 py-0.5 font-mono text-[13px] text-black"
                      {...rest}
                    >
                      {children}
                    </code>
                  );
                },
                pre: (props) => (
                  <pre
                    className="my-2 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-100 p-3 text-[13px] leading-relaxed text-black"
                    {...props}
                  />
                ),
                hr: (props) => <hr className="my-3 border-neutral-200" {...props} />,
                table: (props) => (
                  <span className="my-2 block overflow-x-auto">
                    <table className="w-full border-collapse text-sm" {...props} />
                  </span>
                ),
                th: (props) => (
                  <th
                    className="border border-neutral-200 bg-neutral-50 px-2 py-1 text-left font-semibold"
                    {...props}
                  />
                ),
                td: (props) => (
                  <td className="border border-neutral-200 px-2 py-1" {...props} />
                ),
              }}
            >
              {cleanContent}
            </ReactMarkdown>
            {streaming && (
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-4 w-2 animate-pulse bg-black align-middle"
              />
            )}
          </div>
        )}
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy message'}
            title={copied ? 'Copied' : 'Copy message'}
            className={cn(
              'flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-opacity sm:min-h-0 sm:min-w-0',
              isUser
                ? 'text-neutral-300 hover:text-white'
                : 'text-neutral-400 hover:text-black',
              'lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100'
            )}
          >
            {copied ? (
              <Check size={12} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Copy size={12} strokeWidth={1.75} aria-hidden="true" />
            )}
            <span aria-live="polite" className="sr-only">{copied ? 'Copied' : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
