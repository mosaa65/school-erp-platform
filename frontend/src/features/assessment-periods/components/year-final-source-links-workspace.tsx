"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarRange, FileStack, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  ApiError,
  apiClient,
  type AssessmentComponentSourcePeriodListItem,
  type AssessmentPeriodListItem,
} from "@/lib/api/client";
import { formatNameCodeLabel } from "@/lib/option-labels";

function formatPeriodScope(item: AssessmentPeriodListItem) {
  const parts = [formatNameCodeLabel(item.academicYear.name, item.academicYear.code)];
  if (item.academicTerm) {
    parts.push(formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code));
  }
  return parts.join(" / ");
}

function formatSemesterSourceLabel(
  source: AssessmentComponentSourcePeriodListItem["sourcePeriod"],
  semesterLookup: Map<string, AssessmentPeriodListItem>,
) {
  const semester = semesterLookup.get(source.id);
  const scopeParts: string[] = [];
  if (semester?.academicTerm) {
    scopeParts.push(formatNameCodeLabel(semester.academicTerm.name, semester.academicTerm.code));
  }
  return scopeParts.length > 0 ? `${source.name} - ${scopeParts.join(" / ")}` : source.name;
}

export function YearFinalSourceLinksWorkspace() {
  const auth = useAuth();
  const [selectedPeriodId, setSelectedPeriodId] = React.useState("");

  const onAuthError = React.useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
    [auth],
  );

  const finalPeriodsQuery = useQuery({
    queryKey: ["assessment-periods", "year-final-source-links"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listAssessmentPeriods({
          page: 1,
          limit: 100,
          isActive: true,
        });
        return response.data.filter((item) => item.category === "YEAR_FINAL");
      } catch (error) {
        onAuthError(error);
        throw error;
      }
    },
  });

  const semesterPeriodsQuery = useQuery({
    queryKey: ["assessment-periods", "year-final-semester-lookup"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listAssessmentPeriods({
          page: 1,
          limit: 200,
          isActive: true,
        });
        return response.data.filter((item) => item.category === "SEMESTER");
      } catch (error) {
        onAuthError(error);
        throw error;
      }
    },
  });

  const finalPeriods = React.useMemo(
    () =>
      [...(finalPeriodsQuery.data ?? [])].sort((a, b) =>
        `${a.sequence}-${a.name}`.localeCompare(`${b.sequence}-${b.name}`, "ar"),
      ),
    [finalPeriodsQuery.data],
  );

  React.useEffect(() => {
    if (!selectedPeriodId && finalPeriods[0]) {
      setSelectedPeriodId(finalPeriods[0].id);
    }
  }, [finalPeriods, selectedPeriodId]);

  const selectedPeriod = finalPeriods.find((item) => item.id === selectedPeriodId) ?? null;

  const componentsQuery = useQuery({
    queryKey: ["assessment-period-components", "year-final-source-links", selectedPeriodId],
    enabled: auth.isHydrated && auth.isAuthenticated && Boolean(selectedPeriodId),
    queryFn: async () => {
      try {
        const response = await apiClient.listAssessmentPeriodComponents({
          page: 1,
          limit: 100,
          assessmentPeriodId: selectedPeriodId,
          isActive: true,
        });
        return response.data.filter((item) => item.entryMode === "AGGREGATED_PERIODS");
      } catch (error) {
        onAuthError(error);
        throw error;
      }
    },
  });

  const aggregateComponents = componentsQuery.data ?? [];

  const sourceLinksQuery = useQuery({
    queryKey: ["assessment-component-source-periods", "year-final-source-links", selectedPeriodId],
    enabled: auth.isHydrated && auth.isAuthenticated && aggregateComponents.length > 0,
    queryFn: async () => {
      try {
        const settled = await Promise.all(
          aggregateComponents.map(async (component) => {
            const response = await apiClient.listAssessmentComponentSourcePeriods({
              page: 1,
              limit: 100,
              assessmentPeriodComponentId: component.id,
              isActive: true,
            });
            return response.data;
          }),
        );
        return settled.flat();
      } catch (error) {
        onAuthError(error);
        throw error;
      }
    },
  });

  const semesterLookup = React.useMemo(
    () => new Map((semesterPeriodsQuery.data ?? []).map((item) => [item.id, item])),
    [semesterPeriodsQuery.data],
  );

  const sourceLinks = sourceLinksQuery.data ?? [];
  const linksByComponent = React.useMemo(() => {
    const map = new Map<string, AssessmentComponentSourcePeriodListItem[]>();
    for (const link of sourceLinks) {
      const current = map.get(link.assessmentPeriodComponentId) ?? [];
      current.push(link);
      map.set(link.assessmentPeriodComponentId, current);
    }
    return map;
  }, [sourceLinks]);

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">اختيار الفترة النهائية</CardTitle>
          <CardDescription>
            اختر الفترة النهائية التي تريد مراجعة مصادرها الفصلية ومكونات المحصلة داخلها.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectField value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)}>
            <option value="">اختر فترة نهائية</option>
            {finalPeriods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {formatPeriodScope(item)}
              </option>
            ))}
          </SelectField>

          {selectedPeriod ? (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">الفترة المختارة</p>
                <p className="mt-1 font-semibold">{selectedPeriod.name}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">النطاق</p>
                <p className="mt-1 text-sm font-semibold">{formatPeriodScope(selectedPeriod)}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">مكونات المحصلة</p>
                <p className="mt-1 font-semibold">{aggregateComponents.length}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">الفترات الفصلية المرتبطة</p>
                <p className="mt-1 font-semibold">{sourceLinks.length}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {finalPeriodsQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {finalPeriodsQuery.error instanceof Error
              ? finalPeriodsQuery.error.message
              : "تعذر تحميل الفترات النهائية."}
          </CardContent>
        </Card>
      ) : null}

      {componentsQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {componentsQuery.error instanceof Error
              ? componentsQuery.error.message
              : "تعذر تحميل مكونات النهائي."}
          </CardContent>
        </Card>
      ) : null}

      {sourceLinksQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {sourceLinksQuery.error instanceof Error
              ? sourceLinksQuery.error.message
              : "تعذر تحميل المصادر الفصلية."}
          </CardContent>
        </Card>
      ) : null}

      {selectedPeriod ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {aggregateComponents.map((component) => {
            const componentLinks = linksByComponent.get(component.id) ?? [];
            return (
              <Card key={component.id} className="border-border/70 bg-card/80">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      <CardTitle className="text-base">{component.name}</CardTitle>
                    </div>
                    <Badge variant={componentLinks.length > 0 ? "default" : "secondary"}>
                      {componentLinks.length}
                    </Badge>
                  </div>
                  <CardDescription>
                    هذا المكوّن يحتسب من نتائج الفترات الفصلية المرتبطة به ثم يعاد تحجيمه إلى
                    {` ${component.maxScore}`} درجة.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {componentLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد فترات فصلية مرتبطة بهذا المكوّن حتى الآن.
                    </p>
                  ) : (
                    componentLinks.map((link) => (
                      <div key={link.id} className="rounded-xl border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {formatSemesterSourceLabel(link.sourcePeriod, semesterLookup)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              مصدر فصلي داخل نفس السنة الدراسية
                            </p>
                          </div>
                          <Badge variant="outline">
                            <CalendarRange className="mr-1 h-3.5 w-3.5" />
                            فصل
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3">
                    <Button asChild variant="outline">
                      <Link href="/app/semester-assessment-periods">
                        فتح الفترات الفصلية
                        <ArrowLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/app/semester-period-results">
                        فتح نتائج الفصل
                        <ArrowLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href="/app/year-final-assessment-components">
                        تعديل مكونات النهائي
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {aggregateComponents.length === 0 ? (
            <Card className="border-border/70 bg-card/80 xl:col-span-2">
              <CardContent className="p-4 text-sm text-muted-foreground">
                لا توجد مكونات محصلة داخل هذه الفترة النهائية. أضف مكوّنًا من نوع
                {" "}
                `AGGREGATED_PERIODS`
                {" "}
                من صفحة مكونات الفترات النهائية.
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-4 text-sm text-muted-foreground">
            اختر فترة نهائية لعرض مصادرها الفصلية المرتبطة.
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileStack className="h-4 w-4" />
            <CardTitle className="text-base">كيف يعمل النهائي هنا</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. اختر الفترة النهائية.</p>
          <p>2. أضف مكوّن محصلة داخل مكونات النهائي.</p>
          <p>3. اربط به الفترات الفصلية المناسبة داخل نفس السنة.</p>
          <p>4. بعد اكتمال نتائج الفصول، استخدم هذه المصادر لبناء النتيجة النهائية فوقها.</p>
        </CardContent>
      </Card>
    </div>
  );
}
