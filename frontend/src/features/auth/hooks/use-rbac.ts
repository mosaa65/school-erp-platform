"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useRbac() {
  const auth = useAuth();

  const permissionSet = useMemo(
    () => new Set(auth.session?.user.permissionCodes ?? []),
    [auth.session?.user.permissionCodes],
  );

  const roleSet = useMemo(
    () => new Set(auth.session?.user.roleCodes ?? []),
    [auth.session?.user.roleCodes],
  );
  const isSuperAdmin = useMemo(() => roleSet.has("super_admin"), [roleSet]);

  const hasPermission = useCallback(
    (permissionCode: string) => isSuperAdmin || permissionSet.has(permissionCode),
    [isSuperAdmin, permissionSet],
  );
  const hasAnyPermission = useCallback(
    (permissionCodes: string[]) =>
      isSuperAdmin || permissionCodes.some((code) => permissionSet.has(code)),
    [isSuperAdmin, permissionSet],
  );
  const hasRole = useCallback((roleCode: string) => roleSet.has(roleCode), [roleSet]);

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
  };
}


