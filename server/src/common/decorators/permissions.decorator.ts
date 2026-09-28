import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
/** Require one or more permission keys, e.g. `@RequirePermissions('students.create')`. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
