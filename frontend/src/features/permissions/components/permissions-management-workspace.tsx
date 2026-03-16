"use client";

import * as React from "react";
import { RefreshCw, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePermissionsQuery } from "@/features/permissions/hooks/use-permissions-query";
import { translatePermissionCode } from "@/lib/i18n/ar";

const PAGE_SIZE = 20;

export function PermissionsManagementWorkspace() {
  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");

  const permissionsQuery = usePermissionsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });

  const permissions = React.useMemo(
    () => permissionsQuery.data?.data ?? [],
    [permissionsQuery.data?.data],
  );
  const pagination = permissionsQuery.data?.pagination;

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>دليل الصلاحيات</CardTitle>
          <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
        </div>
        <CardDescription>
          هذه الشاشة للعرض فقط. إنشاء/تعديل/حذف الصلاحيات يتم عبر الكود وملفات
          التهيئة (seed) لضمان ثبات النظام.
        </CardDescription>
        <form onSubmit={handleSearchSubmit} className="grid gap-2 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث في الرمز/المورد/الإجراء..."
              className="pr-8"
            />
          </div>
          <Button type="submit" variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            تطبيق
          </Button>
        </form>
      </CardHeader>

      <CardContent className="space-y-3">
        {permissionsQuery.isPending ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            جارٍ تحميل قائمة الصلاحيات...
          </div>
        ) : null}

        {permissionsQuery.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {permissionsQuery.error instanceof Error
              ? permissionsQuery.error.message
              : "فشل تحميل قائمة الصلاحيات"}
          </div>
        ) : null}

        {!permissionsQuery.isPending && permissions.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            لا توجد صلاحيات مطابقة.
          </div>
        ) : null}

        {permissions.map((permission) => (
          <div
            key={permission.id}
            className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="font-medium">
                  <code>{permission.code}</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  {translatePermissionCode(permission.code)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{permission.resource}</Badge>
                  <Badge variant="secondary">{permission.action}</Badge>
                </div>
                {permission.description ? (
                  <p className="text-xs text-muted-foreground">{permission.description}</p>
                ) : null}
              </div>

              <Badge variant="outline" className="gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                {permission.isSystem ? "نظامية" : "مخصصة"}
              </Badge>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <p className="text-xs text-muted-foreground">
            صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={!pagination || pagination.page <= 1 || permissionsQuery.isFetching}
            >
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((prev) =>
                  pagination ? Math.min(prev + 1, pagination.totalPages) : prev,
                )
              }
              disabled={
                !pagination ||
                pagination.page >= pagination.totalPages ||
                permissionsQuery.isFetching
              }
            >
              التالي
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => void permissionsQuery.refetch()}
              disabled={permissionsQuery.isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${permissionsQuery.isFetching ? "animate-spin" : ""}`}
              />
              تحديث
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
