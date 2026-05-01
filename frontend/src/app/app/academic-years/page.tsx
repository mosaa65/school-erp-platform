import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AcademicYearsWorkspace } from "@/features/academic-years/components/academic-years-workspace";

export default function AcademicYearsPage() {
  return (
    <PermissionGuard permission="academic-years.read">
      <div className="space-y-4">
        <AcademicYearsWorkspace />
      </div>
    </PermissionGuard>
  );
}





