import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCog,
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  BarChart3,
  ShieldCheck,
  ScrollText,
  Settings,
  DatabaseBackup,
  Award,
  Bell,
  Send,
  Megaphone,
  FileBarChart,
  Activity,
  BookMarked,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '../types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: string;
  section?: string;
  roles?: Role[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const common: NavSection = {
  title: 'Overview',
  items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
};

const management: NavSection = {
  title: 'Administration',
  items: [
    { label: 'Students', to: '/students', icon: GraduationCap, permission: 'students.list' },
    { label: 'Teachers', to: '/teachers', icon: UserCog, permission: 'teachers.manage' },
    { label: 'Users', to: '/users', icon: Users, permission: 'users.list' },
    { label: 'Classes & Subjects', to: '/academics', icon: BookOpen, permission: 'academic.manage' },
    { label: 'Timetable', to: '/timetable', icon: CalendarRange, permission: 'timetable.manage' },
    { label: 'Attendance', to: '/attendance', icon: ClipboardCheck, permission: 'attendance.view-all' },
    { label: 'Exams & Results', to: '/exams', icon: FileText, permission: 'exams.manage' },
    { label: 'Results & Reports', to: '/results', icon: Award, permission: 'results.view' },
    { label: 'Letters & Appeals', to: '/letters', icon: MessageSquareText, permission: 'letters.manage' },
    { label: 'Announcements', to: '/announcements', icon: Megaphone, permission: 'announcements.manage' },
    { label: 'Notifications', to: '/notifications', icon: Bell, permission: 'notifications.view' },
    { label: 'Messages', to: '/messages', icon: Send, permission: 'messages.view' },
    { label: 'Study Materials', to: '/materials', icon: BookMarked, permission: 'materials.view' },
  ],
};

const teacherOps: NavSection = {
  title: 'Teaching',
  items: [
    { label: 'My Classes', to: '/my-classes', icon: BookOpen, roles: ['teacher'] },
    { label: 'Take Attendance', to: '/attendance', icon: ClipboardCheck, permission: 'attendance.take' },
    { label: 'Timetable', to: '/timetable', icon: CalendarRange, permission: 'timetable.view' },
    { label: 'Assignments', to: '/assignments', icon: FileText, permission: 'assignments.manage' },
    { label: 'Quizzes', to: '/quizzes', icon: FileText, permission: 'quizzes.manage' },
    { label: 'Exams & Results', to: '/exams', icon: FileText, permission: 'exams.manage' },
    { label: 'Results & Reports', to: '/results', icon: Award, permission: 'results.view' },
    { label: 'Reports', to: '/reports', icon: FileBarChart, permission: 'reports.generate' },
    { label: 'Letters & Requests', to: '/letters', icon: MessageSquareText, permission: 'letters.reply' },
    { label: 'Announcements', to: '/announcements', icon: Megaphone, permission: 'announcements.view' },
    { label: 'Notifications', to: '/notifications', icon: Bell, permission: 'notifications.view' },
    { label: 'Messages', to: '/messages', icon: Send, permission: 'messages.view' },
    { label: 'Study Materials', to: '/materials', icon: BookMarked, permission: 'materials.view' },
  ],
};

const studentOps: NavSection = {
  title: 'My Studies',
  items: [
    { label: 'My Classes', to: '/my-classes', icon: BookOpen, roles: ['student'] },
    { label: 'My Attendance', to: '/attendance', icon: ClipboardCheck, permission: 'attendance.view-own' },
    { label: 'Timetable', to: '/timetable', icon: CalendarRange, permission: 'timetable.view' },
    { label: 'Assignments', to: '/assignments', icon: FileText, permission: 'assignments.submit' },
    { label: 'Quizzes', to: '/quizzes', icon: FileText, permission: 'quizzes.attempt' },
    { label: 'Exams', to: '/exams', icon: FileText, permission: 'exams.view' },
    { label: 'My Results', to: '/results', icon: Award, permission: 'results.view' },
    { label: 'My Reports', to: '/reports', icon: FileBarChart, permission: 'reports.generate' },
    { label: 'Letters & Appeals', to: '/letters', icon: MessageSquareText, permission: 'letters.submit' },
    { label: 'Announcements', to: '/announcements', icon: Megaphone, permission: 'announcements.view' },
    { label: 'Notifications', to: '/notifications', icon: Bell, permission: 'notifications.view' },
    { label: 'Messages', to: '/messages', icon: Send, permission: 'messages.view' },
    { label: 'Study Materials', to: '/materials', icon: BookMarked, permission: 'materials.view' },
  ],
};

const reporting: NavSection = {
  title: 'Insights',
  items: [
    { label: 'Analytics', to: '/analytics', icon: BarChart3, permission: 'analytics.view' },
    { label: 'Reports', to: '/reports', icon: FileBarChart, permission: 'reports.generate' },
    { label: 'Activity Logs', to: '/audit/logs', icon: ScrollText, permission: 'audit.view' },
    { label: 'Login History', to: '/audit/login-history', icon: ScrollText, permission: 'login-history.view' },
  ],
};

const system: NavSection = {
  title: 'System',
  items: [
    { label: 'Roles & Permissions', to: '/settings/roles', icon: ShieldCheck, permission: 'users.list' },
    { label: 'Settings & Branding', to: '/settings', icon: Settings, permission: 'settings.manage' },
    { label: 'Backups', to: '/settings/backups', icon: DatabaseBackup, permission: 'backups.manage' },
    { label: 'System Health', to: '/analytics?health=true', icon: Activity, permission: 'system.health' },
  ],
};

export function getNavigation(role: Role, permissions: string[]): NavSection[] {
  const can = (p?: string) => !p || p === 'users.list' || permissions.includes(p);

  const sections = [common];
  if (role === 'super_admin') {
    sections.push(management);
  } else {
    sections.push(role === 'teacher' ? teacherOps : studentOps);
  }
  if (role !== 'student' && permissions.some((p) => p.startsWith('analytics') || p.startsWith('reports') || p.startsWith('audit'))) {
    sections.push(reporting);
  }
  if (role === 'super_admin') sections.push(system);
  else if (role === 'teacher' && permissions.includes('system.health')) {
    sections.push({ title: 'System', items: system.items.filter((i) => can(i.permission)) });
  }

  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => can(i.permission) && (!i.roles || i.roles.includes(role))),
    }))
    .filter((s) => s.items.length > 0);
}
