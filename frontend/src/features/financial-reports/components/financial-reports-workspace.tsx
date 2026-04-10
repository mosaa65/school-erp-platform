"use client";

import * as React from "react";
import { FileText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SelectField } from "@/components/ui/select-field";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import {
  FinanceAlert,
  FinanceAppliedFiltersSummary,
  FinanceEmptyState,
  FinanceInlineHint,
} from "@/features/finance/shared/finance-ui";
import {
  useFinancialReportQuery,
  type FinancialReportType,
} from "@/features/financial-reports/hooks/use-financial-report-query";

const DEFAULT_REPORT: FinancialReportType = "trial-balance";

const REPORT_OPTIONS: Array<{ value: FinancialReportType; label: string }> = [
  { value: "trial-balance", label: "ميزان المراجعة" },
  { value: "general-ledger", label: "دفتر الأستاذ العام" },
  { value: "account-summary", label: "ملخص الحسابات" },
  { value: "income-statement", label: "قائمة الدخل" },
  { value: "balance-sheet", label: "الميزانية العمومية" },
  { value: "student-account-statement", label: "كشف حساب الطالب" },
  { value: "vat-report", label: "تقرير ضريبة القيمة المضافة" },
  { value: "accounts-receivable-aging", label: "أعمار الذمم" },
];

const REPORT_GUIDANCE: Record<FinancialReportType, string> = {
  "trial-balance": "مناسب للمراجعة السريعة على مستوى الفرع أو الفترة المالية.",
  "general-ledger": "الأفضل عند تتبع حركة حساب محدد أو مراجعة دفتر الأستاذ العام.",
  "account-summary": "مفيد لعرض ملخص مختصر لحساب واحد أو أكثر دون تفاصيل السطور.",
  "income-statement": "يعرض الأداء التشغيلي خلال فترة زمنية محددة.",
  "balance-sheet": "يعرض المركز المالي حتى تاريخ معيّن، ويفضّل استخدام تاريخ as of date.",
  "student-account-statement": "يتطلب معرّف القيد الدراسي لإظهار كشف حساب طالب واحد.",
  "vat-report": "راجعه بعد تحديد الفترة أو نطاق التاريخ لتفادي مخرجات واسعة جدًا.",
  "accounts-receivable-aging": "أفضل تقرير لمتابعة الذمم المفتوحة والمتأخرة حسب الفرع أو التاريخ.",
};

type DraftFilters = {
  reportType: FinancialReportType;
  branchId: string;
  fiscalYearId: string;
  fiscalPeriodId: string;
  accountId: string;
  enrollmentId: string;
  academicYearId: string;
  dateFrom: string;
  dateTo: string;
  asOfDate: string;
  includeHeaders: boolean;
  page: string;
  limit: string;
};

type AppliedFilters = Omit<DraftFilters, "page" | "limit" | "includeHeaders"> & {
  page?: number;
  limit?: number;
  includeHeaders?: boolean;
};

const DEFAULT_FILTERS: DraftFilters = {
  reportType: DEFAULT_REPORT,
  branchId: "",
  fiscalYearId: "",
  fiscalPeriodId: "",
  accountId: "",
  enrollmentId: "",
  academicYearId: "",
  dateFrom: "",
  dateTo: "",
  asOfDate: "",
  includeHeaders: true,
  page: "",
  limit: "",
};

