"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Cable,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Calendar,
  Layers,
  GraduationCap,
  BookOpen,
  Layout,
  Target,
  Settings2,
  BarChart3,
  ListOrdered,
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
  useCreateTermSubjectOfferingMutation,
  useDeleteTermSubjectOfferingMutation,
  useUpdateTermSubjectOfferingMutation,
} from "@/features/term-subject-offerings/hooks/use-term-subject-offerings-mutations";
import { useTermSubjectOfferingsQuery } from "@/features/term-subject-offerings/hooks/use-term-subject-offerings-query";
import { useAcademicYearOptionsQuery } from "@/features/term-subject-offerings/hooks/use-academic-year-options-query";
import { useAcademicTermOptionsQuery } from "@/features/term-subject-offerings/hooks/use-academic-term-options-query";
import { useGradeLevelSubjectOptionsQuery } from "@/features/term-subject-offerings/hooks/use-grade-level-subject-options-query";
import type {
  AcademicTermListItem,
  GradeLevelSubjectListItem,
  TermSubjectOfferingListItem,
} from "@/lib/api/client";

type TermSubjectOfferingFormState = {
  academicTermId: string;
  gradeLevelSubjectId: string;
  weeklyPeriods: string;
  displayOrder: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: TermSubjectOfferingFormState = {
  academicTermId: "",
  gradeLevelSubjectId: "",
  weeklyPeriods: "1",
  displayOrder: "",
  isActive: true,
};

function toFormState(offering: TermSubjectOfferingListItem): TermSubjectOfferingFormState {
  return {
    academicTermId: offering.academicTermId,
    gradeLevelSubjectId: offering.gradeLevelSubjectId,
    weeklyPeriods: String(offering.weeklyPeriods),
    displayOrder: offering.displayOrder === null ? "" : String(offering.displayOrder),
    isActive: offering.isActive,
  };
}

export function TermSubjectOfferingsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("term-subject-offerings.create");
  const canUpdate = hasPermission("term-subject-offerings.update");
  const canDelete = hasPermission("term-subject-offerings.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [termFilter, setTermFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", term: "all", active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<TermSubjectOfferingFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const offeringsQuery = useTermSubjectOfferingsQuery({
    page, limit: PAGE_SIZE, search,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const yearOptionsQuery = useAcademicYearOptionsQuery();
  const termOptionsQuery = useAcademicTermOptionsQuery();
  
  const selectedTermForForm = React.useMemo(() => 
    (termOptionsQuery.data ?? []).find(t => t.id === form.academicTermId),
    [termOptionsQuery.data, form.academicTermId]
  );

  const subjectOptionsQuery = useGradeLevelSubjectOptionsQuery({
    academicYearId: selectedTermForForm?.academicYearId
  });

  const createMutation = useCreateTermSubjectOfferingMutation();
  const updateMutation = useUpdateTermSubjectOfferingMutation();
  const deleteMutation = useDeleteTermSubjectOfferingMutation();

  const records = React.useMemo(() => offeringsQuery.data?.data ?? [], [offeringsQuery.data?.data]);
  const pagination = offeringsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ year: yearFilter, term: termFilter, active: activeFilter });
  }, [activeFilter, isFilterOpen, termFilter, yearFilter]);

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

  const handleStartEdit = (item: TermSubjectOfferingListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.academicTermId || !form.gradeLevelSubjectId) {
      setFormError("الفصل الدراسي وربط المادة حقول مطلوبة.");
      return;
    }

    const payload = {
      academicTermId: form.academicTermId,
      gradeLevelSubjectId: form.gradeLevelSubjectId,
      weeklyPeriods: Number(form.weeklyPeriods) || 1,
      displayOrder: form.displayOrder.trim() ? Number(form.displayOrder) : undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ offeringId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: TermSubjectOfferingListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف عرض المادة ${item.gradeLevelSubject.subject.name} من الفصل الدراسي؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setTermFilter(filterDraft.term);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setTermFilter("all");
    setActiveFilter("all");
    setFilterDraft({ year: "all", term: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0, yearFilter !== "all" ? 1 : 0,
      termFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, searchInput, termFilter, yearFilter]);

  return (
    <PageShell
      title="عروض المواد الفصلية"
      subtitle="تفعيل الخطط الدراسية لكل فصل أكاديمي، وتحديد الكثافة الزمنية (الحصص الأسبوعية) لكل مادة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالمادة، الصف، أو الفصل..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void offeringsQuery.refetch()} disabled={offeringsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${offeringsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات العرض التشغيلي"
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
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value, term: "all" }))}>
                <option value="all">كل السنوات</option>
                {(yearOptionsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.code}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الفصل الدراسي</label>
              <SelectField value={filterDraft.term} onChange={(e) => setFilterDraft(p => ({ ...p, term: e.target.value }))}>
                <option value="all">كل الفصول</option>
                {(termOptionsQuery.data ?? []).filter(t => filterDraft.year === "all" || t.academicYearId === filterDraft.year).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الحالة</label>
              <SelectField value={filterDraft.active} onChange={(e) => setFilterDraft(p => ({ ...p, active: e.target.value as any }))}>
                <option value="all">كل العروض</option>
                <option value="active">العروض النشطة</option>
                <option value="inactive">العروض المؤرشفة</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Cable className="h-5 w-5 text-primary" />
                خطة المواد التشغيلية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {offeringsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل خطة المواد...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-secondary/5 border border-secondary/10 group-hover:bg-secondary/10 transition-colors shadow-sm">
                         <BookOpen className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.gradeLevelSubject.subject.name}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-muted-foreground border-border/70">
                             {item.gradeLevelSubject.subject.code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <GraduationCap className="h-3.5 w-3.5" /> <span>{item.gradeLevelSubject.gradeLevel.name}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Calendar className="h-3.5 w-3.5" /> <span>{item.academicTerm.name} ({item.academicTerm.academicYear?.code ?? ""})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Operational" : "Offline"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 text-indigo-600 bg-indigo-50">
                          <BarChart3 className="h-2.5 w-2.5 mr-1 inline" /> {item.weeklyPeriods} Periods/Week
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

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <Layout className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">الصف المستهدف</span>
                           <span className="text-[10px] font-bold truncate tracking-tight">{item.gradeLevelSubject.gradeLevel.name} ({item.gradeLevelSubject.gradeLevel.code})</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <ListOrdered className="h-4 w-4 text-emerald-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">تسلسل العرض بالجدول</span>
                           <span className="text-[10px] font-bold truncate tracking-tight">{item.displayOrder !== null ? `Order #${item.displayOrder}` : "تلقائي"}</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <Target className="h-4 w-4 text-amber-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">نوع المادة</span>
                           <span className="text-[10px] font-bold truncate tracking-tight">{item.gradeLevelSubject.isMandatory ? "إلزامية (Core)" : "اختيارية (Elective)"}</span>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {!offeringsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد عروض مواد مسجلة حالياً.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط التخطيط: الخطة الدراسية المعتمدة</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="طرح مادة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحديث عرض المادة" : "إضافة مادة للخطة الفصلية"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> الإطار الزمني والمكاني</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الفصل المستهدف *</label>
                <SelectField value={form.academicTermId} onChange={(e) => setForm(p => ({ ...p, academicTermId: e.target.value, gradeLevelSubjectId: "" }))}>
                  <option value="">اختر الفصل الدراسي</option>
                  {(termOptionsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name} ({t.academicYear.code})</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">المادة (من دليل الصفوف) *</label>
                <SelectField value={form.gradeLevelSubjectId} onChange={(e) => setForm(p => ({ ...p, gradeLevelSubjectId: e.target.value }))} disabled={!form.academicTermId}>
                  <option value="">اختر الربط المتاح</option>
                  {(subjectOptionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.gradeLevel.name} - {s.subject.name} ({s.academicYear.code})</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><ListOrdered className="h-3.5 w-3.5" /> تفاصيل التشغيل</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الحصص الأسبوعية *</label>
                <Input type="number" min={1} max={60} value={form.weeklyPeriods} onChange={(e) => setForm(p => ({ ...p, weeklyPeriods: e.target.value }))} placeholder="1" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">ترتيب العرض</label>
                <Input type="number" min={1} max={500} value={form.displayOrder} onChange={(e) => setForm(p => ({ ...p, displayOrder: e.target.value }))} placeholder="1" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-3">
             <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> حالة العرض</h4>
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">مادة مفعلة فصلياً (Active)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل ظهور المادة في سجلات الحضور والجدول</p>
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
