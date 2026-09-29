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
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className="mb-4 flex items-start gap-2 rounded-md border border-black bg-neutral-50 px-3 py-2 text-sm text-black"
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 break-words">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={variant === 'error' ? 'Dismiss error' : 'Dismiss message'}
          title="Dismiss"
          className="shrink-0 rounded p-0.5 hover:bg-neutral-200"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
