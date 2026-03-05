import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import {
  getLookupCatalogDefinition,
  getLookupCatalogGroupByType,
} from "@/features/lookup-catalog/config/lookup-catalog-config";
import { LookupCatalogWorkspace } from "@/features/lookup-catalog/components/lookup-catalog-workspace";

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

  return (
    <PermissionGuard permission={definition.readPermission}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            {group.label}
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">{definition.title}</h2>
          <p className="text-sm text-muted-foreground">{definition.description}</p>
        </div>
        <LookupCatalogWorkspace definition={definition} />
      </div>
    </PermissionGuard>
  );
}
