import { Construction } from 'lucide-react';
import { PageHeader } from '../components/layout/page-header';

export default function ComingSoonPage({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <Construction className="size-6" />
        </div>
        <p className="text-sm font-medium">This module is scheduled for a later phase</p>
        <p className="max-w-md text-sm text-muted-foreground">
          The foundation (authentication, RBAC, user management and audit) is live. Academic,
          attendance, examination, results and communication modules are being built next.
        </p>
      </div>
    </div>
  );
}
