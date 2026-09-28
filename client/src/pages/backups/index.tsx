import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseBackup, Download, Trash2, Plus } from 'lucide-react';
import { api, unwrap, getApiError } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

interface BackupRecord {
  id: string;
  filename: string;
  type: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => unwrap<BackupRecord[]>(api.get('/backups')),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/backups'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['backups'] }); setCreating(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/backups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
  });

  const list = backups || [];
  const completedCount = list.filter((b) => b.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Database Backups</h1><p className="text-muted-foreground">Manage PostgreSQL database backups</p></div>
        <Button onClick={() => { setCreating(true); createMutation.mutate(); }} disabled={creating || createMutation.isPending}>
          <Plus className="mr-2 h-4 w-4" />{createMutation.isPending ? 'Creating...' : 'Create Backup'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Backups</CardTitle><DatabaseBackup className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{list.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{completedCount}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Failed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{list.filter((b) => b.status === 'FAILED').length}</div></CardContent></Card>
      </div>

      {createMutation.isError && <p className="text-sm text-red-500">{getApiError(createMutation.error)}</p>}

      <Card>
        <CardHeader><CardTitle>Backup History</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : list.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No backups yet</div>
          ) : (
            <div className="space-y-3">
              {list.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{b.filename}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${b.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : b.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{b.status}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{b.type}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{formatSize(b.sizeBytes)} | {new Date(b.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status === 'COMPLETED' && (
                      <a href={`/api/backups/${b.id}/download`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Download</Button>
                      </a>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this backup?')) deleteMutation.mutate(b.id); }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
