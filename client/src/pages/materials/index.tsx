import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, BookOpen, Trash2, Upload,
  Eye, EyeOff, FileText, X, Edit2,
} from 'lucide-react';
import { api, unwrap, getApiError } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { useAuthStore } from '../../stores/auth';
import type { StudyMaterial, AcademicClass, Subject, Section } from '../../types';

export default function MaterialsPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'super_admin' || role === 'teacher';

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<StudyMaterial | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    isPublished: false,
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ id: string; name: string }>>([]);

  const { data: classes } = useQuery({
    queryKey: ['classes-for-materials'],
    queryFn: () => unwrap<{ data: AcademicClass[] }>(api.get('/academics/classes')),
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-for-materials', form.classId],
    queryFn: () => unwrap<{ data: Subject[] }>(api.get('/academics/subjects', { params: form.classId ? { classId: form.classId } : {} })),
  });

  const { data: sections } = useQuery({
    queryKey: ['sections-for-materials', form.classId],
    queryFn: () => form.classId
      ? unwrap<{ data: Section[] }>(api.get(`/academics/classes/${form.classId}/sections`))
      : Promise.resolve({ data: [] }),
    enabled: !!form.classId,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['study-materials', page, classFilter, subjectFilter],
    queryFn: () => unwrap<{ data: { items: StudyMaterial[]; total: number } }>(
      api.get('/study-materials', {
        params: {
          page,
          limit: 10,
          ...(classFilter && { classId: classFilter }),
          ...(subjectFilter && { subjectId: subjectFilter }),
        },
      }),
    ),
  });

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('module', 'material');
    const res = await api.post('/files/upload', fd);
    return res.data.data;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadFile(file);
        setAttachedFiles((prev) => [...prev, { id: uploaded.id, name: uploaded.originalName }]);
      }
    } catch (err) {
      alert(getApiError(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const createMutation = useMutation({
    mutationFn: (dto: typeof form & { fileIds?: string[] }) =>
      api.post('/study-materials', { ...dto, fileIds: attachedFiles.map((f) => f.id) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-materials'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...dto }: typeof form & { id: string; fileIds?: string[] }) =>
      api.patch(`/study-materials/${id}`, { ...dto, fileIds: attachedFiles.map((f) => f.id) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-materials'] });
      resetForm();
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/study-materials/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-materials'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/study-materials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-materials'] }),
  });

  const resetForm = () => {
    setForm({ title: '', description: '', classId: '', sectionId: '', subjectId: '', isPublished: false });
    setAttachedFiles([]);
    setShowCreate(false);
    setEditing(null);
  };

  const startEdit = (m: StudyMaterial) => {
    setEditing(m);
    setForm({
      title: m.title,
      description: m.description || '',
      classId: m.classId,
      sectionId: m.sectionId || '',
      subjectId: m.subjectId,
      isPublished: m.isPublished,
    });
    if (m.fileIds) {
      try { setAttachedFiles(JSON.parse(m.fileIds)); } catch { setAttachedFiles([]); }
    } else {
      setAttachedFiles([]);
    }
    setShowCreate(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.classId || !form.subjectId) return;
    if (editing) {
      updateMutation.mutate({ ...form, id: editing.id });
    } else {
      createMutation.mutate(form);
    }
  };

  const materials = data?.data?.items || data?.data || [];
  const meta = data?.data?.total ? { total: data.data.total } : undefined;

  const filtered = Array.isArray(materials)
    ? materials.filter((m: StudyMaterial) =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.description?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const getClassOptions = () => {
    const list = classes?.data || [];
    return list.map((c: AcademicClass) => ({ value: c.id, label: `${c.name} (${c.code})` }));
  };

  const getSubjectOptions = () => {
    const list = subjects?.data || [];
    return list.map((s: Subject) => ({ value: s.id, label: `${s.name} (${s.code})` }));
  };

  const getSectionOptions = () => {
    const list = sections?.data || [];
    return list.map((s: Section) => ({ value: s.id, label: s.name }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
          <p className="text-muted-foreground">{canManage ? 'Manage study materials and resources' : 'View study materials for your classes'}</p>
        </div>
        {canManage && (
          <Button onClick={() => { resetForm(); setShowCreate(true); }}>
            <Plus className="mr-2 h-4 w-4" />New Material
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{meta?.total || filtered.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{filtered.filter((m: StudyMaterial) => m.isPublished).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Materials</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search materials..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={classFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClassFilter(e.target.value)}>
              <option value="">All Classes</option>
              {getClassOptions().map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Select value={subjectFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSubjectFilter(e.target.value)}>
              <option value="">All Subjects</option>
              {getSubjectOptions().map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : isError ? (
            <div className="text-center py-8 text-red-500">Failed to load materials. Please try again.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No study materials found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((m: StudyMaterial) => (
                <div key={m.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{m.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {m.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {m.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{m.class?.name} {m.section ? `- ${m.section.name}` : ''}</span>
                        <span>{m.subject?.name}</span>
                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm" onClick={() => togglePublishMutation.mutate(m.id)}>
                          {m.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(m)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (confirm('Delete this material?')) deleteMutation.mutate(m.id);
                        }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Material' : 'New Material'}</h2>
              <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })} placeholder="Material title" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input value={form.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Class *</label>
                  <Select value={form.classId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, classId: e.target.value, sectionId: '' })}>
                    <option value="">Select class</option>
                    {getClassOptions().map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Section</label>
                  <Select value={form.sectionId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, sectionId: e.target.value })}>
                    <option value="">All sections</option>
                    {getSectionOptions().map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Subject *</label>
                <Select value={form.subjectId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, subjectId: e.target.value })}>
                  <option value="">Select subject</option>
                  {getSubjectOptions().map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Attachments</label>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-2 h-4 w-4" />{uploading ? 'Uploading...' : 'Add Files'}
                </Button>
                {attachedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachedFiles.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span>{f.name}</span>
                        <button onClick={() => setAttachedFiles((prev) => prev.filter((p) => p.id !== f.id))} className="text-red-500 hover:text-red-700">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="published" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="rounded" />
                <label htmlFor="published" className="text-sm font-medium">Publish immediately</label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.title || !form.classId || !form.subjectId || createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
