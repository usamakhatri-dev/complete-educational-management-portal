import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, BookOpen, Trash2, Pencil } from 'lucide-react';
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
import type { Paginated, Subject } from '../../types';

export function SubjectsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Subject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', credits: '1', isElective: false });

  const query = useQuery({
    queryKey: ['subjects', { search, page }],
    queryFn: () =>
      unwrap<Paginated<Subject>>(
        api.get('/academics/subjects', { params: { search: search || undefined, page, limit: 10 } }),
      ),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['subjects'] });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/academics/subjects', payload),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/academics/subjects/${v.id}`, v.data),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academics/subjects/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditItem(null);
    setForm({ name: '', code: '', description: '', credits: '1', isElective: false });
  }

  function openCreate() {
    setForm({ name: '', code: '', description: '', credits: '1', isElective: false });
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(s: Subject) {
    setForm({
      name: s.name,
      code: s.code,
      description: s.description || '',
      credits: String(s.credits),
      isElective: s.isElective,
    });
    setEditItem(s);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const payload: Record<string, unknown> = {
      name: form.name,
      code: form.code,
      description: form.description || undefined,
      credits: parseInt(form.credits, 10) || 1,
      isElective: form.isElective,
    };
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
            placeholder="Search subjects…"
            value={search}
            className="pl-8"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add Subject
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects found"
          description="Create a subject to define curriculum topics."
          action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Add Subject</Button>}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Credits</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      {s.description && <p className="max-w-[200px] truncate text-xs text-muted-foreground">{s.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{s.code}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell">{s.credits}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={s.isElective ? 'info' : 'secondary'}>
                      {s.isElective ? 'Elective' : 'Core'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{s._count?.classSubjects ?? 0} classes</TableCell>
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
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} subjects</span>
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
        title={editItem ? 'Edit Subject' : 'Create Subject'}
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
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. MATH" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Credits</label>
              <Input type="number" min="1" value={form.credits} onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.isElective}
                  onChange={(e) => setForm((f) => ({ ...f, isElective: e.target.checked }))}
                  className="size-4 rounded border-input"
                />
                Elective subject
              </label>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete subject"
        description={`This will permanently delete "${confirmDelete?.name}". Remove all class assignments, exams, and quizzes first.`}
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
