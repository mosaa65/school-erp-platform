"use client";

import { BadgeCheck, BookOpenCheck, ReceiptText, RotateCcw, Settings2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { FinanceEmptyState } from "@/features/finance/shared/finance-ui";
import { useBillingEngineActions } from "@/features/billing-engine/hooks/use-billing-engine-actions";

export function BillingEngineWorkspace() {
  const {
    defaults,
    bulkForm,
    setBulkForm,
    siblingForm,
    setSiblingForm,
    statementForm,
    setStatementForm,
    withdrawalForm,
    setWithdrawalForm,
    logs,
    handleBulkGenerate,
    handleApplySiblingDiscount,
    handleReadStatement,
    handleProcessWithdrawal,
    handleReadFamilyBalance,
    applySuggestedBulkDefaults,
  } = useBillingEngineActions();

  return (
    <PageShell
      title="محرك الفوترة"
      subtitle="تشغيل العمليات المالية المجمعة وربط الخصومات والبيانات والسحب." 
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-emerald-600" />
                توليد فواتير جماعي
              </CardTitle>
              {defaults?.academicYear ? (
                <Badge variant="secondary">
                  السنة الحالية: {defaults.academicYear.name}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              تشغيل دفعة فواتير حسب السنة والدورة وهيكل الرسوم.
            </p>
            {defaults ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  تاريخ الفاتورة المقترح: {defaults.invoiceDate}
                </span>
                <span>
                  الاستحقاق المقترح: {defaults.dueDate}
                </span>
                <span>
                  العملة الأساسية: {defaults.baseCurrency?.code ?? "غير محددة"}
                </span>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleBulkGenerate}>
              {defaults ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => applySuggestedBulkDefaults(defaults)}
                >
                  استخدام الإعدادات المقترحة
                </Button>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={bulkForm.academicYearId}
                  onChange={(event) =>
                    setBulkForm((prev) => ({ ...prev, academicYearId: event.target.value }))
                  }
                  placeholder="معرّف السنة الدراسية"
                />
                <Input
                  value={bulkForm.gradeLevelId}
                  onChange={(event) =>
                    setBulkForm((prev) => ({ ...prev, gradeLevelId: event.target.value }))
                  }
                  placeholder="معرّف مستوى الصف (اختياري)"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={bulkForm.branchId}
                  onChange={(event) =>
                    setBulkForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  placeholder="رقم الفرع (اختياري)"
                />
                <Input
                  type="number"
                  min={1}
                  value={bulkForm.installmentCount}
                  onChange={(event) =>
                    setBulkForm((prev) => ({ ...prev, installmentCount: event.target.value }))
                  }
                  placeholder="عدد الأقساط (افتراضي 1)"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="date"
                  value={bulkForm.invoiceDate}
                  onChange={(event) =>
                    setBulkForm((prev) => ({ ...prev, invoiceDate: event.target.value }))
                  }
                  placeholder="تاريخ الفاتورة"
                />
                <Input
                  type="date"
                  value={bulkForm.dueDate}
                  onChange={(event) =>
                    setBulkForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  placeholder="تاريخ الاستحقاق"
                />
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>تطبيق خصم الأشقاء تلقائياً</span>
                <input
                  type="checkbox"
                  checked={bulkForm.applySiblingDiscount}
                  onChange={(event) =>
                    setBulkForm((prev) => ({ ...prev, applySiblingDiscount: event.target.checked }))
                  }
                />
              </label>

              <Button type="submit" className="w-full gap-2">
                <BadgeCheck className="h-4 w-4" />
                تشغيل التوليد
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-emerald-600" />
              تطبيق خصم الأشقاء
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              ربط الخصومات العائلية بمجموعة فواتير الطلبة.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleApplySiblingDiscount}>
              <Input
                value={siblingForm.guardianId}
                onChange={(event) =>
                  setSiblingForm((prev) => ({ ...prev, guardianId: event.target.value }))
                }
                placeholder="معرّف ولي الأمر (Guardian ID)"
              />

              <Input
                value={siblingForm.academicYearId}
                onChange={(event) =>
                  setSiblingForm((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
                placeholder="معرّف السنة الدراسية"
              />

              <Button type="submit" className="w-full gap-2" variant="outline">
                تطبيق الخصم
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpenCheck className="h-4 w-4 text-emerald-600" />
              قراءة بيان حساب
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              استخراج بيان شامل للفواتير والسداد ضمن فترة محددة.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleReadStatement}>
              <Input
                value={statementForm.enrollmentId}
                onChange={(event) =>
                  setStatementForm((prev) => ({ ...prev, enrollmentId: event.target.value }))
                }
                placeholder="معرّف القيد (Enrollment ID)"
              />
              <Input
                value={statementForm.guardianId}
                onChange={(event) =>
                  setStatementForm((prev) => ({ ...prev, guardianId: event.target.value }))
                }
                placeholder="معرّف ولي الأمر (Guardian ID)"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Button type="submit" className="w-full gap-2" variant="secondary">
                  كشف حساب الطالب
                </Button>
                <Button
                  type="button"
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => {
                    void handleReadFamilyBalance();
                  }}
                >
                  رصيد العائلة
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-4 w-4 text-emerald-600" />
              معالجة سحب
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              معالجة انسحاب الطالب مع احتساب الاستحقاق (Proration).
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleProcessWithdrawal}>
              <Input
                value={withdrawalForm.enrollmentId}
                onChange={(event) =>
                  setWithdrawalForm((prev) => ({ ...prev, enrollmentId: event.target.value }))
                }
                placeholder="رقم القيد (Enrollment ID)"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="date"
                  value={withdrawalForm.withdrawalDate}
                  onChange={(event) =>
                    setWithdrawalForm((prev) => ({ ...prev, withdrawalDate: event.target.value }))
                  }
                  placeholder="تاريخ الانسحاب"
                />
                <Input
                  value={withdrawalForm.academicTermId}
                  onChange={(event) =>
                    setWithdrawalForm((prev) => ({ ...prev, academicTermId: event.target.value }))
                  }
                  placeholder="معرّف الفصل (اختياري)"
                />
              </div>
              <Input
                value={withdrawalForm.reason}
                onChange={(event) =>
                  setWithdrawalForm((prev) => ({ ...prev, reason: event.target.value }))
                }
                placeholder="سبب الانسحاب (اختياري)"
              />

              <Button type="submit" className="w-full gap-2" variant="outline">
                تأكيد الانسحاب
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-4 w-4 text-emerald-600" />
            سجل العمليات الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 ? (
            <FinanceEmptyState className="p-3">لا توجد عمليات منفذة بعد.</FinanceEmptyState>
          ) : null}

          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-md border border-dashed p-3 text-sm text-muted-foreground"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-foreground">{log.title}</div>
                <Badge variant={log.status === "success" ? "default" : "secondary"}>
                  {log.status === "success" ? "تم" : "تنبيه"}
                </Badge>
              </div>
              <p className="mt-1">{log.detail}</p>
              <p className="mt-1 text-xs">{log.timestamp}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
