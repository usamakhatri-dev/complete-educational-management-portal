import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { api, unwrap, getApiError } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { useAuthStore } from '../../stores/auth';
import type { AcademicClass, Subject } from '../../types';

interface QuizQuestion {
  id: string;
  text: string;
  type: string;
  options: string[];
  answer: string;
  marks: number;
}

let qCounter = 0;
const makeQ = (): QuizQuestion => ({
  id: `q-${++qCounter}`,
  text: '',
  type: 'MCQ',
  options: ['', '', '', ''],
  answer: '',
  marks: 1,
});

export default function CreateQuizPage() {
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
    startAt: '',
    durationMinutes: '15',
    totalMarks: '10',
    passMarks: '5',
    shuffleQuestions: false,
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([makeQ()]);

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
    mutationFn: (payload: Record<string, unknown>) => api.post('/quizzes', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      navigate('/quizzes');
    },
    onError: (err: unknown) => setError(getApiError(err)),
  });

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateQuestion = (idx: number, field: keyof QuizQuestion, value: string | number | string[]) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.classId || !form.subjectId) {
      setError('Title, class, and subject are required.');
      return;
    }
    if (questions.some((q) => !q.text.trim())) {
      setError('All questions must have text.');
      return;
    }

    const questionsJson = JSON.stringify(
      questions.map(({ id, ...rest }) => ({
        id: id,
        text: rest.text,
        type: rest.type,
        options: rest.type === 'MCQ' ? rest.options.filter(Boolean) : [],
        answer: rest.answer,
        marks: rest.marks,
      }))
    );

    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      classId: form.classId,
      subjectId: form.subjectId,
      startAt: form.startAt || undefined,
      durationMinutes: parseInt(form.durationMinutes, 10) || 15,
      totalMarks: parseInt(form.totalMarks, 10) || 10,
      passMarks: parseInt(form.passMarks, 10) || 5,
      questionsJson,
      shuffleQuestions: form.shuffleQuestions,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/quizzes" className="rounded-md p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Quiz</h1>
          <p className="text-sm text-muted-foreground">Create a new quiz with questions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quiz Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="e.g. Chapter 3 Quiz" value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optional description"
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

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Start At</Label>
                <Input type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" min="1" max="300" value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Total Marks</Label>
                <Input type="number" min="1" value={form.totalMarks} onChange={(e) => set('totalMarks', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Pass Marks</Label>
                <Input type="number" min="0" value={form.passMarks} onChange={(e) => set('passMarks', e.target.value)} />
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <input
                  type="checkbox"
                  id="shuffle"
                  checked={form.shuffleQuestions}
                  onChange={(e) => set('shuffleQuestions', e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="shuffle" className="cursor-pointer">Shuffle questions</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Questions ({questions.length})</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setQuestions((qs) => [...qs, makeQ()])}>
              <Plus className="mr-1 h-4 w-4" /> Add Question
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Question {idx + 1}</span>
                  {questions.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Question text"
                  value={q.text}
                  onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={q.type} onChange={(e) => updateQuestion(idx, 'type', e.target.value)}>
                      <option value="MCQ">Multiple Choice</option>
                      <option value="SHORT">Short Answer</option>
                      <option value="LONG">Long Answer</option>
                      <option value="TRUE_FALSE">True / False</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Marks</Label>
                    <Input type="number" min="1" value={q.marks} onChange={(e) => updateQuestion(idx, 'marks', parseInt(e.target.value, 10) || 1)} />
                  </div>
                </div>
                {q.type === 'MCQ' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Options</Label>
                    <div className="grid gap-2 md:grid-cols-2">
                      {q.options.map((opt, oIdx) => (
                        <Input
                          key={oIdx}
                          placeholder={`Option ${oIdx + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Correct Answer</Label>
                  <Input
                    placeholder={q.type === 'MCQ' ? 'Enter correct option text' : 'Enter expected answer'}
                    value={q.answer}
                    onChange={(e) => updateQuestion(idx, 'answer', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Quiz
          </Button>
          <Link to="/quizzes">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
