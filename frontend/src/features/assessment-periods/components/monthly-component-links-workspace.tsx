"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, Calculator, ClipboardCheck, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  ApiError,
  apiClient,
  type AssessmentPeriodComponentListItem,
  type AssessmentPeriodListItem,
} from "@/lib/api/client";
import { formatNameCodeLabel } from "@/lib/option-labels";

type SourceGroup = {
  key: "AUTO_HOMEWORK" | "AUTO_ATTENDANCE" | "AUTO_EXAM" | "MANUAL" | "OTHER";
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  icon: React.ReactNode;
  components: AssessmentPeriodComponentListItem[];
};

function buildSourceGroups(
  components: AssessmentPeriodComponentListItem[],
): SourceGroup[] {
  const groups: SourceGroup[] = [
    {
      key: "AUTO_HOMEWORK",
      title: "مصدر الواجبات",
      description: "هذه المكونات تُغذى من نظام الواجبات وواجبات الطلاب.",
      href: "/app/student-homeworks",
      actionLabel: "فتح واجبات الطلاب",
      icon: <BookOpenCheck className="h-4 w-4" />,
      components: [],
    },
    {
      key: "AUTO_ATTENDANCE",
      title: "مصدر الحضور والغياب",
      description: "هذه المكونات تُغذى من نظام حضور وغياب الطلاب.",
      href: "/app/student-attendance",
      actionLabel: "فتح حضور الطلاب",
      icon: <ClipboardCheck className="h-4 w-4" />,
      components: [],
    },
    {
      key: "AUTO_EXAM",
      title: "مصدر الاختبارات",
      description: "هذه المكونات تُغذى من نظام الاختبارات ودرجات الاختبارات.",
      href: "/app/student-exam-scores",
      actionLabel: "فتح درجات الاختبارات",
      icon: <Calculator className="h-4 w-4" />,
      components: [],
    },
    {
      key: "MANUAL",
      title: "مكونات الإدخال اليدوي",
      description: "هذه المكونات لا تأتي من نظام خارجي وتُدخل يدويًا داخل نتائج الشهر.",
      href: "/app/monthly-period-component-scores",
      actionLabel: "فتح درجات مكونات الشهر",
      icon: <FileText className="h-4 w-4" />,
      components: [],
    },
    {
      key: "OTHER",
      title: "مكونات تحتاج مراجعة",
      description: "هذه المكونات لا يُفترض وجودها عادة داخل الفترة الشهرية، راجع إعدادها.",
      href: "/app/monthly-assessment-components",
      actionLabel: "فتح مكونات الشهر",
      icon: <FileText className="h-4 w-4" />,
      components: [],
    },
  ];

  for (const component of components) {
    if (component.entryMode === "AUTO_HOMEWORK") {
      groups[0].components.push(component);
      continue;
    }
    if (component.entryMode === "AUTO_ATTENDANCE") {
      groups[1].components.push(component);
      continue;
    }
    if (component.entryMode === "AUTO_EXAM") {
      groups[2].components.push(component);
      continue;
    }
    if (component.entryMode === "MANUAL") {
      groups[3].components.push(component);
      continue;
    }
    groups[4].components.push(component);
  }

  return groups;
}

function formatPeriodScope(item: AssessmentPeriodListItem) {
  const parts = [formatNameCodeLabel(item.academicYear.name, item.academicYear.code)];
  if (item.academicTerm) {
    parts.push(formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code));
  }
  if (item.academicMonth) {
    parts.push(formatNameCodeLabel(item.academicMonth.name, item.academicMonth.code));
  }
  return parts.join(" / ");
}

export function MonthlyComponentLinksWorkspace() {
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

  const periodsQuery = useQuery({
    queryKey: ["monthly-assessment-periods", "monthly-links"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listMonthlyAssessmentPeriods({
          page: 1,
          limit: 100,
          isActive: true,
        });
        return response.data;
      } catch (error) {
        onAuthError(error);
        throw error;
      }
    },
  });

  const periods = React.useMemo(
    () =>
      [...(periodsQuery.data ?? [])].sort((a, b) =>
        `${a.sequence}-${a.name}`.localeCompare(`${b.sequence}-${b.name}`, "ar"),
      ),
    [periodsQuery.data],
  );

  React.useEffect(() => {
    if (!selectedPeriodId && periods[0]) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const selectedPeriod = periods.find((item) => item.id === selectedPeriodId) ?? null;

  const componentsQuery = useQuery({
    queryKey: ["monthly-assessment-components", "monthly-links", selectedPeriodId],
    enabled: auth.isHydrated && auth.isAuthenticated && Boolean(selectedPeriodId),
    queryFn: async () => {
      try {
        const response = await apiClient.listMonthlyAssessmentComponents({
          page: 1,
          limit: 100,
          assessmentPeriodId: selectedPeriodId,
          isActive: true,
        });
        return response.data;
      } catch (error) {
        onAuthError(error);
        throw error;
      }
    },
  });

  const components = componentsQuery.data ?? [];
  const sourceGroups = buildSourceGroups(components);
  const invalidMonthlyComponents = sourceGroups.find((group) => group.key === "OTHER")?.components.length ?? 0;

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">اختيار الفترة الشهرية</CardTitle>
          <CardDescription>
            اختر الشهر الذي تريد مراجعة مصادر مكوناته وربطها بالأنظمة التنفيذية.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectField
            value={selectedPeriodId}
            onChange={(event) => setSelectedPeriodId(event.target.value)}
          >
            <option value="">اختر فترة شهرية</option>
            {periods.map((item) => (
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
                <p className="text-xs text-muted-foreground">عدد المكونات</p>
                <p className="mt-1 font-semibold">{components.length}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">مكونات تحتاج مراجعة</p>
                <p className="mt-1 font-semibold">{invalidMonthlyComponents}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {periodsQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {periodsQuery.error instanceof Error
              ? periodsQuery.error.message
              : "تعذر تحميل الفترات الشهرية."}
          </CardContent>
        </Card>
      ) : null}

      {componentsQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {componentsQuery.error instanceof Error
              ? componentsQuery.error.message
              : "تعذر تحميل المكونات."}
          </CardContent>
        </Card>
      ) : null}

      {selectedPeriod ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {sourceGroups.map((group) => (
            <Card key={group.key} className="border-border/70 bg-card/80">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {group.icon}
                    <CardTitle className="text-base">{group.title}</CardTitle>
                  </div>
                  <Badge variant={group.components.length > 0 ? "default" : "secondary"}>
                    {group.components.length}
                  </Badge>
                </div>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.components.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    لا توجد مكونات من هذا النوع في الشهر المحدد.
                  </p>
                ) : (
                  group.components.map((component) => (
                    <div key={component.id} className="rounded-xl border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{component.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {component.code ? `${component.code} | ` : ""}
                            الدرجة {component.maxScore}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {group.key === "AUTO_HOMEWORK"
                            ? "الواجبات"
                            : group.key === "AUTO_ATTENDANCE"
                              ? "الحضور"
                              : group.key === "AUTO_EXAM"
                                ? "الاختبارات"
                                : group.key === "MANUAL"
                                  ? "يدوي"
                                  : "مراجعة"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}

                <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3">
                  <Button asChild variant="outline">
                    <Link href={group.href}>
                      {group.actionLabel}
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/app/monthly-assessment-components">تعديل مكونات الشهر</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-4 text-sm text-muted-foreground">
            اختر فترة شهرية لعرض مصادر المكونات.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
