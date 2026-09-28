import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Layers, Trash2, Pencil } from 'lucide-react';
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
import type { Paginated, Section, AcademicClass } from '../../types';

export function SectionsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Section | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Section | null>(null);
  const [form, setForm] = useState({ name: '', classId: '', room: '' });

  const query = useQuery({
    queryKey: ['sections', { search, classId: classFilter, page }],
    queryFn: () =>
      unwrap<Paginated<Section>>(
        api.get('/academics/sections', {
          params: { search: search || undefined, classId: classFilter || undefined, page, limit: 10 },
        }),
      ),
  });

  const classesQuery = useQuery({
    queryKey: ['classes-list-for-sections'],
    queryFn: () => unwrap<Paginated<AcademicClass>>(api.get('/academics/classes', { params: { limit: 100 } })),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['sections'] });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/academics/sections', payload),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/academics/sections/${v.id}`, v.data),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academics/sections/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditItem(null);
    setForm({ name: '', classId: '', room: '' });
  }

  function openCreate() {
    setForm({ name: '', classId: classFilter || '', room: '' });
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(s: Section) {
    setForm({ name: s.name, classId: s.classId, room: s.room || '' });
    setEditItem(s);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const payload: Record<string, unknown> = {
      name: form.name,
      classId: form.classId,
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
  const classes = classesQuery.data?.data ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sections…"
            value={search}
            className="pl-8"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={classFilter} className="w-44" onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}>
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add Section
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No sections found"
          description="Create a section to subdivide a class into groups."
          action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Add Section</Button>}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="hidden md:table-cell">Room</TableHead>
                <TableHead className="hidden md:table-cell">Enrolled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="secondary">{s.class?.name ?? '—'}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{s.room || '—'}</TableCell>
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
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} sections</span>
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
        title={editItem ? 'Edit Section' : 'Create Section'}
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
            <label className="mb-1 block text-sm font-medium">Class *</label>
            <Select value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}>
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Section Name *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. A" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Room</label>
              <Input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="Optional room" />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete section"
        description={`This will permanently delete section "${confirmDelete?.name}". Enrollments must be removed first.`}
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
