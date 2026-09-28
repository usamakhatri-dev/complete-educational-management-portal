import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { cn } from '../../lib/utils';

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 -translate-x-full transition-transform lg:hidden',
          mobileNavOpen && 'translate-x-0',
        )}
      >
        <Sidebar />
      </div>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto w-full max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
