"use client";

import type { ReactNode } from "react";
import { ForbiddenCard } from "@/components/layout/forbidden-card";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRbac } from "@/features/auth/hooks/use-rbac";

type PermissionGuardProps = {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGuard({
  permission,
  children,
  fallback,
}: PermissionGuardProps) {
  const auth = useAuth();
  const { hasPermission } = useRbac();

  if (!auth.isHydrated) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        جارٍ التحقق من الصلاحيات...
      </div>
    );
  }

  if (!auth.session) {
    return null;
  }

  if (!hasPermission(permission)) {
    return fallback ?? <ForbiddenCard requiredPermission={permission} />;
  }

  return <>{children}</>;
}




