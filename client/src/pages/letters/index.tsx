import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MessageSquareText, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { api, unwrap, getApiError } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { useAuthStore } from '../../stores/auth';
import type { LetterRequest } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
};

const TYPE_LABELS: Record<string, string> = {
  LEAVE: 'Leave Request',
  COMPLAINT: 'Complaint',
  APPEAL: 'Appeal',
  CORRECTION_REQUEST: 'Correction',
  SUBJECT_CHANGE: 'Subject Change',
  GENERAL: 'General',
  SUGGESTION: 'Suggestion',
  DOCUMENT_UPLOAD: 'Document',
};

export default function LettersPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isStudent = role === 'student';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<LetterRequest | null>(null);
  const [showRespond, setShowRespond] = useState(false);
  const [respondStatus, setRespondStatus] = useState('UNDER_REVIEW');
  const [respondMessage, setRespondMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['letters', page, statusFilter, typeFilter],
    queryFn: () => unwrap<{ data: LetterRequest[]; meta: any }>(api.get('/letters', { params: { page, limit: 10, ...(statusFilter !== 'all' && { status: statusFilter }), ...(typeFilter !== 'all' && { type: typeFilter }) } })),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { type: string; title: string; content: string }) => api.post('/letters', dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setShowCreate(false); },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, message, status }: { id: string; message: string; status?: string }) =>
      api.post(`/letters/${id}/respond`, { message, status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['letters'] }); setShowRespond(false); setSelectedLetter(null); setRespondMessage(''); },
  });

  const letters = data?.data || [];
  const meta = data?.meta;

  const filtered = letters.filter((l: LetterRequest) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.trackingNumber.toLowerCase().includes(search.toLowerCase())
  );

  const [createForm, setCreateForm] = useState({ type: 'GENERAL', title: '', content: '' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Letters & Appeals</h1>
          <p className="text-muted-foreground">{isStudent ? 'Submit and track your requests' : 'Manage student letters and appeals'}</p>
        </div>
        {isStudent && (
          <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />New Request</Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{meta?.total || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{letters.filter((l: LetterRequest) => l.status === 'PENDING').length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{letters.filter((l: LetterRequest) => l.status === 'APPROVED').length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{letters.filter((l: LetterRequest) => l.status === 'REJECTED').length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isStudent ? 'My Requests' : 'All Letters'}</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by title or tracking number..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">In Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
            </Select>
            <Select value={typeFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="LEAVE">Leave</option>
              <option value="COMPLAINT">Complaint</option>
              <option value="APPEAL">Appeal</option>
              <option value="GENERAL">General</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No letters found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((letter: LetterRequest) => (
                <div key={letter.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{letter.title}</h3>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{letter.trackingNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[letter.status] || 'bg-gray-100 text-gray-800'}`}>{letter.status.replace('_', ' ')}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">{TYPE_LABELS[letter.type] || letter.type}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {letter.student?.user?.fullName} | Submitted {new Date(letter.submittedAt).toLocaleDateString()}
                    </div>
                    {letter.timeline && letter.timeline.length > 0 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Latest: {letter.timeline[0].message.substring(0, 80)}...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLetter(letter)}><Eye className="h-4 w-4 mr-1" />View</Button>
                    {!isStudent && letter.status !== 'APPROVED' && letter.status !== 'REJECTED' && (
                      <Button variant="outline" size="sm" onClick={() => { setSelectedLetter(letter); setShowRespond(true); }}>Respond</Button>
                    )}
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">New Letter / Appeal</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={createForm.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreateForm({ ...createForm, type: e.target.value })}>
                  <option value="LEAVE">Leave Request</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="APPEAL">Appeal</option>
                  <option value="CORRECTION_REQUEST">Correction</option>
                  <option value="SUBJECT_CHANGE">Subject Change</option>
                  <option value="GENERAL">General</option>
                  <option value="SUGGESTION">Suggestion</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={createForm.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Brief title..." />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <textarea className="w-full border rounded-md p-2 min-h-[120px]" value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })} placeholder="Describe your request..." />
              </div>
              {createMutation.isError && <p className="text-sm text-red-500">{getApiError(createMutation.error)}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate(createForm)} disabled={!createForm.title || !createForm.content || createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedLetter && !showRespond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedLetter.title}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLetter(null)}>X</Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{selectedLetter.trackingNumber}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selectedLetter.status]}`}>{selectedLetter.status.replace('_', ' ')}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">{TYPE_LABELS[selectedLetter.type]}</span>
              </div>
              <p className="text-muted-foreground">{selectedLetter.content}</p>
              {selectedLetter.timeline && selectedLetter.timeline.length > 0 && (
                <div>
                  <h3 className="font-medium mt-4 mb-2">Timeline</h3>
                  <div className="space-y-2">
                    {selectedLetter.timeline.map((t) => (
                      <div key={t.id} className="border-l-2 border-blue-200 pl-3 py-1">
                        <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()} - {t.actorRole}</div>
                        <p>{t.message}</p>
                        {t.newStatus && <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.newStatus] || 'bg-gray-100 text-gray-800'}`}>{t.newStatus.replace('_', ' ')}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRespond && selectedLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Respond to: {selectedLetter.title}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Update Status</label>
                <Select value={respondStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRespondStatus(e.target.value)}>
                  <option value="UNDER_REVIEW">In Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="COMPLETED">Completed</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Response</label>
                <textarea className="w-full border rounded-md p-2 min-h-[100px]" value={respondMessage} onChange={(e) => setRespondMessage(e.target.value)} placeholder="Enter your response..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowRespond(false); setRespondMessage(''); }}>Cancel</Button>
                <Button onClick={() => respondMutation.mutate({ id: selectedLetter.id, message: respondMessage, status: respondStatus })} disabled={!respondMessage || respondMutation.isPending}>
                  {respondMutation.isPending ? 'Sending...' : 'Send Response'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
