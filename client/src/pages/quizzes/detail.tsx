import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog } from '../../components/ui/dialog';
import { FullPageLoader } from '../../components/ui/spinner';
import { useAuthStore } from '../../stores/auth';
import type { Quiz } from '../../types';

interface QuizQuestion {
  id: string;
  text: string;
  type: string;
  options: string[];
  answer: string;
  marks: number;
}

export default function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canManage = user?.role === 'super_admin' || user?.role === 'teacher';
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: quiz, isLoading, isError } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => unwrap<Quiz>(api.get(`/quizzes/${id}`)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/quizzes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      navigate('/quizzes');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.patch(`/quizzes/${id}`, { isPublished: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quiz', id] });
      qc.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  const questions: QuizQuestion[] = (() => {
    try {
      return JSON.parse(quiz?.questionsJson || '[]');
    } catch {
      return [];
    }
  })();

  if (isLoading) return <FullPageLoader />;
  if (isError || !quiz) {
    return (
      <div className="space-y-6">
        <Link to="/quizzes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Quizzes
        </Link>
        <div className="text-center py-12 text-muted-foreground">Quiz not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/quizzes" className="rounded-md p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{quiz.title}</h1>
          <p className="text-sm text-muted-foreground">{quiz.subject?.name} &middot; {quiz.class?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={quiz.isPublished ? 'success' : 'warning'}>
            {quiz.isPublished ? 'Published' : 'Draft'}
          </Badge>
          {canManage && !quiz.isPublished && (
            <Button variant="outline" size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
            </Button>
          )}
          {canManage && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{quiz.durationMinutes} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Marks</span>
              <span className="font-medium">{quiz.totalMarks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pass Marks</span>
              <span className="font-medium">{quiz.passMarks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Start Time</span>
              <span className="font-medium">{quiz.startAt ? new Date(quiz.startAt).toLocaleString() : 'Anytime'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shuffle Questions</span>
              <span className="font-medium">{quiz.shuffleQuestions ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Submissions</span>
              <span className="font-medium">{quiz._count?.submissions || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{new Date(quiz.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {quiz.description || 'No description provided.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Q{idx + 1}</span>
                  <Badge variant="muted">{q.type}</Badge>
                  <Badge variant="outline">{q.marks} mark{q.marks !== 1 ? 's' : ''}</Badge>
                </div>
                <p className="text-sm">{q.text}</p>
                {q.type === 'MCQ' && q.options.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt, oIdx) => (
                      <span key={oIdx} className="rounded-md bg-muted px-2 py-1 text-xs">
                        {String.fromCharCode(65 + oIdx)}. {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Link to={`/quizzes/${id}/submissions`}>
            <Button>View Submissions</Button>
          </Link>
        </div>
      )}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Quiz" footer={
        <>
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete
          </Button>
        </>
      }>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this quiz? This action cannot be undone.
        </p>
      </Dialog>
    </div>
  );
}
