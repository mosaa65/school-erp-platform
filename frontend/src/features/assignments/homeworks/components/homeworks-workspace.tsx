"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ClipboardList,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  UsersRound,
  CalendarDays,
  CheckCircle2,
  BookOpen,
  Layout,
  Clock,
  Info,
  Layers,
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
  useCreateHomeworkMutation,
  useDeleteHomeworkMutation,
  usePopulateHomeworkStudentsMutation,
  useUpdateHomeworkMutation,
} from "@/features/assignments/homeworks/hooks/use-homeworks-mutations";
import { useHomeworksQuery } from "@/features/assignments/homeworks/hooks/use-homeworks-query";
import { useAcademicYearOptionsQuery } from "@/features/assignments/homeworks/hooks/use-academic-year-options-query";
import { useAcademicTermOptionsQuery } from "@/features/assignments/homeworks/hooks/use-academic-term-options-query";
import { useSectionOptionsQuery } from "@/features/assignments/homeworks/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/assignments/homeworks/hooks/use-subject-options-query";
import { useHomeworkTypeOptionsQuery } from "@/features/assignments/homeworks/hooks/use-homework-type-options-query";
import type { HomeworkListItem } from "@/lib/api/client";
import {
  formatNameCodeLabel,
  formatSectionWithGradeLabel,
} from "@/lib/option-labels";

