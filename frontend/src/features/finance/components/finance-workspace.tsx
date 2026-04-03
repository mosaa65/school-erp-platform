"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  BanknoteArrowDown,
  CalendarClock,
  CircleDollarSign,
  Coins,
  CreditCard,
  FileText,
  Layers,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import {
  matchesPermissionRequirement,
  type PermissionRequirement,
} from "@/features/auth/lib";
import { useRbac } from "@/features/auth/hooks/use-rbac";

type QuickAction = PermissionRequirement & {
  href: string;
  label: string;
  group: "setup" | "operations" | "controls" | "integrations";
  description: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/app/branches",
    label: "الفروع",
    requiredPermission: "branches.read",
    group: "setup",
    description: "تعريف الفروع والنطاق التشغيلي لكل منها.",
  },
  {
    href: "/app/currencies",
    label: "العملات",
    requiredPermission: "currencies.read",
    group: "setup",
    description: "إعداد العملات وعملة الأساس.",
  },
  {
    href: "/app/fiscal-years",
    label: "السنوات المالية",
    requiredPermission: "fiscal-years.read",
    group: "setup",
    description: "ضبط السنة المالية وربطها بالعام الدراسي.",
  },
  {
    href: "/app/fiscal-periods",
    label: "الفترات المالية",
    requiredPermission: "fiscal-periods.read",
    group: "setup",
    description: "فتح وإغلاق الفترات التي تُرحّل إليها القيود.",
  },
  {
    href: "/app/chart-of-accounts",
    label: "دليل الحسابات",
    requiredPermission: "chart-of-accounts.read",
    group: "setup",
    description: "شجرة الحسابات العامة والفرعية.",
  },
  {
    href: "/app/fee-structures",
    label: "هياكل الرسوم",
    requiredPermission: "fee-structures.read",
    group: "operations",
    description: "تعريف الرسوم قبل إصدار الفواتير.",
  },
  {
    href: "/app/discount-rules",
    label: "قواعد الخصم",
    requiredPermission: "discount-rules.read",
    group: "operations",
    description: "ضبط خصومات الأشقاء أو الخصومات الخاصة.",
  },
  {
    href: "/app/student-invoices",
    label: "فواتير الطلاب",
    requiredPermission: "student-invoices.read",
    group: "operations",
    description: "إصدار الفواتير ومراجعة الرصيد والاستحقاق.",
  },
  {
    href: "/app/invoice-installments",
    label: "أقساط الفواتير",
    requiredPermission: "invoice-installments.read",
    group: "operations",
    description: "متابعة الأقساط والسداد الجزئي والمتأخرات.",
  },
  {
    href: "/app/billing-engine",
    label: "محرك الفوترة",
    requiredPermission: "billing.read-statement",
    group: "operations",
    description: "تشغيل العمليات المجمعة وكشوفات الحساب.",
  },
  {
    href: "/app/journal-entries",
    label: "القيود اليومية",
    requiredPermission: "journal-entries.read",
    group: "controls",
    description: "مراجعة القيود والترحيل والعكس.",
  },
  {
    href: "/app/payment-transactions",
    label: "عمليات الدفع",
    requiredPermission: "payment-transactions.read",
    group: "controls",
    description: "متابعة التحصيل والإيصالات والتسوية.",
  },
  {
    href: "/app/financial-reports",
    label: "التقارير المالية",
    requiredPermission: "financial-reports.read",
    group: "controls",
    description: "الوصول السريع إلى الميزان والتقارير النهائية.",
  },
  {
    href: "/app/hr-integrations",
    label: "تكاملات الموارد البشرية",
    requiredAnyPermission: [
      "finance-hr.payroll-summary",
      "finance-hr.payroll-journal",
      "finance-hr.deduction-journal",
    ],
    group: "integrations",
    description: "إنشاء قيود الرواتب والاستقطاعات.",
  },
  {
    href: "/app/procurement-integrations",
    label: "تكاملات المشتريات",
    requiredPermission: "finance-procurement.purchase-journal",
    group: "integrations",
    description: "تسجيل القيود القادمة من المشتريات والموردين.",
  },
  {
    href: "/app/transport-integrations",
    label: "تكاملات النقل",
    requiredPermission: "finance-transport.generate-invoices",
    group: "integrations",
    description: "فواتير النقل ورسوم الاشتراك والتقارير.",
  },
];

const QUICK_ACTION_GROUPS = [
  { key: "setup", title: "الإعدادات الأساسية", description: "ابدأ بهذه الوحدات عند التأسيس أو بداية سنة مالية." },
  { key: "operations", title: "التشغيل اليومي", description: "الوحدات التي يستخدمها فريق المالية بشكل يومي." },
  { key: "controls", title: "المراجعة والرقابة", description: "القيود والتحصيل والتقارير النهائية." },
  { key: "integrations", title: "التكاملات", description: "الوحدات التي تربط المالية مع HR والمشتريات والنقل." },
] as const;

