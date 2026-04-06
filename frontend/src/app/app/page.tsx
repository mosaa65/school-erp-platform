"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NavigationHubWorkspace } from "@/features/navigation-hub/components/navigation-hub-workspace";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useNavigationPreferences } from "@/hooks/use-navigation-preferences";
import { UsersPreviewCard } from "@/features/users/components/users-preview-card";
import { BackendHealthCard } from "@/features/system-foundation/components/backend-health-card";
import { translatePermissionCode, translateRoleCode } from "@/lib/i18n/ar";

export default function AppDashboardPage() {
  const auth = useAuth();
  const navigationPreferences = useNavigationPreferences();

  if (!auth.session) {
    return null;
  }

  if (
    navigationPreferences.layoutMode === "hub" ||
    navigationPreferences.landingPage === "navigation-hub"
  ) {
    return <NavigationHubWorkspace />;
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Badge variant="secondary" className="w-fit gap-1.5">
          <ShieldCheck className="h-4 w-4" />
          الجلسة نشطة
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          نظرة عامة على لوحة التحكم
        </h2>
        <p className="text-sm text-muted-foreground md:text-base">
          مرحبًا {auth.session.user.firstName} {auth.session.user.lastName}. هذا
          الملخص يثبت جاهزية الربط بين الواجهة والـAPI مع JWT وRBAC.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">الحساب الحالي</CardTitle>
            <CardDescription>{auth.session.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              نوع الرمز: <strong>{auth.session.tokenType}</strong>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ينتهي خلال: <strong>{auth.session.expiresIn}</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">الأدوار</CardTitle>
            <CardDescription>
              عدد الأدوار المعيّنة: {auth.session.user.roleCodes.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {auth.session.user.roleCodes.map((roleCode) => (
              <Badge key={roleCode} variant="outline">
                {translateRoleCode(roleCode)}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">الصلاحيات</CardTitle>
            <CardDescription>
              عدد الصلاحيات الممنوحة: {auth.session.user.permissionCodes.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {auth.session.user.permissionCodes.slice(0, 7).map((permissionCode) => (
              <Badge key={permissionCode} variant="secondary">
                {translatePermissionCode(permissionCode)}
              </Badge>
            ))}
            {auth.session.user.permissionCodes.length > 7 ? (
              <Badge variant="outline">
                <KeyRound className="me-1 h-3.5 w-3.5" />
                +{auth.session.user.permissionCodes.length - 7}
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <BackendHealthCard />
        <UsersPreviewCard />
      </section>
    </div>
  );
}




