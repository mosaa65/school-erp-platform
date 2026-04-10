"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarRange,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  CalendarDays,
  Hash,
  Type,
  Activity,
  Calendar,
  LayoutGrid,
  Settings2,
  History,
  Clock,
  Layout,
  CheckCircle2,
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
  useCreateAcademicTermMutation,
  useDeleteAcademicTermMutation,
  useUpdateAcademicTermMutation,
} from "@/features/academic-terms/hooks/use-academic-terms-mutations";
import { useAcademicTermsQuery } from "@/features/academic-terms/hooks/use-academic-terms-query";
import { useAcademicYearOptionsQuery } from "@/features/academic-terms/hooks/use-academic-year-options-query";
import type { AcademicTermListItem, AcademicTermType } from "@/lib/api/client";

type FormState = {
  academicYearId: string;
  code: string;
  name: string;
  termType: AcademicTermType;
  sequence: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  academicYearId: "",
  code: "",
  name: "",
  termType: "SEMESTER",
  sequence: "1",
  startDate: "",
  endDate: "",
  isActive: true,
};

function formatDateInput(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toUtcStartIso(dateInput: string): string { return `${dateInput}T00:00:00.000Z`; }
function toUtcEndIso(dateInput: string): string { return `${dateInput}T23:59:59.999Z`; }

function toFormState(term: AcademicTermListItem): FormState {
  return {
    academicYearId: term.academicYearId,
    code: term.code,
    name: term.name,
    termType: term.termType,
    sequence: String(term.sequence),
    startDate: formatDateInput(term.startDate),
    endDate: formatDateInput(term.endDate),
    isActive: term.isActive,
  };
}

function termTypeLabel(type: AcademicTermType): string {
  switch (type) {
    case "SEMESTER": return "فصلي (Semester)";
    case "TRIMESTER": return "ثلاثي (Trimester)";
    case "QUARTER": return "ربعي (Quarter)";
    case "CUSTOM": return "مخصص (Custom)";
    default: return type;
  }
}

export function AcademicTermsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("academic-terms.create");
  const canUpdate = hasPermission("academic-terms.update");
  const canDelete = hasPermission("academic-terms.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState<AcademicTermType | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", type: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const termsQuery = useAcademicTermsQuery({
    page, limit: PAGE_SIZE, search,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    termType: typeFilter === "all" ? undefined : typeFilter as any,
  });

  const academicYearOptionsQuery = useAcademicYearOptionsQuery();

  const createMutation = useCreateAcademicTermMutation();
  const updateMutation = useUpdateAcademicTermMutation();
  const deleteMutation = useDeleteAcademicTermMutation();

  const records = React.useMemo(() => termsQuery.data?.data ?? [], [termsQuery.data?.data]);
  const pagination = termsQuery.data?.pagination;
  const yearOptions = React.useMemo(() => academicYearOptionsQuery.data ?? [], [academicYearOptionsQuery.data]);
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ year: yearFilter, type: typeFilter });
  }, [isFilterOpen, typeFilter, yearFilter]);

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

  const handleStartEdit = (item: AcademicTermListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.academicYearId || !form.name || !form.startDate || !form.endDate) {
      setFormError("الرجاء إكمال كافة الحقول الأساسية.");
      return;
    }

    const payload = {
      academicYearId: form.academicYearId,
      name: form.name.trim(),
      termType: form.termType,
      sequence: Number(form.sequence),
      startDate: toUtcStartIso(form.startDate),
      endDate: toUtcEndIso(form.endDate),
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ academicTermId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: AcademicTermListItem) => {
    if (!canDelete || !window.confirm(`حذف الفصل ${item.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setTypeFilter(filterDraft.type);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setTypeFilter("all");
    setFilterDraft({ year: "all", type: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      typeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [searchInput, typeFilter, yearFilter]);

  return (
    <PageShell
      title="الفصول الأكاديمية"
      subtitle="توزيع السنة الدراسية إلى فصول زمنية (سمسترات) مع تحديد الترتيب، النوع، ونطاقات التاريخ المعتمدة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الفصل..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void termsQuery.refetch()} disabled={termsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${termsQuery.isFetching ? "animate-spin" : ""}`} />
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
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value }))}>
                <option value="all">كل السنوات</option>
                {yearOptions.map(y => <option key={y.id} value={y.id}>{y.code}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">نمط التقسيم</label>
              <SelectField value={filterDraft.type} onChange={(e) => setFilterDraft(p => ({ ...p, type: e.target.value as any }))}>
                <option value="all">كل الأنماط</option>
                <option value="SEMESTER">فصلي</option>
                <option value="TRIMESTER">ثلاثي</option>
                <option value="QUARTER">ربعي</option>
                <option value="CUSTOM">مخصص</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <CalendarRange className="h-5 w-5 text-primary" />
                هيكلة التقويم المدرسي
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {termsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل البيانات...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                        <span className="text-[10px] font-black text-primary/60 leading-none uppercase">Step</span>
                        <span className="text-xl font-black text-primary">{item.sequence}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.name}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-muted-foreground border-border/70 group-hover:border-primary/30 transition-colors">
                             {termTypeLabel(item.termType)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Layout className="h-3.5 w-3.5" /> <span>{item.academicYear.code}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Clock className="h-3.5 w-3.5" /> <span>{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Active" : "Disabled"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 italic">
                          <History className="h-2.5 w-2.5 mr-1 inline" /> {item._count.academicMonths} Months
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

            {!termsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد فصول أكاديمية مسجلة تتوافق مع البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط العرض: فترات التحليل الزمكانية</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة فصل" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير بيانات الفصل" : "تعريف فصل أكاديمي جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> السياق الزمني</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">السنة الأكاديمية الأم *</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value }))}>
                  <option value="">اختر السنة</option>
                  {yearOptions.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> مواصفات الفصل</h4>
            <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">التسلسل *</label>
                <Input type="number" value={form.sequence} onChange={(e) => setForm(p => ({ ...p, sequence: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">اسم الفصل الأكاديمي *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: الفصل الدراسي الأول" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">نمط التقسيم (Term Type) *</label>
                <SelectField value={form.termType} onChange={(e) => setForm(p => ({ ...p, termType: e.target.value as any }))}>
                  <option value="SEMESTER">فصلي (Semester)</option>
                  <option value="TRIMESTER">ثلاثي (Trimester)</option>
                  <option value="QUARTER">ربعي (Quarter)</option>
                  <option value="CUSTOM">مخصص (Custom)</option>
                </SelectField>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">رمز المعرف (ID Code)</label>
                <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="SEM-2024-01" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> الفترات التشغيلية</h4>
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
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> مراقبة الحالة</h4>
            <label className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 cursor-pointer transition-colors hover:bg-background">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">نشط (Active)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل الفصل لاستخدامه في رصد الدرجات والتقويم الشهري</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            </label>
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
