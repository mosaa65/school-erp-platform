"use client";

import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HealthVisitsWorkspace } from "@/features/health-visits/components/health-visits-workspace";

export default function HealthPage() {
  return (
    <PermissionGuard permission="health-visits.read">
      <div className="space-y-4">
        <HealthVisitsWorkspace />
      </div>
    </PermissionGuard>
  );
}
