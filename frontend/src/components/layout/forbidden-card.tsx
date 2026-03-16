import { LockKeyhole } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ForbiddenCardProps = {
  requiredPermission?: string;
};

export function ForbiddenCard({ requiredPermission }: ForbiddenCardProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <LockKeyhole className="h-5 w-5" />
          403 - غير مصرح
        </CardTitle>
        <CardDescription className="text-destructive/90">
          لا تملك الصلاحية المطلوبة للوصول إلى هذه الصفحة.
        </CardDescription>
      </CardHeader>
      {requiredPermission ? (
        <CardContent>
          <p className="text-sm text-destructive">
            الصلاحية المطلوبة:
            <code className="ms-2 rounded bg-destructive/20 px-1.5 py-0.5">
              {requiredPermission}
            </code>
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}




