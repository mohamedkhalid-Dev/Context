import { Loader2 } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="space-y-2" role="status" aria-live="polite" aria-label="Assistant is thinking">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        <span>Thinking — checking what is still unclear…</span>
      </div>
      <div aria-hidden="true" className="max-w-[70%] space-y-1.5">
        <div className="h-3 animate-pulse rounded bg-neutral-200" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-neutral-100" />
      </div>
    </div>
  );
}
