import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { RemindersTickerWorkspace } from "@/features/reminders-ticker/components/reminders-ticker-workspace";

export default function RemindersTickerPage() {
  return (
    <PermissionGuard permission="reminders-ticker.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 01 - البنية المشتركة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">شريط التنبيهات المتحرك</h2>
        </div>
        <RemindersTickerWorkspace />
      </div>
    </PermissionGuard>
  );
}
