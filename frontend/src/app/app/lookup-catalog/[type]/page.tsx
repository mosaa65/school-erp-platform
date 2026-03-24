import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import {
  getLookupCatalogDefinition,
  getLookupCatalogGroupByType,
} from "@/features/lookup-catalog/config/lookup-catalog-config";
import { getLookupCatalogVisual } from "@/features/lookup-catalog/config/lookup-catalog-visuals";
import { LookupCatalogWorkspace } from "@/features/lookup-catalog/components/lookup-catalog-workspace";
import { cn } from "@/lib/utils";

type LookupCatalogTypePageProps = {
  params: {
    type: string;
  };
};

export default function LookupCatalogTypePage({ params }: LookupCatalogTypePageProps) {
  const definition = getLookupCatalogDefinition(params.type);

  if (!definition) {
    notFound();
  }
  const group = getLookupCatalogGroupByType(definition.type);
  const visual = getLookupCatalogVisual(definition.type);
  const Icon = visual.icon;

  return (
    <PermissionGuard permission={definition.readPermission}>
      <div className="space-y-5">
        <div className={cn("rounded-[28px] border border-border/70 p-5 shadow-sm", group.surfaceClassName)}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                  visual.iconSurfaceClassName,
                )}
              >
                <Icon className={cn("h-7 w-7", visual.iconClassName)} />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {group.label}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {definition.fields.length} حقل
                  </Badge>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">{definition.title}</h2>
                <p className="text-sm leading-7 text-muted-foreground">{definition.description}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3 text-xs backdrop-blur-sm">
              <p className="text-muted-foreground">رمز المرجعية</p>
              <p className="mt-1 font-medium">{definition.type}</p>
            </div>
          </div>
        </div>
        <LookupCatalogWorkspace definition={definition} />
      </div>
    </PermissionGuard>
  );
}
