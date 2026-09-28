import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const Spinner = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn('inline-flex items-center', className)} {...props}>
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
    </span>
  ),
);
Spinner.displayName = 'Spinner';

export { Spinner };

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
