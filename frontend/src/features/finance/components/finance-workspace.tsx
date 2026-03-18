"use client";

import {
  BadgeDollarSign,
  BanknoteArrowDown,
  CircleDollarSign,
  Coins,
  CreditCard,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

const FINANCE_SECTIONS = [
  {
    title: "هياكل الرسوم",
    description: "تعريف الرسوم الدراسية والخدمات والغرامات المرتبطة بكل مرحلة أو شعبة.",
    status: "جاهز للتخطيط",
    icon: WalletCards,
  },
  {
    title: "حسابات الطلاب",
    description: "عرض رصيد كل طالب، الذمم المالية، وجدولة الاستحقاقات والمتابعات.",
    status: "بانتظار الربط",
    icon: CircleDollarSign,
  },
  {
    title: "الفواتير",
    description: "إصدار الفواتير المدرسية وربطها بالسنة والفصل والطالب ونوع الرسوم.",
    status: "بانتظار التنفيذ",
    icon: BadgeDollarSign,
  },
  {
    title: "المدفوعات والتحصيل",
    description: "تسجيل السداد النقدي أو البنكي أو الإلكتروني مع تتبع حالة كل عملية.",
    status: "بانتظار التنفيذ",
    icon: CreditCard,
  },
  {
    title: "الرواتب والمصروفات",
    description: "توسعة لاحقة لربط كشوف الرواتب والمصروفات التشغيلية بالنظام المالي.",
    status: "مرحلة لاحقة",
    icon: BanknoteArrowDown,
  },
] as const;

export function FinanceWorkspace() {
  return (
    <PageShell
      title="النظام المالي"
      subtitle="أضفت لك نقطة دخول واضحة للنظام المالي داخل الموقع بعد مراجعة الدمج الأخير."
    >
      <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-l from-emerald-500/10 via-background to-background">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
              النظام 07
            </Badge>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700">
              قيد التوسعة
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Coins className="h-5 w-5 text-emerald-600" />
            المالية والرسوم والتحصيل
          </CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-7">
            راجعت الدمج الحالي، واتضح أن النظام المالي لم يكن مخفيًا بسبب الصلاحيات فقط، بل لم
            يكن له مدخل ظاهر داخل الواجهة أصلًا. لذلك جهزت لك صفحة افتتاحية منظمة ليظهر النظام
            الآن داخل الموقع، وتكون نقطة الانطلاق لبناء وحداته المالية بشكل مرتب.
          </CardDescription>
        </CardHeader>
      </Card>

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

      <Card className="border-dashed border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="space-y-2 py-5 text-sm leading-7 text-muted-foreground">
          <p>
            ملاحظة فنية: بعد المراجعة، لم أجد حتى الآن وحدات Backend أو جداول Prisma كاملة
            خاصة بالنظام المالي داخل الدمج الحالي، لذلك شغّلت لك الظهور في الموقع أولًا بشكل
            منظم وواضح.
          </p>
          <p>
            إذا أردت، فالخطوة التالية الطبيعية هي بناء أول وحدة مالية فعلية مثل
            <span className="font-medium text-foreground"> الفواتير والمدفوعات </span>
            أو
            <span className="font-medium text-foreground"> حسابات رسوم الطلاب </span>
            وربطها بقاعدة البيانات والصلاحيات.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
