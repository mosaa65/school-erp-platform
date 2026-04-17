"use client";

import type { ReactNode } from "react";
import { ForbiddenCard } from "@/components/layout/forbidden-card";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { matchesPermissionRequirement } from "@/features/auth/lib/permission-requirements";

type PermissionGuardProps = {
  permission?: string;
  requiredAnyPermission?: string[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGuard({
  permission,
  requiredAnyPermission,
  children,
  fallback,
}: PermissionGuardProps) {
  const auth = useAuth();
  const { hasAnyPermission, hasPermission } = useRbac();

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

  const hasAccess = matchesPermissionRequirement(
    {
      requiredPermission: permission,
      requiredAnyPermission,
    },
    {
      hasPermission,
      hasAnyPermission,
    },
  );

  if (!hasAccess) {
    const requiredPermissionLabel =
      permission ?? requiredAnyPermission?.join(" | ") ?? "صلاحية غير محددة";
    return fallback ?? <ForbiddenCard requiredPermission={requiredPermissionLabel} />;
  }

  return <>{children}</>;
}




