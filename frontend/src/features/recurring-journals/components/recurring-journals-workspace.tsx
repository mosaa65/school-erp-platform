"use client";

import * as React from "react";
import { PlayCircle, Power, RefreshCw, Repeat, Calendar, ArrowRightLeft, Clock } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
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

  const helperText = journalsQuery.isFetching ? "جارٍ تحديث القوالب" : "أتمتة القيود المحاسبية الدورية";

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
    const confirmed = window.confirm(`تأكيد توليد القيد ${journal.templateName} الآن؟`);
    if (!confirmed) return;
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
    <PageShell
      title="القيود المتكررة"
      subtitle="جدولة القيود المحاسبية الدورية وتلقائية تسجيل الاستحقاقات والرواتب."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم القالب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void journalsQuery.refetch()}
              disabled={journalsQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${journalsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">حالة القالب</label>
              <SelectField
                value={filterDraft}
                onChange={(event) => setFilterDraft(event.target.value as any)}
              >
                <option value="all">كل الحالات</option>
                <option value="ACTIVE">نشط</option>
                <option value="PAUSED">متوقف</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Repeat className="h-5 w-5 text-primary" />
                القوالب الدورية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              {helperText} - يتم تشغيلها آلياً حسب التكرار المحدد أو يدوياً.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {journalsQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                جارٍ تحميل قوالب القيود...
              </div>
            )}

            {journalsQuery.error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-medium text-center">
                {journalsQuery.error instanceof Error ? journalsQuery.error.message : "فشل تحميل القوالب"}
              </div>
            )}

            {!journalsQuery.isPending && journals.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لا توجد قوالب قيود متكررة مسجلة في النظام.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {journals.map((journal) => {
                const isActive = journal.isActive;
                return (
                  <div key={journal.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{journal.templateName}</p>
                        <Badge variant="outline" className="h-5 text-[9px] uppercase tracking-tighter border-primary/20 bg-primary/5 text-primary">
                          {FREQUENCY_LABELS[journal.frequency] ?? journal.frequency}
                        </Badge>
                      </div>
                      <Badge variant={isActive ? "default" : "secondary"} className={`h-6 rounded-full text-[10px] px-2.5 font-bold ${isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                        {isActive ? "نشط" : "متوقف"}
                      </Badge>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold leading-none">إجمالي القيمة</span>
                        <div className="flex items-center gap-1.5">
                          <ArrowRightLeft className="h-4 w-4 text-primary" />
                          <span className="font-bold text-lg text-foreground">{Number(journal.totalAmount).toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground">ر.س</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>آخر تشغيل: {journal.lastGeneratedAt || "أبداً"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] border-r border-border/60 pr-3 font-semibold text-primary">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>القادم: {journal.nextRunDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 mt-auto">
                      <Button
                        size="sm"
                        className="flex-1 h-8 rounded-xl gap-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleGenerate(journal)}
                        disabled={!canGenerate || !isActive || generateMutation.isPending}
                      >
                        {generateMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                        توليد القيد الآن
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-8 rounded-xl gap-1.5 px-3 text-[11px] font-bold ${isActive ? 'text-destructive border-destructive/20 hover:bg-destructive/5' : 'text-primary'}`}
                        onClick={() => handleToggle(journal)}
                        disabled={!canUpdate || toggleMutation.isPending}
                      >
                        {toggleMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                        {isActive ? "إيقاف" : "تفعيل"}
                      </Button>
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
                  disabled={!pagination || pagination.page <= 1 || journalsQuery.isFetching}
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
                  disabled={!pagination || pagination.page >= pagination.totalPages || journalsQuery.isFetching}
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
