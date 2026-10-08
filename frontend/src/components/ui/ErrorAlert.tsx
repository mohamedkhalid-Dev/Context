import { CheckCircle2, CircleAlert, MailCheck, X } from 'lucide-react';

export type AlertVariant = 'error' | 'info' | 'success';

const ICONS: Record<AlertVariant, typeof CircleAlert> = {
  error: CircleAlert,
  info: MailCheck,
  success: CheckCircle2,
};

export default function ErrorAlert({
  message,
  onDismiss,
  variant = 'error',
}: {
  message: string;
  onDismiss?: () => void;
  variant?: AlertVariant;
}) {
  if (!message) return null;
  const Icon = ICONS[variant];
  const assertive = variant === 'error';
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="mb-4 flex w-full max-w-full items-start gap-2 rounded-md border border-black bg-neutral-50 px-3 py-2.5 text-sm leading-relaxed text-black"
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 break-words">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={variant === 'error' ? 'Dismiss error' : 'Dismiss message'}
          title="Dismiss"
          className="flex min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
