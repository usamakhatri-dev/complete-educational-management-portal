import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sun,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  FileBarChart,
  Users,
} from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
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
import type {
  Paginated,
  AttendanceRecord,
  AcademicClass,
  Section,
  Subject,
  Student,
} from '../../types';

const STATUS_OPTIONS = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HOLIDAY'] as const;

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  PRESENT: { color: 'text-green-600 bg-green-50', icon: CheckCircle2, label: 'Present' },
  ABSENT: { color: 'text-red-600 bg-red-50', icon: XCircle, label: 'Absent' },
  LATE: { color: 'text-amber-600 bg-amber-50', icon: Clock, label: 'Late' },
  LEAVE: { color: 'text-blue-600 bg-blue-50', icon: AlertCircle, label: 'Leave' },
  HOLIDAY: { color: 'text-purple-600 bg-purple-50', icon: Sun, label: 'Holiday' },
};

type Tab = 'list' | 'take' | 'reports';

export default function AttendancePage() {
  const { user, permissions } = useAuthStore();
  const role = user?.role;
  const canTake = permissions.includes('attendance.take');
  const canViewAll = permissions.includes('attendance.view-all') || permissions.includes('attendance.reports');
  const canEdit = permissions.includes('attendance.edit');

  const [tab, setTab] = useState<Tab>(canTake ? 'take' : 'list');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">
            {role === 'student'
              ? 'View your attendance records'
              : canTake
                ? 'Mark and manage student attendance'
                : 'View attendance records'}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1">
        <button
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('list')}
        >
          <ClipboardCheck className="mr-2 inline size-4" />
          Attendance List
        </button>
        {canTake && (
          <button
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === 'take' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab('take')}
          >
            <Plus className="mr-2 inline size-4" />
            Take Attendance
          </button>
        )}
        {canViewAll && (
          <button
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === 'reports' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab('reports')}
          >
            <FileBarChart className="mr-2 inline size-4" />
            Reports
          </button>
        )}
      </div>

      {tab === 'list' && <AttendanceList canEdit={canEdit} canViewAll={canViewAll} />}
      {tab === 'take' && <TakeAttendance />}
      {tab === 'reports' && <AttendanceReports />}
    </div>
  );
}

// ──────────────────── Attendance List ────────────────────

