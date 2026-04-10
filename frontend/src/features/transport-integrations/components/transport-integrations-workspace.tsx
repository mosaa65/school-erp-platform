"use client";

import { BadgeCheck, CalendarClock, LoaderCircle, ReceiptText, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { FinanceEmptyState } from "@/features/finance/shared/finance-ui";
import { type PaymentMethod } from "@/lib/api/client";
import { useTransportIntegrationsActions } from "@/features/transport-integrations/hooks/use-transport-integrations-actions";

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "نقدي" },
  { value: "CARD", label: "بطاقة" },
  { value: "BANK_TRANSFER", label: "تحويل بنكي" },
  { value: "MOBILE_WALLET", label: "محفظة رقمية" },
  { value: "CHEQUE", label: "شيك" },
];

export function TransportIntegrationsWorkspace() {
  const {
    generateForm,
    setGenerateForm,
    subscriptionForm,
    setSubscriptionForm,
    maintenanceForm,
    setMaintenanceForm,
    isGenerateSubmitting,
    isSubscriptionSubmitting,
    isMaintenanceSubmitting,
    revenueReport,
    isRevenueReportLoading,
    revenueReportError,
    refreshRevenueReport,
    logs,
    handleGenerateInvoices,
    handleSubscriptionFee,
    handleMaintenanceExpense,
  } = useTransportIntegrationsActions();

  return (
    <PageShell
      title="تكاملات النقل"
      subtitle="إصدار فواتير النقل وإضافة الرسوم والصيانة بشكل مباشر."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              توليد فواتير النقل
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              توليد فواتير النقل للطلاب المسجلين مع إمكانية تحديد التواريخ والضريبة.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleGenerateInvoices}>
              <Input
                value={generateForm.academicYearId}
                onChange={(event) =>
                  setGenerateForm((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
                placeholder="معرف العام الدراسي"
              />
              <Input
                value={generateForm.enrollmentIds}
                onChange={(event) =>
                  setGenerateForm((prev) => ({ ...prev, enrollmentIds: event.target.value }))
                }
                placeholder="معرفات القيد (افصل بفاصلة أو سطر جديد)"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  min={0}
                  value={generateForm.amount}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  placeholder="مبلغ الرسوم"
                />
                <Input
                  type="number"
                  min={0}
                  value={generateForm.vatRate}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, vatRate: event.target.value }))
                  }
                  placeholder="نسبة الضريبة (اختياري)"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="date"
                  value={generateForm.invoiceDate}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, invoiceDate: event.target.value }))
                  }
                  placeholder="تاريخ الفاتورة"
                />
                <Input
                  type="date"
                  value={generateForm.dueDate}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  placeholder="تاريخ الاستحقاق"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  min={1}
                  value={generateForm.branchId}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  placeholder="معرف الفرع (اختياري)"
                />
                <Input
                  value={generateForm.description}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="وصف البند (اختياري)"
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isGenerateSubmitting}>
                {isGenerateSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                توليد الفواتير
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-4 w-4 text-emerald-600" />
              إضافة رسوم اشتراك
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              إضافة بند رسوم نقل إضافي إلى فاتورة طالب محددة.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubscriptionFee}>
              <Input
                value={subscriptionForm.invoiceId}
                onChange={(event) =>
                  setSubscriptionForm((prev) => ({ ...prev, invoiceId: event.target.value }))
                }
                placeholder="معرف الفاتورة"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  min={0}
                  value={subscriptionForm.amount}
                  onChange={(event) =>
                    setSubscriptionForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  placeholder="مبلغ الرسوم"
                />
                <Input
                  type="number"
                  min={0}
                  value={subscriptionForm.vatRate}
                  onChange={(event) =>
                    setSubscriptionForm((prev) => ({ ...prev, vatRate: event.target.value }))
                  }
                  placeholder="نسبة الضريبة (اختياري)"
                />
              </div>
              <Input
                value={subscriptionForm.description}
                onChange={(event) =>
                  setSubscriptionForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="وصف البند (اختياري)"
              />
              <Button
                type="submit"
                className="w-full gap-2"
                variant="outline"
                disabled={isSubscriptionSubmitting}
              >
                {isSubscriptionSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                إضافة الرسوم
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4 text-amber-600" />
              مصروف صيانة النقل
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              تسجيل مصروفات الصيانة وربطها بطريقة الدفع والفرع.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleMaintenanceExpense}>
              <Input
                type="number"
                min={0}
                value={maintenanceForm.amount}
                onChange={(event) =>
                  setMaintenanceForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                placeholder="مبلغ الصيانة"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  min={1}
                  value={maintenanceForm.branchId}
                  onChange={(event) =>
                    setMaintenanceForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  placeholder="معرف الفرع (اختياري)"
                />
                <SelectField
                  value={maintenanceForm.paymentMethod}
                  onChange={(event) =>
                    setMaintenanceForm((prev) => ({
                      ...prev,
                      paymentMethod: event.target.value as PaymentMethod | "",
                    }))
                  }
                >
                  <option value="">طريقة الدفع (اختياري)</option>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
              <Input
                value={maintenanceForm.description}
                onChange={(event) =>
                  setMaintenanceForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="وصف العملية (اختياري)"
              />
              <Button
                type="submit"
                className="w-full gap-2"
                variant="outline"
                disabled={isMaintenanceSubmitting}
              >
                {isMaintenanceSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                اعتماد المصروف
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              ملخص إيرادات النقل
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshRevenueReport()}>
              تحديث
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            نظرة سريعة على الفواتير والإيرادات المحصلة والمتبقية للنقل.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {isRevenueReportLoading ? (
            <FinanceEmptyState className="p-3">جارٍ تحميل ملخص الإيرادات...</FinanceEmptyState>
          ) : null}

          {revenueReportError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {revenueReportError}
            </div>
          ) : null}

          {revenueReport ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border border-dashed p-3">
                <p className="text-xs text-muted-foreground">عدد الفواتير</p>
                <p className="text-lg font-semibold">{revenueReport.summary.invoiceCount}</p>
              </div>
              <div className="rounded-md border border-dashed p-3">
                <p className="text-xs text-muted-foreground">عدد العمليات</p>
                <p className="text-lg font-semibold">{revenueReport.summary.transactionCount}</p>
              </div>
              <div className="rounded-md border border-dashed p-3">
                <p className="text-xs text-muted-foreground">الإيرادات المحصلة</p>
                <p className="text-lg font-semibold">
                  {revenueReport.summary.collectedRevenue.toLocaleString('ar-SA')} ر.س
                </p>
              </div>
              <div className="rounded-md border border-dashed p-3">
                <p className="text-xs text-muted-foreground">الإيرادات المتبقية</p>
                <p className="text-lg font-semibold">
                  {revenueReport.summary.outstandingRevenue.toLocaleString('ar-SA')} ر.س
                </p>
              </div>
            </div>
          ) : null}

          {revenueReport ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">الإيرادات الإجمالية: {revenueReport.summary.totalRevenue.toLocaleString('ar-SA')} ر.س</Badge>
              <Badge variant="outline">الفرع: {revenueReport.filters.branchId ?? 'كل الفروع'}</Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
            <div key={log.id} className="rounded-md border border-dashed p-3 text-sm">
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

