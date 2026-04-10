"use client";

import { BadgeCheck, ClipboardCheck, Coins, LoaderCircle, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { FinanceEmptyState } from "@/features/finance/shared/finance-ui";
import { type PaymentMethod } from "@/lib/api/client";
import { useProcurementIntegrationsActions } from "@/features/procurement-integrations/hooks/use-procurement-integrations-actions";

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "نقدي" },
  { value: "CARD", label: "بطاقة" },
  { value: "BANK_TRANSFER", label: "تحويل بنكي" },
  { value: "MOBILE_WALLET", label: "محفظة رقمية" },
  { value: "CHEQUE", label: "شيك" },
];

export function ProcurementIntegrationsWorkspace() {
  const {
    purchaseForm,
    setPurchaseForm,
    paymentForm,
    setPaymentForm,
    depreciationForm,
    setDepreciationForm,
    isPurchaseSubmitting,
    isPaymentSubmitting,
    isDepreciationSubmitting,
    logs,
    handlePurchaseJournal,
    handlePaymentJournal,
    handleDepreciationJournal,
  } = useProcurementIntegrationsActions();

  return (
    <PageShell
      title="تكاملات المشتريات"
      subtitle="تسجيل قيود المشتريات والسداد والإهلاك وربطها مباشرة بالدفاتر المالية."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              قيد مشتريات
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              تسجيل قيد المشتريات مع مبلغ الضريبة والملاحظات الأساسية.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handlePurchaseJournal}>
              <Input
                type="number"
                min={0}
                value={purchaseForm.totalAmount}
                onChange={(event) =>
                  setPurchaseForm((prev) => ({ ...prev, totalAmount: event.target.value }))
                }
                placeholder="إجمالي المبلغ"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  min={0}
                  value={purchaseForm.vatAmount}
                  onChange={(event) =>
                    setPurchaseForm((prev) => ({ ...prev, vatAmount: event.target.value }))
                  }
                  placeholder="ضريبة القيمة (اختياري)"
                />
                <Input
                  type="number"
                  min={1}
                  value={purchaseForm.branchId}
                  onChange={(event) =>
                    setPurchaseForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  placeholder="معرف الفرع (اختياري)"
                />
              </div>
              <Input
                value={purchaseForm.description}
                onChange={(event) =>
                  setPurchaseForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="وصف القيد (اختياري)"
              />
              <Button type="submit" className="w-full gap-2" disabled={isPurchaseSubmitting}>
                {isPurchaseSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
                إنشاء قيد المشتريات
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-4 w-4 text-emerald-600" />
              قيد سداد مورد
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              تسجيل عمليات سداد الموردين وربطها بطريقة الدفع المناسبة.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handlePaymentJournal}>
              <Input
                type="number"
                min={0}
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                placeholder="مبلغ السداد"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  min={1}
                  value={paymentForm.branchId}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  placeholder="معرف الفرع (اختياري)"
                />
                <SelectField
                  value={paymentForm.paymentMethod}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({
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
                value={paymentForm.description}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="وصف العملية (اختياري)"
              />
              <Button
                type="submit"
                className="w-full gap-2"
                variant="outline"
                disabled={isPaymentSubmitting}
              >
                {isPaymentSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                تأكيد السداد
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4 text-amber-600" />
              قيد إهلاك الأصول
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              تسجيل قيد الإهلاك الدوري للأصول ومطابقته مع الفرع.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleDepreciationJournal}>
              <Input
                type="number"
                min={0}
                value={depreciationForm.amount}
                onChange={(event) =>
                  setDepreciationForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                placeholder="مبلغ الإهلاك"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  min={1}
                  value={depreciationForm.branchId}
                  onChange={(event) =>
                    setDepreciationForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  placeholder="معرف الفرع (اختياري)"
                />
                <Input
                  value={depreciationForm.description}
                  onChange={(event) =>
                    setDepreciationForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="وصف القيد (اختياري)"
                />
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                variant="outline"
                disabled={isDepreciationSubmitting}
              >
                {isDepreciationSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                اعتماد قيد الإهلاك
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

