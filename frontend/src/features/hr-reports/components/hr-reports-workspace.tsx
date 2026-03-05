"use client";

import * as React from "react";
import { BarChart3, RefreshCw, Search } from "lucide-react";
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

export function HrReportsWorkspace() {
  const [filters, setFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);

  const employeesQuery = useEmployeeOptionsQuery();
  const reportQuery = useHrSummaryReportQuery({
    employeeId: appliedFilters.employeeId || undefined,
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
            ملخص عمليات الموارد البشرية
          </CardTitle>
          <CardDescription>
            تقرير موحد للحضور والمخالفات والعبء الوظيفي والتقييمات.
          </CardDescription>
          <form
            className="grid gap-2 md:grid-cols-[220px_170px_170px_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedFilters(filters);
            }}
            data-testid="hr-report-filters-form"
          >
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
            </select>

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

            <Button
              type="submit"
              variant="outline"
              className="gap-2"
              data-testid="hr-report-filters-submit"
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
              data-testid="hr-report-filters-clear"
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

          <div className="grid gap-3 md:grid-cols-2">
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





