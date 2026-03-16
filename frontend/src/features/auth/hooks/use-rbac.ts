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

  const hasPermission = useCallback(
    (permissionCode: string) => permissionSet.has(permissionCode),
    [permissionSet],
  );
  const hasAnyPermission = useCallback(
    (permissionCodes: string[]) => permissionCodes.some((code) => permissionSet.has(code)),
    [permissionSet],
  );
  const hasRole = useCallback((roleCode: string) => roleSet.has(roleCode), [roleSet]);

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
  };
}


