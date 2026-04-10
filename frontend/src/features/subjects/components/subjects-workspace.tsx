"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BookOpenText,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  BookMarked,
  Layout,
  Layers,
  Activity,
  CheckCircle2,
  Info,
  Settings2,
  Tag,
  Hash,
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
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useUpdateSubjectMutation,
} from "@/features/subjects/hooks/use-subjects-mutations";
import { useSubjectsQuery } from "@/features/subjects/hooks/use-subjects-query";
import type { SubjectCategory, SubjectListItem } from "@/lib/api/client";

type SubjectFormState = {
  code: string;
  name: string;
  shortName: string;
  category: SubjectCategory;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const CATEGORY_OPTIONS: SubjectCategory[] = [
  "CORE",
  "ELECTIVE",
  "LANGUAGE",
  "SCIENCE",
  "MATHEMATICS",
  "HUMANITIES",
  "ARTS",
  "SPORTS",
  "TECHNOLOGY",
  "OTHER",
];

const DEFAULT_FORM_STATE: SubjectFormState = {
  code: "",
  name: "",
  shortName: "",
  category: "CORE",
  isActive: true,
};

function toFormState(subject: SubjectListItem): SubjectFormState {
  return {
    code: subject.code,
    name: subject.name,
    shortName: subject.shortName ?? "",
    category: subject.category,
    isActive: subject.isActive,
  };
}

function categoryLabel(category: SubjectCategory): string {
  switch (category) {
    case "CORE": return "أساسية (Core)";
    case "ELECTIVE": return "اختيارية (Elective)";
    case "LANGUAGE": return "لغات (Language)";
    case "SCIENCE": return "علوم (Science)";
    case "MATHEMATICS": return "رياضيات (Math)";
    case "HUMANITIES": return "إنسانيات (Humanities)";
    case "ARTS": return "فنون (Arts)";
    case "SPORTS": return "رياضة (Sports)";
    case "TECHNOLOGY": return "تقنية (Tech)";
    case "OTHER": return "أخرى (Other)";
    default: return category;
  }
}

export function SubjectsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("subjects.create");
  const canUpdate = hasPermission("subjects.update");
  const canDelete = hasPermission("subjects.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<SubjectCategory | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ category: "all" as any, active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<SubjectFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const subjectsQuery = useSubjectsQuery({
    page, limit: PAGE_SIZE, search,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateSubjectMutation();
  const updateMutation = useUpdateSubjectMutation();
  const deleteMutation = useDeleteSubjectMutation();

  const records = React.useMemo(() => subjectsQuery.data?.data ?? [], [subjectsQuery.data?.data]);
  const pagination = subjectsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ category: categoryFilter, active: activeFilter });
  }, [activeFilter, categoryFilter, isFilterOpen]);

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

  const handleStartEdit = (item: SubjectListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim()) {
      setFormError("اسم المادة حقل مطلوب.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      shortName: form.shortName.trim() || undefined,
      category: form.category,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ subjectId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: SubjectListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف المادة ${item.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setCategoryFilter(filterDraft.category);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setCategoryFilter("all");
    setActiveFilter("all");
    setFilterDraft({ category: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      categoryFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, categoryFilter, searchInput]);

  return (
    <PageShell
      title="دليل المواد الدراسية"
      subtitle="إدارة وتصنيف المواد الأكاديمية والمهنية المعتمدة في الخطط التعليمية للمؤسسة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالاسم أو الكود..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void subjectsQuery.refetch()} disabled={subjectsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${subjectsQuery.isFetching ? "animate-spin" : ""}`} />
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
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">التصنيف الأكاديمي</label>
              <SelectField value={filterDraft.category} onChange={(e) => setFilterDraft(p => ({ ...p, category: e.target.value as any }))}>
                <option value="all">كل التصنيفات</option>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الحالة التشغيلية</label>
              <SelectField value={filterDraft.active} onChange={(e) => setFilterDraft(p => ({ ...p, active: e.target.value as any }))}>
                <option value="all">كل الحالات</option>
                <option value="active">المواد النشطة</option>
                <option value="inactive">المواد الموقوفة</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <BookMarked className="h-5 w-5 text-primary" />
                سجل المواد الأكاديمية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {subjectsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل البيانات...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                        <BookOpenText className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.name}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-muted-foreground border-border/70 group-hover:border-primary/30 transition-colors">
                             {item.code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Layers className="h-3.5 w-3.5" /> <span>{categoryLabel(item.category)}</span>
                          {item.shortName && (
                            <>
                              <span className="mx-1 opacity-30">•</span>
                              <Tag className="h-3.5 w-3.5" /> <span>{item.shortName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Active" : "Disabled"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 italic">
                          <Activity className="h-2.5 w-2.5 mr-1 inline" /> {item._count?.gradeLevelSubjects ?? 0} Levels
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

            {!subjectsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد مواد دراسية مسجلة تتوافق مع البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط العرض: وحدات مخرجات التعلم</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة مادة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير بيانات المادة" : "تعريف مادة دراسية جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> التعريف الأساسي</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">اسم المادة المعتمد *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: اللغة العربية والتربية الإسلامية" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الاسم المختصر</label>
                  <Input value={form.shortName} onChange={(e) => setForm(p => ({ ...p, shortName: e.target.value }))} placeholder="مثال: ARB" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">رمز المادة (Code)</label>
                  <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="SUBJ-001" disabled={isEditing} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> التصنيف والتوافق</h4>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase leading-none">التصنيف الأكاديمي *</label>
              <SelectField value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value as any }))}>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </SelectField>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> التحكم بالحالة</h4>
            <label className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 cursor-pointer transition-colors hover:bg-background">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">نشط (Active)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل المادة لإدراجها في الخطط الدراسية وجداول التوزيع</p>
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
