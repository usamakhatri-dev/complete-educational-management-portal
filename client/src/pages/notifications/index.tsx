import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck, Search } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import type { Notification } from '../../types';

const TYPE_COLORS: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-800',
  SUCCESS: 'bg-green-100 text-green-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  ALERT: 'bg-red-100 text-red-800',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => unwrap<{ data: Notification[]; meta: any }>(api.get('/notifications', { params: { page, limit: 20 } })),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data || [];
  const meta = data?.meta;

  const filtered = notifications.filter((n: Notification) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.body && n.body.toLowerCase().includes(search.toLowerCase()))
  );

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />Mark All Read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />All Notifications
          </CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search notifications..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : isError ? (
            <div className="text-center py-8 text-red-500">Failed to load notifications. Please try again.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              No notifications
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((n: Notification) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-4 rounded-lg transition-colors cursor-pointer ${n.isRead ? 'bg-background' : 'bg-blue-50/50 border border-blue-100'}`}
                  onClick={() => { if (!n.isRead) markReadMutation.mutate(n.id); }}
                >
                  <div className={`mt-0.5 p-1.5 rounded-full ${TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-800'}`}>
                    <Bell className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm ${n.isRead ? 'font-normal' : 'font-semibold'}`}>{n.title}</h3>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages} ({meta.total} total)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
