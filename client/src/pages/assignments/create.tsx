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
import type { AcademicClass, Subject } from '../../types';

export default function CreateAssignmentPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === 'teacher';
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    dueDate: '',
    totalMarks: '20',
    allowLate: false,
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

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/assignments', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      navigate('/assignments');
    },
    onError: (err: unknown) => setError(getApiError(err)),
  });

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.classId || !form.subjectId) {
      setError('Title, class, and subject are required.');
      return;
    }
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      classId: form.classId,
      subjectId: form.subjectId,
      dueDate: form.dueDate || undefined,
      totalMarks: form.totalMarks ? parseInt(form.totalMarks, 10) : undefined,
      allowLate: form.allowLate,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/assignments" className="rounded-md p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Assignment</h1>
          <p className="text-sm text-muted-foreground">Add a new assignment for your class</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Chapter 5 Homework"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optional instructions or description"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                <Label>Due Date</Label>
                <Input
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Marks</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.totalMarks}
                  onChange={(e) => set('totalMarks', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowLate"
                checked={form.allowLate}
                onChange={(e) => set('allowLate', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="allowLate" className="cursor-pointer">Allow late submissions</Label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Assignment
              </Button>
              <Link to="/assignments">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