type HomeworkFormState = {
  academicYearId: string;
  academicTermId: string;
  sectionId: string;
  subjectId: string;
  homeworkTypeId: string;
  title: string;
  homeworkDate: string;
  dueDate: string;
  maxScore: string;
  content: string;
  notes: string;
  autoPopulateStudents: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: HomeworkFormState = {
  academicYearId: "",
  academicTermId: "",
  sectionId: "",
  subjectId: "",
  homeworkTypeId: "",
  title: "",
  homeworkDate: "",
  dueDate: "",
  maxScore: "",
  content: "",
  notes: "",
  autoPopulateStudents: true,
  isActive: true,
};

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultFormState(): HomeworkFormState {
  const homeworkDate = toLocalDateInput(new Date());
  return {
    ...DEFAULT_FORM_STATE,
    homeworkDate,
    dueDate: homeworkDate,
  };
}

function toDateInput(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toDateIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function toFormState(item: HomeworkListItem): HomeworkFormState {
  return {
    academicYearId: item.academicYearId,
    academicTermId: item.academicTermId,
    sectionId: item.sectionId,
    subjectId: item.subjectId,
    homeworkTypeId: item.homeworkTypeId,
    title: item.title,
    homeworkDate: toDateInput(item.homeworkDate),
    dueDate: toDateInput(item.dueDate),
    maxScore: String(item.maxScore),
    content: item.content ?? "",
    notes: item.notes ?? "",
    autoPopulateStudents: true,
    isActive: item.isActive,
  };
}

export function HomeworksWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("homeworks.create");
  const canUpdate = hasPermission("homeworks.update");
  const canDelete = hasPermission("homeworks.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [termFilter, setTermFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", term: "all", section: "all", subject: "all", active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<HomeworkFormState>(createDefaultFormState());
  const [formError, setFormError] = React.useState<string | null>(null);

  const homeworksQuery = useHomeworksQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const yearsQuery = useAcademicYearOptionsQuery();
  const termsQuery = useAcademicTermOptionsQuery(form.academicYearId || (yearFilter === "all" ? undefined : yearFilter));
  const filterTermsQuery = useAcademicTermOptionsQuery(filterDraft.year === "all" ? undefined : filterDraft.year);
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const typesQuery = useHomeworkTypeOptionsQuery();

  const createMutation = useCreateHomeworkMutation();
  const updateMutation = useUpdateHomeworkMutation();
  const populateMutation = usePopulateHomeworkStudentsMutation();
  const deleteMutation = useDeleteHomeworkMutation();

  const records = React.useMemo(() => homeworksQuery.data?.data ?? [], [homeworksQuery.data?.data]);
  const pagination = homeworksQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ year: yearFilter, term: termFilter, section: sectionFilter, subject: subjectFilter, active: activeFilter });
  }, [activeFilter, isFilterOpen, sectionFilter, subjectFilter, termFilter, yearFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(createDefaultFormState());
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(createDefaultFormState());
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: HomeworkListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.sectionId || !form.subjectId || !form.homeworkTypeId) {
      setFormError("العنوان، الشعبة، المادة، ونوع الواجب حقول مطلوبة.");
      return;
    }

    const payload = {
      academicYearId: form.academicYearId,
      academicTermId: form.academicTermId,
      sectionId: form.sectionId,
      subjectId: form.subjectId,
      homeworkTypeId: form.homeworkTypeId,
      title: form.title.trim(),
      content: form.content.trim() || undefined,
      homeworkDate: toDateIso(form.homeworkDate),
      dueDate: form.dueDate ? toDateIso(form.dueDate) : undefined,
      maxScore: Number(form.maxScore) || 0,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ homeworkId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate({ ...payload, autoPopulateStudents: form.autoPopulateStudents }, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: HomeworkListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف الواجب ${item.title}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const handlePopulate = (item: HomeworkListItem) => {
    if (!canUpdate) return;
    populateMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setTermFilter(filterDraft.term);
    setSectionFilter(filterDraft.section);
    setSubjectFilter(filterDraft.subject);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setTermFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setActiveFilter("all");
    setFilterDraft({ year: "all", term: "all", section: "all", subject: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      termFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, searchInput, sectionFilter, subjectFilter, termFilter, yearFilter]);

  return (
    <PageShell
      title="إدارة الواجبات المدرسية"
      subtitle="إعداد وتكليف الطلاب بالواجبات المنزلية، متابعة تواريخ التسليم، وتحديد معايير التقييم."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث في الواجبات..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void homeworksQuery.refetch()} disabled={homeworksQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${homeworksQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الواجبات"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">السنة</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value, term: "all" }))}>
                <option value="all">كل السنوات</option>
                {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">الفصل</label>
              <SelectField value={filterDraft.term} onChange={(e) => setFilterDraft(p => ({ ...p, term: e.target.value }))}>
                <option value="all">كل الفصول</option>
                {(filterTermsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <ClipboardList className="h-5 w-5 text-primary" />
                سجل التكليفات
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {homeworksQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل الواجبات...
              </div>
            )}

            {!homeworksQuery.isPending && records.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لا توجد واجبات مسجلة للفلاتر الحالية.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <CalendarDays className="h-3 w-3" />
                        <span>{item.academicTerm.name} - {item.section.name}</span>
                      </div>
                    </div>
                    <Badge variant={item.isActive ? "default" : "secondary"} className="h-5 text-[8px] font-bold uppercase">
                      {item.isActive ? "فعال" : "موقف"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold">المادة</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                        <BookOpen className="h-3.5 w-3.5 text-primary/70" />
                        <span>{item.subject.name}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold">الاستحقاق</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Clock className="h-3.5 w-3.5 text-amber-600/70" />
                        <span>{toDateInput(item.dueDate) || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
                    <Badge variant="outline" className="h-5 text-[9px] bg-slate-50 border-slate-200">الدرجة: {item.maxScore}</Badge>
                    <Badge variant="outline" className="h-5 text-[9px] bg-slate-50 border-slate-200">الطلاب: {item._count.studentHomeworks}</Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/10">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg font-bold" onClick={() => handleStartEdit(item)} disabled={!canUpdate}>
                      <PencilLine className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg px-2 text-primary hover:bg-primary/10" onClick={() => handlePopulate(item)} disabled={!canUpdate}>
                      <UsersRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)} disabled={!canDelete}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-6 mt-2">
              <p className="text-xs text-muted-foreground">صفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong></p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-2xl" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-2xl" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة واجب" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet open={isFormOpen} onClose={resetFormState} title={isEditing ? "تعديل الواجب" : "إضافة واجب جديد"} isEditing={isEditing} isSubmitting={isSubmitting} onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> النطاق الأكاديمي</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">السنة</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value, academicTermId: "" }))}>
                  <option value="">اختر السنة</option>
                  {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الفصل</label>
                <SelectField value={form.academicTermId} onChange={(e) => setForm(p => ({ ...p, academicTermId: e.target.value }))}>
                  <option value="">اختر الفصل</option>
                  {(termsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الشعبة</label>
                <SelectField value={form.sectionId} onChange={(e) => setForm(p => ({ ...p, sectionId: e.target.value }))}>
                  <option value="">اختر الشعبة</option>
                  {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المادة</label>
                <SelectField value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))}>
                  <option value="">اختر المادة</option>
                  {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> تفاصيل الواجب</label>
            <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="عنوان الواجب..." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ الواجب</label>
              <Input type="date" value={form.homeworkDate} onChange={(e) => setForm(p => ({ ...p, homeworkDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ التسليم</label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>

          {formError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-bold text-center">{formError}</div>}
        </div>
      </CrudFormSheet>
    </PageShell>
  );
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" {
  return status === "active" ? "default" : "secondary";
}
