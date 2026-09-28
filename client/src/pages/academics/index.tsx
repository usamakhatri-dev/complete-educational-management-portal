import { useState } from 'react';
import { Building2, CalendarRange, GraduationCap, Layers, BookOpen } from 'lucide-react';
import { PageHeader } from '../../components/layout/page-header';
import { DepartmentsTab } from './departments';
import { SessionsTab } from './sessions';
import { ClassesTab } from './classes';
import { SectionsTab } from './sections';
import { SubjectsTab } from './subjects';

const TABS = [
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'sessions', label: 'Sessions', icon: CalendarRange },
  { key: 'classes', label: 'Classes', icon: GraduationCap },
  { key: 'sections', label: 'Sections', icon: Layers },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('departments');

  return (
    <div>
      <PageHeader
        title="Academics"
        description="Manage departments, sessions, classes, sections, and subjects."
      />

      <div className="mb-6 flex gap-1 rounded-lg border bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'departments' && <DepartmentsTab />}
      {activeTab === 'sessions' && <SessionsTab />}
      {activeTab === 'classes' && <ClassesTab />}
      {activeTab === 'sections' && <SectionsTab />}
      {activeTab === 'subjects' && <SubjectsTab />}
    </div>
  );
}