const FINANCE_SECTIONS = [
  {
    title: "هياكل الرسوم",
    description: "تعريف الرسوم الدراسية والخدمات والغرامات المرتبطة بكل مرحلة أو شعبة.",
    status: "جاهز",
    icon: WalletCards,
  },
  {
    title: "حسابات الطلاب",
    description: "عرض رصيد كل طالب، الذمم المالية، وجدولة الاستحقاقات والمتابعات.",
    status: "جاهز",
    icon: CircleDollarSign,
  },
  {
    title: "الفواتير",
    description: "إصدار الفواتير المدرسية وربطها بالسنة والفصل والطالب ونوع الرسوم.",
    status: "جاهز",
    icon: BadgeDollarSign,
  },
  {
    title: "المدفوعات والتحصيل",
    description: "تسجيل السداد النقدي أو البنكي أو الإلكتروني مع تتبع حالة كل عملية.",
    status: "جاهز",
    icon: CreditCard,
  },
  {
    title: "المتكاملات المالية",
    description: "تشغيل تكاملات HR وProcurement وTransport من واجهة واحدة.",
    status: "جاهز",
    icon: BanknoteArrowDown,
  },
] as const;

export function FinanceWorkspace() {
  const { hasAnyPermission, hasPermission } = useRbac();
  const visibleActions = QUICK_ACTIONS.filter((action) =>
    matchesPermissionRequirement(action, {
      hasPermission,
      hasAnyPermission,
    }),
  );
  const visibleActionGroups = QUICK_ACTION_GROUPS.map((group) => ({
    ...group,
    items: visibleActions.filter((action) => action.group === group.key),
  })).filter((group) => group.items.length > 0);

  return (
    <PageShell
      title="النظام المالي"
      subtitle="مدخل موحد إلى إعدادات المالية والفوترة والقيود والتقارير والتكاملات."
    >
      <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-l from-emerald-500/10 via-background to-background">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
              النظام 07
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700">
              جاهز للتشغيل
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Coins className="h-5 w-5 text-emerald-600" />
            المالية والرسوم والتحصيل
          </CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-7">
            استخدم لوحة العمل أدناه للوصول الأسرع إلى أكثر المهام شيوعًا، من الإعدادات إلى التحصيل ثم التقارير.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-emerald-600" />
            الوصول السريع لخدمات المالية
          </CardTitle>
          <CardDescription>الأزرار المعروضة تعتمد على صلاحيات المستخدم الحالية.</CardDescription>
        </CardHeader>
        <CardContent>
          {visibleActionGroups.length === 0 ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا توجد صلاحيات مالية كافية لعرض الروابط.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleActionGroups.map((group) => (
                <div key={group.key} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{group.title}</p>
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="secondary">{group.items.length} وحدة</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((action) => (
                      <Button
                        asChild
                        key={action.href}
                        variant="outline"
                        className="h-auto justify-between px-4 py-3 text-start"
                      >
                        <Link href={action.href}>
                          <span className="space-y-1">
                            <span className="block font-medium">{action.label}</span>
                            <span className="block text-xs text-muted-foreground">
                              {action.description}
                            </span>
                          </span>
                          <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5 lg:col-span-2">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">المسار الأنسب للمستخدم الجديد</CardTitle>
            <CardDescription>
              هذه الخطوات ترتب العمل من التأسيس حتى التحقق النهائي لتقليل التنقل العشوائي.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-dashed bg-background/70 p-3 text-sm">
              <p className="font-medium text-foreground">1. جهّز الأساس</p>
              <p className="mt-1 text-muted-foreground">الفروع، العملات، الفترات، ودليل الحسابات.</p>
            </div>
            <div className="rounded-xl border border-dashed bg-background/70 p-3 text-sm">
              <p className="font-medium text-foreground">2. فعّل التشغيل</p>
              <p className="mt-1 text-muted-foreground">هياكل الرسوم، الخصومات، الفواتير، والأقساط.</p>
            </div>
            <div className="rounded-xl border border-dashed bg-background/70 p-3 text-sm">
              <p className="font-medium text-foreground">3. راقب النتائج</p>
              <p className="mt-1 text-muted-foreground">التحصيل، القيود، والتقارير المالية النهائية.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">ملخص الوصول</CardTitle>
            <CardDescription>يعرض ما هو متاح لك حسب صلاحياتك الحالية.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span>الوحدات المتاحة</span>
              <span className="font-medium text-foreground">{visibleActions.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span>التكاملات المتاحة</span>
              <span className="font-medium text-foreground">
                {visibleActions.filter((action) => action.group === "integrations").length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span>التقارير والرقابة</span>
              <span className="font-medium text-foreground">
                {visibleActions.filter((action) => action.group === "controls").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FINANCE_SECTIONS.map((section) => (
          <Card
            key={section.title}
            className="border-border/70 bg-card/80 transition hover:border-emerald-500/30 hover:shadow-sm"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700">
                  <section.icon className="h-5 w-5" />
                </span>
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-700">
                  {section.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription className="text-sm leading-6">
                  {section.description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-dashed border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
            <ReceiptText className="h-4 w-4 text-emerald-600" />
            ابدأ من إعدادات الرسوم ثم انتقل مباشرة للفواتير.
          </CardContent>
        </Card>
        <Card className="border-dashed border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4 text-emerald-600" />
            راجع الأقساط والاستحقاقات قبل التسويات.
          </CardContent>
        </Card>
        <Card className="border-dashed border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 text-emerald-600" />
            تابع التقارير المالية للتحقق من النتائج.
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
