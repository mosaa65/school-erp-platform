import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AcademicTermsWorkspace } from "@/features/academic-terms/components/academic-terms-workspace";

export default function AcademicTermsPage() {
  return (
    <PermissionGuard permission="academic-terms.read">
      <div className="space-y-4">
        <AcademicTermsWorkspace />
      </div>
    </PermissionGuard>
  );
}





