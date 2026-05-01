import Link from "next/link";
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
