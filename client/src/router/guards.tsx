import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { FullPageLoader } from '../components/ui/spinner';
import type { Role } from '../types';

/** Blocks unauthenticated access. */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'loading' || status === 'idle') {
    return <FullPageLoader label="Checking session…" />;
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

/** Restricts the subtree to a set of roles. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

/** Restricts the subtree to users holding a permission key. */
export function RequirePermission({ permission }: { permission: string }) {
  const role = useAuthStore((s) => s.user?.role);
  const permissions = useAuthStore((s) => s.permissions);
  if (role !== 'super_admin' && !permissions.includes(permission)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
