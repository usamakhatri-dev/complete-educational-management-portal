import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CalendarRange, Trash2, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog } from '../../components/ui/dialog';
import { Spinner } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { formatDate } from '../../lib/utils';
import type { Paginated, Session } from '../../types';

export function SessionsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Session | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Session | null>(null);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isActive: false });

  const query = useQuery({
    queryKey: ['sessions', { search, page }],
    queryFn: () =>
      unwrap<Paginated<Session>>(
        api.get('/academics/sessions', { params: { search: search || undefined, page, limit: 10 } }),
      ),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['sessions'] });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/academics/sessions', payload),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/academics/sessions/${v.id}`, v.data),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academics/sessions/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditItem(null);
    setForm({ name: '', startDate: '', endDate: '', isActive: false });
  }

  function openCreate() {
    setForm({ name: '', startDate: '', endDate: '', isActive: false });
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(s: Session) {
    setForm({
      name: s.name,
      startDate: s.startDate?.slice(0, 10) || '',
      endDate: s.endDate?.slice(0, 10) || '',
      isActive: s.isActive,
    });
    setEditItem(s);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const payload = { ...form };
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  }

  const data = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sessions…"
            value={search}
            className="pl-8"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add Session
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No sessions found"
          description="Create an academic session to organize classes and exams."
          action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Add Session</Button>}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Classes</TableHead>
                <TableHead className="hidden md:table-cell">Enrollments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(s.startDate)} — {formatDate(s.endDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'success' : 'secondary'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{s._count?.classes ?? 0}</TableCell>
                  <TableCell className="hidden md:table-cell">{s._count?.enrollments ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="iconSm" title="Edit" onClick={() => openEdit(s)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="iconSm" title="Delete" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(s)}>
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
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} sessions</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editItem ? 'Edit Session' : 'Create Session'}
        footer={
          <>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button disabled={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. 2026-2027" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Start Date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End Date</label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className="inline-flex items-center gap-2 text-sm"
            >
              {form.isActive ? <ToggleRight className="size-5 text-primary" /> : <ToggleLeft className="size-5 text-muted-foreground" />}
              {form.isActive ? 'Active (current session)' : 'Inactive'}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete session"
        description={`This will permanently delete "${confirmDelete?.name}". Classes and enrollments must be removed first.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => confirmDelete && deleteMutation.mutateAsync(confirmDelete.id)}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      />
    </div>
  );
}
