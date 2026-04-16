import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';
export const REQUIRED_ANY_PERMISSIONS_KEY = 'required_any_permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
export const RequireAnyPermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_ANY_PERMISSIONS_KEY, permissions);
