import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FinancialCategoriesWorkspace } from "@/features/financial-categories/components/financial-categories-workspace";

export default function FinancialCategoriesPage() {
  return (
    <PermissionGuard permission="financial-categories.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الفئات المالية</h2>
        </div>
        <FinancialCategoriesWorkspace />
      </div>
    </PermissionGuard>
  );
}