function AttendanceList({ canEdit, canViewAll }: { canEdit: boolean; canViewAll: boolean }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<AttendanceRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AttendanceRecord | null>(null);

  const query = useQuery({
    queryKey: ['attendance', { classFilter, sectionFilter, subjectFilter, statusFilter, dateFrom, dateTo, page }],
    queryFn: () =>
      unwrap<Paginated<AttendanceRecord>>(
        api.get('/attendance', {
          params: {
            classId: classFilter || undefined,
            sectionId: sectionFilter || undefined,
            subjectId: subjectFilter || undefined,
            status: statusFilter || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            studentId: user?.role === 'student' ? undefined : undefined,
            page,
            limit: 20,
          },
        }),
      ),
  });

  // Fetch classes for filters
  const classesQuery = useQuery({
    queryKey: ['classes-filter'],
    queryFn: () =>
      unwrap<Paginated<AcademicClass>>(
        api.get('/academics/classes', { params: { limit: 100 } }),
      ),
    enabled: canViewAll,
  });
  const rawClassFilterData = classesQuery.data?.data;
  const classFilterOptions = Array.isArray(rawClassFilterData) ? rawClassFilterData : [];

  const sectionsQuery = useQuery({
    queryKey: ['sections-filter', classFilter],
    queryFn: () =>
      unwrap<Section[]>(
        api.get(`/academics/classes/${classFilter}/sections`),
      ),
    enabled: !!classFilter,
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects-filter', classFilter],
    queryFn: () =>
      unwrap<Subject[]>(
        api.get(`/academics/classes/${classFilter}/subjects`),
      ),
    enabled: !!classFilter,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['attendance'] });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/attendance/${v.id}`, v.data),
    onSuccess: () => { invalidate(); setEditItem(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/attendance/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  const data = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {canViewAll && classesQuery.isError && (
          <p className="w-full text-sm text-destructive">
            Failed to load classes for filters. Please refresh and try again.
          </p>
        )}
        {canViewAll && (
          <> 
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setSectionFilter(''); setSubjectFilter(''); setPage(1); }}
            >
              <option value="">All Classes</option>
              {classFilterOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {classFilter && (
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={sectionFilter}
                onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Sections</option>
                {(sectionsQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            {classFilter && (
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={subjectFilter}
                onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Subjects</option>
                {(subjectsQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </>
        )}
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Calendar className="size-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-36"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-36"
          />
        </div>
      </div>

      {/* Table */}
      {query.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No attendance records"
          description="No attendance records match your filters."
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="hidden md:table-cell">Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Remark</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PRESENT;
                const Icon = cfg.icon;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.student?.user?.fullName ?? '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {r.class?.name ?? '—'}{r.section ? ` / ${r.section.name}` : ''}
                    </TableCell>
                    <TableCell>{r.subject?.name ?? '—'}</TableCell>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.period ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                        <Icon className="size-3" />
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[150px] truncate">{r.remark || '—'}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="iconSm" title="Edit" onClick={() => setEditItem(r)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="iconSm" title="Delete" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(r)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} records</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Attendance"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => editItem && updateMutation.mutateAsync({ id: editItem.id, data: { status: editItem.status, remark: editItem.remark } })}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        {editItem && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={editItem.status}
                onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Remark</label>
              <Input
                value={editItem.remark ?? ''}
                onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
                placeholder="Optional remark"
              />
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete attendance record"
        description="This will permanently delete this attendance record."
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

// ──────────────────── Take Attendance ────────────────────

function TakeAttendance() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('');
  const [records, setRecords] = useState<Record<string, { status: string; remark: string }>>({});
  const [saved, setSaved] = useState(false);

  const classesQuery = useQuery({
    queryKey: ['classes-for-attendance'],
    queryFn: () =>
      unwrap<Paginated<AcademicClass>>(
        api.get('/academics/classes', { params: { limit: 100 } }),
      ),
  });
  const rawClassData = classesQuery.data?.data;
  const classOptions = Array.isArray(rawClassData) ? rawClassData : [];

  const sectionsQuery = useQuery({
    queryKey: ['sections-for-attendance', classId],
    queryFn: () => unwrap<Section[]>(api.get(`/academics/classes/${classId}/sections`)),
    enabled: !!classId,
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects-for-attendance', classId],
    queryFn: () => unwrap<Subject[]>(api.get(`/academics/classes/${classId}/subjects`)),
    enabled: !!classId,
  });

  const studentsQuery = useQuery({
    queryKey: ['students-for-attendance', classId, sectionId],
    queryFn: () =>
      unwrap<Paginated<Student>>(
        api.get('/people/students', {
          params: { classId, sectionId: sectionId || undefined, page: 1, limit: 200 },
        }),
      ),
    enabled: !!classId,
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/attendance/bulk', payload),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['attendance'] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const students = studentsQuery.data?.data ?? [];

  function setAllStatus(status: string) {
    const newRecords: Record<string, { status: string; remark: string }> = {};
    for (const s of students) {
      newRecords[s.id] = { status, remark: records[s.id]?.remark ?? '' };
    }
    setRecords(newRecords);
  }

  function handleSubmit() {
    if (!classId || !subjectId || !date || students.length === 0) return;

    const payload = {
      classId,
      sectionId: sectionId || undefined,
      subjectId,
      date,
      period: period ? parseInt(period) : undefined,
      records: students.map((s) => ({
        studentId: s.studentProfile?.id ?? s.id,
        status: records[s.id]?.status ?? 'PRESENT',
        remark: records[s.id]?.remark || undefined,
      })),
    };

    bulkMutation.mutateAsync(payload);
  }

  return (
    <div className="space-y-6">
      {/* Selection form */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        {classesQuery.isError && (
          <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Failed to load classes. Please refresh and try again.
          </p>
        )}
        <h3 className="mb-4 text-lg font-semibold">Mark Attendance</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Class *</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setSectionId(''); setSubjectId(''); setRecords({}); }}
            >
              <option value="">Select Class</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Section</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={sectionId}
              onChange={(e) => { setSectionId(e.target.value); setRecords({}); }}
              disabled={!classId}
            >
              <option value="">All Sections</option>
              {(sectionsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Subject *</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={!classId}
            >
              <option value="">Select Subject</option>
              {(subjectsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Period</label>
            <Input
              type="number"
              min={1}
              max={12}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Quick actions */}
        {students.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Quick set all:</span>
            {STATUS_OPTIONS.map((s) => (
              <Button key={s} variant="outline" size="sm" onClick={() => setAllStatus(s)}>
                All {STATUS_CONFIG[s].label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Student list */}
      {!classId ? (
        <EmptyState
          icon={Users}
          title="Select a class"
          description="Choose a class to begin marking attendance."
        />
      ) : studentsQuery.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description="No students are enrolled in this class/section."
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden md:table-cell">Roll No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, idx) => {
                const currentStatus = records[s.id]?.status ?? 'PRESENT';
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{s.fullName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary">{s.studentProfile?.rollNumber}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {STATUS_OPTIONS.map((st) => {
                          const sc = STATUS_CONFIG[st];
                          const Icon = sc.icon;
                          return (
                            <button
                              key={st}
                              title={sc.label}
                              className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                                currentStatus === st
                                  ? sc.color
                                  : 'border-transparent text-muted-foreground hover:bg-muted'
                              }`}
                              onClick={() =>
                                setRecords((prev) => ({
                                  ...prev,
                                  [s.id]: { status: st, remark: prev[s.id]?.remark ?? '' },
                                }))
                              }
                            >
                              <Icon className="size-3" />
                            </button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Input
                        value={records[s.id]?.remark ?? ''}
                        onChange={(e) =>
                          setRecords((prev) => ({
                            ...prev,
                            [s.id]: { status: prev[s.id]?.status ?? 'PRESENT', remark: e.target.value },
                          }))
                        }
                        placeholder="Optional"
                        className="h-8 w-40 text-xs"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Submit */}
      {students.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-card">
          <div className="text-sm text-muted-foreground">
            {Object.keys(records).length} of {students.length} students marked
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-green-600 font-medium">Attendance saved!</span>
            )}
            <Button
              disabled={bulkMutation.isPending || !classId || !subjectId}
              onClick={handleSubmit}
            >
              {bulkMutation.isPending ? 'Saving…' : 'Save Attendance'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────── Reports ────────────────────

type ReportView = 'student' | 'class' | 'subject';

function AttendanceReports() {
  const [view, setView] = useState<ReportView>('class');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const classesQuery = useQuery({
    queryKey: ['classes-for-reports'],
    queryFn: () =>
      unwrap<Paginated<AcademicClass>>(
        api.get('/academics/classes', { params: { limit: 100 } }),
      ),
  });
  const rawReportClassData = classesQuery.data?.data;
  const reportClassOptions = Array.isArray(rawReportClassData) ? rawReportClassData : [];

  const studentsQuery = useQuery({
    queryKey: ['students-for-reports'],
    queryFn: () =>
      unwrap<Paginated<Student>>(
        api.get('/people/students', { params: { page: 1, limit: 200 } }),
      ),
  });

  const classReportQuery = useQuery({
    queryKey: ['attendance-class-report', classId, dateFrom, dateTo],
    queryFn: () =>
      api.get(`/attendance/reports/class/${classId}`, {
        params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      }).then((r) => r.data.data),
    enabled: view === 'class' && !!classId,
  });

  const studentReportQuery = useQuery({
    queryKey: ['attendance-student-report', studentId, dateFrom, dateTo],
    queryFn: () =>
      api.get(`/attendance/reports/student/${studentId}`, {
        params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      }).then((r) => r.data.data),
    enabled: view === 'student' && !!studentId,
  });

  const subjectReportQuery = useQuery({
    queryKey: ['attendance-subject-report', classId, dateFrom, dateTo],
    queryFn: () =>
      api.get(`/attendance/reports/subject/${classId}`, {
        params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      }).then((r) => r.data.data),
    enabled: view === 'subject' && !!classId,
  });

  return (
    <div className="space-y-6">
      {/* View selector */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1">
        {[
          { key: 'class' as const, label: 'Class Summary' },
          { key: 'student' as const, label: 'Student Summary' },
          { key: 'subject' as const, label: 'Subject-wise' },
        ].map((v) => (
          <button
            key={v.key}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              view === v.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {classesQuery.isError && (
          <p className="w-full text-sm text-destructive">
            Failed to load classes for reports. Please refresh and try again.
          </p>
        )}
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Select Class</option>
          {reportClassOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {view === 'student' && (
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">Select Student</option>
            {(studentsQuery.data?.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        </div>
      </div>

      {/* Report results */}
      {view === 'class' && classId && (
        <ClassReport data={classReportQuery.data} isLoading={classReportQuery.isLoading} />
      )}
      {view === 'student' && studentId && (
        <StudentReport data={studentReportQuery.data} isLoading={studentReportQuery.isLoading} />
      )}
      {view === 'subject' && classId && (
        <SubjectReport data={subjectReportQuery.data} isLoading={subjectReportQuery.isLoading} />
      )}
      {((view === 'class' && !classId) || (view === 'student' && !studentId) || (view === 'subject' && !classId)) && (
        <EmptyState
          icon={FileBarChart}
          title="Select criteria"
          description="Choose the required filters to generate a report."
        />
      )}
    </div>
  );
}

function SummaryCards({ data }: { data: { total: number; present: number; absent: number; late: number; leave: number; holiday: number; percentage: number } }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      {[
        { label: 'Total', value: data.total, color: 'text-foreground' },
        { label: 'Present', value: data.present, color: 'text-green-600' },
        { label: 'Absent', value: data.absent, color: 'text-red-600' },
        { label: 'Late', value: data.late, color: 'text-amber-600' },
        { label: 'Leave', value: data.leave, color: 'text-blue-600' },
        { label: 'Holiday', value: data.holiday, color: 'text-purple-600' },
        { label: 'Attendance %', value: `${data.percentage}%`, color: 'text-primary' },
      ].map((item) => (
        <div key={item.label} className="rounded-lg border bg-card p-3 text-center shadow-card">
          <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-xs text-muted-foreground">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function ClassReport({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <SummaryCards data={data} />
      {data.studentSummary?.length > 0 && (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-center">Late</TableHead>
                <TableHead className="text-center">Attendance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.studentSummary.map((s: any) => (
                <TableRow key={s.studentId}>
                  <TableCell className="font-medium">{s.studentName}</TableCell>
                  <TableCell className="text-center">{s.total}</TableCell>
                  <TableCell className="text-center text-green-600">{s.present}</TableCell>
                  <TableCell className="text-center text-red-600">{s.absent}</TableCell>
                  <TableCell className="text-center text-amber-600">{s.late}</TableCell>
                  <TableCell className="text-center font-medium">{s.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StudentReport({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <SummaryCards data={data} />
      {data.subjectSummary?.length > 0 && (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-center">Attendance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subjectSummary.map((s: any) => (
                <TableRow key={s.subject.id}>
                  <TableCell className="font-medium">{s.subject.name}</TableCell>
                  <TableCell className="text-center">{s.total}</TableCell>
                  <TableCell className="text-center text-green-600">{s.present}</TableCell>
                  <TableCell className="text-center text-red-600">{s.absent}</TableCell>
                  <TableCell className="text-center font-medium">{s.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SubjectReport({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!data?.length) return <EmptyState icon={FileBarChart} title="No data" description="No subject attendance data found." />;

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead className="text-center">Total</TableHead>
            <TableHead className="text-center">Present</TableHead>
            <TableHead className="text-center">Absent</TableHead>
            <TableHead className="text-center">Late</TableHead>
            <TableHead className="text-center">Leave</TableHead>
            <TableHead className="text-center">Holiday</TableHead>
            <TableHead className="text-center">Attendance %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s: any) => (
            <TableRow key={s.subject.id}>
              <TableCell className="font-medium">{s.subject.name}</TableCell>
              <TableCell className="text-center">{s.total}</TableCell>
              <TableCell className="text-center text-green-600">{s.present}</TableCell>
              <TableCell className="text-center text-red-600">{s.absent}</TableCell>
              <TableCell className="text-center text-amber-600">{s.late}</TableCell>
              <TableCell className="text-center text-blue-600">{s.leave}</TableCell>
              <TableCell className="text-center text-purple-600">{s.holiday}</TableCell>
              <TableCell className="text-center font-medium">{s.percentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
