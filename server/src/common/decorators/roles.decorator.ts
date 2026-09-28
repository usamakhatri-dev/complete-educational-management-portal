import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/** Restrict a route to specific roles (super_admin | teacher | student). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
