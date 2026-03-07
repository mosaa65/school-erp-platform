"use client";

import * as React from "react";
import { BarChart3, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAcademicTermOptionsQuery } from "@/features/grading-reports/hooks/use-academic-term-options-query";
import { useAcademicYearOptionsQuery } from "@/features/grading-reports/hooks/use-academic-year-options-query";
import { useGradeLevelOptionsQuery } from "@/features/grading-reports/hooks/use-grade-level-options-query";
import { useGradingSummaryReportQuery } from "@/features/grading-reports/hooks/use-grading-summary-report-query";
import { useSectionOptionsQuery } from "@/features/grading-reports/hooks/use-section-options-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel } from "@/lib/option-labels";

type FiltersState = {
  academicYearId: string;
  gradeLevelId: string;
  sectionId: string;
  academicTermId: string;
  fromDate: string;
  toDate: string;
};

const DEFAULT_FILTERS: FiltersState = {
  academicYearId: "",
  gradeLevelId: "",
  sectionId: "",
  academicTermId: "",
  fromDate: "",
  toDate: "",
};

function toDateStartIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return `${value}T00:00:00.000Z`;
}

function toDateEndIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return `${value}T23:59:59.999Z`;
}

function toPercentageLabel(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function GradingReportsWorkspace() {
  const [filters, setFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);

  const yearOptionsQuery = useAcademicYearOptionsQuery();
  const gradeLevelOptionsQuery = useGradeLevelOptionsQuery();
  const sectionOptionsQuery = useSectionOptionsQuery(filters.gradeLevelId || undefined);
  const termOptionsQuery = useAcademicTermOptionsQuery(filters.academicYearId || undefined);

  const reportQuery = useGradingSummaryReportQuery({
    academicYearId: appliedFilters.academicYearId || undefined,
    gradeLevelId: appliedFilters.gradeLevelId || undefined,
    sectionId: appliedFilters.sectionId || undefined,
    academicTermId: appliedFilters.academicTermId || undefined,
    fromDate: toDateStartIso(appliedFilters.fromDate),
    toDate: toDateEndIso(appliedFilters.toDate),
  });

  const report = reportQuery.data;

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            ملخص حوكمة الدرجات
          </CardTitle>
          <CardDescription>
            تقرير ملخّص لحوكمة الدرجات الفصلية والسنوية والنتائج.
          </CardDescription>
          <form
            className="grid gap-2 md:grid-cols-[150px_150px_160px_170px_150px_150px_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedFilters(filters);
            }}
            data-testid="grading-report-filters-form"
          >
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.academicYearId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  academicYearId: event.target.value,
                  academicTermId: "",
                }))
              }
              data-testid="grading-report-filter-year"
            >
              <option value="">كل السنوات</option>
              {(yearOptionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.gradeLevelId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  gradeLevelId: event.target.value,
                  sectionId: "",
                }))
              }
              data-testid="grading-report-filter-grade"
            >
              <option value="">كل المراحل</option>
              {(gradeLevelOptionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.sectionId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, sectionId: event.target.value }))
              }
              data-testid="grading-report-filter-section"
            >
              <option value="">كل الشعب</option>
              {(sectionOptionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.academicTermId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, academicTermId: event.target.value }))
              }
              data-testid="grading-report-filter-term"
            >
              <option value="">كل الفصول</option>
              {(termOptionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={filters.fromDate}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, fromDate: event.target.value }))
              }
              data-testid="grading-report-filter-from-date"
            />
            <Input
              type="date"
              value={filters.toDate}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, toDate: event.target.value }))
              }
              data-testid="grading-report-filter-to-date"
            />

            <Button
              type="submit"
              variant="outline"
              className="gap-2"
              data-testid="grading-report-filters-submit"
            >
              <Search className="h-4 w-4" />
              تطبيق
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setAppliedFilters(DEFAULT_FILTERS);
              }}
              data-testid="grading-report-filters-clear"
            >
              مسح
            </Button>
          </form>
        </CardHeader>
      </Card>

      {reportQuery.isPending ? (
        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardContent className="py-6 text-sm text-muted-foreground">
            جارٍ التحميل...
          </CardContent>
        </Card>
      ) : null}

      {reportQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">
            {reportQuery.error instanceof Error
              ? reportQuery.error.message
              : "فشل التحميل"}
          </CardContent>
        </Card>
      ) : null}

      {report ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-border/70 bg-card/80" data-testid="grading-report-semester-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">الدرجات الفصلية</CardTitle>
                <CardDescription>الإجمالي: {report.semesterGrades.total}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>النشط: {report.semesterGrades.active}</p>
                <p>المقفل: {report.semesterGrades.locked}</p>
                <p>نسبة الإقفال: {toPercentageLabel(report.semesterGrades.lockRate)}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="grading-report-annual-grades-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">الدرجات السنوية</CardTitle>
                <CardDescription>الإجمالي: {report.annualGrades.total}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>النشط: {report.annualGrades.active}</p>
                <p>المقفل: {report.annualGrades.locked}</p>
                <p>نسبة الإقفال: {toPercentageLabel(report.annualGrades.lockRate)}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="grading-report-annual-results-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">النتائج السنوية</CardTitle>
                <CardDescription>الإجمالي: {report.annualResults.total}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>النشط: {report.annualResults.active}</p>
                <p>المقفل: {report.annualResults.locked}</p>
                <p>نسبة الإقفال: {toPercentageLabel(report.annualResults.lockRate)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-border/70 bg-card/80" data-testid="grading-report-workflow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">توزيع حالات سير العمل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">الفصلي</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.semesterGrades.byStatus.map((item) => (
                      <Badge key={`semester-${item.status}`} variant="outline">
                        {translateGradingWorkflowStatus(item.status)}: {item.count}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">الدرجات السنوية</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.annualGrades.byStatus.map((item) => (
                      <Badge key={`annual-grade-${item.status}`} variant="outline">
                        {translateGradingWorkflowStatus(item.status)}: {item.count}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">النتائج السنوية</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.annualResults.byStatus.map((item) => (
                      <Badge key={`annual-result-${item.status}`} variant="outline">
                        {translateGradingWorkflowStatus(item.status)}: {item.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="grading-report-ranking-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">جاهزية الترتيب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>مع ترتيب شعبة: {report.rankingReadiness.withClassRank}</p>
                <p>مع ترتيب مرحلة: {report.rankingReadiness.withGradeRank}</p>
                <p>مرتبة بالكامل: {report.rankingReadiness.fullyRanked}</p>
                <p>بدون ترتيب شعبة: {report.rankingReadiness.missingClassRank}</p>
                <p>بدون ترتيب مرحلة: {report.rankingReadiness.missingGradeRank}</p>
                <p>غير مرتبة بالكامل: {report.rankingReadiness.notFullyRanked}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-border/70 bg-card/80" data-testid="grading-report-final-status-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">توزيع الحالات النهائية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {report.annualGrades.byFinalStatus.length === 0 ? (
                  <p className="text-muted-foreground">لا توجد بيانات.</p>
                ) : (
                  report.annualGrades.byFinalStatus.map((item) => (
                    <p key={item.finalStatusId}>
                      {formatNameCodeLabel(item.name, item.code)}: {item.count}
                    </p>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="grading-report-promotion-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">توزيع قرارات الترفيع</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {report.annualResults.byPromotionDecision.length === 0 ? (
                  <p className="text-muted-foreground">لا توجد بيانات.</p>
                ) : (
                  report.annualResults.byPromotionDecision.map((item) => (
                    <p key={item.promotionDecisionId}>
                      {formatNameCodeLabel(item.name, item.code)}: {item.count}
                    </p>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => void reportQuery.refetch()}
              disabled={reportQuery.isFetching}
              data-testid="grading-report-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${reportQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}





