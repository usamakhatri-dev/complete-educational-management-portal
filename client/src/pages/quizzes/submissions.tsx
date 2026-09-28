import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { EmptyState } from '../../components/ui/empty-state';
import { FullPageLoader } from '../../components/ui/spinner';
import type { QuizSubmission } from '../../types';

export default function QuizSubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quiz-submissions', id, page, statusFilter],
    queryFn: () =>
      unwrap<{ data: QuizSubmission[]; meta: any }>(
        api.get('/quizzes/submissions/all', {
          params: { page, limit: 10, quizId: id, ...(statusFilter && { status: statusFilter }) },
        }),
      ),
    enabled: !!id,
  });

  const submissions = data?.data || [];
  const meta = data?.meta;

  const filtered = submissions.filter((s: QuizSubmission) =>
    s.student?.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    s.student?.rollNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'info' | 'muted'> = {
      SUBMITTED: 'info',
      GRADED: 'success',
      TIMED_OUT: 'warning',
    };
    return <Badge variant={variants[status] || 'muted'}>{status}</Badge>;
  };

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/quizzes/${id}`} className="rounded-md p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quiz Submissions</h1>
          <p className="text-sm text-muted-foreground">{meta?.total || 0} total submissions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student name or roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="GRADED">Graded</option>
              <option value="TIMED_OUT">Timed Out</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="text-center py-8 text-red-500">Failed to load submissions.</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No submissions yet" description="Students haven't submitted this quiz yet." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub: QuizSubmission) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.student?.user?.fullName || 'Unknown'}</TableCell>
                      <TableCell>{sub.student?.rollNumber || '-'}</TableCell>
                      <TableCell>{statusBadge(sub.status)}</TableCell>
                      <TableCell>{sub.score} / {sub.quiz?.totalMarks || '?'}</TableCell>
                      <TableCell>{sub.percentage != null ? `${sub.percentage}%` : '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
