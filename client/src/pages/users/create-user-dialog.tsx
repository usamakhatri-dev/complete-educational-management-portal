import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { getApiError } from '../../lib/api';

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const schema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Valid email required'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(passwordRule, 'Uppercase, lowercase, number & special character required'),
    role: z.enum(['teacher', 'student', 'super_admin']),
    phone: z.string().optional().or(z.literal('')),
    employeeCode: z.string().optional().or(z.literal('')),
    qualification: z.string().optional().or(z.literal('')),
    specialization: z.string().optional().or(z.literal('')),
    rollNumber: z.string().optional().or(z.literal('')),
    admissionNumber: z.string().optional().or(z.literal('')),
    guardianName: z.string().optional().or(z.literal('')),
    guardianPhone: z.string().optional().or(z.literal('')),
    gender: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'teacher' && !data.employeeCode) {
      ctx.addIssue({ code: 'custom', path: ['employeeCode'], message: 'Employee code is required' });
    }
    if (data.role === 'student' && (!data.rollNumber || !data.admissionNumber)) {
      ctx.addIssue({
        code: 'custom',
        path: ['rollNumber'],
        message: 'Roll number is required',
      });
      ctx.addIssue({
        code: 'custom',
        path: ['admissionNumber'],
        message: 'Admission number is required',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function CreateUserDialog({ open, onClose, onSubmit }: CreateUserDialogProps) {
  const [role, setRole] = useState<string>('student');
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student', gender: '' },
  });

  const close = () => {
    reset();
    setServerError(null);
    onClose();
  };

  const handleRoleChange = (value: string) => {
    setRole(value);
  };

  const onFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setServerError(null);
    const payload: Record<string, unknown> = {
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      role: values.role,
      phone: values.phone || undefined,
    };
    if (values.role === 'teacher') {
      payload.teacher = {
        employeeCode: values.employeeCode,
        qualification: values.qualification || undefined,
        specialization: values.specialization || undefined,
      };
    }
    if (values.role === 'student') {
      payload.student = {
        rollNumber: values.rollNumber,
        admissionNumber: values.admissionNumber,
        guardianName: values.guardianName || undefined,
        guardianPhone: values.guardianPhone || undefined,
        gender: values.gender || undefined,
      };
    }
    try {
      await onSubmit(payload);
      close();
    } catch (err) {
      setServerError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create user account"
      description="Accounts are created by management. A default password is set here."
      className="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button form="create-user-form" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create user'}
          </Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-fullName">Full name</Label>
            <Input id="cu-fullName" placeholder="Full name" {...register('fullName')} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" placeholder="name@institution.edu" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Temporary password</Label>
            <Input id="cu-password" type="text" placeholder="Strong password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role</Label>
            <Select
              id="cu-role"
              defaultValue="student"
              {...register('role', { onChange: (e) => handleRoleChange(e.target.value) })}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="super_admin">Management</option>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cu-phone">Phone (optional)</Label>
          <Input id="cu-phone" placeholder="+00 0000 000000" {...register('phone')} />
        </div>

        {role === 'teacher' && (
          <div className="grid gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cu-emp">Employee code *</Label>
              <Input id="cu-emp" placeholder="TCH-001" {...register('employeeCode')} />
              {errors.employeeCode && <p className="text-xs text-destructive">{errors.employeeCode.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-qual">Qualification</Label>
              <Input id="cu-qual" placeholder="M.Sc Mathematics" {...register('qualification')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-spec">Specialization</Label>
              <Input id="cu-spec" placeholder="Mathematics" {...register('specialization')} />
            </div>
          </div>
        )}

        {role === 'student' && (
          <div className="grid gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cu-roll">Roll number *</Label>
              <Input id="cu-roll" placeholder="R-001" {...register('rollNumber')} />
              {errors.rollNumber && <p className="text-xs text-destructive">{errors.rollNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-adm">Admission number *</Label>
              <Input id="cu-adm" placeholder="ADM-001" {...register('admissionNumber')} />
              {errors.admissionNumber && <p className="text-xs text-destructive">{errors.admissionNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-guardian">Guardian name</Label>
              <Input id="cu-guardian" placeholder="Guardian name" {...register('guardianName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-gphone">Guardian phone</Label>
              <Input id="cu-gphone" placeholder="+00 0000 000000" {...register('guardianPhone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-gender">Gender</Label>
              <Select id="cu-gender" {...register('gender')}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
}
