import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { PageHeader } from '../../components/layout/page-header';
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
import { formatDateTime } from '../../lib/utils';
import type { PageMeta } from '../../types';

interface LoginEntry {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  device?: string | null;
  success: boolean;
  reason?: string | null;
  createdAt: string;
  user?: { id: string; email: string; fullName: string } | null;
}

export default function LoginHistoryPage() {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['audit', 'login-history', page],
    queryFn: () =>
      unwrap<{ data: LoginEntry[]; meta: PageMeta }>(
        api.get('/audit/login-history', { params: { page, limit: 15 } }),
      ),
  });

  const meta = query.data?.meta;

  return (
    <div>
      <PageHeader
        title="Login History"
        description="Every sign-in attempt across the portal, successful or otherwise."
      />

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !query.data?.data.length ? (
        <EmptyState icon={LogIn} title="No sign-in activity yet" />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="hidden lg:table-cell">IP address</TableHead>
                <TableHead className="hidden xl:table-cell">Device / agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{entry.user?.fullName ?? 'Unknown'}</span>
                    <p className="text-xs text-muted-foreground">{entry.user?.email ?? '—'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.success ? 'success' : 'destructive'}>
                      {entry.success ? 'Success' : entry.reason ?? 'Failed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                    {entry.ipAddress ?? '—'}
                  </TableCell>
                  <TableCell className="hidden max-w-64 truncate text-xs text-muted-foreground xl:table-cell">
                    {entry.userAgent ?? '—'}
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
