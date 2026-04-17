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
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { SelectField } from "@/components/ui/select-field";
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
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            نوع التقرير: {REPORT_OPTIONS.find((option) => option.value === reportType)?.label}
          </Badge>
          <FilterTriggerButton
            count={activeFiltersCount}
            onClick={() => setIsFilterOpen((prev) => !prev)}
          />
        </div>
      }
    >
      <div className="space-y-4">
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
              onClick={() => {
                setDraftFilters((prev) => ({ ...prev, reportType: option.value }));
                setAppliedFilters((prev) => ({ ...prev, reportType: option.value }));
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
        actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
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
          <Input
            placeholder="معرف الفرع"
            value={draftFilters.branchId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, branchId: event.target.value }))
            }
          />
          <Input
            placeholder="معرف السنة المالية"
            value={draftFilters.fiscalYearId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, fiscalYearId: event.target.value }))
            }
          />
          <Input
            placeholder="معرف الفترة المالية"
            value={draftFilters.fiscalPeriodId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, fiscalPeriodId: event.target.value }))
            }
          />
          <Input
            placeholder="معرف الحساب"
            value={draftFilters.accountId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, accountId: event.target.value }))
            }
          />
          <Input
            placeholder="معرف القيد الدراسي"
            value={draftFilters.enrollmentId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, enrollmentId: event.target.value }))
            }
          />
          <Input
            placeholder="معرف العام الدراسي"
            value={draftFilters.academicYearId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, academicYearId: event.target.value }))
            }
          />
          <Input
            type="date"
            value={draftFilters.dateFrom}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
            }
          />
          <Input
            type="date"
            value={draftFilters.dateTo}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, dateTo: event.target.value }))
            }
          />
          <Input
            type="date"
            value={draftFilters.asOfDate}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, asOfDate: event.target.value }))
            }
          />
          <Input
            placeholder="رقم الصفحة"
            value={draftFilters.page}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, page: event.target.value }))
            }
          />
          <Input
            placeholder="عدد السجلات"
            value={draftFilters.limit}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, limit: event.target.value }))
            }
          />
          <FormBooleanField
            label="إظهار العناوين"
            checked={draftFilters.includeHeaders}
            onCheckedChange={(checked) =>
              setDraftFilters((prev) => ({
                ...prev,
                includeHeaders: checked,
              }))
            }
          />
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            التقارير المالية
          </CardTitle>
          <CardDescription>
            استعراض تقارير النظام المالي مع إمكانية ضبط الفلاتر المختلفة.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!canRunReport ? (
            <FinanceEmptyState>
              يجب تحديد معرف القيد الدراسي لتوليد كشف حساب الطالب.
            </FinanceEmptyState>
          ) : null}

          {reportQuery.isPending ? (
            <FinanceEmptyState>جارٍ تحميل التقرير...</FinanceEmptyState>
          ) : null}

          {reportQuery.error ? (
            <FinanceAlert tone="error">
              {reportQuery.error instanceof Error
                ? reportQuery.error.message
                : "تعذر تحميل التقرير."}
            </FinanceAlert>
          ) : null}

          {report ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>تم الإنشاء: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : "-"}</span>
                <span>عدد الصفوف: {reportRows.length}</span>
              </div>

              {summaryEntries.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {summaryEntries.map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {reportRows.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">معاينة الصفوف الأولى</p>
                  <pre className="max-h-72 overflow-auto rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    {JSON.stringify(reportRows.slice(0, 10), null, 2)}
                  </pre>
                </div>
              ) : (
                <FinanceEmptyState>لا توجد بيانات تفصيلية للعرض.</FinanceEmptyState>
              )}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => void reportQuery.refetch()}
              disabled={reportQuery.isFetching || !canRunReport}
            >
              <RefreshCw className={`h-4 w-4 ${reportQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </PageShell>
  );
}
