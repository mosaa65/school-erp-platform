"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, Layers3, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchField } from "@/components/ui/search-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  LOOKUP_CATALOG_GROUPS,
  LOOKUP_CATALOG_LIST,
} from "@/features/lookup-catalog/config/lookup-catalog-config";
import { getLookupCatalogVisual } from "@/features/lookup-catalog/config/lookup-catalog-visuals";
import { cn } from "@/lib/utils";

export default function LookupCatalogIndexPage() {
  const { hasPermission } = useRbac();
  const [search, setSearch] = React.useState("");
  const normalizedSearch = search.trim().toLowerCase();

  const visibleDefinitions = LOOKUP_CATALOG_LIST.filter((definition) =>
    hasPermission(definition.readPermission),
  );

  const groups = LOOKUP_CATALOG_GROUPS.map((group) => {
    const definitions = group.types
      .map((type) => LOOKUP_CATALOG_LIST.find((definition) => definition.type === type) ?? null)
      .filter(
        (definition): definition is (typeof LOOKUP_CATALOG_LIST)[number] =>
          definition !== null && hasPermission(definition.readPermission),
      )
      .filter((definition) => {
        if (!normalizedSearch) {
          return true;
        }

        const visual = getLookupCatalogVisual(definition.type);
        const haystack = [
          definition.title,
          definition.description,
          definition.type,
          group.label,
          ...visual.keywords,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      });

    return {
      ...group,
      definitions,
    };
  }).filter((group) => group.definitions.length > 0);

  const totalVisibleReferences = groups.reduce((sum, group) => sum + group.definitions.length, 0);
  const totalVisibleFields = groups.reduce((sum, group) => {
    return (
      sum +
      group.definitions.reduce((groupSum, definition) => groupSum + definition.fields.length, 0)
    );
  }, 0);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-br from-fuchsia-500/10 via-background to-sky-500/10 p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
              البنية المشتركة - مركز المرجعيات
            </Badge>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300">
                <Layers3 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">قاموس كل المرجعيات</h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  بوابة منظمة لكل المرجعيات في النظام، مع تقسيم واضح حسب المجال، وأيقونات
                  ملوّنة تساعدك تعرف كل مرجعية من أول نظرة.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">المرجعيات المتاحة</p>
              <p className="mt-1 text-2xl font-semibold">{totalVisibleReferences}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">إجمالي الحقول التعريفية</p>
              <p className="mt-1 text-2xl font-semibold">{totalVisibleFields}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن مرجعية، وصف، أو كلمة مفتاحية..."
            containerClassName="w-full lg:max-w-xl"
            className="h-11 rounded-2xl border-border/70 bg-background/80"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-300" />
            <span>كل بطاقة تعرض لونًا وأيقونة تعكس وظيفة المرجعية.</span>
          </div>
        </div>
      </section>

      {visibleDefinitions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            لا تملك صلاحيات قراءة لأي مرجعية إضافية.
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card className="border-dashed border-border/70 bg-card/70">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/70">
              <Layers3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">لا توجد مرجعيات مطابقة</p>
              <p className="text-xs text-muted-foreground">
                جرّب كلمة أبسط أو امسح البحث لرؤية جميع المرجعيات المتاحة.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.id} className="space-y-3">
              <div className={cn("rounded-[24px] border border-border/70 p-4", group.surfaceClassName)}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                        group.iconClassName,
                      )}
                    >
                      <group.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">{group.label}</h3>
                      <p className="text-xs leading-6 text-muted-foreground">{group.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {group.definitions.length} مرجعية
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.definitions.map((definition) => {
                  const visual = getLookupCatalogVisual(definition.type);
                  const Icon = visual.icon;

                  return (
                    <Link key={definition.type} href={`/app/lookup-catalog/${definition.type}`}>
                      <Card
                        className={cn(
                          "group h-full overflow-hidden border-border/70 bg-card/85 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                          visual.cardClassName,
                        )}
                      >
                        <CardHeader className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                                visual.iconSurfaceClassName,
                              )}
                            >
                              <Icon className={cn("h-6 w-6", visual.iconClassName)} />
                            </div>
                            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px]">
                              {definition.fields.length} حقل
                            </Badge>
                          </div>
                          <div className="space-y-1.5">
                            <CardTitle className="text-base leading-7">{definition.title}</CardTitle>
                            <CardDescription className="line-clamp-2 text-xs leading-6">
                              {definition.description}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between pt-0 text-xs">
                          <span className="text-muted-foreground">{definition.type}</span>
                          <span
                            className={cn("flex items-center gap-1 font-medium", visual.iconClassName)}
                          >
                            فتح المرجعية
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
