"use client";

import * as React from "react";
import { ClipboardList, RefreshCw, Trash2 } from "lucide-react";
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
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAlert,
  FinanceEmptyState,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import { useAuditTrailQuery } from "@/features/audit-trail/hooks/use-audit-trail-query";
import { useDeleteAuditTrailMutation } from "@/features/audit-trail/hooks/use-audit-trail-mutations";

const PAGE_SIZE = 12;

type DraftFilters = {
  search: string;
  tableName: string;
  recordId: string;
  action: "all" | "INSERT" | "UPDATE" | "DELETE" | "APPROVE" | "POST" | "REVERSE" | "CLOSE" | "REOPEN";
  userId: string;
  from: string;
  to: string;
};

type AppliedFilters = {
  search?: string;
  tableName?: string;
  recordId?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
};

const DEFAULT_FILTERS: DraftFilters = {
  search: "",
  tableName: "",
  recordId: "",
  action: "all",
  userId: "",
  from: "",
  to: "",
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function AuditTrailWorkspace() {
  const { hasPermission } = useRbac();
  const canDelete = hasPermission("audit-trail.delete");

  const [page, setPage] = React.useState(1);
  const [draftFilters, setDraftFilters] = React.useState<DraftFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilters>({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const auditQuery = useAuditTrailQuery({
    page,
    limit: PAGE_SIZE,
    search: appliedFilters.search,
    tableName: appliedFilters.tableName,
    recordId: appliedFilters.recordId,
    action: appliedFilters.action,
    userId: appliedFilters.userId,
    from: appliedFilters.from,
    to: appliedFilters.to,
  });

  const deleteMutation = useDeleteAuditTrailMutation();

  const entries = React.useMemo(() => auditQuery.data?.data ?? [], [auditQuery.data?.data]);
  const pagination = auditQuery.data?.pagination;

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      appliedFilters.search ? 1 : 0,
      appliedFilters.tableName ? 1 : 0,
      appliedFilters.recordId ? 1 : 0,
      appliedFilters.action ? 1 : 0,
      appliedFilters.userId ? 1 : 0,
      appliedFilters.from ? 1 : 0,
      appliedFilters.to ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return count;
  }, [appliedFilters]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      search: toOptionalString(draftFilters.search),
      tableName: toOptionalString(draftFilters.tableName),
      recordId: toOptionalString(draftFilters.recordId),
      action: draftFilters.action === "all" ? undefined : draftFilters.action,
      userId: toOptionalString(draftFilters.userId),
      from: toOptionalString(draftFilters.from),
      to: toOptionalString(draftFilters.to),
    });
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters({});
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleDelete = (id: string | number) => {
    if (!canDelete) {
      return;
    }

    const confirmed = confirmFinanceAction("تأكيد حذف سجل الأثر المالي؟");
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTriggerButton
          count={activeFiltersCount}
          onClick={() => setIsFilterOpen((prev) => !prev)}
        />
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلترة سجل الأثر المالي"
        actionButtons={
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="flex-1 gap-1.5"
            >
              مسح
            </Button>
            <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
              تطبيق
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="بحث بالنص"
            value={draftFilters.search}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          />
          <Input
            placeholder="اسم الجدول (مثال: revenues)"
            value={draftFilters.tableName}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, tableName: event.target.value }))
            }
          />
          <Input
            placeholder="معرف السجل"
            value={draftFilters.recordId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, recordId: event.target.value }))
            }
          />
          <SelectField
            value={draftFilters.action}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                action: event.target.value as DraftFilters["action"],
              }))
            }
          >
            <option value="all">كل الإجراءات</option>
            <option value="INSERT">إضافة</option>
            <option value="UPDATE">تعديل</option>
            <option value="DELETE">حذف</option>
            <option value="APPROVE">اعتماد</option>
            <option value="POST">ترحيل</option>
            <option value="REVERSE">عكس</option>
            <option value="CLOSE">إغلاق</option>
            <option value="REOPEN">إعادة فتح</option>
          </SelectField>
          <Input
            placeholder="معرف المستخدم"
            value={draftFilters.userId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, userId: event.target.value }))
            }
          />
          <Input
            type="date"
            value={draftFilters.from}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, from: event.target.value }))
            }
          />
          <Input
            type="date"
            value={draftFilters.to}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, to: event.target.value }))
            }
          />
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              سجل الأثر المالي
            </CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            يتتبع جميع العمليات المالية الحساسة مع تفاصيل التعديلات.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {auditQuery.isPending ? (
            <FinanceEmptyState>جارٍ تحميل السجل...</FinanceEmptyState>
          ) : null}

          {auditQuery.error ? (
            <FinanceAlert tone="error">
              {auditQuery.error instanceof Error
                ? auditQuery.error.message
                : "تعذر تحميل سجل الأثر المالي."}
            </FinanceAlert>
          ) : null}

          {!auditQuery.isPending && entries.length === 0 ? (
            <FinanceEmptyState>لا توجد سجلات مطابقة.</FinanceEmptyState>
          ) : null}

          {entries.map((entry) => (
            <div
              key={entry.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {entry.tableName ?? "جدول غير معروف"} · {entry.action ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المستخدم: {entry.user?.email ?? "غير محدد"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    التاريخ: {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "-"}
                  </p>
                </div>
                <Badge variant="outline">{entry.recordId ?? "-"}</Badge>
              </div>

              {entry.changeSummary ? (
                <p className="text-xs text-muted-foreground">{entry.changeSummary}</p>
              ) : null}

              {entry.fieldName ? (
                <p className="text-xs text-muted-foreground">
                  الحقل: {entry.fieldName}
                </p>
              ) : null}

              {canDelete ? (
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(entry.id)}
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
                disabled={!pagination || pagination.page <= 1 || auditQuery.isFetching}
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
                disabled={!pagination || pagination.page >= pagination.totalPages || auditQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void auditQuery.refetch()}
                disabled={auditQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${auditQuery.isFetching ? "animate-spin" : ""}`}
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
