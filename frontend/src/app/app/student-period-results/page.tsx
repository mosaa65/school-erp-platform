import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const links = [
  { href: "/app/monthly-period-results", label: "نتائج الفترات الشهرية" },
  { href: "/app/monthly-period-component-scores", label: "درجات مكونات الشهر" },
  { href: "/app/monthly-period-bulk-entry", label: "الإدخال الجماعي الشهري" },
  { href: "/app/semester-period-results", label: "نتائج الفترات الفصلية" },
  { href: "/app/semester-period-calculation", label: "احتساب الفترات الفصلية" },
  { href: "/app/year-final-period-results", label: "النتائج النهائية" },
];

export default function StudentPeriodResultsPage() {
  return (
    <PermissionGuard permission="student-period-results.read">
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
