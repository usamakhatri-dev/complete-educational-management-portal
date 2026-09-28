import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import type { Exam } from '../../types';

export default function ExamsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exams', page, typeFilter],
    queryFn: () => unwrap<{ data: Exam[]; meta: any }>(api.get('/exams', { params: { page, limit: 10, ...(typeFilter !== 'all' && { type: typeFilter }) } })),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/exams/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });

  const exams = data?.data || [];
  const meta = data?.meta;

  const filtered = exams.filter((e: Exam) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.subject?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground">Manage examinations and view results</p>
        </div>
        <Link to="/exams/new">
          <Button><Plus className="mr-2 h-4 w-4" />Create Exam</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{meta?.total || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{exams.filter((e: Exam) => e.isPublished).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{exams.filter((e: Exam) => !e.isPublished).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search exams..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="MIDTERM">Midterm</option>
              <option value="FINAL">Final</option>
              <option value="UNIT">Unit Test</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : isError ? (
            <div className="text-center py-8 text-red-500">Failed to load exams. Please try again.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No exams found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((exam: Exam) => (
                <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{exam.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${exam.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {exam.isPublished ? 'Published' : 'Draft'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{exam.type}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {exam.subject?.name} | {exam.class?.name} | {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total: {exam.totalMarks} | Pass: {exam.passMarks} | Results: {exam._count?.results || 0}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!exam.isPublished && (
                      <Button variant="outline" size="sm" onClick={() => publishMutation.mutate(exam.id)}>Publish</Button>
                    )}
                    <Link to={`/exams/${exam.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                    <Link to={`/exams/${exam.id}/results`}><Button variant="ghost" size="sm">Results</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages} ({meta.total} total)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
