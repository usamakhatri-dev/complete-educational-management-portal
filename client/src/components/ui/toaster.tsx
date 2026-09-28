import { useSyncExternalStore } from 'react';
import { X, CircleAlert } from 'lucide-react';
import { dismissToast, getToasts, subscribeToasts } from '../../lib/toast';

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-destructive/30 bg-card px-4 py-3 text-sm shadow-card-hover animate-fade-in"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="flex-1 text-foreground">{t.message}</p>
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
