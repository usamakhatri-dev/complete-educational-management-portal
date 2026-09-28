import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Trash2, Pencil } from 'lucide-react';
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
import type { Paginated, Department } from '../../types';

export function DepartmentsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Department | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const query = useQuery({
    queryKey: ['departments', { search, page }],
    queryFn: () =>
      unwrap<Paginated<Department>>(
        api.get('/academics/departments', { params: { search: search || undefined, page, limit: 10 } }),
      ),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['departments'] });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/academics/departments', payload),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/academics/departments/${v.id}`, v.data),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academics/departments/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditItem(null);
    setForm({ name: '', code: '', description: '' });
  }

  function openCreate() {
    setForm({ name: '', code: '', description: '' });
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(dept: Department) {
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setEditItem(dept);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
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
            placeholder="Search departments…"
            value={search}
            className="pl-8"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add Department
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments found"
          description="Create your first department to organize classes and teachers."
          action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Add Department</Button>}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden md:table-cell">Teachers</TableHead>
                <TableHead className="hidden md:table-cell">Classes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell><Badge variant="secondary">{d.code}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{d.description || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">{d._count?.teachers ?? 0}</TableCell>
                  <TableCell className="hidden md:table-cell">{d._count?.classes ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="iconSm" title="Edit" onClick={() => openEdit(d)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="iconSm" title="Delete" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(d)}>
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
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} departments</span>
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
        title={editItem ? 'Edit Department' : 'Create Department'}
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
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Computer Science" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Code</label>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. CS" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete department"
        description={`This will permanently delete "${confirmDelete?.name}". Classes and teachers must be reassigned first.`}
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
