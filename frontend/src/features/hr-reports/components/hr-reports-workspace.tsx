"use client";

import * as React from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelectField } from "@/components/ui/select-field";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { useEmployeeOptionsQuery } from "@/features/hr-reports/hooks/use-employee-options-query";
import { useHrSummaryReportQuery } from "@/features/hr-reports/hooks/use-hr-summary-report-query";
import type {
  EmployeeAttendanceStatus,
} from "@/lib/api/client";
import {
  translateAttendanceStatus,
  translatePerformanceRatingLevel,
  translateViolationSeverity,
} from "@/lib/i18n/ar";

type FiltersState = {
  employeeId: string;
  fromDate: string;
  toDate: string;
};

const DEFAULT_FILTERS: FiltersState = {
  employeeId: "",
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

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function HrReportsWorkspace() {
  const [filters, setFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const employeesQuery = useEmployeeOptionsQuery();
  const reportQuery = useHrSummaryReportQuery({
    employeeId: appliedFilters.employeeId || undefined,
    fromDate: toDateStartIso(appliedFilters.fromDate),
    toDate: toDateEndIso(appliedFilters.toDate),
  });

  const report = reportQuery.data;
  const activeFiltersCount = React.useMemo(() => {
    const count = [
      appliedFilters.employeeId ? 1 : 0,
      appliedFilters.fromDate ? 1 : 0,
      appliedFilters.toDate ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [appliedFilters.employeeId, appliedFilters.fromDate, appliedFilters.toDate]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilters(appliedFilters);
  }, [appliedFilters, isFilterOpen]);

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setIsFilterOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-start gap-2 rounded-[28px] border border-border/70 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsFilterOpen((prev) => !prev)}
          className="h-10 rounded-2xl px-3 sm:px-4"
          aria-label="فتح فلاتر التقرير"
          data-testid="hr-report-open-filters"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">فلاتر التقرير</span>
          {activeFiltersCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {activeFiltersCount}
            </span>
          ) : null}
        </Button>
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر التقرير"
        renderInPortal
        overlayClassName="z-[70]"
        actionButtons={
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="flex-1 gap-1.5"
              data-testid="hr-report-filters-clear"
            >
              مسح
            </Button>
            <Button
              type="button"
              onClick={applyFilters}
              className="flex-1 gap-1.5"
              data-testid="hr-report-filters-submit"
            >
              تطبيق
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            value={filters.employeeId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, employeeId: event.target.value }))
            }
            data-testid="hr-report-filter-employee"
          >
            <option value="">كل الموظفين</option>
            {(employeesQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.fullName}
              </option>
            ))}
          </SelectField>

          <Input
            type="date"
            value={filters.fromDate}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, fromDate: event.target.value }))
            }
            data-testid="hr-report-filter-from-date"
          />
          <Input
            type="date"
            value={filters.toDate}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, toDate: event.target.value }))
            }
            data-testid="hr-report-filter-to-date"
          />
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            ملخص عمليات الموارد البشرية
          </CardTitle>
          <CardDescription>
            تقرير موحد للحضور والمخالفات والعبء الوظيفي والتقييمات.
          </CardDescription>
        </CardHeader>
      </Card>

      {reportQuery.isPending ? (
        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardContent className="py-6 text-sm text-muted-foreground">
            جارٍ تحميل البيانات...
          </CardContent>
        </Card>
      ) : null}

      {reportQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">
            {reportQuery.error instanceof Error
              ? reportQuery.error.message
              : "تعذّر تحميل البيانات."}
          </CardContent>
        </Card>
      ) : null}

      {report ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-border/70 bg-card/80" data-testid="hr-report-employees-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">الموظفون</CardTitle>
                <CardDescription>الإجمالي: {report.employees.total}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>النشط: {report.employees.active}</p>
                <p>غير نشط: {report.employees.inactive}</p>
                <p>لديهم حساب: {report.employees.withUserAccount}</p>
                <p>بدون حساب: {report.employees.withoutUserAccount}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="hr-report-attendance-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">الحضور</CardTitle>
                <CardDescription>الإجمالي: {report.attendance.total}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {report.attendance.byStatus.length === 0 ? (
                  <p className="text-muted-foreground">لا توجد بيانات.</p>
                ) : (
                  report.attendance.byStatus.map((item) => (
                    <Badge key={item.status} variant="outline" className="mr-1 mb-1">
                      {translateAttendanceStatus(item.status as EmployeeAttendanceStatus)}:{" "}
                      {item.count}
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="hr-report-violations-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">المخالفات</CardTitle>
                <CardDescription>الإجمالي: {report.violations.total}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>مع إنذار: {report.violations.withWarning}</p>
                <div>
                  {report.violations.bySeverity.length === 0 ? (
                    <p className="text-muted-foreground">لا توجد بيانات.</p>
                  ) : (
                    report.violations.bySeverity.map((item) => (
                      <Badge key={item.severity} variant="outline" className="mr-1 mb-1">
                        {translateViolationSeverity(item.severity)}: {item.count}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Card
              className="border-border/70 bg-card/80"
              data-testid="hr-report-attendance-indicators-card"
            >
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">مؤشرات الحضور</CardTitle>
                <CardDescription>نسب تشغيلية للالتزام والانضباط.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>نسبة الحضور: {formatPercent(report.attendance.indicators.presentRate)}</p>
                <p>نسبة الغياب: {formatPercent(report.attendance.indicators.absentRate)}</p>
                <p>نسبة التأخر: {formatPercent(report.attendance.indicators.lateRate)}</p>
                <p>
                  نسبة الغياب بعذر:{" "}
                  {formatPercent(report.attendance.indicators.excusedAbsenceRate)}
                </p>
                <p>
                  نسبة الانصراف المبكر:{" "}
                  {formatPercent(report.attendance.indicators.earlyLeaveRate)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="hr-report-workload-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">عبء العمل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>تكاليف التدريس النشطة: {report.workload.activeTeachingAssignments}</p>
                <p>المهام النشطة: {report.workload.activeTasks}</p>
                <p>الدورات ضمن النطاق: {report.courses.total}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="hr-report-performance-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">الأداء</CardTitle>
                <CardDescription>
                  إجمالي التقييمات: {report.performance.totalEvaluations}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {report.performance.byRating.length === 0 ? (
                  <p className="text-muted-foreground">لا توجد بيانات.</p>
                ) : (
                  report.performance.byRating.map((item) => (
                    <Badge key={item.ratingLevel} variant="outline" className="mr-1 mb-1">
                      {translatePerformanceRatingLevel(item.ratingLevel)}: {item.count}
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="hr-report-compliance-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">الامتثال والجودة</CardTitle>
                <CardDescription>
                  نافذة المتابعة: {report.compliance.thresholdDays} يوم
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>ملفات موظفين ناقصة: {report.compliance.incompleteProfiles}</p>
                <p>موظفون بدون مستندات: {report.compliance.employeesWithoutDocuments}</p>
                <p>عقود قريبة من الانتهاء: {report.compliance.contractsExpiringSoon}</p>
                <p>عقود منتهية: {report.compliance.contractsExpired}</p>
                <p>مستندات قريبة من الانتهاء: {report.compliance.documentsExpiringSoon}</p>
                <p>مستندات منتهية: {report.compliance.documentsExpired}</p>
                <p>هويات قريبة من الانتهاء: {report.compliance.identitiesExpiringSoon}</p>
                <p>هويات منتهية: {report.compliance.identitiesExpired}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80" data-testid="hr-report-organization-card">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-sm">التوزيع التنظيمي</CardTitle>
                <CardDescription>توزيع الموظفين النشطين حسب الأقسام.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>غير مرتبطين بقسم: {report.organization.unassignedEmployees}</p>
                {report.organization.departmentDistribution.length === 0 ? (
                  <p className="text-muted-foreground">لا توجد بيانات أقسام.</p>
                ) : (
                  report.organization.departmentDistribution.map((item) => (
                    <div
                      key={item.departmentId}
                      className="flex items-center justify-between rounded-md border border-dashed px-2 py-1"
                    >
                      <span>
                        {item.departmentName}
                        {item.departmentCode ? ` (${item.departmentCode})` : ""}
                      </span>
                      <Badge variant="outline">{item.employeeCount}</Badge>
                    </div>
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
              data-testid="hr-report-refresh"
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





