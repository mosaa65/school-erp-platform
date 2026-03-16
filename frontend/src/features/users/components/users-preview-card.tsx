"use client";

import { RefreshCw, Users } from "lucide-react";
import { useUsersQuery } from "@/features/users/hooks/use-users-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { translateRoleCode } from "@/lib/i18n/ar";

export function UsersPreviewCard() {
  const usersQuery = useUsersQuery({ limit: 6 });

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            معاينة API المستخدمين
          </span>
          <Badge variant="secondary">
            الإجمالي: {usersQuery.data?.pagination.total ?? 0}
          </Badge>
        </CardTitle>
        <CardDescription>
          اختبار حي لنقطة النهاية المحمية <code>/users</code> باستخدام JWT.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usersQuery.isPending ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            جارٍ تحميل المستخدمين...
          </div>
        ) : null}

        {usersQuery.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {usersQuery.error instanceof Error
              ? usersQuery.error.message
              : "فشل تحميل قائمة المستخدمين"}
          </div>
        ) : null}

        {usersQuery.data && usersQuery.data.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا يوجد مستخدمون.
          </div>
        ) : null}

        {usersQuery.data && usersQuery.data.data.length > 0 ? (
          <div className="space-y-2">
            {usersQuery.data.data.map((user) => (
              <div
                key={user.id}
                className="rounded-md border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                    <Badge variant="outline">{user.email}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  الأدوار:{" "}
                  {user.userRoles.length > 0
                    ? user.userRoles.map((item) => translateRoleCode(item.role.code)).join("، ")
                    : "لا توجد أدوار"}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void usersQuery.refetch()}
            disabled={usersQuery.isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${usersQuery.isFetching ? "animate-spin" : ""}`}
            />
            تحديث
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}




