import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Megaphone, Pin, Trash2 } from 'lucide-react';
import { api, unwrap, getApiError } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { useAuthStore } from '../../stores/auth';
import type { Announcement } from '../../types';

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'super_admin' || role === 'teacher';

  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', content: '', audience: 'ALL', type: 'ANNOUNCEMENT', isPinned: false });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['announcements', page, audienceFilter],
    queryFn: () => unwrap<{ data: Announcement[]; meta: any }>(api.get('/announcements', { params: { page, limit: 10, ...(audienceFilter !== 'all' && { audience: audienceFilter }) } })),
  });

  const createMutation = useMutation({
    mutationFn: (dto: typeof createForm) => api.post('/announcements', dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); setShowCreate(false); setCreateForm({ title: '', content: '', audience: 'ALL', type: 'ANNOUNCEMENT', isPinned: false }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const announcements = data?.data || [];
  const meta = data?.meta;

  const filtered = announcements.filter((a: Announcement) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">{canManage ? 'Create and manage announcements' : 'View announcements'}</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />New Announcement</Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{meta?.total || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pinned</CardTitle>
            <Pin className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{announcements.filter((a: Announcement) => a.isPinned).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{announcements.filter((a: Announcement) => a.expiresAt && new Date(a.expiresAt) < new Date()).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search announcements..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={audienceFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAudienceFilter(e.target.value)}>
              <option value="all">All Audience</option>
              <option value="ALL">Everyone</option>
              <option value="TEACHERS">Teachers</option>
              <option value="STUDENTS">Students</option>
              <option value="CLASS">Class</option>
              <option value="SECTION">Section</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : isError ? (
            <div className="text-center py-8 text-red-500">Failed to load announcements. Please try again.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No announcements found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((ann: Announcement) => {
                const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date();
                return (
                  <div key={ann.id} className={`p-4 border rounded-lg transition-colors ${ann.isPinned ? 'border-blue-200 bg-blue-50/50' : 'hover:bg-muted/50'} ${isExpired ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {ann.isPinned && <Pin className="h-4 w-4 text-blue-500" />}
                          <h3 className="font-medium">{ann.title}</h3>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">{ann.audience}</span>
                          {isExpired && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Expired</span>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                        <div className="text-xs text-muted-foreground mt-2">
                          Published {new Date(ann.publishDate).toLocaleDateString()}
                          {ann.class && ` | ${ann.class.name}`}
                          {ann.section && ` - ${ann.section.name}`}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this announcement?')) deleteMutation.mutate(ann.id); }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">New Announcement</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={createForm.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Announcement title..." />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <textarea className="w-full border rounded-md p-2 min-h-[120px]" value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })} placeholder="Announcement content..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Audience</label>
                  <Select value={createForm.audience} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreateForm({ ...createForm, audience: e.target.value })}>
                    <option value="ALL">Everyone</option>
                    <option value="TEACHERS">Teachers</option>
                    <option value="STUDENTS">Students</option>
                    <option value="CLASS">Specific Class</option>
                    <option value="SECTION">Specific Section</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={createForm.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreateForm({ ...createForm, type: e.target.value })}>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="NOTICE">Notice</option>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={createForm.isPinned} onChange={(e) => setCreateForm({ ...createForm, isPinned: e.target.checked })} />
                <span className="text-sm font-medium">Pin this announcement</span>
              </label>
              {createMutation.isError && <p className="text-sm text-red-500">{getApiError(createMutation.error)}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate(createForm)} disabled={!createForm.title || !createForm.content || createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
