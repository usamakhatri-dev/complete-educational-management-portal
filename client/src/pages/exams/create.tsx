import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api, unwrap, getApiError } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { useAuthStore } from '../../stores/auth';
import type { AcademicClass, Subject, Session } from '../../types';

const EXAM_TYPES = [
  'UNIT_TEST', 'MONTHLY_TEST', 'MID_TERM', 'FINAL',
  'PRACTICAL', 'ASSIGNMENT', 'PROJECT', 'ONLINE_TEST', 'OFFLINE_TEST',
];

const GRADING_MODES = ['PERCENTAGE', 'GRADE', 'GPA'];

export default function CreateExamPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === 'teacher';
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'MID_TERM',
    sessionId: '',
    classId: '',
    subjectId: '',
    startDate: '',
    endDate: '',
    totalMarks: '100',
    passMarks: '33',
    weight: '1',
    gradingMode: 'PERCENTAGE',
  });

  const { data: classes } = useQuery({
    queryKey: isTeacher ? ['teacher-classes'] : ['classes'],
    queryFn: () =>
      isTeacher
        ? unwrap<{ classes: AcademicClass[]; subjects: Subject[] }>(api.get('/teacher-academics/my-class-subjects')).then((d) => ({ data: d.classes }))
        : unwrap<{ data: AcademicClass[] }>(api.get('/academics/classes', { params: { limit: 100 } })),
  });

  const { data: subjects } = useQuery({
    queryKey: isTeacher ? ['teacher-subjects'] : ['subjects'],
    queryFn: () =>
      isTeacher
        ? unwrap<{ classes: AcademicClass[]; subjects: Subject[] }>(api.get('/teacher-academics/my-class-subjects')).then((d) => ({ data: d.subjects }))
        : unwrap<{ data: Subject[] }>(api.get('/academics/subjects', { params: { limit: 100 } })),
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => unwrap<{ data: Session[] }>(api.get('/academics/sessions', { params: { limit: 100 } })),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/exams', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      navigate('/exams');
    },
    onError: (err: unknown) => setError(getApiError(err)),
  });

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.sessionId || !form.classId || !form.subjectId || !form.startDate || !form.endDate) {
      setError('Name, session, class, subject, start date, and end date are required.');
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      type: form.type,
      sessionId: form.sessionId,
      classId: form.classId,
      subjectId: form.subjectId,
      startDate: form.startDate,
      endDate: form.endDate,
      totalMarks: parseInt(form.totalMarks, 10) || 100,
      passMarks: parseInt(form.passMarks, 10) || 33,
      weight: parseInt(form.weight, 10) || 1,
      gradingMode: form.gradingMode,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/exams" className="rounded-md p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Exam</h1>
          <p className="text-sm text-muted-foreground">Schedule a new examination</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-2">
              <Label>Exam Name *</Label>
              <Input
                placeholder="e.g. Mid-Term Examination 2026"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {EXAM_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grading Mode</Label>
                <Select value={form.gradingMode} onChange={(e) => set('gradingMode', e.target.value)}>
                  {GRADING_MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Session *</Label>
                <Select value={form.sessionId} onChange={(e) => set('sessionId', e.target.value)} required>
                  <option value="">Select session</option>
                  {sessions?.data?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={form.classId} onChange={(e) => set('classId', e.target.value)} required>
                  <option value="">Select class</option>
                  {classes?.data?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={form.subjectId} onChange={(e) => set('subjectId', e.target.value)} required>
                  <option value="">Select subject</option>
                  {subjects?.data?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Total Marks</Label>
                <Input type="number" min="1" value={form.totalMarks} onChange={(e) => set('totalMarks', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pass Marks</Label>
                <Input type="number" min="0" value={form.passMarks} onChange={(e) => set('passMarks', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input type="number" min="1" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Exam
              </Button>
              <Link to="/exams">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
