import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, Trash2, Pencil } from 'lucide-react';
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
import type { Paginated, Student } from '../../types';

const STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED', 'DROPPED'] as const;

export function StudentsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Student | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    password: '',
    rollNumber: '',
    admissionNumber: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: '',
    address: '',
    phone: '',
  });

  const query = useQuery({
    queryKey: ['students', { search, statusFilter, page }],
    queryFn: () =>
      unwrap<Paginated<Student>>(
        api.get('/people/students', {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
            page,
            limit: 10,
          },
        }),
      ),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['students'] });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/people/students', payload),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/people/students/${v.id}`, v.data),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/people/students/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditItem(null);
    setForm({
      email: '',
      fullName: '',
      password: '',
      rollNumber: '',
      admissionNumber: '',
      dob: '',
      gender: '',
      bloodGroup: '',
      guardianName: '',
      guardianPhone: '',
      guardianRelation: '',
      address: '',
      phone: '',
    });
  }

  function openCreate() {
    setForm({
      email: '',
      fullName: '',
      password: '',
      rollNumber: '',
      admissionNumber: '',
      dob: '',
      gender: '',
      bloodGroup: '',
      guardianName: '',
      guardianPhone: '',
      guardianRelation: '',
      address: '',
      phone: '',
    });
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(s: Student) {
    setForm({
      email: s.email,
      fullName: s.fullName,
      password: '',
      rollNumber: s.studentProfile?.rollNumber || '',
      admissionNumber: s.studentProfile?.admissionNumber || '',
      dob: s.studentProfile?.dob ? new Date(s.studentProfile.dob).toISOString().split('T')[0] : '',
      gender: s.studentProfile?.gender || '',
      bloodGroup: s.studentProfile?.bloodGroup || '',
      guardianName: s.studentProfile?.guardianName || '',
      guardianPhone: s.studentProfile?.guardianPhone || '',
      guardianRelation: s.studentProfile?.guardianRelation || '',
      address: s.studentProfile?.address || '',
      phone: s.phone || '',
    });
    setEditItem(s);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (editItem) {
      const data: Record<string, unknown> = {
        fullName: form.fullName,
        rollNumber: form.rollNumber || undefined,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
        guardianName: form.guardianName || undefined,
        guardianPhone: form.guardianPhone || undefined,
        guardianRelation: form.guardianRelation || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
      };
      await updateMutation.mutateAsync({ id: editItem.id, data });
    } else {
      await createMutation.mutateAsync({
        ...form,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
        guardianName: form.guardianName || undefined,
        guardianPhone: form.guardianPhone || undefined,
        guardianRelation: form.guardianRelation || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
      });
    }
  }

  const data = query.data?.data ?? [];
  const meta = query.data?.meta;

  function getStatusColor(status: string) {
    switch (status) {
      case 'ACTIVE': return 'default';
      case 'SUSPENDED': return 'destructive';
      case 'GRADUATED': return 'secondary';
      case 'TRANSFERRED': return 'outline';
      case 'DROPPED': return 'destructive';
      default: return 'default';
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students…"
            value={search}
            className="pl-8"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add Student
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description="Add your first student to get started."
          action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Add Student</Button>}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Roll No.</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead className="hidden md:table-cell">Guardian</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.fullName}</TableCell>
                  <TableCell><Badge variant="secondary">{s.studentProfile?.rollNumber}</Badge></TableCell>
                  <TableCell>{s.studentProfile?.admissionNumber}</TableCell>
                  <TableCell className="hidden md:table-cell">{s.studentProfile?.guardianName || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={getStatusColor(s.studentProfile?.status || 'ACTIVE') as 'default' | 'secondary' | 'destructive' | 'outline'}>
                      {s.studentProfile?.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>
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
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} students</span>
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
        title={editItem ? 'Edit Student' : 'Create Student'}
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
                <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="student@school.com" />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Roll Number</label>
              <Input value={form.rollNumber} onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value.toUpperCase() }))} placeholder="e.g. R-002" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Admission Number</label>
              <Input value={form.admissionNumber} onChange={(e) => setForm((f) => ({ ...f, admissionNumber: e.target.value.toUpperCase() }))} placeholder="e.g. ADM-002" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Date of Birth</label>
              <Input type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Gender</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Blood Group</label>
            <Input value={form.bloodGroup} onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))} placeholder="e.g. O+" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Guardian Name</label>
              <Input value={form.guardianName} onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Guardian Phone</label>
              <Input value={form.guardianPhone} onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Address</label>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Optional" />
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
        title="Delete student"
        description={`This will permanently delete "${confirmDelete?.fullName}". Active enrollments must be removed first.`}
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
