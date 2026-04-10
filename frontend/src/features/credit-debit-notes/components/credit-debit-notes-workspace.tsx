"use client";

import * as React from "react";
import { CheckCircle2, RefreshCw, Send, FileText, Calendar, Receipt, MessageCircle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SelectField } from "@/components/ui/select-field";
import { PageShell } from "@/components/ui/page-shell";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
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

  const helperText = notesQuery.isFetching ? "جارٍ تحديث الإشعارات" : "إدارة الإشعارات المالية";

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
    <PageShell
      title="الإشعارات المدينة والدائنة"
      subtitle="إصدار واعتماد وتسوية الإشعارات المالية المرتبطة بحسابات الطلاب والفواتير."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث برقم الإشعار..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void notesQuery.refetch()}
              disabled={notesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${notesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">حالة الإشعار</label>
              <SelectField
                value={filterDraft.status}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    status: event.target.value as any,
                  }))
                }
              >
                <option value="all">كل الحالات</option>
                <option value="DRAFT">مسودة</option>
                <option value="APPROVED">معتمدة</option>
                <option value="APPLIED">مطبقة</option>
                <option value="CANCELLED">ملغاة</option>
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">نوع الإشعار</label>
              <SelectField
                value={filterDraft.type}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    type: event.target.value as any,
                  }))
                }
              >
                <option value="all">كل الأنواع</option>
                <option value="CREDIT">إشعار دائن</option>
                <option value="DEBIT">إشعار مدين</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="h-5 w-5 text-primary" />
                قائمة الإشعارات المالية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              {helperText} - راجع حالة الإشعار قبل التطبيق النهائي على الرصيد.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {notesQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                جارٍ تحميل بيانات الإشعارات...
              </div>
            )}

            {notesQuery.error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-medium text-center">
                {notesQuery.error instanceof Error ? notesQuery.error.message : "فشل تحميل الإشعارات"}
              </div>
            )}

            {!notesQuery.isPending && notes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لا توجد إشعارات مالية مسجلة تتوافق مع البحث.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {notes.map((note) => {
                const isCredit = note.noteType === "CREDIT";
                return (
                  <div key={note.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{note.noteNumber}</p>
                          <Badge variant="outline" className={`h-5 text-[9px] uppercase tracking-tighter ${isCredit ? 'border-emerald-500/30 text-emerald-700 bg-emerald-50/50' : 'border-amber-500/30 text-amber-700 bg-amber-50/50'}`}>
                            {TYPE_LABELS[note.noteType]}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold mt-1">
                          {note.enrollment?.student.fullName ?? `مرتبط بالفاتورة: ${note.originalInvoice.invoiceNumber}`}
                        </p>
                      </div>
                      <Badge variant={note.status === "APPLIED" ? "default" : note.status === "APPROVED" ? "secondary" : "outline"} className="h-6 rounded-full text-[10px] px-2.5">
                        {STATUS_LABELS[note.status]}
                      </Badge>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold leading-none">القيمة المالية</span>
                        <div className="flex items-center gap-1.5">
                          {isCredit ? <ArrowDownCircle className="h-4 w-4 text-emerald-600" /> : <ArrowUpCircle className="h-4 w-4 text-amber-600" />}
                          <span className={`font-bold text-lg ${isCredit ? 'text-emerald-700' : 'text-amber-700'}`}>{Number(note.totalAmount).toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground">ر.س</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>{REASON_LABELS[note.reason]}</span>
                        </div>
                        {note.reasonDetails && (
                          <div className="flex items-center gap-1.5 border-r border-border/60 pr-3">
                            <span className="truncate max-w-[150px] italic">{note.reasonDetails}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{note.createdAt}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl gap-1.5 px-3 text-[11px] font-bold"
                          onClick={() => handleApprove(note)}
                          disabled={!canApprove || note.status !== "DRAFT" || approveMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          اعتماد
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl gap-1.5 px-3 text-[11px] font-bold"
                          onClick={() => handleApply(note)}
                          disabled={!canApply || note.status !== "APPROVED" || applyMutation.isPending}
                        >
                          <Send className="h-3.5 w-3.5 text-primary" />
                          تطبيق
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-6 mt-2">
              <p className="text-xs text-muted-foreground">
                صفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || notesQuery.isFetching}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() =>
                    setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                  }
                  disabled={!pagination || pagination.page >= pagination.totalPages || notesQuery.isFetching}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
