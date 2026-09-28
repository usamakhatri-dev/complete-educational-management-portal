import { cn, initials } from '../../lib/utils';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'avatar'}
        className={cn('size-9 rounded-full object-cover', className)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary',
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
