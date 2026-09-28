import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  ClipboardCheck,
  FileText,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { api, unwrap } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { PageHeader } from '../../components/layout/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import type { Paginated, User } from '../../types';
import { formatDateTime, titleCase } from '../../lib/utils';

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value?: number | string;
  loading?: boolean;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-14" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight">{value ?? '—'}</p>
          )}
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const QUICK_ACTIONS: Record<string, { label: string; to: string; icon: React.ElementType }[]> = {
  super_admin: [
    { label: 'Manage Students', to: '/students', icon: GraduationCap },
    { label: 'Manage Teachers', to: '/teachers', icon: Users },
    { label: 'Users & Access', to: '/users', icon: UserCheck },
    { label: 'Roles & Permissions', to: '/settings/roles', icon: Sparkles },
    { label: 'Activity Logs', to: '/audit/logs', icon: ClipboardCheck },
  ],
  teacher: [
    { label: 'Take Attendance', to: '/attendance', icon: ClipboardCheck },
    { label: 'My Classes', to: '/my-classes', icon: GraduationCap },
    { label: 'Assignments', to: '/assignments', icon: FileText },
    { label: 'Exams & Results', to: '/exams', icon: FileText },
  ],
  student: [
    { label: 'My Attendance', to: '/attendance', icon: ClipboardCheck },
    { label: 'Assignments', to: '/assignments', icon: FileText },
    { label: 'My Results', to: '/exams', icon: FileText },
    { label: 'Letters & Appeals', to: '/letters', icon: CalendarDays },
  ],
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const role = user?.role ?? 'student';

  const usersQuery = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => unwrap<Paginated<User>>(api.get('/users', { params: { limit: 1 } })),
    enabled: role === 'super_admin',
  });

  const activeQuery = useQuery({
    queryKey: ['users', 'stats', 'active'],
    queryFn: () => unwrap<Paginated<User>>(api.get('/users', { params: { limit: 1, isActive: 'true' } })),
    enabled: role === 'super_admin',
  });

  const actions = QUICK_ACTIONS[role] ?? [];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.fullName.split(' ')[0] ?? 'there'}`}
        description={`Signed in as ${titleCase(role)} · last login ${formatDateTime(user?.lastLoginAt)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {role === 'super_admin' ? (
          <>
            <StatCard icon={Users} label="Total Users" value={usersQuery.data?.meta.total} loading={usersQuery.isLoading} />
            <StatCard icon={UserCheck} label="Active Users" value={activeQuery.data?.meta.total} loading={activeQuery.isLoading} />
            <StatCard icon={UserX} label="Role" value={titleCase(role)} />
            <StatCard icon={Sparkles} label="Permissions" value={permissions.length} />
          </>
        ) : (
          <>
            <StatCard icon={GraduationCap} label="Role" value={titleCase(role)} />
            <StatCard icon={ClipboardCheck} label="Attendance" value="—" hint="Available after module rollout" />
            <StatCard icon={FileText} label="Assignments" value="—" hint="Available after module rollout" />
            <StatCard icon={CalendarDays} label="Exam Schedule" value="—" hint="Available after module rollout" />
          </>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {actions.map((a) => (
            <Link key={a.to} to={a.to}>
              <Card className="transition-shadow hover:shadow-card-hover">
                <CardContent className="flex items-center gap-3 p-4">
                  <a.icon className="size-4 text-primary" />
                  <span className="text-sm font-medium">{a.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        <span className="flex-1">
          All core modules are live: academic setup, students, teachers, attendance, exams,
          results, assignments, quizzes, and communications.
        </span>
        {permissions.length === 0 && (
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Refresh session
          </Button>
        )}
      </div>
    </div>
  );
}
