import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, GraduationCap, Trash2, Pencil } from 'lucide-react';
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
import type { Paginated, Teacher, Department } from '../../types';

export function TeachersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Teacher | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Teacher | null>(null);
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    password: '',
    employeeCode: '',
    qualification: '',
    specialization: '',
    departmentId: '',
    phone: '',
  });

  const query = useQuery({
    queryKey: ['teachers', { search, page }],
    queryFn: () =>
      unwrap<Paginated<Teacher>>(
        api.get('/people/teachers', { params: { search: search || undefined, page, limit: 10 } }),
      ),
  });

  const deptQuery = useQuery({
    queryKey: ['departments-list'],
    queryFn: () =>
      unwrap<Paginated<Department>>(
        api.get('/academics/departments', { params: { limit: 100 } }),
      ),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['teachers'] });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/people/teachers', payload),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/people/teachers/${v.id}`, v.data),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/people/teachers/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditItem(null);
    setForm({ email: '', fullName: '', password: '', employeeCode: '', qualification: '', specialization: '', departmentId: '', phone: '' });
  }

  function openCreate() {
    setForm({ email: '', fullName: '', password: '', employeeCode: '', qualification: '', specialization: '', departmentId: '', phone: '' });
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(t: Teacher) {
    setForm({
      email: t.email,
      fullName: t.fullName,
      password: '',
      employeeCode: t.teacherProfile?.employeeCode || '',
      qualification: t.teacherProfile?.qualification || '',
      specialization: t.teacherProfile?.specialization || '',
      departmentId: t.teacherProfile?.departmentId || '',
      phone: t.phone || '',
    });
    setEditItem(t);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (editItem) {
      const data: Record<string, unknown> = {
        fullName: form.fullName,
        employeeCode: form.employeeCode,
        qualification: form.qualification || undefined,
        specialization: form.specialization || undefined,
        departmentId: form.departmentId || undefined,
        phone: form.phone || undefined,
      };
      await updateMutation.mutateAsync({ id: editItem.id, data });
    } else {
      await createMutation.mutateAsync(form);
    }
  }

  const data = query.data?.data ?? [];
  const meta = query.data?.meta;
  const departments = deptQuery.data?.data ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teachers…"
            value={search}
            className="pl-8"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add Teacher
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No teachers found"
          description="Add your first teacher to get started."
          action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Add Teacher</Button>}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Employee Code</TableHead>
                <TableHead className="hidden md:table-cell">Qualification</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{t.email}</TableCell>
                  <TableCell><Badge variant="secondary">{t.teacherProfile?.employeeCode}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell">{t.teacherProfile?.qualification || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">{t.teacherProfile?.department?.name || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="iconSm" title="Edit" onClick={() => openEdit(t)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="iconSm" title="Delete" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(t)}>
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
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} teachers</span>
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
        title={editItem ? 'Edit Teacher' : 'Create Teacher'}
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
          {!editItem && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="teacher@school.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Full Name</label>
            <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="e.g. John Smith" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Employee Code</label>
            <Input value={form.employeeCode} onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value.toUpperCase() }))} placeholder="e.g. TCH-002" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Qualification</label>
            <Input value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))} placeholder="e.g. M.Sc Mathematics" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Specialization</label>
            <Input value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Department</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Optional" />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete teacher"
        description={`This will permanently delete "${confirmDelete?.fullName}". Any assigned classes must be reassigned first.`}
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
