import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, User, Lock } from 'lucide-react';
import { api, unwrap, getApiError } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useAuthStore } from '../../stores/auth';

export default function SettingsPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isManagement = role === 'super_admin';

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => unwrap<{ id: string; fullName: string; email: string; phone: string; avatarUrl: string; role: string }>(api.get('/settings/profile')),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => unwrap<Array<{ key: string; value: string; category: string }>>(api.get('/settings')),
    enabled: isManagement,
  });

  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', currentPassword: '', newPassword: '' });
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});

  const updateProfileMutation = useMutation({
    mutationFn: (dto: typeof profileForm) => api.put('/settings/profile', dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); setProfileForm({ ...profileForm, currentPassword: '', newPassword: '' }); },
  });

  const updateSettingMutation = useMutation({
    mutationFn: (dto: { key: string; value: string; category?: string }) => api.put('/settings', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const handleProfileSave = () => {
    const dto: Record<string, string> = {};
    if (profileForm.fullName) dto.fullName = profileForm.fullName;
    if (profileForm.phone !== undefined) dto.phone = profileForm.phone;
    if (profileForm.newPassword) {
      dto.currentPassword = profileForm.currentPassword;
      dto.newPassword = profileForm.newPassword;
    }
    updateProfileMutation.mutate(dto as typeof profileForm);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Settings</h1><p className="text-muted-foreground">Manage your account and portal settings</p></div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Profile</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div><label className="text-sm font-medium">Full Name</label><Input value={profileForm.fullName || profile?.fullName || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, fullName: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Email</label><Input value={profile?.email || ''} disabled /></div>
            <div><label className="text-sm font-medium">Phone</label><Input value={profileForm.phone || profile?.phone || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
            {updateProfileMutation.isError && <p className="text-sm text-red-500">{getApiError(updateProfileMutation.error)}</p>}
            {updateProfileMutation.isSuccess && <p className="text-sm text-green-600">Profile updated!</p>}
            <Button onClick={handleProfileSave} disabled={updateProfileMutation.isPending}><Save className="mr-2 h-4 w-4" />{updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Change Password</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div><label className="text-sm font-medium">Current Password</label><Input type="password" value={profileForm.currentPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, currentPassword: e.target.value })} /></div>
            <div><label className="text-sm font-medium">New Password</label><Input type="password" value={profileForm.newPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, newPassword: e.target.value })} /></div>
            <Button onClick={handleProfileSave} disabled={!profileForm.currentPassword || !profileForm.newPassword || updateProfileMutation.isPending}>Change Password</Button>
          </div>
        </CardContent>
      </Card>

      {isManagement && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Portal Settings</CardTitle></CardHeader>
          <CardContent>
            {settings && settings.length > 0 ? (
              <div className="space-y-4 max-w-md">
                {settings.map((s) => (
                  <div key={s.key}>
                    <label className="text-sm font-medium">{s.key}</label>
                    <div className="flex gap-2">
                      <Input value={settingsForm[s.key] ?? s.value.replace(/"/g, '')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettingsForm({ ...settingsForm, [s.key]: e.target.value })} />
                      <Button size="sm" onClick={() => updateSettingMutation.mutate({ key: s.key, value: settingsForm[s.key] ?? s.value, category: s.category })}>Save</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No settings configured</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
