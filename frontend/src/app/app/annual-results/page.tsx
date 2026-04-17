import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AnnualResultsWorkspace } from "@/features/results-decisions/annual-results/components/annual-results-workspace";

export default function AnnualResultsPage() {
  return (
    <PermissionGuard permission="annual-results.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">
            النتائج السنوية والقرار النهائي
          </h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">طبقة القرار النهائي فوق الفترات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              الحساب السنوي أصبح يعتمد على نتائج الفترات المرنة النهائية عند توفرها،
              مع بقاء هذه الشاشة كطبقة قرار نهائي وترفيع فوق النتائج الفصلية والنهائية.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/app/year-final-assessment-periods">الفترات النهائية ومكوناتها</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/year-final-period-results">فتح النتائج النهائية</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <AnnualResultsWorkspace />
      </div>
    </PermissionGuard>
  );
}
