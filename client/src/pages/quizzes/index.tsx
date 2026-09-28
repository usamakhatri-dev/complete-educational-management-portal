import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import type { Quiz } from '../../types';

export default function QuizzesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['quizzes', page],
    queryFn: () => unwrap<{ data: Quiz[]; meta: any }>(api.get('/quizzes', { params: { page, limit: 10 } })),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/quizzes/${id}`, { isPublished: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  });

  const quizzes = data?.data || [];
  const meta = data?.meta;

  const filtered = quizzes.filter((q: Quiz) =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.subject?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">Manage quizzes and track student attempts</p>
        </div>
        <Link to="/quizzes/new">
          <Button><Plus className="mr-2 h-4 w-4" />Create Quiz</Button>
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
          <CardContent><div className="text-2xl font-bold">{quizzes.filter((q: Quiz) => q.isPublished).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{quizzes.reduce((acc: number, q: Quiz) => acc + (q._count?.submissions || 0), 0)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quizzes</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search quizzes..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No quizzes found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((quiz: Quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{quiz.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${quiz.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {quiz.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {quiz.subject?.name} | {quiz.class?.name} | {quiz.durationMinutes} min | {quiz.totalMarks} marks
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Submissions: {quiz._count?.submissions || 0} | Start: {quiz.startAt ? new Date(quiz.startAt).toLocaleString() : 'Anytime'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!quiz.isPublished && (
                      <Button variant="outline" size="sm" onClick={() => publishMutation.mutate(quiz.id)}>Publish</Button>
                    )}
                    <Link to={`/quizzes/${quiz.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                    <Link to={`/quizzes/${quiz.id}/submissions`}><Button variant="ghost" size="sm">Submissions</Button></Link>
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
