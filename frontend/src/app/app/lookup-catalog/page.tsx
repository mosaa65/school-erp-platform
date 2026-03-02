"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { LOOKUP_CATALOG_LIST } from "@/features/lookup-catalog/config/lookup-catalog-config";

export default function LookupCatalogIndexPage() {
  const { hasPermission } = useRbac();

  const visibleDefinitions = LOOKUP_CATALOG_LIST.filter((definition) =>
    hasPermission(definition.readPermission),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Badge variant="secondary" className="w-fit">
          النظام 01 - البنية المشتركة
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight">قاموس المرجعيات الموسع</h2>
        <p className="text-sm text-muted-foreground">
          إدارة جميع جداول Lookup الإضافية من شاشة موحدة.
        </p>
      </div>

      {visibleDefinitions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            لا تملك صلاحيات قراءة لأي مرجعية إضافية.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleDefinitions.map((definition) => (
            <Link key={definition.type} href={`/app/lookup-catalog/${definition.type}`}>
              <Card className="h-full border-border/70 bg-card/80 backdrop-blur-sm transition hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="text-base">{definition.title}</CardTitle>
                  <CardDescription>{definition.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
