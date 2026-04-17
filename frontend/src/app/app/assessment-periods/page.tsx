import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const links = [
  { href: "/app/monthly-assessment-periods", label: "الفترات الشهرية" },
  { href: "/app/monthly-assessment-components", label: "مكونات الفترات الشهرية" },
  { href: "/app/semester-assessment-periods", label: "الفترات الفصلية" },
  { href: "/app/semester-aggregate-links", label: "فترات المحصلة للفصل" },
  { href: "/app/year-final-assessment-periods", label: "الفترات النهائية" },
];

export default function AssessmentPeriodsPage() {
  return (
    <PermissionGuard permission="assessment-periods.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - إعادة تنظيم الفترات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">
            تم فصل الفترات إلى واجهات مستقلة
          </h2>
        </div>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">اختر الواجهة المطلوبة</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {links.map((item) => (
              <Button key={item.href} asChild variant="outline">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
