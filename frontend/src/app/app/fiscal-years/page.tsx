import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FiscalYearsWorkspace } from "@/features/fiscal-years/components/fiscal-years-workspace";

export default function FiscalYearsPage() {
  return (
    <PermissionGuard permission="fiscal-years.read">
      <div className="space-y-4">
        <FiscalYearsWorkspace />
      </div>
    </PermissionGuard>
  );
}
