"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
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

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
          <SearchField
            containerClassName="flex-1"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ابحث بالكود/المورد/الإجراء..."
          />
        </div>
      </div>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>قائمة الصلاحيات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            صفحة عرض فقط. المورد/الإجراء/الكود تأتي من الباك إند ويتم
            تهيئتها (seed) عند إعداد النظام.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {permissionsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل الصلاحيات...
            </div>
          ) : null}

          {permissionsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {permissionsQuery.error instanceof Error
                ? permissionsQuery.error.message
                : "تعذر تحميل الصلاحيات"}
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
    </div>
  );
}
