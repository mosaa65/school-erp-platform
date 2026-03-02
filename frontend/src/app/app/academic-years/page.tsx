import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AcademicYearsWorkspace } from "@/features/academic-years/components/academic-years-workspace";

export default function AcademicYearsPage() {
  return (
    <PermissionGuard permission="academic-years.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 02 - Academic Core
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">السنوات الأكاديمية</h2>
        </div>
        <AcademicYearsWorkspace />
      </div>
    </PermissionGuard>
  );
}




