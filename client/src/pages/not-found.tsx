import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { buttonVariants } from '../components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Compass className="size-8" />
      </div>
      <div>
        <h1 className="text-3xl font-semibold">404</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
      </div>
      <Link to="/dashboard" className={buttonVariants()}>
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
