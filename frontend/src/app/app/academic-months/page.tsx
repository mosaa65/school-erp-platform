import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AcademicMonthsWorkspace } from "@/features/academic-months/components/academic-months-workspace";

export default function AcademicMonthsPage() {
  return (
    <PermissionGuard permission="academic-months.read">
      <div className="space-y-4">
        <AcademicMonthsWorkspace />
      </div>
    </PermissionGuard>
  );
}





