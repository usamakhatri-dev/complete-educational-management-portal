import { useState } from 'react';
import { GraduationCap, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/page-header';
import { TeachersTab } from './teachers';
import { StudentsTab } from './students';

const TABS = [
  { key: 'teachers', label: 'Teachers', icon: GraduationCap },
  { key: 'students', label: 'Students', icon: Users },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function PeoplePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('teachers');

  return (
    <div>
      <PageHeader
        title="People"
        description="Manage teachers and students."
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

      {activeTab === 'teachers' && <TeachersTab />}
      {activeTab === 'students' && <StudentsTab />}
    </div>
  );
}
