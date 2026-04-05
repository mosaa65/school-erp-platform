"use client";

import * as React from "react";
import { PlayCircle, Power, RefreshCw } from "lucide-react";
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
  useGenerateRecurringJournalMutation,
  useToggleRecurringJournalStatusMutation,
} from "@/features/recurring-journals/hooks/use-recurring-journals-mutations";
import {
  useRecurringJournalsQuery,
  type RecurringFrequency,
  type RecurringJournalListItem,
  type RecurringJournalStatus,
} from "@/features/recurring-journals/hooks/use-recurring-journals-query";

const PAGE_SIZE = 8;

const STATUS_LABELS: Record<RecurringJournalStatus, string> = {
  ACTIVE: "نشط",
  PAUSED: "متوقف",
};

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  DAILY: "يومي",
  WEEKLY: "أسبوعي",
  MONTHLY: "شهري",
  QUARTERLY: "ربع سنوي",
  SEMI_ANNUAL: "نصف سنوي",
  ANNUAL: "سنوي",
};

export function RecurringJournalsWorkspace() {
  const { hasPermission } = useRbac();
  const canGenerate = hasPermission("recurring-journals.generate");
  const canUpdate = hasPermission("recurring-journals.update");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<RecurringJournalStatus | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState<RecurringJournalStatus | "all">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const journalsQuery = useRecurringJournalsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const generateMutation = useGenerateRecurringJournalMutation();
  const toggleMutation = useToggleRecurringJournalStatusMutation();

  const journals = React.useMemo(() => journalsQuery.data?.data ?? [], [journalsQuery.data?.data]);
  const pagination = journalsQuery.data?.pagination;

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
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

  const handleGenerate = (journal: RecurringJournalListItem) => {
    if (!canGenerate || !journal.isActive) return;
    generateMutation.mutate(journal.id);
  };

  const handleToggle = (journal: RecurringJournalListItem) => {
    if (!canUpdate) return;
    toggleMutation.mutate({
      journalId: journal.id,
      isActive: !journal.isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
          <SearchField
            containerClassName="flex-1"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ابحث باسم القيد المتكرر..."
          />
        </div>
        <FilterTriggerButton count={activeFiltersCount} onClick={() => setIsFilterOpen((prev) => !prev)} />
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر القيود المتكررة"
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
            onChange={(event) => setFilterDraft(event.target.value as RecurringJournalStatus | "all")}
          >
            <option value="all">كل الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="PAUSED">متوقف</option>
          </SelectField>
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>القيود المتكررة</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>توليد القيود الدورية والتحكم في تشغيلها.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {journalsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل القيود المتكررة...
            </div>
          ) : null}

          {journalsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {journalsQuery.error instanceof Error ? journalsQuery.error.message : "فشل تحميل القيود"}
            </div>
          ) : null}

          {!journalsQuery.isPending && journals.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد قيود متكررة.
            </div>
          ) : null}

          {journals.map((journal) => {
            const status: RecurringJournalStatus = journal.isActive ? "ACTIVE" : "PAUSED";

            return (
              <div key={journal.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{journal.templateName}</p>
                    <p className="text-xs text-muted-foreground">
                      التكرار: {FREQUENCY_LABELS[journal.frequency] ?? journal.frequency} • إجمالي القيم:{" "}
                      {Number(journal.totalAmount).toLocaleString()} ر.س
                    </p>
                    <p className="text-xs text-muted-foreground">
                      آخر تشغيل: {journal.lastGeneratedAt ?? "—"} • القادم: {journal.nextRunDate}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <Badge variant={status === "ACTIVE" ? "default" : "outline"}>
                      {STATUS_LABELS[status]}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => handleGenerate(journal)}
                    disabled={!canGenerate || !journal.isActive || generateMutation.isPending}
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    توليد الآن
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => handleToggle(journal)}
                    disabled={!canUpdate || toggleMutation.isPending}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {journal.isActive ? "إيقاف" : "تفعيل"}
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">
              صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination || pagination.page <= 1 || journalsQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                }
                disabled={!pagination || pagination.page >= pagination.totalPages || journalsQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void journalsQuery.refetch()}
                disabled={journalsQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${journalsQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
