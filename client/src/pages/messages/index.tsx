import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Inbox, Mail, MailOpen, Search, ArrowLeft } from 'lucide-react';
import { api, unwrap, getApiError } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import type { Message } from '../../types';

export default function MessagesPage() {
  const qc = useQueryClient();
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composeForm, setComposeForm] = useState({ recipientId: '', subject: '', body: '' });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['messages', folder, page],
    queryFn: () => unwrap<{ data: Message[]; meta: any }>(api.get(`/messages/${folder}`, { params: { page, limit: 15 } })),
  });

  const sendMutation = useMutation({
    mutationFn: (dto: typeof composeForm) => api.post('/messages', dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setShowCompose(false); setComposeForm({ recipientId: '', subject: '', body: '' }); },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.post(`/messages/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });

  const messages = data?.data || [];
  const meta = data?.meta;

  const filtered = messages.filter((m: Message) =>
    m.subject.toLowerCase().includes(search.toLowerCase()) ||
    m.body.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = messages.filter((m: Message) => !m.isRead).length;

  if (selectedMessage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <h1 className="text-2xl font-bold">{selectedMessage.subject}</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <div>
                <p className="text-sm text-muted-foreground">
                  From: <span className="font-medium text-foreground">{selectedMessage.sender?.fullName || 'Unknown'}</span>
                  {selectedMessage.sender?.role && <span className="ml-2 text-xs text-muted-foreground">({selectedMessage.sender.role})</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  To: <span className="font-medium text-foreground">{selectedMessage.recipient?.fullName || 'Unknown'}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
            </div>
            <div className="whitespace-pre-wrap text-sm">{selectedMessage.body}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Inbox'}</p>
        </div>
        <Button onClick={() => setShowCompose(true)}><Send className="mr-2 h-4 w-4" />Compose</Button>
      </div>

      <div className="flex gap-4">
        <div className="flex gap-2">
          <Button variant={folder === 'inbox' ? 'default' : 'outline'} size="sm" onClick={() => { setFolder('inbox'); setPage(1); }}>
            <Inbox className="mr-2 h-4 w-4" />Inbox
          </Button>
          <Button variant={folder === 'sent' ? 'default' : 'outline'} size="sm" onClick={() => { setFolder('sent'); setPage(1); }}>
            <Send className="mr-2 h-4 w-4" />Sent
          </Button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search messages..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : isError ? (
            <div className="text-center py-8 text-red-500">Failed to load messages. Please try again.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              {folder === 'inbox' ? 'No messages in inbox' : 'No sent messages'}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((msg: Message) => {
                const otherParty = folder === 'inbox' ? msg.sender : msg.recipient;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${msg.isRead ? 'hover:bg-muted/50' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                    onClick={() => { if (folder === 'inbox' && !msg.isRead) markReadMutation.mutate(msg.id); setSelectedMessage(msg); }}
                  >
                    {folder === 'inbox' && !msg.isRead ? (
                      <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${msg.isRead ? '' : 'font-semibold'}`}>{msg.subject}</span>
                        {!msg.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {folder === 'inbox' ? `From: ${otherParty?.fullName}` : `To: ${otherParty?.fullName}`} - {msg.body.substring(0, 80)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                );
              })}
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

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">New Message</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Recipient ID</label>
                <Input value={composeForm.recipientId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComposeForm({ ...composeForm, recipientId: e.target.value })} placeholder="User ID of recipient..." />
              </div>
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input value={composeForm.subject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComposeForm({ ...composeForm, subject: e.target.value })} placeholder="Message subject..." />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea className="w-full border rounded-md p-2 min-h-[120px]" value={composeForm.body} onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })} placeholder="Type your message..." />
              </div>
              {sendMutation.isError && <p className="text-sm text-red-500">{getApiError(sendMutation.error)}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
                <Button onClick={() => sendMutation.mutate(composeForm)} disabled={!composeForm.recipientId || !composeForm.subject || !composeForm.body || sendMutation.isPending}>
                  {sendMutation.isPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
