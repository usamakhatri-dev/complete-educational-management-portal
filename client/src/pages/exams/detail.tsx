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
import type { Exam } from '../../types';

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canManage = user?.role === 'super_admin' || user?.role === 'teacher';
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: exam, isLoading, isError } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => unwrap<Exam>(api.get(`/exams/${id}`)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/exams/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      navigate('/exams');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/exams/${id}/publish`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });

  if (isLoading) return <FullPageLoader />;
  if (isError || !exam) {
    return (
      <div className="space-y-6">
        <Link to="/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Exams
        </Link>
        <div className="text-center py-12 text-muted-foreground">Exam not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/exams" className="rounded-md p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{exam.name}</h1>
          <p className="text-sm text-muted-foreground">{exam.subject?.name} &middot; {exam.class?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={exam.isPublished ? 'success' : 'warning'}>
            {exam.isPublished ? 'Published' : 'Draft'}
          </Badge>
          <Badge variant="info">{exam.type}</Badge>
          {canManage && !exam.isPublished && (
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
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{exam.type.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Session</span>
              <span className="font-medium">{exam.session?.name || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Start</span>
              <span className="font-medium">{new Date(exam.startDate).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">End</span>
              <span className="font-medium">{new Date(exam.endDate).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Marks</span>
              <span className="font-medium">{exam.totalMarks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pass Marks</span>
              <span className="font-medium">{exam.passMarks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Weight</span>
              <span className="font-medium">{exam.weight}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Grading Mode</span>
              <span className="font-medium">{exam.gradingMode}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Results</span>
              <span className="font-medium">{exam._count?.results || 0}</span>
            </div>
          </CardContent>
        </Card>

        {exam.section && (
          <Card>
            <CardHeader>
              <CardTitle>Section</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Section: {exam.section.name}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Link to={`/exams/${id}/results`}>
            <Button>View Results</Button>
          </Link>
        </div>
      )}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Exam" footer={
        <>
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete
          </Button>
        </>
      }>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this exam? This action cannot be undone.
        </p>
      </Dialog>
    </div>
  );
}
