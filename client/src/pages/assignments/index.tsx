import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import type { Assignment } from '../../types';

export default function AssignmentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', page],
    queryFn: () => unwrap<{ data: Assignment[]; meta: any }>(api.get('/assignments', { params: { page, limit: 10 } })),
  });

  const assignments = data?.data || [];
  const meta = data?.meta;

  const filtered = assignments.filter((a: Assignment) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.subject?.name.toLowerCase().includes(search.toLowerCase())
  );

  const isOverdue = (dueDate?: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">Manage assignments and track submissions</p>
        </div>
        <Link to="/assignments/new">
          <Button><Plus className="mr-2 h-4 w-4" />Create Assignment</Button>
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
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{assignments.filter((a: Assignment) => !isOverdue(a.dueDate)).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{assignments.filter((a: Assignment) => isOverdue(a.dueDate)).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search assignments..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No assignments found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((assignment: Assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{assignment.title}</h3>
                      {isOverdue(assignment.dueDate) && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Overdue</span>
                      )}
                      {assignment.allowLate && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Late Allowed</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {assignment.subject?.name} | {assignment.class?.name} | {assignment.totalMarks} marks
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No deadline'} | Submissions: {assignment._count?.submissions || 0}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/assignments/${assignment.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                    <Link to={`/assignments/${assignment.id}/submissions`}><Button variant="ghost" size="sm">Submissions</Button></Link>
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
