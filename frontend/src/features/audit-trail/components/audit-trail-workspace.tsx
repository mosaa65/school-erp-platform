"use client";

import * as React from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
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
import {
  FinanceAlert,
  FinanceEmptyState,
} from "@/features/finance/shared/finance-ui";
import { useAuditTrailQuery } from "@/features/audit-trail/hooks/use-audit-trail-query";

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

function translateAuditAction(action?: string | null): string {
  switch (action) {
    case "INSERT":
      return "إضافة";
    case "UPDATE":
      return "تعديل";
    case "DELETE":
      return "حذف";
    case "APPROVE":
      return "اعتماد";
    case "POST":
      return "ترحيل";
    case "REVERSE":
      return "عكس";
    case "CLOSE":
      return "إغلاق";
    case "REOPEN":
      return "إعادة فتح";
    default:
      return action ? `عملية ${action}` : "عملية غير محددة";
  }
}

function translateActionContext(action?: string | null): string {
  switch (action) {
    case "INSERT":
      return "تمت إضافة سجل جديد";
    case "UPDATE":
      return "تم تعديل سجل مالي";
    case "DELETE":
      return "تم حذف سجل مالي";
    case "APPROVE":
      return "تم اعتماد العملية المالية";
    case "POST":
      return "تم ترحيل القيد المالي";
    case "REVERSE":
      return "تم عكس القيد المالي";
    case "CLOSE":
      return "تم إغلاق السجل المالي";
    case "REOPEN":
      return "تمت إعادة فتح السجل المالي";
    default:
      return "تم تنفيذ عملية مالية";
  }
}

function translateEntityName(entity?: string | null): string {
  if (!entity) {
    return "السجل المالي";
  }

  const normalized = entity.trim().toLowerCase();
  const map: Record<string, string> = {
    revenues: "الإيرادات",
    revenue: "الإيراد",
    expenses: "المصروفات",
    expense: "المصروف",
    budgets: "الميزانيات",
    budget: "الميزانية",
    journal_entries: "القيود اليومية",
    invoices: "الفواتير",
    student_invoices: "فواتير الطلاب",
    fees: "الرسوم",
    fee_structures: "هياكل الرسوم",
    financial_funds: "الصناديق المالية",
    financial_categories: "التصنيفات المالية",
  };

  return map[normalized] ?? entity;
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "لا يوجد";
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? value : "فارغ";
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditTrailWorkspace() {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">عرض قراءة فقط</Badge>
          <Badge variant="outline">للإدارة المالية</Badge>
        </div>
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
            سجل مرئي يوضح ما الذي تغيّر في العمليات المالية، ومن نفذه، ومتى حدث.
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
                    {translateActionContext(entry.action)} · {translateEntityName(entry.tableName)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المستخدم: {entry.user?.email ?? "غير محدد"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    التاريخ: {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "-"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{translateAuditAction(entry.action)}</Badge>
                  <Badge variant="outline">{entry.recordId ?? "-"}</Badge>
                </div>
              </div>

              {entry.changeSummary ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
                  <p className="mb-1 font-medium text-amber-800">ملخص التغيير</p>
                  <p>{entry.changeSummary}</p>
                </div>
              ) : null}

              {(
                entry.fieldName ||
                entry.oldValue !== null ||
                entry.oldValue !== undefined ||
                entry.newValue !== null ||
                entry.newValue !== undefined
              ) ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {entry.fieldName ? (
                    <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">الحقل</span>
                      <div>{entry.fieldName}</div>
                    </div>
                  ) : null}
                  {entry.oldValue !== null && entry.oldValue !== undefined ? (
                    <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">قبل</span>
                      <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-xs">
                        {formatAuditValue(entry.oldValue)}
                      </pre>
                    </div>
                  ) : null}
                  {entry.newValue !== null && entry.newValue !== undefined ? (
                    <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground md:col-span-2">
                      <span className="font-medium text-foreground">بعد</span>
                      <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-xs">
                        {formatAuditValue(entry.newValue)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">IP: {entry.userIp ?? "غير متاح"}</Badge>
                <Badge variant="outline">قراءة فقط</Badge>
              </div>

              {entry.userAgent ? (
                <p className="truncate text-xs text-muted-foreground">
                  عميل المتصفح: {entry.userAgent}
                </p>
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