const DEFAULT_APPLIED_FILTERS: AppliedFilters = {
  reportType: DEFAULT_REPORT,
  branchId: "",
  fiscalYearId: "",
  fiscalPeriodId: "",
  accountId: "",
  enrollmentId: "",
  academicYearId: "",
  dateFrom: "",
  dateTo: "",
  asOfDate: "",
  includeHeaders: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function toOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function FinancialReportsWorkspace() {
  const [draftFilters, setDraftFilters] = React.useState<DraftFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilters>(
    DEFAULT_APPLIED_FILTERS,
  );
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const reportType = appliedFilters.reportType ?? DEFAULT_REPORT;
  const requiresEnrollment = reportType === "student-account-statement";
  const canRunReport = !requiresEnrollment || Boolean(appliedFilters.enrollmentId);

  const reportQuery = useFinancialReportQuery({
    reportType,
    enabled: canRunReport,
    params: {
      branchId: toOptionalNumber(appliedFilters.branchId),
      fiscalYearId: toOptionalNumber(appliedFilters.fiscalYearId),
      fiscalPeriodId: toOptionalNumber(appliedFilters.fiscalPeriodId),
      accountId: toOptionalNumber(appliedFilters.accountId),
      enrollmentId: toOptionalString(appliedFilters.enrollmentId),
      academicYearId: toOptionalString(appliedFilters.academicYearId),
      dateFrom: toOptionalString(appliedFilters.dateFrom),
      dateTo: toOptionalString(appliedFilters.dateTo),
      asOfDate: toOptionalString(appliedFilters.asOfDate),
      includeHeaders: appliedFilters.includeHeaders,
      page: appliedFilters.page,
      limit: appliedFilters.limit,
    },
  });

  const report = reportQuery.data;
  const reportRows = report?.rows ?? [];
  const summaryEntries = report?.summary ? Object.entries(report.summary) : [];

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      appliedFilters.branchId ? 1 : 0,
      appliedFilters.fiscalYearId ? 1 : 0,
      appliedFilters.fiscalPeriodId ? 1 : 0,
      appliedFilters.accountId ? 1 : 0,
      appliedFilters.enrollmentId ? 1 : 0,
      appliedFilters.academicYearId ? 1 : 0,
      appliedFilters.dateFrom ? 1 : 0,
      appliedFilters.dateTo ? 1 : 0,
      appliedFilters.asOfDate ? 1 : 0,
      appliedFilters.includeHeaders === false ? 1 : 0,
      appliedFilters.page ? 1 : 0,
      appliedFilters.limit ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return count;
  }, [appliedFilters]);

  const appliedFilterItems = React.useMemo(
    () =>
      [
        appliedFilters.branchId
          ? { key: "branchId", label: "الفرع", value: appliedFilters.branchId }
          : null,
        appliedFilters.fiscalYearId
          ? { key: "fiscalYearId", label: "السنة المالية", value: appliedFilters.fiscalYearId }
          : null,
        appliedFilters.fiscalPeriodId
          ? { key: "fiscalPeriodId", label: "الفترة", value: appliedFilters.fiscalPeriodId }
          : null,
        appliedFilters.accountId
          ? { key: "accountId", label: "الحساب", value: appliedFilters.accountId }
          : null,
        appliedFilters.enrollmentId
          ? { key: "enrollmentId", label: "القيد", value: appliedFilters.enrollmentId }
          : null,
        appliedFilters.academicYearId
          ? { key: "academicYearId", label: "العام الدراسي", value: appliedFilters.academicYearId }
          : null,
        appliedFilters.dateFrom
          ? { key: "dateFrom", label: "من", value: appliedFilters.dateFrom }
          : null,
        appliedFilters.dateTo ? { key: "dateTo", label: "إلى", value: appliedFilters.dateTo } : null,
        appliedFilters.asOfDate
          ? { key: "asOfDate", label: "حتى تاريخ", value: appliedFilters.asOfDate }
          : null,
      ].filter((item): item is { key: string; label: string; value: string } => item !== null),
    [appliedFilters],
  );

  const applyFilters = () => {
    setAppliedFilters({
      ...draftFilters,
      page: toOptionalNumber(draftFilters.page),
      limit: toOptionalNumber(draftFilters.limit),
    });
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_APPLIED_FILTERS);
    setIsFilterOpen(false);
  };

  return (
    <PageShell
      title="التقارير المالية"
      subtitle="تشغيل تقارير المالية بسرعة مع تلميحات تساعدك على اختيار التقرير والفلتر المناسب."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={appliedFilters.enrollmentId || ""}
          onSearchChange={(event) => setAppliedFilters((prev) => ({ ...prev, enrollmentId: event.target.value }))}
          searchPlaceholder="بحث بمعرف القيد..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void reportQuery.refetch()}
              disabled={reportQuery.isFetching || !canRunReport}
            >
              <RefreshCw className={`h-4 w-4 ${reportQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FinanceInlineHint title="متى أستخدم هذا التقرير؟">
          {REPORT_GUIDANCE[reportType]}
        </FinanceInlineHint>

        <div className="flex flex-wrap gap-2">
          {REPORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={reportType === option.value ? "default" : "outline"}
              size="sm"
              className="rounded-full px-4"
              onClick={() => {
                const newType = option.value;
                setDraftFilters((prev) => ({ ...prev, reportType: newType }));
                setAppliedFilters((prev) => ({ ...prev, reportType: newType }));
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <FinanceAppliedFiltersSummary
          items={appliedFilterItems}
          onClear={clearFilters}
          emptyLabel="التقرير يعمل الآن بدون فلاتر إضافية."
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر التقارير المالية"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">
                مسح
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1">
                تطبيق
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">نوع التقرير</label>
              <SelectField
                value={draftFilters.reportType}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    reportType: event.target.value as FinancialReportType,
                  }))
                }
              >
                {REPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">معرف الفرع</label>
              <Input
                placeholder="branchId"
                value={draftFilters.branchId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, branchId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">السنة المالية</label>
              <Input
                placeholder="fiscalYearId"
                value={draftFilters.fiscalYearId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, fiscalYearId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الفترة المالية</label>
              <Input
                placeholder="fiscalPeriodId"
                value={draftFilters.fiscalPeriodId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, fiscalPeriodId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">معرف الحساب</label>
              <Input
                placeholder="accountId"
                value={draftFilters.accountId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, accountId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">العام الدراسي</label>
              <Input
                placeholder="academicYearId"
                value={draftFilters.academicYearId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
              <Input
                type="date"
                value={draftFilters.dateFrom}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
              <Input
                type="date"
                value={draftFilters.dateTo}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, dateTo: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">حتى تاريخ (As of)</label>
              <Input
                type="date"
                value={draftFilters.asOfDate}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, asOfDate: event.target.value }))
                }
              />
            </div>
            <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm">
              <span>إظهار العناوين</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={draftFilters.includeHeaders}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    includeHeaders: event.target.checked,
                  }))
                }
              />
            </label>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 pb-6 border-b border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                مخرجات التقرير
              </CardTitle>
              <Badge variant="outline" className="rounded-full bg-background/50">
                {REPORT_OPTIONS.find(o => o.value === reportType)?.label}
              </Badge>
            </div>
            <CardDescription>
              استعراض مخرجات التقرير المالي بناءً على المعايير المحددة أعلاه.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {!canRunReport ? (
              <FinanceEmptyState>
                يجب تحديد معرّف القيد الدراسي لتوليد كشف حساب الطالب. استخدم شريط البحث أعلاه لإدخال المعرف.
              </FinanceEmptyState>
            ) : null}

            {reportQuery.isPending ? (
              <FinanceEmptyState>جارٍ توليد وتحميل مخرجات التقرير... يرجى الانتظار.</FinanceEmptyState>
            ) : null}

            {reportQuery.error ? (
              <FinanceAlert tone="error">
                {reportQuery.error instanceof Error
                  ? reportQuery.error.message
                  : "حدث خطأ غير متوقع أثناء محاولة تحميل التقرير."}
              </FinanceAlert>
            ) : null}

            {report ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-muted/20 border border-border/60">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                      <span className="text-foreground">{report.generatedAt ? new Date(report.generatedAt).toLocaleString("ar-SA") : "-"}</span>
                    </div>
                    <div className="h-3 w-px bg-border/60" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">عدد السجلات:</span>
                      <span className="text-foreground">{reportRows.length}</span>
                    </div>
                  </div>
                  
                  {summaryEntries.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {summaryEntries.map(([key, value]) => (
                        <div key={key} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20 text-[10px] font-bold text-primary">
                          <span>{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {reportRows.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">معاينة أولية للسجلات</p>
                      <Badge variant="secondary" className="text-[10px]">JSON Format Preview</Badge>
                    </div>
                    <div className="relative group">
                      <pre className="max-h-96 overflow-auto rounded-2xl border border-border/70 bg-background/50 p-4 text-[11px] font-mono leading-relaxed text-muted-foreground scrollbar-thin scrollbar-thumb-border">
                        {JSON.stringify(reportRows, null, 2)}
                      </pre>
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/80 to-transparent pointer-events-none rounded-b-2xl" />
                    </div>
                  </div>
                ) : (
                  <FinanceEmptyState>التقرير ناجح ولكن لا توجد سجلات مطابقة للمعايير المختارة.</FinanceEmptyState>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
