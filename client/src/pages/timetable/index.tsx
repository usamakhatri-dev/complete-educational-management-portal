import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Calendar, Trash2, Pencil } from 'lucide-react';
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
import type { Paginated, TimetableSlot, AcademicClass, Section, ClassSubject } from '../../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_MAP: Record<number, string> = { 0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun' };

export default function TimetablePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [dayFilter, setDayFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TimetableSlot | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TimetableSlot | null>(null);
  const [form, setForm] = useState({
    classSubjectId: '',
    sectionId: '',
    dayOfWeek: 0,
    period: 1,
    startTime: '08:00',
    endTime: '08:45',
    room: '',
  });

  const query = useQuery({
    queryKey: ['timetable-slots', { search, classFilter, sectionFilter, dayFilter, page }],
    queryFn: () =>
      unwrap<Paginated<TimetableSlot>>(
        api.get('/timetable/slots', {
          params: {
            search: search || undefined,
            classId: classFilter || undefined,
            sectionId: sectionFilter || undefined,
            dayOfWeek: dayFilter !== '' ? dayFilter : undefined,
            page,
            limit: 20,
          },
        }),
      ),
  });

  const classQuery = useQuery({
    queryKey: ['classes-list'],
    queryFn: () =>
      unwrap<Paginated<AcademicClass>>(
        api.get('/academics/classes', { params: { limit: 100 } }),
      ),
  });

  const sectionQuery = useQuery({
    queryKey: ['sections-list', classFilter],
    queryFn: () =>
      unwrap<Paginated<Section>>(
        api.get('/academics/sections', {
          params: { classId: classFilter || undefined, limit: 100 },
        }),
      ),
    enabled: !!classFilter,
  });

  const classSubjectQuery = useQuery({
    queryKey: ['class-subjects-list', classFilter],
    queryFn: () =>
      unwrap<Paginated<ClassSubject>>(
        api.get('/academics/class-subjects', {
          params: { classId: classFilter || undefined, limit: 100 },
        }),
      ),
    enabled: !!classFilter,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['timetable-slots'] });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/timetable/slots', payload),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/timetable/slots/${v.id}`, v.data),
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/timetable/slots/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditItem(null);
    setForm({
      classSubjectId: '',
      sectionId: '',
      dayOfWeek: 0,
      period: 1,
      startTime: '08:00',
      endTime: '08:45',
      room: '',
    });
  }

  function openCreate() {
    setForm({
      classSubjectId: '',
      sectionId: '',
      dayOfWeek: 0,
      period: 1,
      startTime: '08:00',
      endTime: '08:45',
      room: '',
    });
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(s: TimetableSlot) {
    setForm({
      classSubjectId: s.classSubjectId,
      sectionId: s.sectionId || '',
      dayOfWeek: s.dayOfWeek,
      period: s.period,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room || '',
    });
    setEditItem(s);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const payload = {
      ...form,
      sectionId: form.sectionId || undefined,
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
  const classes = classQuery.data?.data ?? [];
  const sections = sectionQuery.data?.data ?? [];
  const classSubjects = classSubjectQuery.data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timetable</h1>
          <p className="text-muted-foreground">Manage class schedules and time slots</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add Slot
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search timetable…"
            value={search}
            className="pl-8"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value); setSectionFilter(''); setPage(1); }}
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={sectionFilter}
          onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
          disabled={!classFilter}
        >
          <option value="">All Sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={dayFilter}
          onChange={(e) => { setDayFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
        >
          <option value="">All Days</option>
          {DAYS.map((d, idx) => (
            <option key={idx} value={idx}>{d}</option>
          ))}
        </select>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No timetable slots found"
          description="Create your first timetable slot to get started."
          action={<Button size="sm" onClick={openCreate}><Plus className="size-4" /> Add Slot</Button>}
        />
      ) : (
        <>
          {/* Grid View */}
          <div className="mb-6 overflow-x-auto rounded-xl border bg-card shadow-card">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium text-muted-foreground w-20">Period</th>
                  {DAYS.map((day) => (
                    <th key={day} className="p-2 text-left font-medium text-muted-foreground">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((period) => (
                  <tr key={period} className="border-b last:border-0">
                    <td className="p-2 font-medium text-muted-foreground">{period}</td>
                    {DAYS.map((_, dayIdx) => {
                      const slot = data.find((s) => s.dayOfWeek === dayIdx && s.period === period);
                      return (
                        <td key={dayIdx} className="p-1">
                          {slot ? (
                            <div
                              className="cursor-pointer rounded-md border bg-primary/5 p-2 hover:bg-primary/10"
                              onClick={() => openEdit(slot)}
                            >
                              <div className="font-medium text-xs">
                                {slot.classSubject?.subject?.name || 'Subject'}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {slot.classSubject?.class?.name}
                                {slot.section ? ` - ${slot.section.name}` : ''}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {slot.classSubject?.teacher?.user?.fullName}
                              </div>
                              {slot.room && (
                                <div className="text-[10px] text-muted-foreground">
                                  Room: {slot.room}
                                </div>
                              )}
                              <div className="text-[10px] text-muted-foreground">
                                {slot.startTime} - {slot.endTime}
                              </div>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground hover:bg-muted/50"
                              onClick={() => {
                                setForm((f) => ({ ...f, dayOfWeek: dayIdx, period }));
                                setDialogOpen(true);
                              }}
                            >
                              + Add
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table View */}
          <div className="rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="hidden md:table-cell">Time</TableHead>
                  <TableHead className="hidden md:table-cell">Room</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><Badge variant="secondary">{DAY_MAP[s.dayOfWeek]}</Badge></TableCell>
                    <TableCell>{s.period}</TableCell>
                    <TableCell className="font-medium">{s.classSubject?.subject?.name || '—'}</TableCell>
                    <TableCell>{s.classSubject?.class?.name || '—'}</TableCell>
                    <TableCell>{s.classSubject?.teacher?.user?.fullName || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {s.startTime} - {s.endTime}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{s.room || '—'}</TableCell>
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
                <span>Page {meta.page} of {meta.totalPages} · {meta.total} slots</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editItem ? 'Edit Timetable Slot' : 'Create Timetable Slot'}
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
            <label className="mb-1 block text-sm font-medium">Class</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">Select class first</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Class-Subject Assignment</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.classSubjectId}
              onChange={(e) => setForm((f) => ({ ...f, classSubjectId: e.target.value }))}
              disabled={!classFilter}
            >
              <option value="">Select class-subject</option>
              {classSubjects.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.subject?.name} - {cs.teacher?.user?.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Section (Optional)</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.sectionId}
              onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
              disabled={!classFilter}
            >
              <option value="">No section (whole class)</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Day</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.dayOfWeek}
                onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
              >
                {DAYS.map((d, idx) => (
                  <option key={idx} value={idx}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Period</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Start Time</label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End Time</label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Room (Optional)</label>
            <Input
              value={form.room}
              onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
              placeholder="e.g. Room 101"
            />
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete timetable slot"
        description="This will permanently delete this timetable slot."
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
