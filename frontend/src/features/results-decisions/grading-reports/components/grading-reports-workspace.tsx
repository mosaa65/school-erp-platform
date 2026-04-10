"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BarChart3,
  RefreshCw,
  CalendarDays,
  GraduationCap,
  Layout,
  Users,
  Trophy,
  Activity,
  CheckCircle2,
  Lock,
  LockOpen,
  Eye,
  FileSpreadsheet,
  PieChart,
  ArrowRightCircle,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { PageShell } from "@/components/ui/page-shell";
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

function toDateStartIso(value: string) { return value ? `${value}T00:00:00.000Z` : undefined; }
function toDateEndIso(value: string) { return value ? `${value}T23:59:59.999Z` : undefined; }
function toPercentageLabel(value: number) { return `${value.toFixed(1)}%`; }

export function GradingReportsWorkspace() {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filterDraft, setFilterDraft] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [detailsPage, setDetailsPage] = React.useState(1);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

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

  useDebounceEffect(() => {
    setSearch(searchInput.trim());
    setDetailsPage(1);
  }, 400, [searchInput]);

  const applyFilters = () => {
    setAppliedFilters(filterDraft);
    setDetailsPage(1);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilterDraft(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setDetailsPage(1);
    setIsFilterOpen(false);
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
    ].reduce((acc, v) => acc + v, 0);
  }, [appliedFilters, searchInput]);

  return (
    <PageShell
      title="تقارير حوكمة الدرجات"
      subtitle="شاشة تحليلية لمتابعة حالة رصد الدرجات، نسب الإعتماد، وتوزيع النتائج النهائية عبر المستويات التعليمية المختلفة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الطالب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void Promise.all([reportQuery.refetch(), detailsQuery.refetch()])} disabled={reportQuery.isFetching || detailsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${reportQuery.isFetching || detailsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="معايير التقرير"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none px-1">السنة الدراسية</label>
              <SelectField value={filterDraft.academicYearId} onChange={(e) => setFilterDraft(p => ({ ...p, academicYearId: e.target.value, academicTermId: "" }))}>
                <option value="">كل السنوات</option>
                {(yearOptionsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{formatNameCodeLabel(y.name, y.code)}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none px-1">المرحلة</label>
              <SelectField value={filterDraft.gradeLevelId} onChange={(e) => setFilterDraft(p => ({ ...p, gradeLevelId: e.target.value, sectionId: "" }))}>
                <option value="">كل المراحل</option>
                {(gradeLevelOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{formatNameCodeLabel(g.name, g.code)}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none px-1">الشعبة</label>
              <SelectField value={filterDraft.sectionId} onChange={(e) => setFilterDraft(p => ({ ...p, sectionId: e.target.value }))}>
                <option value="">كل الشعب</option>
                {(sectionOptionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        {report && (
          <div className="space-y-4">
            {/* KPI Summary Rows */}
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "كشوف الفصل", data: report.semesterGrades, color: "primary", icon: GraduationCap },
                { label: "الدرجات السنوية", data: report.annualGrades, color: "emerald", icon: BarChart3 },
                { label: "النتائج النهائية", data: report.annualResults, color: "amber", icon: Trophy },
              ].map((kpi, idx) => (
                <Card key={idx} className={`border-${kpi.color}-500/10 bg-${kpi.color}-500/5 group hover:shadow-lg transition-all`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-xl bg-background border border-${kpi.color}-500/10`}>
                        <kpi.icon className={`h-5 w-5 text-${kpi.color}-600`} />
                      </div>
                      <Badge variant="outline" className={`h-5 text-[8px] font-bold border-${kpi.color}-500/20 text-${kpi.color}-700`}>
                        {toPercentageLabel(kpi.data.lockRate)} قفل
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold uppercase text-muted-foreground">{kpi.label}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black">{kpi.data.total}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">سجل</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold text-muted-foreground">نشط</span>
                        <span className="text-xs font-bold">{kpi.data.active}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold text-muted-foreground">مقفل</span>
                        <span className="text-xs font-bold">{kpi.data.locked}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Analytics Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/70 bg-card/80">
                <CardHeader className="py-4 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary" /> توزيع حالات المعالجة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {[
                    { label: "الفصلية", items: report.semesterGrades.byStatus },
                    { label: "السنوية", items: report.annualGrades.byStatus },
                    { label: "النتائج", items: report.annualResults.byStatus },
                  ].map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2">
                      <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">{group.label}</span>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {group.items.map((it, iIdx) => (
                          <Badge key={iIdx} variant="secondary" className="h-6 font-bold bg-background text-[10px] rounded-lg border-border/60">
                            {translateGradingWorkflowStatus(it.status)}: <span className="ml-1 text-primary">{it.count}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader className="py-4 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> جاهزية تصدير الترتيب
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-emerald-700">مكتملة الترتيب</span>
                      <div className="text-lg font-black text-emerald-600 leading-none">{report.rankingReadiness.fullyRanked}</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-amber-700">نواقص الترتيب</span>
                      <div className="text-lg font-black text-amber-600 leading-none">{report.rankingReadiness.notFullyRanked}</div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    {[
                      { label: "ترتيب الشعبة مفقود", count: report.rankingReadiness.missingClassRank },
                      { label: "ترتيب المرحلة مفقود", count: report.rankingReadiness.missingGradeRank },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 text-[11px] font-bold border-b border-border/40 last:border-0">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="text-destructive px-2 py-0.5 rounded-full bg-destructive/5 border border-destructive/10">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Details List */}
            <Card className="border-border/70 bg-card/80 overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/60 py-5">
                <div className="flex flex-wrap items-center justify-between gap-2 px-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" /> تفاصيل النتائج السنوية
                  </CardTitle>
                  <Badge variant="secondary" className="h-5 px-3 rounded-full text-[10px]">نطاق الفلترة: {detailsPagination?.total ?? 0}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {details.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[15px]">{item.student.fullName}</p>
                            {item.student.admissionNo && <Badge variant="outline" className="text-[9px] h-4 leading-none font-bold">#{item.student.admissionNo}</Badge>}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold tracking-tight uppercase">
                            <Layout className="h-3.5 w-3.5" /> <span>{item.section.name}</span>
                            <span className="mx-1 opacity-40">•</span>
                            <CalendarDays className="h-3.5 w-3.5" /> <span>{formatNameCodeLabel(item.academicYear.name, item.academicYear.code)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[10px] font-black leading-none opacity-40 uppercase">الإجمالي</div>
                            <div className="text-lg font-black text-primary">{item.totalAllSubjects}</div>
                          </div>
                          <div className="h-10 w-[1px] bg-border/40 mx-2" />
                          <div className="flex flex-col gap-1 items-end">
                            <Badge variant={item.isLocked ? "secondary" : "default"} className="h-5 text-[8px] font-black uppercase">
                              {item.isLocked ? <Lock className="h-2.5 w-2.5 mr-1 inline" /> : <LockOpen className="h-2.5 w-2.5 mr-1 inline" />}
                              {item.isLocked ? "مقفل" : "مفتوح"}
                            </Badge>
                            <Badge variant="outline" className="h-5 text-[8px] font-black bg-emerald-50 text-emerald-700 border-emerald-200">
                              {formatNameCodeLabel(item.promotionDecision.name, item.promotionDecision.code)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "النسبة", val: `${item.percentage}%`, icon: Trophy },
                          { label: "ت. الشعبة", val: item.rankInClass ?? "-", icon: Users },
                          { label: "ت. المرحلة", val: item.rankInGrade ?? "-", icon: ArrowRightCircle },
                          { label: "التقدير", val: item.gradeDescription?.nameAr ?? "-", icon: CheckCircle2 },
                        ].map((stat, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/40 bg-background/50">
                            <stat.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                            <div className="flex flex-col">
                              <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none">{stat.label}</span>
                              <span className="text-[11px] font-black mt-0.5">{stat.val}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {!detailsQuery.isPending && details.length === 0 && (
                  <div className="p-12 text-center space-y-2 opacity-50">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm font-bold">لا توجد بيانات تفصيلية مطابقة للفلترة.</p>
                  </div>
                )}

                <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
                  <p className="text-xs text-muted-foreground font-bold italic tracking-wide">نمط العرض: كشوفات تفصيلية</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setDetailsPage(p => Math.max(p - 1, 1))} disabled={!detailsPagination || detailsPagination.page <= 1}>السابق</Button>
                    <div className="text-[10px] font-bold px-2">Page {detailsPagination?.page ?? 1} / {detailsPagination?.totalPages ?? 1}</div>
                    <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setDetailsPage(p => (detailsPagination ? Math.min(p + 1, detailsPagination.totalPages || 1) : p))} disabled={!detailsPagination || detailsPagination.page >= detailsPagination.totalPages}>التالي</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageShell>
  );
}
