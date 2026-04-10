"use client";

import * as React from "react";
import {
  CheckCircle2,
  FileText,
  RefreshCw,
  Send,
  Undo2,
} from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SelectField } from "@/components/ui/select-field";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAlert,
  FinanceEmptyState,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import {
  useApproveJournalEntryMutation,
  usePostJournalEntryMutation,
  useReverseJournalEntryMutation,
} from "@/features/journal-entries/hooks/use-journal-entries-mutations";
import {
  useJournalEntriesQuery,
  type JournalEntryStatus,
  type JournalEntryListItem,
} from "@/features/journal-entries/hooks/use-journal-entries-query";

const PAGE_SIZE = 8;

const STATUS_LABELS: Record<JournalEntryStatus, string> = {
  DRAFT: "مسودة",
  APPROVED: "معتمد",
  POSTED: "مرحّل",
  REVERSED: "معكوس",
};

const STATUS_VARIANTS: Record<JournalEntryStatus, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  APPROVED: "secondary",
  POSTED: "default",
  REVERSED: "outline",
};

function canApprove(entry: JournalEntryListItem) {
  return entry.status === "DRAFT";
}

function canPost(entry: JournalEntryListItem) {
  return entry.status === "APPROVED";
}

function canReverse(entry: JournalEntryListItem) {
  return entry.status === "POSTED";
}

export function JournalEntriesWorkspace() {
  const { hasPermission } = useRbac();
  const canApproveAction = hasPermission("journal-entries.approve");
  const canPostAction = hasPermission("journal-entries.post");
  const canReverseAction = hasPermission("journal-entries.reverse");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<JournalEntryStatus | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState<JournalEntryStatus | "all">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const journalEntriesQuery = useJournalEntriesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const approveMutation = useApproveJournalEntryMutation();
  const postMutation = usePostJournalEntryMutation();
  const reverseMutation = useReverseJournalEntryMutation();

  const entries = React.useMemo(
    () => journalEntriesQuery.data?.data ?? [],
    [journalEntriesQuery.data?.data],
  );
  const pagination = journalEntriesQuery.data?.pagination;

  const helperText = journalEntriesQuery.isFetching ? "جارٍ التحديث" : "بيانات مباشرة";

  useDebounceEffect(
    () => {
      setPage(1);
      setSearch(searchInput.trim());
    },
    350,
    [searchInput],
  );

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }
    setFilterDraft(statusFilter);
  }, [isFilterOpen, statusFilter]);

  const applyFilters = () => {
    setPage(1);
    setStatusFilter(filterDraft);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, statusFilter !== "all" ? 1 : 0].reduce(
      (acc, value) => acc + value,
      0,
    );
  }, [searchInput, statusFilter]);

  const handleApprove = (entry: JournalEntryListItem) => {
    if (!canApproveAction || !canApprove(entry)) {
      return;
    }

    const confirmed = confirmFinanceAction(`اعتماد القيد ${entry.entryNo}؟`);
    if (!confirmed) {
      return;
    }

    approveMutation.mutate(entry.id);
  };

  const handlePost = (entry: JournalEntryListItem) => {
    if (!canPostAction || !canPost(entry)) {
      return;
    }

    const confirmed = confirmFinanceAction(`ترحيل القيد ${entry.entryNo} إلى الأستاذ العام؟`);
    if (!confirmed) {
      return;
    }

    postMutation.mutate(entry.id);
  };

  const handleReverse = (entry: JournalEntryListItem) => {
    if (!canReverseAction || !canReverse(entry)) {
      return;
    }

    const confirmed = confirmFinanceAction(`عكس القيد ${entry.entryNo}؟`);
    if (!confirmed) {
      return;
    }

    const reason = window.prompt("اذكر سبب عكس القيد:", "");
    if (!reason || !reason.trim()) {
      return;
    }

    reverseMutation.mutate({ journalEntryId: entry.id, reason: reason.trim() });
  };

  return (
    <PageShell
      title="القيود اليومية"
      subtitle="إدارة واعتماد القيود اليومية وترحيلها للأستاذ العام."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث برقم القيد أو الوصف..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void journalEntriesQuery.refetch()}
              disabled={journalEntriesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${journalEntriesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر القيود"
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
              <label className="text-xs font-medium text-muted-foreground">حالة القيد</label>
              <SelectField
                value={filterDraft}
                onChange={(event) => setFilterDraft(event.target.value as JournalEntryStatus | "all")}
              >
                <option value="all">كل الحالات</option>
                <option value="DRAFT">مسودة</option>
                <option value="APPROVED">معتمد</option>
                <option value="POSTED">مرحّل</option>
                <option value="REVERSED">معكوس</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>القيود المتاحة</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              {helperText} - راجع القيود بعناية قبل الترحيل النهائي للأستاذ العام.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {journalEntriesQuery.isPending ? (
              <FinanceEmptyState>جارٍ تحميل القيود...</FinanceEmptyState>
            ) : null}

            {journalEntriesQuery.error ? (
              <FinanceAlert tone="error">
                {journalEntriesQuery.error instanceof Error
                  ? journalEntriesQuery.error.message
                  : "فشل تحميل القيود"}
              </FinanceAlert>
            ) : null}

            {!journalEntriesQuery.isPending && entries.length === 0 ? (
              <FinanceEmptyState>لا توجد قيود مطابقة للبحث الحالي.</FinanceEmptyState>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{entry.entryNo}</p>
                        <Badge variant={STATUS_VARIANTS[entry.status]} className="h-5 text-[10px]">
                          {STATUS_LABELS[entry.status]}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{entry.description}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground font-mono">{entry.date}</p>
                      <div className="mt-1 flex flex-col items-end gap-0.5">
                        <span className="text-[10px] uppercase text-muted-foreground leading-none">الإجمالي</span>
                        <p className="text-sm font-bold text-emerald-600">
                          {entry.totalDebit.toLocaleString()} <span className="text-[10px] font-normal opacity-70">ريال</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-muted/30 p-2.5 text-[11px] grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground">المصدر:</span>
                      <p className="font-medium">{entry.source}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground">المُنشئ:</span>
                      <p className="font-medium text-xs">{entry.createdBy}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs"
                      onClick={() => handleApprove(entry)}
                      disabled={!canApproveAction || !canApprove(entry) || approveMutation.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      اعتماد
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs"
                      onClick={() => handlePost(entry)}
                      disabled={!canPostAction || !canPost(entry) || postMutation.isPending}
                    >
                      <Send className="h-3.5 w-3.5 text-primary" />
                      ترحيل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleReverse(entry)}
                      disabled={!canReverseAction || !canReverse(entry) || reverseMutation.isPending}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      عكس
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4">
              <p className="text-xs text-muted-foreground">
                صفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || journalEntriesQuery.isFetching}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                  }
                  disabled={!pagination || pagination.page >= pagination.totalPages || journalEntriesQuery.isFetching}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 overflow-hidden">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm relative">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <span className="leading-tight">تأكد من مراجعة الحسابات المدينة والدائنة قبل الاعتماد النهائي والترحيل.</span>
            </div>
            <Badge variant="outline" className="rounded-lg h-7 border-primary/20 bg-primary/5 text-primary">حالة المراجعة: تشغيل يدوي</Badge>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
