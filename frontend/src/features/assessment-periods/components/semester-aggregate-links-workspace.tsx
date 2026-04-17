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

function formatMonthlySourceLabel(
  source: AssessmentComponentSourcePeriodListItem["sourcePeriod"],
  monthlyLookup: Map<string, AssessmentPeriodListItem>,
) {
  const monthly = monthlyLookup.get(source.id);
  const scopeParts: string[] = [];
  if (monthly?.academicMonth) {
    scopeParts.push(formatNameCodeLabel(monthly.academicMonth.name, monthly.academicMonth.code));
  }
  if (monthly?.academicTerm) {
    scopeParts.push(formatNameCodeLabel(monthly.academicTerm.name, monthly.academicTerm.code));
  }
  return scopeParts.length > 0 ? `${source.name} - ${scopeParts.join(" / ")}` : source.name;
}

export function SemesterAggregateLinksWorkspace() {
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

  const semesterPeriodsQuery = useQuery({
    queryKey: ["assessment-periods", "semester-aggregate-links"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listAssessmentPeriods({
          page: 1,
          limit: 100,
          isActive: true,
        });
        return response.data.filter((item) => item.category === "SEMESTER");
      } catch (error) {
        onAuthError(error);
        throw error;
      }
    },
  });

  const monthlyPeriodsQuery = useQuery({
    queryKey: ["assessment-periods", "semester-aggregate-monthly-lookup"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listAssessmentPeriods({
          page: 1,
          limit: 200,
          isActive: true,
        });
        return response.data.filter((item) => item.category === "MONTHLY");
      } catch (error) {
        onAuthError(error);
        throw error;
      }
    },
  });

  const semesterPeriods = React.useMemo(
    () =>
      [...(semesterPeriodsQuery.data ?? [])].sort((a, b) =>
        `${a.sequence}-${a.name}`.localeCompare(`${b.sequence}-${b.name}`, "ar"),
      ),
    [semesterPeriodsQuery.data],
  );

  React.useEffect(() => {
    if (!selectedPeriodId && semesterPeriods[0]) {
      setSelectedPeriodId(semesterPeriods[0].id);
    }
  }, [semesterPeriods, selectedPeriodId]);

  const selectedPeriod = semesterPeriods.find((item) => item.id === selectedPeriodId) ?? null;

  const componentsQuery = useQuery({
    queryKey: ["assessment-period-components", "semester-aggregate-links", selectedPeriodId],
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
    queryKey: ["assessment-component-source-periods", "semester-aggregate-links", selectedPeriodId],
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

  const monthlyLookup = React.useMemo(
    () => new Map((monthlyPeriodsQuery.data ?? []).map((item) => [item.id, item])),
    [monthlyPeriodsQuery.data],
  );

  const linksByComponent = React.useMemo(() => {
    const sourceLinks = sourceLinksQuery.data ?? [];
    const map = new Map<string, AssessmentComponentSourcePeriodListItem[]>();
    for (const link of sourceLinks) {
      const current = map.get(link.assessmentPeriodComponentId) ?? [];
      current.push(link);
      map.set(link.assessmentPeriodComponentId, current);
    }
    return map;
  }, [sourceLinksQuery.data]);
  const sourceLinks = sourceLinksQuery.data ?? [];

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">اختيار الفترة الفصلية</CardTitle>
          <CardDescription>
            اختر الفصل الذي تريد مراجعة مكونات المحصلة فيه والفترات الشهرية الداخلة في احتسابه.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectField
            value={selectedPeriodId}
            onChange={(event) => setSelectedPeriodId(event.target.value)}
          >
            <option value="">اختر فترة فصلية</option>
            {semesterPeriods.map((item) => (
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
                <p className="text-xs text-muted-foreground">الفترات الشهرية المرتبطة</p>
                <p className="mt-1 font-semibold">{sourceLinks.length}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {semesterPeriodsQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {semesterPeriodsQuery.error instanceof Error
              ? semesterPeriodsQuery.error.message
              : "تعذر تحميل الفترات الفصلية."}
          </CardContent>
        </Card>
      ) : null}

      {componentsQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {componentsQuery.error instanceof Error
              ? componentsQuery.error.message
              : "تعذر تحميل مكونات المحصلة."}
          </CardContent>
        </Card>
      ) : null}

      {sourceLinksQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {sourceLinksQuery.error instanceof Error
              ? sourceLinksQuery.error.message
              : "تعذر تحميل فترات المحصلة."}
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
                    هذا المكوّن يحتسب من مجموع الفترات الشهرية المرتبطة به ثم يعاد تحجيمه إلى
                    {` ${component.maxScore}`} درجة.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {componentLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد فترات شهرية مرتبطة بهذا المكوّن حتى الآن.
                    </p>
                  ) : (
                    componentLinks.map((link) => (
                      <div key={link.id} className="rounded-xl border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {formatMonthlySourceLabel(link.sourcePeriod, monthlyLookup)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              مصدر شهري داخل نفس السنة والترم
                            </p>
                          </div>
                          <Badge variant="outline">
                            <CalendarRange className="mr-1 h-3.5 w-3.5" />
                            شهر
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3">
                    <Button asChild variant="outline">
                      <Link href="/app/monthly-assessment-periods">
                        فتح الفترات الشهرية
                        <ArrowLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/app/monthly-period-results">
                        فتح نتائج الشهر
                        <ArrowLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href="/app/semester-assessment-components">
                        تعديل مكونات الفصل
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
                لا توجد مكونات محصلة داخل هذه الفترة الفصلية. أضف مكوّنًا من نوع
                {" "}
                `AGGREGATED_PERIODS`
                {" "}
                من صفحة مكونات الفترات الفصلية.
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-4 text-sm text-muted-foreground">
            اختر فترة فصلية لعرض فترات المحصلة المرتبطة بها.
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileStack className="h-4 w-4" />
            <CardTitle className="text-base">كيف تعمل المحصلة هنا</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. اختر الفترة الفصلية.</p>
          <p>2. أضف مكوّن محصلة داخل مكونات الفصل.</p>
          <p>3. اربط به الفترات الشهرية المناسبة من نفس السنة والترم.</p>
          <p>4. بعد إدخال نتائج الشهور، شغّل احتساب الفصل ليعيد النظام تحجيم مجموع الشهور إلى درجة مكوّن المحصلة.</p>
        </CardContent>
      </Card>
    </div>
  );
}
