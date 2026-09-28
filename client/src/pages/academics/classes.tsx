import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, GraduationCap, Trash2, Pencil } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
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
import type { Paginated, AcademicClass, Session, Department } from '../../types';

export function ClassesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AcademicClass | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AcademicClass | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', departmentId: '', sessionId: '', room: '',
  });

  const query = useQuery({
    queryKey: ['classes', { search, sessionId: sessionFilter, page }],
    queryFn: () =>
      unwrap<Paginated<AcademicClass>>(
        api.get('/academics/classes', {
          params: { search: search || undefined, sessionId: sessionFilter || undefined, page, limit: 10 },
        }),
      ),
  });

  const sessionsQuery = useQuery({
    queryKey: ['sessions-list'],
    queryFn: () => unwrap<Paginated<Session>>(api.get('/academics/sessions', { params: { limit: 100 } })),
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => unwrap<Paginated<Department>>(api.get('/academics/departments', { params: { limit: 100 } })),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['classes'] });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/academics/classes', payload),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/academics/classes/${v.id}`, v.data),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academics/classes/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditItem(null);
    setForm({ name: '', code: '', departmentId: '', sessionId: '', room: '' });
  }

  function openCreate() {
    setForm({ name: '', code: '', departmentId: '', sessionId: sessionFilter || '', room: '' });
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(c: AcademicClass) {
    setForm({
      name: c.name,
      code: c.code,
      departmentId: c.departmentId || '',
      sessionId: c.sessionId,
      room: c.room || '',
    });
    setEditItem(c);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const payload: Record<string, unknown> = {
      name: form.name,
      code: form.code,
      sessionId: form.sessionId,
      departmentId: form.departmentId || undefined,
      room: form.room || undefined,
    };
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  }

  const data = query.data?.data ?? [];
  const meta = query.data?.meta;
  const sessions = sessionsQuery.data?.data ?? [];
  const departments = departmentsQuery.data?.data ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search classes…"
            value={search}
            className="pl-8"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={sessionFilter} className="w-44" onChange={(e) => { setSessionFilter(e.target.value); setPage(1); }}>
          <option value="">All sessions</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add Class
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No classes found"
          description="Create a class to start organizing students and subjects."
          action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Add Class</Button>}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead className="hidden md:table-cell">Sections</TableHead>
                <TableHead className="hidden md:table-cell">Subjects</TableHead>
                <TableHead className="hidden md:table-cell">Enrolled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.code}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{c.session?.name ?? '—'}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.department?.name ?? '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">{c._count?.sections ?? 0}</TableCell>
                  <TableCell className="hidden md:table-cell">{c._count?.classSubjects ?? 0}</TableCell>
                  <TableCell className="hidden md:table-cell">{c._count?.enrollments ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="iconSm" title="Edit" onClick={() => openEdit(c)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="iconSm" title="Delete" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(c)}>
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
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} classes</span>
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
        title={editItem ? 'Edit Class' : 'Create Class'}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Grade 10" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. G10" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Session *</label>
            <Select value={form.sessionId} onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}>
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Department</label>
            <Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Room</label>
            <Input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="Optional room" />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete class"
        description={`This will permanently delete "${confirmDelete?.name}". Sections, subjects, and enrollments must be removed first.`}
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
