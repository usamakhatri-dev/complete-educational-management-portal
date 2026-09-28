import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Save } from 'lucide-react';
import { api, getApiError, unwrap } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { titleCase } from '../../lib/utils';

interface RoleWithPerms {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  isSystem: boolean;
  permissions: { permission: { key: string } }[];
}

interface Permission {
  id: string;
  key: string;
  module: string;
  label: string;
  description?: string | null;
}

export default function RolesPage() {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['rbac', 'roles'],
    queryFn: () => unwrap<RoleWithPerms[]>(api.get('/rbac/roles')),
  });

  const permsQuery = useQuery({
    queryKey: ['rbac', 'permissions'],
    queryFn: () => unwrap<Permission[]>(api.get('/rbac/permissions')),
  });

  const saveMutation = useMutation({
    mutationFn: (v: { roleId: string; permissions: string[] }) =>
      api.put(`/rbac/roles/${v.roleId}/permissions`, { permissions: v.permissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac'] });
      setMessage({ ok: true, text: 'Permissions updated. Changes take effect immediately.' });
    },
    onError: (err) => setMessage({ ok: false, text: getApiError(err) }),
  });

  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permsQuery.data ?? []) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return [...map.entries()];
  }, [permsQuery.data]);

  const selectRole = (role: RoleWithPerms) => {
    setSelectedRole(role.id);
    setDraft(new Set(role.permissions.map((p) => p.permission.key)));
    setMessage(null);
  };

  const role = rolesQuery.data?.find((r) => r.id === selectedRole);

  const toggle = (key: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setMessage(null);
  };

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Fine-grained access control for every role in the portal."
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {rolesQuery.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            rolesQuery.data?.map((r) => (
              <button
                key={r.id}
                onClick={() => selectRole(r)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedRole === r.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium capitalize">{r.label}</p>
                  <Badge variant="secondary">{r.permissions.length}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
              </button>
            ))
          )}
        </div>

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                {role ? titleCase(role.label) : 'Select a role'}
              </CardTitle>
              <CardDescription>
                {role?.name === 'super_admin'
                  ? 'Management always has full access — permissions are enforced for other roles.'
                  : role
                    ? 'Toggle permission keys this role may perform.'
                    : 'Choose a role on the left to manage its permissions.'}
              </CardDescription>
            </div>
          </CardHeader>

          {role && role.name !== 'super_admin' && (
            <CardContent>
              {message && (
                <p
                  className={`mb-3 rounded-md border px-3 py-2 text-sm ${
                    message.ok
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-destructive/40 bg-destructive/10 text-destructive'
                  }`}
                >
                  {message.text}
                </p>
              )}
              <div className="space-y-4">
                {groups.map(([module, perms]) => (
                  <div key={module}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {titleCase(module)}
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                      {perms.map((p) => (
                        <label
                          key={p.key}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors ${
                            draft.has(p.key)
                              ? 'border-primary/50 bg-primary/5'
                              : 'hover:bg-accent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={draft.has(p.key)}
                            onChange={() => toggle(p.key)}
                            className="size-3.5 accent-[var(--primary)]"
                          />
                          <span className="truncate" title={p.key}>
                            {p.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <Button
                  disabled={saveMutation.isPending}
                  onClick={async () => {
                    if (role) {
                      await saveMutation.mutateAsync({
                        roleId: role.id,
                        permissions: [...draft],
                      });
                    }
                  }}
                >
                  <Save className="size-4" />
                  {saveMutation.isPending ? 'Saving…' : 'Save permissions'}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
