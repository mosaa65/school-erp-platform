"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Cable,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  CheckCircle2,
  Activity,
  ListOrdered,
  Clock,
  Settings2,
  Target,
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
  useCreateGradeLevelSubjectMutation,
  useDeleteGradeLevelSubjectMutation,
  useUpdateGradeLevelSubjectMutation,
} from "@/features/grade-level-subjects/hooks/use-grade-level-subjects-mutations";
import { useGradeLevelSubjectsQuery } from "@/features/grade-level-subjects/hooks/use-grade-level-subjects-query";
import { useAcademicYearOptionsQuery } from "@/features/grade-level-subjects/hooks/use-academic-year-options-query";
import { useGradeLevelOptionsQuery } from "@/features/grade-level-subjects/hooks/use-grade-level-options-query";
import { useSubjectOptionsQuery } from "@/features/grade-level-subjects/hooks/use-subject-options-query";
import type { GradeLevelSubjectListItem } from "@/lib/api/client";

type GradeLevelSubjectFormState = {
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  isMandatory: boolean;
  weeklyPeriods: string;
  displayOrder: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: GradeLevelSubjectFormState = {
  academicYearId: "",
  gradeLevelId: "",
  subjectId: "",
  isMandatory: true,
  weeklyPeriods: "1",
  displayOrder: "",
  isActive: true,
};

function toFormState(mapping: GradeLevelSubjectListItem): GradeLevelSubjectFormState {
  return {
    academicYearId: mapping.academicYearId,
    gradeLevelId: mapping.gradeLevelId,
    subjectId: mapping.subjectId,
    isMandatory: mapping.isMandatory,
    weeklyPeriods: String(mapping.weeklyPeriods),
    displayOrder: mapping.displayOrder === null ? "" : String(mapping.displayOrder),
    isActive: mapping.isActive,
  };
}

export function GradeLevelSubjectsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grade-level-subjects.create");
  const canUpdate = hasPermission("grade-level-subjects.update");
  const canDelete = hasPermission("grade-level-subjects.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [gradeLevelFilter, setGradeLevelFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [mandatoryFilter, setMandatoryFilter] = React.useState<"all" | "mandatory" | "optional">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", grade: "all", subject: "all", mandatory: "all" as any, active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<GradeLevelSubjectFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const mappingsQuery = useGradeLevelSubjectsQuery({
    page, limit: PAGE_SIZE, search,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    gradeLevelId: gradeLevelFilter === "all" ? undefined : gradeLevelFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    isMandatory: mandatoryFilter === "all" ? undefined : mandatoryFilter === "mandatory",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const yearsQuery = useAcademicYearOptionsQuery();
  const gradeLevelsQuery = useGradeLevelOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();

  const createMutation = useCreateGradeLevelSubjectMutation();
  const updateMutation = useUpdateGradeLevelSubjectMutation();
  const deleteMutation = useDeleteGradeLevelSubjectMutation();

  const records = React.useMemo(() => mappingsQuery.data?.data ?? [], [mappingsQuery.data?.data]);
  const pagination = mappingsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ year: yearFilter, grade: gradeLevelFilter, subject: subjectFilter, mandatory: mandatoryFilter, active: activeFilter });
  }, [activeFilter, gradeLevelFilter, isFilterOpen, mandatoryFilter, subjectFilter, yearFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: GradeLevelSubjectListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.academicYearId || !form.gradeLevelId || !form.subjectId) {
      setFormError("السنة، المستوى، والمادة حقول إلزامية للبدء.");
      return;
    }

    const payload = {
      academicYearId: form.academicYearId,
      gradeLevelId: form.gradeLevelId,
      subjectId: form.subjectId,
      isMandatory: form.isMandatory,
      weeklyPeriods: Number(form.weeklyPeriods) || 1,
      displayOrder: form.displayOrder.trim() ? Number(form.displayOrder) : undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ mappingId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: GradeLevelSubjectListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف ربط المادة ${item.subject.name} بالصف ${item.gradeLevel.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setGradeLevelFilter(filterDraft.grade);
    setSubjectFilter(filterDraft.subject);
    setMandatoryFilter(filterDraft.mandatory);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setGradeLevelFilter("all");
    setSubjectFilter("all");
    setMandatoryFilter("all");
    setActiveFilter("all");
    setFilterDraft({ year: "all", grade: "all", subject: "all", mandatory: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0, yearFilter !== "all" ? 1 : 0, gradeLevelFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0, mandatoryFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, gradeLevelFilter, mandatoryFilter, searchInput, subjectFilter, yearFilter]);

  return (
    <PageShell
      title="مصفوفة المواد والمستويات"
      subtitle="ربط المواد الدراسية بالصفوف وتحديد الحصص الأسبوعية ووزن المادة في الخطة التعليمية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالسنة أو الصف أو المادة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void mappingsQuery.refetch()} disabled={mappingsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${mappingsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="تخصيص العرض"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">السنة الأكاديمية</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value }))}>
                <option value="all">كل السنوات</option>
                {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.code}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">المستوى</label>
              <SelectField value={filterDraft.grade} onChange={(e) => setFilterDraft(p => ({ ...p, grade: e.target.value }))}>
                <option value="all">كل المستويات</option>
                {(gradeLevelsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.code}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">المادة</label>
              <SelectField value={filterDraft.subject} onChange={(e) => setFilterDraft(p => ({ ...p, subject: e.target.value }))}>
                <option value="all">كل المواد</option>
                {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Cable className="h-5 w-5 text-primary" />
                سجل روابط المواد
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {mappingsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل البيانات...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors shadow-sm">
                        <BookOpen className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.subject.name}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-secondary-foreground border-border/70">
                             {item.gradeLevel.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Calendar className="h-3.5 w-3.5" /> <span>{item.academicYear.code}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Badge variant="outline" className="h-4 text-[7px] border-amber-500/20 text-amber-600 bg-amber-500/5 uppercase font-black tracking-tighter">
                            {item.isMandatory ? "Mandatory" : "Optional"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Active Plan" : "Disabled"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 italic text-stone-500 bg-stone-50">
                          <Clock className="h-2.5 w-2.5 mr-1 inline" /> {item.weeklyPeriods} Periods/wk
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

                  {item.displayOrder !== null && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/40 bg-background/50 text-[10px] font-bold text-muted-foreground group-hover:bg-background transition-colors w-fit">
                      <ListOrdered className="h-3 w-3 text-emerald-600/60" />
                      <span>ترتيب العرض في الكشوف: {item.displayOrder}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!mappingsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد روابط مسجلة تتوافق مع البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط التخطيط: هيكلة الخصائص الأكاديمية</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="ربط مادة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير ربط المادة" : "تعريف ربط مادة جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> الأطر التنظيمية</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">السنة الأكاديمية المعتمدة *</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value }))}>
                  <option value="">اختر السنة</option>
                  {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">المستوى الدراسي المستهدف *</label>
                <SelectField value={form.gradeLevelId} onChange={(e) => setForm(p => ({ ...p, gradeLevelId: e.target.value }))}>
                  <option value="">اختر المستوى</option>
                  {(gradeLevelsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> المادة والوزن</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">المادة الدراسية *</label>
                <SelectField value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))}>
                  <option value="">اختر المادة</option>
                  {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </SelectField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> الحصص الأسبوعية</label>
                  <Input type="number" value={form.weeklyPeriods} onChange={(e) => setForm(p => ({ ...p, weeklyPeriods: e.target.value }))} placeholder="1" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><ListOrdered className="h-3.5 w-3.5" /> ترتيب العرض</label>
                  <Input type="number" value={form.displayOrder} onChange={(e) => setForm(p => ({ ...p, displayOrder: e.target.value }))} placeholder="1" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> سياسات التطبيق</h4>
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">مادة إلزامية (Mandatory)</span>
                <p className="text-[10px] text-muted-foreground">اعتبار المادة ركيزة أساسية للنجاح والرسوب</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.isMandatory} onChange={(e) => setForm(p => ({ ...p, isMandatory: e.target.checked }))} />
            </label>
            <div className="h-[1px] bg-border/40" />
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">تفعيل الربط (Active)</span>
                <p className="text-[10px] text-muted-foreground">تضمين المادة في كشوفات الرصد للسنة المختارة</p>
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
