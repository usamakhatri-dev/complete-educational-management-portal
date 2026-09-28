export interface ToastItem {
  id: number;
  message: string;
  type: 'error';
}

let seq = 0;
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function pushToast(message: string) {
  const id = ++seq;
  toasts = [...toasts, { id, message, type: 'error' }];
  if (toasts.length > 3) toasts = toasts.slice(-3);
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 5000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getToasts(): ToastItem[] {
  return toasts;
}
