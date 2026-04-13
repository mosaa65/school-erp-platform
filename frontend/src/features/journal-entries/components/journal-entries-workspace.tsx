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
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
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

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350, [searchInput]);

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
    <div className="space-y-4">
      <ManagementToolbar
        searchValue={searchInput}
        onSearchChange={(event) => setSearchInput(event.target.value)}
        searchPlaceholder="ابحث برقم القيد أو الوصف..."
        filterCount={activeFiltersCount}
        onFilterClick={() => setIsFilterOpen((prev) => !prev)}
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
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>القيود اليومية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>اعتماد وترحيل القيود المالية مع مراجعة الحالة.</CardDescription>
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

          {entries.map((entry) => (
            <div
              key={entry.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{entry.entryNo}</p>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.date} • المصدر: {entry.source} • المُنشئ: {entry.createdBy}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <Badge variant={STATUS_VARIANTS[entry.status]}>
                    {STATUS_LABELS[entry.status]}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    مدين: {entry.totalDebit.toLocaleString()} | دائن: {entry.totalCredit.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleApprove(entry)}
                  disabled={!canApproveAction || !canApprove(entry) || approveMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  اعتماد
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handlePost(entry)}
                  disabled={!canPostAction || !canPost(entry) || postMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                  ترحيل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleReverse(entry)}
                  disabled={!canReverseAction || !canReverse(entry) || reverseMutation.isPending}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  عكس
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
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void journalEntriesQuery.refetch()}
                disabled={journalEntriesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${journalEntriesQuery.isFetching ? "animate-spin" : ""}`}
                />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>راجع القيود بعناية قبل الترحيل النهائي للأستاذ العام.</span>
          </div>
          <Badge variant="outline">حالة المراجعة: تشغيل يدوي</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
