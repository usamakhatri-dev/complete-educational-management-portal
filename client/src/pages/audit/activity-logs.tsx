import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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
import { formatDateTime, titleCase } from '../../lib/utils';
import type { PageMeta } from '../../types';

interface ActivityLog {
  id: string;
  action: string;
  module: string;
  entityId?: string | null;
  meta?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; email: string; fullName: string } | null;
}

export default function ActivityLogsPage() {
  const [module, setModule] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['audit', 'activity', { module, page }],
    queryFn: () =>
      unwrap<{ data: ActivityLog[]; meta: PageMeta }>(
        api.get('/audit/activity-logs', { params: { module: module || undefined, page, limit: 15 } }),
      ),
  });

  const meta = query.data?.meta;

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        description="Audit trail of every action performed across the portal."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter by module (e.g. users)…"
          value={module}
          className="w-full max-w-xs"
          onChange={(e) => {
            setModule(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !query.data?.data.length ? (
        <EmptyState icon={ScrollText} title="No activity recorded" description="Actions will appear here as users work in the portal." />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead className="hidden lg:table-cell">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.data.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{log.user?.fullName ?? 'System'}</span>
                    <p className="text-xs text-muted-foreground">{log.user?.email ?? '—'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{titleCase(log.action)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{titleCase(log.module)}</Badge>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                    {log.ipAddress ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} events</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
