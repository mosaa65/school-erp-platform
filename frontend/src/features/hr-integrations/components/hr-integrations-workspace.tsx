"use client";

import { AlertTriangle, BadgeCheck, Calculator, LoaderCircle, ReceiptText, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { FinanceEmptyState } from "@/features/finance/shared/finance-ui";
import { useEmployeeOptionsQuery } from "@/features/hr-integrations/hooks/use-employee-options-query";
import { useHrIntegrationsActions } from "@/features/hr-integrations/hooks/use-hr-integrations-actions";

export function HrIntegrationsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreatePayrollJournal = hasPermission("finance-hr.payroll-journal");
  const canReadPayrollSummary = hasPermission("finance-hr.payroll-summary");
  const canCreateDeductionJournal = hasPermission("finance-hr.deduction-journal");
  const canReadEmployees = hasPermission("employees.read");
  const {
    payrollForm,
    setPayrollForm,
    deductionForm,
    setDeductionForm,
    isPayrollSubmitting,
    isDeductionSubmitting,
    isPayrollPreviewLoading,
    payrollPreview,
    logs,
    handlePayrollPreview,
    handlePayrollJournal,
    handleDeductionJournal,
  } = useHrIntegrationsActions();
  const employeesQuery = useEmployeeOptionsQuery({ enabled: canReadEmployees });

  return (
    <PageShell
      title="تكاملات الموارد البشرية"
      subtitle="تشغيل قيود الرواتب والخصومات مباشرة وربطها بالنظام المالي."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              قيد الرواتب الشهري
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              يسجل قيد الرواتب مع إجمالي الاستحقاقات والخصومات حسب الشهر.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handlePayrollJournal} data-testid="hr-payroll-form">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  data-testid="hr-payroll-month"
                  type="number"
                  min={1}
                  max={12}
                  value={payrollForm.month}
                  onChange={(event) =>
                    setPayrollForm((prev) => ({ ...prev, month: event.target.value }))
                  }
                  placeholder="الشهر (1-12)"
                />
                <Input
                  data-testid="hr-payroll-year"
                  type="number"
                  min={2000}
                  value={payrollForm.year}
                  onChange={(event) =>
                    setPayrollForm((prev) => ({ ...prev, year: event.target.value }))
                  }
                  placeholder="السنة (YYYY)"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  data-testid="hr-payroll-total-salaries"
                  type="number"
                  min={0}
                  value={payrollForm.totalSalaries}
                  onChange={(event) =>
                    setPayrollForm((prev) => ({ ...prev, totalSalaries: event.target.value }))
                  }
                  placeholder="إجمالي الرواتب"
                />
                <Input
                  data-testid="hr-payroll-total-deductions"
                  type="number"
                  min={0}
                  value={payrollForm.totalDeductions}
                  onChange={(event) =>
                    setPayrollForm((prev) => ({ ...prev, totalDeductions: event.target.value }))
                  }
                  placeholder="إجمالي الخصومات (اختياري)"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  data-testid="hr-payroll-branch"
                  type="number"
                  min={1}
                  value={payrollForm.branchId}
                  onChange={(event) =>
                    setPayrollForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  placeholder="معرف الفرع (اختياري)"
                />
                <Input
                  data-testid="hr-payroll-description"
                  value={payrollForm.description}
                  onChange={(event) =>
                    setPayrollForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="وصف القيد (اختياري)"
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full gap-2"
                onClick={() => void handlePayrollPreview()}
                disabled={!canReadPayrollSummary || isPayrollPreviewLoading}
                data-testid="hr-payroll-preview"
              >
                {isPayrollPreviewLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4" />
                )}
                معاينة احتساب الرواتب
              </Button>

              {!canReadPayrollSummary ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  لا تملك الصلاحية المطلوبة: <code>finance-hr.payroll-summary</code>.
                </div>
              ) : null}

              {!canCreatePayrollJournal ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  لا تملك الصلاحية المطلوبة: <code>finance-hr.payroll-journal</code>.
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={!canCreatePayrollJournal || isPayrollSubmitting}
                data-testid="hr-payroll-submit"
              >
                {isPayrollSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                إنشاء قيد الرواتب
              </Button>

              {payrollPreview ? (
                <div
                  className="space-y-2 rounded-md border border-dashed p-3 text-sm"
                  data-testid="hr-payroll-preview-card"
                >
                  <p className="font-medium">نتيجة المعاينة التقديرية</p>
                  <p>
                    إجمالي الرواتب: {payrollPreview.totals.grossSalaries.toLocaleString()} ر.س
                  </p>
                  <p>
                    الخصومات التقديرية:{" "}
                    {payrollPreview.totals.estimatedDeductions.toLocaleString()} ر.س
                  </p>
                  <p>
                    صافي الرواتب:{" "}
                    {payrollPreview.totals.estimatedNetSalaries.toLocaleString()} ر.س
                  </p>
                  <p>
                    الموظفون المشمولون: {payrollPreview.assumptions.employeesIncluded} (بعطل غير
                    مدفوعة: {payrollPreview.assumptions.employeesWithUnpaidLeave})
                  </p>
                  <p>إجمالي أيام الإجازات غير المدفوعة: {payrollPreview.assumptions.totalUnpaidLeaveDays}</p>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              قيد خصم موظف
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              إنشاء قيد خصم لموظف مع سبب الخصم وربطه بالحسابات المطلوبة.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleDeductionJournal} data-testid="hr-deduction-form">
              {canReadEmployees ? (
                <div className="space-y-2">
                  <SelectField
                    value={deductionForm.employeeId}
                    onChange={(event) =>
                      setDeductionForm((prev) => ({ ...prev, employeeId: event.target.value }))
                    }
                    data-testid="hr-deduction-employee"
                    disabled={employeesQuery.isPending}
                  >
                    <option value="">اختر الموظف</option>
                    {(employeesQuery.data ?? []).map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} ({employee.jobNumber ?? "بدون رقم"})
                      </option>
                    ))}
                  </SelectField>
                  {employeesQuery.isPending ? (
                    <p className="text-xs text-muted-foreground">جارٍ تحميل الموظفين...</p>
                  ) : null}
                  {!employeesQuery.isPending && (employeesQuery.data?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      لا يوجد موظفون نشطون متاحون للاختيار حاليًا.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    data-testid="hr-deduction-employee-id"
                    value={deductionForm.employeeId}
                    onChange={(event) =>
                      setDeductionForm((prev) => ({ ...prev, employeeId: event.target.value }))
                    }
                    placeholder="معرف الموظف"
                  />
                  <p className="text-xs text-muted-foreground">
                    لا تملك صلاحية <code>employees.read</code>، لذلك يتم إدخال معرف الموظف يدويًا.
                  </p>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  data-testid="hr-deduction-amount"
                  type="number"
                  min={0}
                  value={deductionForm.amount}
                  onChange={(event) =>
                    setDeductionForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  placeholder="مبلغ الخصم"
                />
                <Input
                  data-testid="hr-deduction-branch"
                  type="number"
                  min={1}
                  value={deductionForm.branchId}
                  onChange={(event) =>
                    setDeductionForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  placeholder="معرف الفرع (اختياري)"
                />
              </div>
              <Input
                data-testid="hr-deduction-reason"
                value={deductionForm.reason}
                onChange={(event) =>
                  setDeductionForm((prev) => ({ ...prev, reason: event.target.value }))
                }
                placeholder="سبب الخصم (اختياري)"
              />

              {!canCreateDeductionJournal ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  لا تملك الصلاحية المطلوبة: <code>finance-hr.deduction-journal</code>.
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full gap-2"
                variant="outline"
                disabled={!canCreateDeductionJournal || isDeductionSubmitting}
                data-testid="hr-deduction-submit"
              >
                {isDeductionSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                اعتماد الخصم
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-4 w-4 text-emerald-600" />
            سجل التكاملات الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 ? (
            <FinanceEmptyState className="p-3">لا توجد عمليات منفذة بعد.</FinanceEmptyState>
          ) : null}

          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-md border border-dashed p-3 text-sm"
              data-testid="hr-integrations-log"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-foreground">{log.title}</div>
                <Badge variant={log.status === "success" ? "default" : "secondary"}>
                  {log.status === "success" ? "تم" : "تنبيه"}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{log.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">{log.timestamp}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}

