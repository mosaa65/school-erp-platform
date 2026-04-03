"use client";

import * as React from "react";
import { CheckCircle2, RefreshCw, Send } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useApproveCreditDebitNoteMutation,
  useApplyCreditDebitNoteMutation,
} from "@/features/credit-debit-notes/hooks/use-credit-debit-notes-mutations";
import {
  useCreditDebitNotesQuery,
  type CreditDebitNoteListItem,
  type CreditDebitNoteStatus,
  type CreditDebitNoteType,
  type CreditDebitNoteReason,
} from "@/features/credit-debit-notes/hooks/use-credit-debit-notes-query";

const PAGE_SIZE = 8;

const STATUS_LABELS: Record<CreditDebitNoteStatus, string> = {
  DRAFT: "مسودة",
  APPROVED: "معتمدة",
  APPLIED: "مطبقة",
  CANCELLED: "ملغاة",
};

const TYPE_LABELS: Record<CreditDebitNoteType, string> = {
  CREDIT: "إشعار دائن",
  DEBIT: "إشعار مدين",
};

const REASON_LABELS: Record<CreditDebitNoteReason, string> = {
  WITHDRAWAL: "انسحاب",
  OVERCHARGE: "زيادة تحصيل",
  SCHOLARSHIP: "منحة",
  FEE_ADJUSTMENT: "تعديل رسوم",
  REFUND: "استرداد",
  PENALTY: "غرامة",
  OTHER: "أخرى",
};

export function CreditDebitNotesWorkspace() {
  const { hasPermission } = useRbac();
  const canApprove = hasPermission("credit-debit-notes.approve");
  const canApply = hasPermission("credit-debit-notes.apply");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<CreditDebitNoteStatus | "all">("all");
  const [typeFilter, setTypeFilter] = React.useState<CreditDebitNoteType | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    status: "all" as CreditDebitNoteStatus | "all",
    type: "all" as CreditDebitNoteType | "all",
  });
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const notesQuery = useCreditDebitNotesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
  });

  const approveMutation = useApproveCreditDebitNoteMutation();
  const applyMutation = useApplyCreditDebitNoteMutation();

  const notes = React.useMemo(() => notesQuery.data?.data ?? [], [notesQuery.data?.data]);
  const pagination = notesQuery.data?.pagination;

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ status: statusFilter, type: typeFilter });
  }, [isFilterOpen, statusFilter, typeFilter]);

  const applyFilters = () => {
    setPage(1);
    setStatusFilter(filterDraft.status);
    setTypeFilter(filterDraft.type);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      typeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [searchInput, statusFilter, typeFilter]);

  const handleApprove = (note: CreditDebitNoteListItem) => {
    if (!canApprove || note.status !== "DRAFT") return;
    approveMutation.mutate(note.id);
  };

  const handleApply = (note: CreditDebitNoteListItem) => {
    if (!canApply || note.status !== "APPROVED") return;
    applyMutation.mutate(note.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
          <SearchField
            containerClassName="flex-1"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ابحث برقم الإشعار..."
          />
        </div>
        <FilterTriggerButton count={activeFiltersCount} onClick={() => setIsFilterOpen((prev) => !prev)} />
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر الإشعارات"
        actionButtons={
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">
              مسح
            </Button>
            <Button type="button" onClick={applyFilters} className="flex-1">
              تطبيق
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            value={filterDraft.status}
            onChange={(event) =>
              setFilterDraft((prev) => ({
                ...prev,
                status: event.target.value as CreditDebitNoteStatus | "all",
              }))
            }
          >
            <option value="all">كل الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="APPROVED">معتمدة</option>
            <option value="APPLIED">مطبقة</option>
            <option value="CANCELLED">ملغاة</option>
          </SelectField>
          <SelectField
            value={filterDraft.type}
            onChange={(event) =>
              setFilterDraft((prev) => ({
                ...prev,
                type: event.target.value as CreditDebitNoteType | "all",
              }))
            }
          >
            <option value="all">كل الأنواع</option>
            <option value="CREDIT">إشعار دائن</option>
            <option value="DEBIT">إشعار مدين</option>
          </SelectField>
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>إشعارات دائن/مدين</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>اعتماد الإشعارات وتطبيقها على الحسابات المرتبطة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل الإشعارات...
            </div>
          ) : null}

          {notesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {notesQuery.error instanceof Error ? notesQuery.error.message : "فشل تحميل الإشعارات"}
            </div>
          ) : null}

          {!notesQuery.isPending && notes.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد إشعارات مطابقة.
            </div>
          ) : null}

          {notes.map((note) => (
            <div key={note.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{note.noteNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {note.enrollment?.student.fullName ?? `فاتورة ${note.originalInvoice.invoiceNumber}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {REASON_LABELS[note.reason]}{note.reasonDetails ? ` • ${note.reasonDetails}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">تاريخ الإصدار: {note.createdAt}</p>
                </div>
                <div className="space-y-2 text-right">
                  <Badge variant={note.status === "APPLIED" ? "default" : note.status === "APPROVED" ? "secondary" : "outline"}>
                    {STATUS_LABELS[note.status]}
                  </Badge>
                  <p className="text-sm font-medium">{Number(note.totalAmount).toLocaleString()} ر.س</p>
                  <p className="text-xs text-muted-foreground">{TYPE_LABELS[note.noteType]}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleApprove(note)}
                  disabled={!canApprove || note.status !== "DRAFT" || approveMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  اعتماد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleApply(note)}
                  disabled={!canApply || note.status !== "APPROVED" || applyMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                  تطبيق
                </Button>
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
                disabled={!pagination || pagination.page <= 1 || notesQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                }
                disabled={!pagination || pagination.page >= pagination.totalPages || notesQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void notesQuery.refetch()}
                disabled={notesQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${notesQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
