"use client";

import { ForbiddenCard } from "@/components/layout/forbidden-card";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { HrIntegrationsWorkspace } from "@/features/hr-integrations/components/hr-integrations-workspace";

const PAGE_PERMISSIONS = [
  "finance-hr.payroll-summary",
  "finance-hr.payroll-journal",
  "finance-hr.deduction-journal",
] as const;

export default function HrIntegrationsPage() {
  const auth = useAuth();
  const { hasAnyPermission } = useRbac();

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

  if (!hasAnyPermission([...PAGE_PERMISSIONS])) {
    return (
      <ForbiddenCard requiredPermission={PAGE_PERMISSIONS.join(" | ")} />
    );
  }

  return <HrIntegrationsWorkspace />;
}
