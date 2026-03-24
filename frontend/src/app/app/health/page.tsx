"use client";

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HealthVisitsWorkspace } from "@/features/health-visits/components/health-visits-workspace";

export default function HealthPage() {
  return (
    <PermissionGuard permission="health-visits.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 19 - الصحة المدرسية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">
            نظام الصحة
          </h2>
        </div>
        <HealthVisitsWorkspace />
      </div>
    </PermissionGuard>
  );
}
