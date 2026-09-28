import { NavLink } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { getNavigation } from '../../config/navigation';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  if (!user) return null;

  const sections = getNavigation(user.role, permissions);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">EduPortal</p>
          <p className="text-[11px] text-muted-foreground">Education Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-sidebar-foreground hover:bg-accent hover:text-accent-foreground',
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
