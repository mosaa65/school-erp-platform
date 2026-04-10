"use client";

import * as React from "react";
import {
  CalendarClock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
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
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAuditLogsQuery } from "@/features/audit-logs/hooks/use-audit-logs-query";
import { useDeleteAuditLogMutation } from "@/features/audit-logs/hooks/use-audit-logs-mutations";
import type { AuditStatus } from "@/lib/api/client";

type DraftFilters = {
  resource: string;
  action: string;
  actorUserId: string;
  status: "all" | AuditStatus;
  fromLocal: string;
  toLocal: string;
};

type AppliedFilters = {
  resource?: string;
  action?: string;
  actorUserId?: string;
  status?: AuditStatus;
  from?: string;
  to?: string;
};

const PAGE_SIZE = 15;

const DEFAULT_DRAFT_FILTERS: DraftFilters = {
  resource: "",
  action: "",
  actorUserId: "",
  status: "all",
  fromLocal: "",
  toLocal: "",
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toIsoOrUndefined(localDateTime: string): string | undefined {
  const raw = localDateTime.trim();
  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function formatDetails(details: unknown): string {
  if (details === null || details === undefined) {
    return "لا توجد تفاصيل";
  }

  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export function AuditLogsWorkspace() {
  const { hasPermission } = useRbac();
  const canDelete = hasPermission("audit-logs.delete");

  const [page, setPage] = React.useState(1);
  const [draftFilters, setDraftFilters] = React.useState<DraftFilters>(
    DEFAULT_DRAFT_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilters>({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const logsQuery = useAuditLogsQuery({
    page,
    limit: PAGE_SIZE,
    ...appliedFilters,
  });

  const deleteMutation = useDeleteAuditLogMutation();

  const logs = React.useMemo(() => logsQuery.data?.data ?? [], [logsQuery.data?.data]);
  const pagination = logsQuery.data?.pagination;

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      appliedFilters.resource ? 1 : 0,
      appliedFilters.action ? 1 : 0,
      appliedFilters.actorUserId ? 1 : 0,
      appliedFilters.status ? 1 : 0,
      appliedFilters.from ? 1 : 0,
      appliedFilters.to ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return count;
  }, [appliedFilters]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      resource: toOptionalString(draftFilters.resource),
      action: toOptionalString(draftFilters.action),
      actorUserId: toOptionalString(draftFilters.actorUserId),
      status: draftFilters.status === "all" ? undefined : draftFilters.status,
      from: toIsoOrUndefined(draftFilters.fromLocal),
      to: toIsoOrUndefined(draftFilters.toLocal),
    });
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_DRAFT_FILTERS);
    setAppliedFilters({});
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleDelete = (auditLogId: string) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm("تأكيد حذف سجل التدقيق؟");
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(auditLogId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <FilterTriggerButton
            count={activeFiltersCount}
            onClick={() => setIsFilterOpen((prev) => !prev)}
          />
        </div>
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="خيارات الفلترة"
        actionButtons={
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="flex-1 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              مسح
            </Button>
            <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
              تطبيق
            </Button>
          </div>
        }
      >
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Input
            placeholder="المورد (مثال: users)"
            value={draftFilters.resource}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, resource: event.target.value }))
            }
          />
          <Input
            placeholder="الإجراء (مثال: USER_UPDATE)"
            value={draftFilters.action}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, action: event.target.value }))
            }
          />
          <Input
            placeholder="معرف المستخدم المنفذ"
            value={draftFilters.actorUserId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, actorUserId: event.target.value }))
            }
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={draftFilters.status}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                status: event.target.value as DraftFilters["status"],
              }))
            }
          >
            <option value="all">كل الحالات</option>
            <option value="SUCCESS">نجاح</option>
            <option value="FAILURE">فشل</option>
          </select>
          <Input
            type="datetime-local"
            value={draftFilters.fromLocal}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, fromLocal: event.target.value }))
            }
          />
          <Input
            type="datetime-local"
            value={draftFilters.toLocal}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, toLocal: event.target.value }))
            }
          />
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              سجل التدقيق
            </CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            يتتبع الأحداث التي تمت على النظام مع تفاصيل المورد والمستخدم والوقت.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {logsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل السجلات...
            </div>
          ) : null}

          {logsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {logsQuery.error instanceof Error
                ? logsQuery.error.message
                : "تعذر تحميل سجلات التدقيق."}
            </div>
          ) : null}

          {!logsQuery.isPending && logs.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد سجلات مطابقة.
            </div>
          ) : null}

          {logs.map((log) => (
            <div
              key={log.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {log.action} <span className="text-muted-foreground">على</span> {log.resource}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.occurredAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المنفذ:{" "}
                    {log.actorUser
                      ? `${log.actorUser.firstName} ${log.actorUser.lastName} (${log.actorUser.email})`
                      : log.actorUserId ?? "بدون مستخدم"}
                  </p>
                  {log.resourceId ? (
                    <p className="text-xs text-muted-foreground">
                      معرف المورد: <code>{log.resourceId}</code>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {log.status === "SUCCESS" ? (
                    <Badge variant="default" className="gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      نجاح
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      فشل
                    </Badge>
                  )}
                  {log.ipAddress ? <Badge variant="outline">{log.ipAddress}</Badge> : null}
                </div>
              </div>

              {log.details !== null && log.details !== undefined ? (
                <pre className="max-h-48 overflow-auto rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  {formatDetails(log.details)}
                </pre>
              ) : null}

              {log.userAgent ? (
                <p className="truncate text-xs text-muted-foreground">
                  عميل المتصفح: {log.userAgent}
                </p>
              ) : null}

              {canDelete ? (
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(log.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              ) : null}
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
                disabled={!pagination || pagination.page <= 1 || logsQuery.isFetching}
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
                disabled={!pagination || pagination.page >= pagination.totalPages || logsQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void logsQuery.refetch()}
                disabled={logsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${logsQuery.isFetching ? "animate-spin" : ""}`}
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

