import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getApiError } from '../../lib/api';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setServerError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/dashboard', { replace: true });
    } catch (err) {
      setServerError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card-hover">
            <GraduationCap className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">EduPortal</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your education management account
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@institution.edu"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <div className="mt-4 rounded-lg border bg-muted/50 p-3 text-center text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Demo accounts</p>
          <p>Management — admin@eduportal.dev / Admin@123</p>
          <p>Teacher — teacher@eduportal.dev / Teacher@123</p>
          <p>Student — student@eduportal.dev / Student@123</p>
        </div>
      </div>
    </div>
  );
}
