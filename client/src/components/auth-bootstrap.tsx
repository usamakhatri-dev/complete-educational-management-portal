import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth';

/** Runs once on app load to restore/verify the persisted session. */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (status === 'idle') return null;
  return <>{children}</>;
}
