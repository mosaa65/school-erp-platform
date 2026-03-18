"use client";

import * as React from "react";
import { BarChart3, Filter, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useAcademicTermOptionsQuery } from "@/features/results-decisions/grading-reports/hooks/use-academic-term-options-query";
import { useAcademicYearOptionsQuery } from "@/features/results-decisions/grading-reports/hooks/use-academic-year-options-query";
import { useGradingDetailedReportQuery } from "@/features/results-decisions/grading-reports/hooks/use-grading-detailed-report-query";
import { useGradeLevelOptionsQuery } from "@/features/results-decisions/grading-reports/hooks/use-grade-level-options-query";
import { useGradingSummaryReportQuery } from "@/features/results-decisions/grading-reports/hooks/use-grading-summary-report-query";
import { useSectionOptionsQuery } from "@/features/results-decisions/grading-reports/hooks/use-section-options-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";

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

const DETAILS_PAGE_SIZE = 12;

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
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [filterDraft, setFilterDraft] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [detailsPage, setDetailsPage] = React.useState(1);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false);

  const yearOptionsQuery = useAcademicYearOptionsQuery();
  const gradeLevelOptionsQuery = useGradeLevelOptionsQuery();
  const sectionOptionsQuery = useSectionOptionsQuery(filterDraft.gradeLevelId || undefined);
  const termOptionsQuery = useAcademicTermOptionsQuery(filterDraft.academicYearId || undefined);

  const reportQuery = useGradingSummaryReportQuery({
    academicYearId: appliedFilters.academicYearId || undefined,
    gradeLevelId: appliedFilters.gradeLevelId || undefined,
    sectionId: appliedFilters.sectionId || undefined,
    academicTermId: appliedFilters.academicTermId || undefined,
    fromDate: toDateStartIso(appliedFilters.fromDate),
    toDate: toDateEndIso(appliedFilters.toDate),
  });
  const detailsQuery = useGradingDetailedReportQuery({
    page: detailsPage,
    limit: DETAILS_PAGE_SIZE,
    search: search || undefined,
    academicYearId: appliedFilters.academicYearId || undefined,
    gradeLevelId: appliedFilters.gradeLevelId || undefined,
    sectionId: appliedFilters.sectionId || undefined,
    academicTermId: appliedFilters.academicTermId || undefined,
    fromDate: toDateStartIso(appliedFilters.fromDate),
    toDate: toDateEndIso(appliedFilters.toDate),
  });

  const report = reportQuery.data;
  const details = detailsQuery.data?.data ?? [];
  const detailsPagination = detailsQuery.data?.pagination;

  React.useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setDetailsPage(1);
    }, 400);

    setDebounceTimer(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilterDraft(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setDetailsPage(1);
    setIsFilterOpen(false);
    setIsFilterSheetOpen(false);
  };

  const applyFilters = () => {
    setAppliedFilters(filterDraft);
    setDetailsPage(1);
    setIsFilterOpen(false);
    setIsFilterSheetOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      appliedFilters.academicYearId ? 1 : 0,
      appliedFilters.gradeLevelId ? 1 : 0,
      appliedFilters.sectionId ? 1 : 0,
      appliedFilters.academicTermId ? 1 : 0,
      appliedFilters.fromDate ? 1 : 0,
      appliedFilters.toDate ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [appliedFilters, searchInput]);

  const filterFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField value={filterDraft.academicYearId} onChange={(event) => setFilterDraft((prev) => ({ ...prev, academicYearId: event.target.value, academicTermId: "" }))} data-testid="grading-report-filter-year">
        <option value="">كل السنوات</option>
        {(yearOptionsQuery.data ?? []).map((item) => (
          <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
        ))}
      </SelectField>
      <SelectField value={filterDraft.gradeLevelId} onChange={(event) => setFilterDraft((prev) => ({ ...prev, gradeLevelId: event.target.value, sectionId: "" }))} data-testid="grading-report-filter-grade">
        <option value="">كل المراحل</option>
        {(gradeLevelOptionsQuery.data ?? []).map((item) => (
          <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
        ))}
      </SelectField>
      <SelectField value={filterDraft.sectionId} onChange={(event) => setFilterDraft((prev) => ({ ...prev, sectionId: event.target.value }))} data-testid="grading-report-filter-section">
        <option value="">كل الشعب</option>
        {(sectionOptionsQuery.data ?? []).map((item) => (
          <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>
        ))}
      </SelectField>
      <SelectField value={filterDraft.academicTermId} onChange={(event) => setFilterDraft((prev) => ({ ...prev, academicTermId: event.target.value }))} data-testid="grading-report-filter-term">
        <option value="">كل الفصول</option>
        {(termOptionsQuery.data ?? []).map((item) => (
          <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
        ))}
      </SelectField>
      <Input type="date" value={filterDraft.fromDate} onChange={(event) => setFilterDraft((prev) => ({ ...prev, fromDate: event.target.value }))} data-testid="grading-report-filter-from-date" />
      <Input type="date" value={filterDraft.toDate} onChange={(event) => setFilterDraft((prev) => ({ ...prev, toDate: event.target.value }))} data-testid="grading-report-filter-to-date" />
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <SearchField
              containerClassName="min-w-[260px] max-w-lg flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث باسم الطالب أو رقم القيد"
              data-testid="grading-report-filter-search"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterTriggerButton
              count={activeFiltersCount}
              onClick={() => setIsFilterOpen((prev) => !prev)}
            />
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="مرشحات التقارير"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={clearFilters} data-testid="grading-report-filters-clear">
                مسح
              </Button>
              <Button type="button" className="flex-1 gap-1.5" onClick={applyFilters} data-testid="grading-report-filters-submit">
                تطبيق
              </Button>
            </div>
          }
        >
          {filterFields}
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              ملخص حوكمة الدرجات
            </CardTitle>
            <CardDescription>تقرير ملخّص لحوكمة الدرجات الفصلية والسنوية والنتائج.</CardDescription>
          </CardHeader>
        </Card>

        {reportQuery.isPending ? (
          <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardContent className="py-6 text-sm text-muted-foreground">جارٍ تحميل البيانات...</CardContent>
          </Card>
        ) : null}

        {reportQuery.error ? (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="py-4 text-sm text-destructive">
              {reportQuery.error instanceof Error ? reportQuery.error.message : "تعذّر تحميل البيانات."}
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
                        <Badge key={`semester-${item.status}`} variant="outline">{translateGradingWorkflowStatus(item.status)}: {item.count}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">الدرجات السنوية</p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.annualGrades.byStatus.map((item) => (
                        <Badge key={`annual-grade-${item.status}`} variant="outline">{translateGradingWorkflowStatus(item.status)}: {item.count}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">النتائج السنوية</p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.annualResults.byStatus.map((item) => (
                        <Badge key={`annual-result-${item.status}`} variant="outline">{translateGradingWorkflowStatus(item.status)}: {item.count}</Badge>
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
                  {report.annualGrades.byFinalStatus.length === 0 ? <p className="text-muted-foreground">لا توجد بيانات.</p> : report.annualGrades.byFinalStatus.map((item) => <p key={item.finalStatusId}>{formatNameCodeLabel(item.name, item.code)}: {item.count}</p>)}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80" data-testid="grading-report-promotion-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">توزيع قرارات الترفيع</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {report.annualResults.byPromotionDecision.length === 0 ? <p className="text-muted-foreground">لا توجد بيانات.</p> : report.annualResults.byPromotionDecision.map((item) => <p key={item.promotionDecisionId}>{formatNameCodeLabel(item.name, item.code)}: {item.count}</p>)}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/70 bg-card/80" data-testid="grading-report-details-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">تفاصيل النتائج السنوية</CardTitle>
                <CardDescription>السجلات: {detailsPagination?.total ?? 0}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {detailsQuery.isPending ? <p className="text-sm text-muted-foreground">جارٍ تحميل التفاصيل...</p> : null}
                {detailsQuery.error ? <p className="text-sm text-destructive">{detailsQuery.error instanceof Error ? detailsQuery.error.message : "فشل تحميل التفاصيل"}</p> : null}
                {!detailsQuery.isPending && details.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد بيانات تفصيلية.</p> : null}

                {details.map((item) => (
                  <div key={item.id} className="space-y-2 rounded-md border border-border/70 bg-background/70 p-3" data-testid="grading-report-detail-item">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.student.fullName}{item.student.admissionNo ? ` (${item.student.admissionNo})` : ""}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.status === "APPROVED" ? "default" : "secondary"}>{translateGradingWorkflowStatus(item.status)}</Badge>
                        <Badge variant={item.isLocked ? "default" : "secondary"}>{item.isLocked ? "مقفل" : "غير مقفل"}</Badge>
                        <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "نشط" : "غير نشط"}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} | {formatNameCodeLabel(item.gradeLevel.name, item.gradeLevel.code)} | {formatNameCodeLabel(item.section.name, item.section.code)}</p>
                    <p className="text-xs text-muted-foreground">الإجمالي: {item.totalAllSubjects}/{item.maxPossibleTotal} | النسبة: {item.percentage}% | ترتيب الشعبة: {item.rankInClass ?? "-"} | ترتيب المرحلة: {item.rankInGrade ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">الحالة الوصفية: {item.gradeDescription ? (item.gradeDescription.nameAr || item.gradeDescription.nameEn || "-") : "-"} | قرار الترفيع: {formatNameCodeLabel(item.promotionDecision.name, item.promotionDecision.code)}</p>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
                  <p className="text-xs text-muted-foreground">الصفحة {detailsPagination?.page ?? 1} من {detailsPagination?.totalPages ?? 1}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDetailsPage((prev) => Math.max(prev - 1, 1))} disabled={!detailsPagination || detailsPagination.page <= 1 || detailsQuery.isFetching} data-testid="grading-report-details-prev">السابق</Button>
                    <Button variant="outline" size="sm" onClick={() => setDetailsPage((prev) => (detailsPagination ? Math.min(prev + 1, detailsPagination.totalPages || 1) : prev))} disabled={!detailsPagination || detailsPagination.page >= detailsPagination.totalPages || detailsQuery.isFetching} data-testid="grading-report-details-next">التالي</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { void Promise.all([reportQuery.refetch(), detailsQuery.refetch()]); }} disabled={reportQuery.isFetching || detailsQuery.isFetching} data-testid="grading-report-refresh">
                <RefreshCw className={`h-4 w-4 ${reportQuery.isFetching || detailsQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </>
        ) : null}
      </div>

      <Fab icon={<Filter className="h-4 w-4" />} label="فلاتر" ariaLabel="فتح فلاتر التقارير" onClick={() => setIsFilterSheetOpen(true)} />

      <BottomSheetForm open={isFilterSheetOpen} title="مرشحات التقارير" onClose={() => setIsFilterSheetOpen(false)} onSubmit={() => undefined} showFooter={false}>
        <div className="space-y-3" data-testid="grading-report-filters-form">
          {filterFields}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={clearFilters}>مسح</Button>
            <Button type="button" className="flex-1" onClick={applyFilters}>تطبيق</Button>
          </div>
        </div>
      </BottomSheetForm>
    </>
  );
}
