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
import type { Assignment } from '../../types';

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canManage = user?.role === 'super_admin' || user?.role === 'teacher';
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: assignment, isLoading, isError } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => unwrap<Assignment>(api.get(`/assignments/${id}`)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/assignments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      navigate('/assignments');
    },
  });

  if (isLoading) return <FullPageLoader />;
  if (isError || !assignment) {
    return (
      <div className="space-y-6">
        <Link to="/assignments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Assignments
        </Link>
        <div className="text-center py-12 text-muted-foreground">Assignment not found.</div>
      </div>
    );
  }

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/assignments" className="rounded-md p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{assignment.title}</h1>
          <p className="text-sm text-muted-foreground">{assignment.subject?.name} &middot; {assignment.class?.name}</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Link to={`/assignments/${id}/submissions`}>
              <Button variant="outline" size="sm">Submissions ({assignment._count?.submissions || 0})</Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Marks</span>
              <span className="font-medium">{assignment.totalMarks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Due Date</span>
              <span className="font-medium">
                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'No deadline'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={isOverdue ? 'destructive' : 'success'}>
                {isOverdue ? 'Overdue' : 'Active'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Late Submissions</span>
              <span className="font-medium">{assignment.allowLate ? 'Allowed' : 'Not Allowed'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Submissions</span>
              <span className="font-medium">{assignment._count?.submissions || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{new Date(assignment.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {assignment.description || 'No description provided.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Link to={`/assignments/${id}/submissions`}>
            <Button>View Submissions</Button>
          </Link>
        </div>
      )}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Assignment" footer={
        <>
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete
          </Button>
        </>
      }>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this assignment? This action cannot be undone.
        </p>
      </Dialog>
    </div>
  );
}
