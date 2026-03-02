import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AcademicTermsWorkspace } from "@/features/academic-terms/components/academic-terms-workspace";

export default function AcademicTermsPage() {
  return (
    <PermissionGuard permission="academic-terms.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 02 - Academic Core
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الفصول الأكاديمية</h2>
        </div>
        <AcademicTermsWorkspace />
      </div>
    </PermissionGuard>
  );
}




