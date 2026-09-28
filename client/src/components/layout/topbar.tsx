import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, ChevronDown, Bell } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth';
import { api, unwrap } from '../../lib/api';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { ThemeToggle } from './theme-toggle';
import { titleCase } from '../../lib/utils';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="size-5" />
      </Button>

      <div className="flex-1" />

      <ThemeToggle />

      <NotificationBell />

      <div className="relative">
        <button
          className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-accent"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Avatar name={user?.fullName} src={user?.avatarUrl} />
          <div className="hidden text-left leading-tight sm:block">
            <p className="max-w-40 truncate text-sm font-medium">{user?.fullName}</p>
            <p className="text-[11px] capitalize text-muted-foreground">
              {user ? titleCase(user.role) : ''}
            </p>
          </div>
          <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border bg-popover p-1.5 shadow-card-hover animate-fade-in">
              <div className="border-b px-2.5 py-2">
                <p className="truncate text-sm font-medium">{user?.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <button
                className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function NotificationBell() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => unwrap<{ count: number }>(api.get('/notifications/unread-count')),
    refetchInterval: 30000,
  });

  const count = data?.count || 0;

  return (
    <button
      className="relative p-2 rounded-md hover:bg-accent transition-colors"
      onClick={() => navigate('/notifications')}
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
