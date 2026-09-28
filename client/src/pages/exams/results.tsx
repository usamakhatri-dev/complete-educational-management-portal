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
import type { ExamResult } from '../../types';

export default function ExamResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-results', id, page, statusFilter],
    queryFn: () =>
      unwrap<{ data: ExamResult[]; meta: any }>(
        api.get(`/exams/${id}/results`, {
          params: { page, limit: 10, ...(statusFilter && { status: statusFilter }) },
        }),
      ),
    enabled: !!id,
  });

  const results = data?.data || [];
  const meta = data?.meta;

  const filtered = results.filter((r: ExamResult) =>
    r.student?.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    r.student?.rollNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'info' | 'muted'> = {
      DRAFT: 'muted',
      SUBMITTED: 'info',
      APPROVED: 'warning',
      PUBLISHED: 'success',
    };
    return <Badge variant={variants[status] || 'muted'}>{status}</Badge>;
  };

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/exams/${id}`} className="rounded-md p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exam Results</h1>
          <p className="text-sm text-muted-foreground">{meta?.total || 0} total results</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
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
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="text-center py-8 text-red-500">Failed to load results.</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No results yet" description="Results haven't been entered for this exam yet." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((result: ExamResult) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.student?.user?.fullName || 'Unknown'}</TableCell>
                      <TableCell>{result.student?.rollNumber || '-'}</TableCell>
                      <TableCell>{statusBadge(result.status)}</TableCell>
                      <TableCell>
                        {result.marksObtained != null
                          ? `${result.marksObtained} / ${result.exam?.totalMarks || '?'}`
                          : '-'}
                      </TableCell>
                      <TableCell>{result.grade || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{result.remark || '-'}</TableCell>
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
