import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FinancialCategoriesWorkspace } from "@/features/financial-categories/components/financial-categories-workspace";

export default function FinancialCategoriesPage() {
  return (
    <PermissionGuard permission="financial-categories.read">
      <div className="space-y-4">
        <FinancialCategoriesWorkspace />
      </div>
    </PermissionGuard>
  );
}
