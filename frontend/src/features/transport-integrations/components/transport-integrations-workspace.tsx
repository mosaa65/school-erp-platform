"use client";

import { 
  BadgeCheck, 
  CalendarClock, 
  LoaderCircle, 
  ReceiptText, 
  RotateCcw, 
  Truck, 
  DollarSign, 
  History, 
  RefreshCw,
  Clock,
  ArrowRightLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      title="قمرة قيادة خدمات النقل"
      subtitle="تكامل العمليات التشغيلية للنقل مع النظام المالي المركزي، إصدار الفواتير الموحدة، ومتابعة مصروفات الصيانة."
    >
      <div className="space-y-6">
        {/* Statistics Bar */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
           {[
              { label: "إجمالي الفواتير", value: revenueReport?.summary.invoiceCount ?? 0, icon: <ReceiptText className="h-4 w-4" />, color: "text-blue-500" },
              { label: "الإيرادات المحصلة", value: `${(revenueReport?.summary.collectedRevenue ?? 0).toLocaleString()} ر.س`, icon: <DollarSign className="h-4 w-4" />, color: "text-emerald-500" },
              { label: "المستحقات المعلقة", value: `${(revenueReport?.summary.outstandingRevenue ?? 0).toLocaleString()} ر.س`, icon: <Clock className="h-4 w-4" />, color: "text-amber-500" },
              { label: "سجل العمليات", value: logs.length, icon: <History className="h-4 w-4" />, color: "text-primary" },
           ].map((stat, idx) => (
              <Card key={idx} className="border-border/70 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                 <CardContent className="p-4 flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-tight">{stat.label}</p>
                       <p className="text-lg font-black">{stat.value}</p>
                    </div>
                    <div className={`h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center ${stat.color}`}>
                       {stat.icon}
                    </div>
                 </CardContent>
              </Card>
           ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {/* Invoice Generation */}
          <Card className="border-border/70 bg-card/80 backdrop-blur-sm flex flex-col h-full shadow-sm hover:border-primary/20 transition-all group">
            <CardHeader className="space-y-3 pb-6 border-b border-border/40 bg-muted/10 group-hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <BadgeCheck className="h-5 w-5 text-emerald-600" />
                 </div>
                 <div>
                    <CardTitle className="text-base font-bold">توليد فواتير النقل</CardTitle>
                    <CardDescription className="text-[11px] leading-tight">إصدار آلي للفواتير المجدولة لكافة الطلاب المسجلين.</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              <form className="space-y-4" onSubmit={handleGenerateInvoices}>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">العام الأكاديمي</label>
                   <Input 
                      value={generateForm.academicYearId} 
                      onChange={e => setGenerateForm(p => ({ ...p, academicYearId: e.target.value }))} 
                      placeholder="AY-2024"
                      className="bg-background/50"
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">معرفات الطلاب (Enrollments)</label>
                   <Input 
                      value={generateForm.enrollmentIds} 
                      onChange={e => setGenerateForm(p => ({ ...p, enrollmentIds: e.target.value }))} 
                      placeholder="ID1, ID2..."
                      className="bg-background/50"
                   />
                </div>
                <div className="grid gap-3 grid-cols-2">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">المبلغ</label>
                      <Input type="number" min={0} value={generateForm.amount} onChange={e => setGenerateForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الضريبة %</label>
                      <Input type="number" min={0} value={generateForm.vatRate} onChange={e => setGenerateForm(p => ({ ...p, vatRate: e.target.value }))} placeholder="15" />
                   </div>
                </div>
                <div className="grid gap-3 grid-cols-2">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">تاريخ الفاتورة</label>
                      <Input type="date" value={generateForm.invoiceDate} onChange={e => setGenerateForm(p => ({ ...p, invoiceDate: e.target.value }))} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الاستحقاق</label>
                      <Input type="date" value={generateForm.dueDate} onChange={e => setGenerateForm(p => ({ ...p, dueDate: e.target.value }))} />
                   </div>
                </div>
                <Button type="submit" className="w-full font-bold h-10 gap-2 mt-2 shadow-lg shadow-emerald-500/20" disabled={isGenerateSubmitting}>
                   {isGenerateSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                   بدأ معالجة الفواتير
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Subscription Fee */}
          <Card className="border-border/70 bg-card/80 backdrop-blur-sm flex flex-col h-full shadow-sm hover:border-primary/20 transition-all group">
            <CardHeader className="space-y-3 pb-6 border-b border-border/40 bg-muted/10 group-hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <RotateCcw className="h-5 w-5 text-blue-600" />
                 </div>
                 <div>
                    <CardTitle className="text-base font-bold">إضافة رسوم اشتراك</CardTitle>
                    <CardDescription className="text-[11px] leading-tight">تعديل فواتير قائمة بإضافة بنود نقل مستجدة.</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              <form className="space-y-4" onSubmit={handleSubscriptionFee}>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">رقم الفاتورة المستهدفة</label>
                   <Input value={subscriptionForm.invoiceId} onChange={e => setSubscriptionForm(p => ({ ...p, invoiceId: e.target.value }))} placeholder="INV-0000" className="bg-background/50" />
                </div>
                <div className="grid gap-3 grid-cols-2">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">المبلغ الإضافي</label>
                      <Input type="number" min={0} value={subscriptionForm.amount} onChange={e => setSubscriptionForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الضريبة %</label>
                      <Input type="number" min={0} value={subscriptionForm.vatRate} onChange={e => setSubscriptionForm(p => ({ ...p, vatRate: e.target.value }))} placeholder="15" />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الوصف التفصيلي</label>
                   <Input value={subscriptionForm.description} onChange={e => setSubscriptionForm(p => ({ ...p, description: e.target.value }))} placeholder="اشتراك حافلة شهر مايو..." />
                </div>
                <Button type="submit" variant="outline" className="w-full font-bold h-10 gap-2 mt-12 border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors" disabled={isSubscriptionSubmitting}>
                   {isSubscriptionSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                   تعديل الفاتورة
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Maintenance Expense */}
          <Card className="border-border/70 bg-card/80 backdrop-blur-sm flex flex-col h-full shadow-sm hover:border-primary/20 transition-all group">
            <CardHeader className="space-y-3 pb-6 border-b border-border/40 bg-muted/10 group-hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-amber-600" />
                 </div>
                 <div>
                    <CardTitle className="text-base font-bold">مصروف صيانة الأسطول</CardTitle>
                    <CardDescription className="text-[11px] leading-tight">تسجيل فواتير الصيانة والتشغيل لمركبات النقل.</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              <form className="space-y-4" onSubmit={handleMaintenanceExpense}>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">تكلفة الصيانة</label>
                   <Input type="number" min={0} value={maintenanceForm.amount} onChange={e => setMaintenanceForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="bg-background/50" />
                </div>
                <div className="grid gap-3 grid-cols-2">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">معرف الفرع</label>
                      <Input type="number" min={1} value={maintenanceForm.branchId} onChange={e => setMaintenanceForm(p => ({ ...p, branchId: e.target.value }))} placeholder="B-1" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">طريقة الدفع</label>
                      <SelectField value={maintenanceForm.paymentMethod} onChange={e => setMaintenanceForm(p => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))}>
                         <option value="">اختر الطريقة</option>
                         {PAYMENT_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </SelectField>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">وصف العطل/الصيانة</label>
                   <Input value={maintenanceForm.description} onChange={e => setMaintenanceForm(p => ({ ...p, description: e.target.value }))} placeholder="تغيير زيوت، إطارات..." />
                </div>
                <Button type="submit" variant="outline" className="w-full font-bold h-10 gap-2 mt-12 border-amber-200 text-amber-700 hover:bg-amber-50" disabled={isMaintenanceSubmitting}>
                   {isMaintenanceSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                   تسجيل المصروف
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Console / Logs Section */}
        <div className="grid gap-6 lg:grid-cols-2">
           {/* Revenue Report Chart/Summary Container */}
           <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
             <CardHeader className="bg-emerald-500/5 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
                      <CardTitle className="text-sm font-bold">ملخص التدفقات المالية</CardTitle>
                   </div>
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => void refreshRevenueReport()}>
                      <RefreshCw className={`h-3.5 w-3.5 ${isRevenueReportLoading ? 'animate-spin' : ''}`} />
                   </Button>
                </div>
             </CardHeader>
             <CardContent className="pt-6 h-full">
                {isRevenueReportLoading ? (
                  <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
                     <LoaderCircle className="h-8 w-8 animate-spin opacity-20" />
                     <p className="text-[11px] font-bold uppercase tracking-widest">تحليل البيانات المالية...</p>
                  </div>
                ) : revenueReportError ? (
                  <div className="h-32 flex items-center justify-center p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-xs font-bold">{revenueReportError}</div>
                ) : revenueReport ? (
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">الإيراد الإجمالي</p>
                            <div className="text-xl font-black text-primary">{(revenueReport.summary.totalRevenue).toLocaleString()} <span className="text-[10px] font-bold">ر.س</span></div>
                         </div>
                         <div className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">صافي التجميع</p>
                            <div className="text-xl font-black text-emerald-600">{(revenueReport.summary.collectedRevenue).toLocaleString()} <span className="text-[10px] font-bold">ر.س</span></div>
                         </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                         <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(revenueReport.summary.collectedRevenue / revenueReport.summary.totalRevenue) * 100 || 0}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold italic">نسبة التحصيل: {Math.round((revenueReport.summary.collectedRevenue / revenueReport.summary.totalRevenue) * 100 || 0)}%</p>
                   </div>
                ) : (
                   <FinanceEmptyState className="p-6">لا توجد تقارير مالية متاحة حالياً.</FinanceEmptyState>
                )}
             </CardContent>
           </Card>

           {/* Event Log Console */}
           <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden flex flex-col max-h-[400px]">
              <CardHeader className="bg-muted/30 border-b border-border/40 pb-3">
                 <div className="flex items-center gap-2 font-mono">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-xs font-bold uppercase tracking-widest">Transaction_Console_Log</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto font-mono text-[11px]">
                 {logs.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground opacity-30 italic">CON_SYS_LOG: EMPTY</div>
                 ) : (
                    <div className="divide-y divide-border/20">
                       {logs.map(log => (
                          <div key={log.id} className="p-3 hover:bg-muted/10 transition-colors flex items-start gap-4">
                             <div className={`mt-1 h-3 w-3 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-500/30' : 'bg-amber-500/30'}`} />
                             <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                   <span className="font-bold text-foreground/80">{log.title}</span>
                                   <span className="text-[9px] opacity-40 italic">{log.timestamp}</span>
                                </div>
                                <p className="text-muted-foreground break-all leading-relaxed whitespace-pre-wrap">{log.detail}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </CardContent>
              <div className="p-2 bg-muted/20 border-t border-border/40 text-[9px] font-mono text-center text-muted-foreground">SYSTEM_STATUS: OK_LISTENING</div>
           </Card>
        </div>
      </div>
    </PageShell>
  );
}
