import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserPlus, Power, KeyRound, Trash2, Users as UsersIcon } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/avatar';
import { Dialog } from '../../components/ui/dialog';
import { Spinner } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { CreateUserDialog } from './create-user-dialog';
import type { Paginated, User } from '../../types';
import { formatDateTime, titleCase } from '../../lib/utils';

type RoleFilter = 'all' | 'super_admin' | 'teacher' | 'student';

const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'info'> = {
  super_admin: 'default',
  teacher: 'info',
  student: 'secondary',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    type: 'disable' | 'delete';
    user: User;
  } | null>(null);
  const [resetState, setResetState] = useState<{ user: User; result?: string } | null>(null);

  const query = useQuery({
    queryKey: ['users', { search: debouncedSearch, role: roleFilter, page }],
    queryFn: () =>
      unwrap<Paginated<User>>(
        api.get('/users', {
          params: {
            search: debouncedSearch || undefined,
            role: roleFilter === 'all' ? undefined : roleFilter,
            page,
            limit: 10,
          },
        }),
      ),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const setStatusMutation = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) =>
      api.patch(`/users/${v.id}/status`, { isActive: v.isActive }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: invalidate,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (v: { id: string; newPassword?: string }) =>
      api.post(`/users/${v.id}/reset-password`, { newPassword: v.newPassword }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/users', payload),
    onSuccess: invalidate,
  });

  const runSearch = () => {
    setDebouncedSearch(search.trim());
    setPage(1);
  };

  const users = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div>
      <PageHeader
        title="Users & Accounts"
        description="Create and manage portal accounts across all roles."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" />
            Create user
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            className="pl-8"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
        </div>
        <Select
          value={roleFilter}
          className="w-40"
          onChange={(e) => {
            setRoleFilter(e.target.value as RoleFilter);
            setPage(1);
          }}
        >
          <option value="all">All roles</option>
          <option value="super_admin">Management</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </Select>
        <Button variant="outline" size="sm" onClick={runSearch}>
          Search
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users found"
          description="Try a different search, or create a new account."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create user
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last login</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.fullName} src={u.avatarUrl} />
                      <div className="min-w-0">
                        <p className="block truncate font-medium">{u.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[u.role] ?? 'secondary'}>{titleCase(u.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'success' : 'destructive'}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDateTime(u.lastLoginAt)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatDateTime(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        title="Reset password"
                        onClick={() => setResetState({ user: u })}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        title={u.isActive ? 'Disable' : 'Enable'}
                        onClick={() => setConfirmState({ type: 'disable', user: u })}
                      >
                        <Power className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        className="text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => setConfirmState({ type: 'delete', user: u })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Page {meta.page} of {meta.totalPages} · {meta.total} users
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
      />

      {/* Enable / disable confirm */}
      <Dialog
        open={confirmState?.type === 'disable'}
        onClose={() => setConfirmState(null)}
        title={confirmState?.user.isActive ? 'Disable account' : 'Enable account'}
        description={
          confirmState?.user.isActive
            ? `Disabling will immediately revoke all sessions for ${confirmState.user.email}.`
            : `Re-enabling will allow ${confirmState?.user.email} to sign in again.`
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmState(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmState?.user.isActive ? 'destructive' : 'success'}
              disabled={setStatusMutation.isPending}
              onClick={async () => {
                if (confirmState) {
                  await setStatusMutation.mutateAsync({
                    id: confirmState.user.id,
                    isActive: !confirmState.user.isActive,
                  });
                  setConfirmState(null);
                }
              }}
            >
              {setStatusMutation.isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </>
        }
      />

      {/* Delete confirm */}
      <Dialog
        open={confirmState?.type === 'delete'}
        onClose={() => setConfirmState(null)}
        title="Delete account"
        description={`This permanently deletes ${confirmState?.user.email} and their profile. This cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmState(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (confirmState) {
                  await deleteMutation.mutateAsync(confirmState.user.id);
                  setConfirmState(null);
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </>
        }
      />

      {/* Reset password */}
      <Dialog
        open={!!resetState}
        onClose={() => setResetState(null)}
        title={`Reset password for ${resetState?.user.email ?? ''}`}
        description={
          resetState?.result
            ? resetState.result
            : 'A new temporary password will be generated, or set one below.'
        }
        footer={
          resetState?.result ? (
            <Button onClick={() => setResetState(null)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setResetState(null)}>
                Cancel
              </Button>
              <Button
                disabled={resetPasswordMutation.isPending}
                onClick={async () => {
                  if (resetState) {
                    const res = await resetPasswordMutation.mutateAsync({ id: resetState.user.id });
                    const temp = res.data.data?.temporaryPassword;
                    setResetState((s) =>
                      s ? { ...s, result: temp ? `Temporary password: ${temp}` : 'Password reset successfully.' } : s,
                    );
                  }
                }}
              >
                {resetPasswordMutation.isPending ? 'Resetting…' : 'Reset password'}
              </Button>
            </>
          )
        }
      >
        {resetState && !resetState.result && (
          <p className="text-sm text-muted-foreground">
            The user will be asked to change their password at next sign in.
          </p>
        )}
      </Dialog>
    </div>
  );
}
