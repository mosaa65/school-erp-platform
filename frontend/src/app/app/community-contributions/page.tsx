import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CommunityContributionsWorkspace } from "@/features/community-contributions/components/community-contributions-workspace";

export default function CommunityContributionsPage() {
  return (
    <PermissionGuard permission="community-contributions.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">المساهمات المجتمعية</h2>
        </div>
        <CommunityContributionsWorkspace />
      </div>
    </PermissionGuard>
  );
}
