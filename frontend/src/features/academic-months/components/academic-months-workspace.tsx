"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarClock,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  CalendarDays,
  Activity,
  CheckCircle2,
  Layout,
  Clock,
  History,
  Lock,
  Settings2,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Fab } from "@/components/ui/fab";
import { PageShell } from "@/components/ui/page-shell";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateAcademicMonthMutation,
  useDeleteAcademicMonthMutation,
  useUpdateAcademicMonthMutation,
} from "@/features/academic-months/hooks/use-academic-months-mutations";
import { useAcademicMonthsQuery } from "@/features/academic-months/hooks/use-academic-months-query";
import { useAcademicTermOptionsQuery } from "@/features/academic-months/hooks/use-academic-term-options-query";
import { useAcademicYearOptionsQuery } from "@/features/academic-months/hooks/use-academic-year-options-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel } from "@/lib/option-labels";
import type { AcademicMonthListItem, GradingWorkflowStatus } from "@/lib/api/client";

type FormState = {
  academicYearId: string;
  academicTermId: string;
  code: string;
  name: string;
  sequence: string;
  startDate: string;
  endDate: string;
  status: GradingWorkflowStatus;
  isCurrent: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const WORKFLOW_OPTIONS: GradingWorkflowStatus[] = [
  "DRAFT", "IN_REVIEW", "APPROVED", "ARCHIVED",
];

const DEFAULT_FORM: FormState = {
  academicYearId: "",
  academicTermId: "",
  code: "",
  name: "",
  sequence: "1",
  startDate: "",
  endDate: "",
  status: "DRAFT",
  isCurrent: false,
  isActive: true,
};

function formatDateInput(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toUtcStartIso(dateInput: string): string { return `${dateInput}T00:00:00.000Z`; }
function toUtcEndIso(dateInput: string): string { return `${dateInput}T23:59:59.999Z`; }

function toFormState(month: AcademicMonthListItem): FormState {
  return {
    academicYearId: month.academicYearId,
    academicTermId: month.academicTermId,
    code: month.code,
    name: month.name,
    sequence: String(month.sequence),
    startDate: formatDateInput(month.startDate),
    endDate: formatDateInput(month.endDate),
    status: month.status,
    isCurrent: month.isCurrent,
    isActive: month.isActive,
  };
}

export function AcademicMonthsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("academic-months.create");
  const canUpdate = hasPermission("academic-months.update");
  const canDelete = hasPermission("academic-months.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [termFilter, setTermFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<GradingWorkflowStatus | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", term: "all", status: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const monthsQuery = useAcademicMonthsQuery({
    page, limit: PAGE_SIZE, search,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    status: statusFilter === "all" ? undefined : statusFilter as any,
  });

  const yearOptionsQuery = useAcademicYearOptionsQuery();
  const termOptionsQuery = useAcademicTermOptionsQuery(form.academicYearId || (yearFilter !== "all" ? yearFilter : undefined));

  const createMutation = useCreateAcademicMonthMutation();
  const updateMutation = useUpdateAcademicMonthMutation();
  const deleteMutation = useDeleteAcademicMonthMutation();

  const records = React.useMemo(() => monthsQuery.data?.data ?? [], [monthsQuery.data?.data]);
  const pagination = monthsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ year: yearFilter, term: termFilter, status: statusFilter });
  }, [isFilterOpen, statusFilter, termFilter, yearFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: AcademicMonthListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.academicYearId || !form.academicTermId || !form.name || !form.startDate || !form.endDate) {
      setFormError("الرجاء إكمال كافة الحقول الأساسية.");
      return;
    }

    const payload = {
      academicYearId: form.academicYearId,
      academicTermId: form.academicTermId,
      name: form.name.trim(),
      sequence: Number(form.sequence),
      startDate: toUtcStartIso(form.startDate),
      endDate: toUtcEndIso(form.endDate),
      status: form.status,
      isCurrent: form.isCurrent,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ academicMonthId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: AcademicMonthListItem) => {
    if (!canDelete || !window.confirm(`حذف الشهر ${item.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setTermFilter(filterDraft.term);
    setStatusFilter(filterDraft.status);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setTermFilter("all");
    setStatusFilter("all");
    setFilterDraft({ year: "all", term: "all", status: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      termFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [searchInput, statusFilter, termFilter, yearFilter]);

  return (
    <PageShell
      title="الأشهر الأكاديمية"
      subtitle="إدارة التقويم الشهري المعتمد لرصد الدرجات، تحديد الفترات الزمنية للفصول، وتفعيل الأشهر الحالية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الشهر..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void monthsQuery.refetch()} disabled={monthsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${monthsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفلترة"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">السنة الدراسية</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value, term: "all" }))}>
                <option value="all">كل السنوات</option>
                {(yearOptionsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.code}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الفصل</label>
              <SelectField value={filterDraft.term} onChange={(e) => setFilterDraft(p => ({ ...p, term: e.target.value }))}>
                <option value="all">كل الفصول</option>
                {(termOptionsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.code}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الحالة</label>
              <SelectField value={filterDraft.status} onChange={(e) => setFilterDraft(p => ({ ...p, status: e.target.value as any }))}>
                <option value="all">كل الحالات</option>
                {WORKFLOW_OPTIONS.map(s => <option key={s} value={s}>{translateGradingWorkflowStatus(s)}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <CalendarClock className="h-5 w-5 text-primary" />
                جدولة الأشهر
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {monthsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل البيانات...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                        <span className="text-[10px] font-black text-primary/60 leading-none uppercase">Sequence</span>
                        <span className="text-xl font-black text-primary">{item.sequence}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.name}</p>
                          {item.isCurrent && <Badge className="bg-emerald-500 hover:bg-emerald-600 h-5 text-[8px] font-black uppercase">Current</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Layout className="h-3.5 w-3.5" /> <span>{item.academicYear.code} / {item.academicTerm.code}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Clock className="h-3.5 w-3.5" /> <span>{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={`h-5 text-[8px] font-black uppercase ${item.status === 'APPROVED' ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {translateGradingWorkflowStatus(item.status)}
                        </Badge>
                        <Badge variant={item.isActive ? "secondary" : "outline"} className="h-5 text-[8px] font-black uppercase">
                          {item.isActive ? "Active" : "Disabled"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 italic">
                          <History className="h-2.5 w-2.5 mr-1 inline" /> {item._count.monthlyGrades} Grades
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5" onClick={() => handleStartEdit(item)} disabled={!canUpdate}>
                          <PencilLine className="h-3.5 w-3.5" /> تعديل
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)} disabled={!canDelete}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!monthsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد أشهر مطابقة للبحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">جدولة زمنية بنموذج التقويم الهجري/الميلادي</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة شهر" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير بيانات الشهر" : "تعريف شهر أكاديمي جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> النطاق الزمني</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">السنة الأكاديمية *</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value, academicTermId: "" }))}>
                  <option value="">اختر السنة</option>
                  {(yearOptionsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.code}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الفصل الأكاديمي *</label>
                <SelectField value={form.academicTermId} onChange={(e) => setForm(p => ({ ...p, academicTermId: e.target.value }))}>
                  <option value="">اختر الفصل</option>
                  {(termOptionsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.code}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> مواصفات الشهر</h4>
            <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">التسلسل *</label>
                <Input type="number" value={form.sequence} onChange={(e) => setForm(p => ({ ...p, sequence: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">اسم الشهر (عربي) *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: الشهر الأول (سبتمبر)" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">رمز الشهر</label>
                <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="MO-24-01" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> الفترات الزمنية</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ البدء *</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ الانتهاء *</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> الحالة والاعتماد</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">سير العمل</label>
                <SelectField value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                  {WORKFLOW_OPTIONS.map(s => <option key={s} value={s}>{translateGradingWorkflowStatus(s)}</option>)}
                </SelectField>
              </div>
              <div className="flex gap-2 items-end pt-2">
                <label className="flex-1 flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/50 cursor-pointer">
                  <span className="text-[10px] font-bold">الشهر الحالي</span>
                  <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.isCurrent} onChange={(e) => setForm(p => ({ ...p, isCurrent: e.target.checked }))} />
                </label>
                <label className="flex-1 flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/50 cursor-pointer">
                  <span className="text-[10px] font-bold">نشط</span>
                  <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                </label>
              </div>
            </div>
          </div>

          {formError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-bold text-center">
              {formError}
            </div>
          )}
        </div>
      </CrudFormSheet>
    </PageShell>
  );
}
