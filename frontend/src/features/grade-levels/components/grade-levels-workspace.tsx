"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Layers3,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Hash,
  BookOpen,
  Activity,
  ListOrdered,
  Layout,
  Target,
  Settings2,
  Boxes,
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
  useCreateGradeLevelMutation,
  useDeleteGradeLevelMutation,
  useUpdateGradeLevelMutation,
} from "@/features/grade-levels/hooks/use-grade-levels-mutations";
import { useGradeLevelsQuery } from "@/features/grade-levels/hooks/use-grade-levels-query";
import type { GradeLevelListItem, GradeStage } from "@/lib/api/client";

type GradeLevelFormState = {
  code: string;
  name: string;
  stage: GradeStage;
  sequence: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: GradeLevelFormState = {
  code: "",
  name: "",
  stage: "PRIMARY",
  sequence: "1",
  isActive: true,
};

const STAGE_OPTIONS: GradeStage[] = ["PRE_SCHOOL", "PRIMARY", "MIDDLE", "HIGH", "OTHER"];

const STAGE_LABELS: Record<GradeStage, string> = {
  PRE_SCHOOL: "ما قبل المدرسة (K-Level)",
  PRIMARY: "المرحلة الابتدائية (Primary)",
  MIDDLE: "المرحلة الإعدادية (Middle)",
  HIGH: "المرحلة الثانوية (High)",
  OTHER: "تصنيف آخر (Other)",
};

function toFormState(gradeLevel: GradeLevelListItem): GradeLevelFormState {
  return {
    code: gradeLevel.code,
    name: gradeLevel.name,
    stage: gradeLevel.stage,
    sequence: String(gradeLevel.sequence),
    isActive: gradeLevel.isActive,
  };
}

export function GradeLevelsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grade-levels.create");
  const canUpdate = hasPermission("grade-levels.update");
  const canDelete = hasPermission("grade-levels.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<GradeStage | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ stage: "all" as any, active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<GradeLevelFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const gradeLevelsQuery = useGradeLevelsQuery({
    page, limit: PAGE_SIZE, search,
    stage: stageFilter === "all" ? undefined : stageFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateGradeLevelMutation();
  const updateMutation = useUpdateGradeLevelMutation();
  const deleteMutation = useDeleteGradeLevelMutation();

  const records = React.useMemo(() => gradeLevelsQuery.data?.data ?? [], [gradeLevelsQuery.data?.data]);
  const pagination = gradeLevelsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ stage: stageFilter, active: activeFilter });
  }, [activeFilter, isFilterOpen, stageFilter]);

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

  const handleStartEdit = (item: GradeLevelListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim()) {
      setFormError("اسم المستوى مطلوب.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      stage: form.stage,
      sequence: Number(form.sequence) || 1,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ gradeLevelId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: GradeLevelListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف المستوى التعليمي ${item.name}؟ سيؤدي ذلك لحذف الارتباطات التابعة.`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setStageFilter(filterDraft.stage);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStageFilter("all");
    setActiveFilter("all");
    setFilterDraft({ stage: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0, stageFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, searchInput, stageFilter]);

  return (
    <PageShell
      title="المستويات الأكاديمية"
      subtitle="تعريف سلم الدرجات التعليمي، ترتيب الصفوف، وتصنيف المرحل التدريسية المعتمدة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الصف أو الكود..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void gradeLevelsQuery.refetch()} disabled={gradeLevelsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${gradeLevelsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر المستويات التدريسية"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">المرحلة التعليمية</label>
              <SelectField value={filterDraft.stage} onChange={(e) => setFilterDraft(p => ({ ...p, stage: e.target.value as any }))}>
                <option value="all">كل المراحل</option>
                {STAGE_OPTIONS.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الحالة التشغيلية</label>
              <SelectField value={filterDraft.active} onChange={(e) => setFilterDraft(p => ({ ...p, active: e.target.value as any }))}>
                <option value="all">كل الحالات</option>
                <option value="active">مستويات نشطة</option>
                <option value="inactive">مستويات مؤرشفة</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Layers3 className="h-5 w-5 text-primary" />
                سجل الصفوف والمراحل
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {gradeLevelsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل البيانات...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors shadow-sm">
                        <Boxes className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.name}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-muted-foreground border-border/70">
                             {item.code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Target className="h-3.5 w-3.5" /> <span>{STAGE_LABELS[item.stage]}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Hash className="h-3.5 w-3.5" /> <span>Sequence: {item.sequence}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Active Level" : "Archived"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 italic text-stone-500 bg-stone-50">
                          <Layout className="h-2.5 w-2.5 mr-1 inline" /> {item.sections.length} Sections
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
                  
                  {item.sections.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                       {item.sections.map(sec => (
                          <Badge key={sec.id} variant="outline" className="px-2 py-0 h-4 text-[7px] border-emerald-500/20 text-emerald-600 bg-emerald-500/5">{sec.name}</Badge>
                       ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!gradeLevelsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد صفوف مسجلة تتوافق مع البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط التدرج: تنظيم الهياكل التعليمية</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة صف" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير بيانات المستوى" : "تعريف مستوى تعليمي جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> الهوية الأكاديمية</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الاسم المعتمد للمستوى *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: الصف التاسع" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">كود النظام</label>
                  <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="G-9" disabled={isEditing} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1 flex items-center gap-1.5"><ListOrdered className="h-3.5 w-3.5" /> التسلسل الدراسي</label>
                  <Input type="number" value={form.sequence} onChange={(e) => setForm(p => ({ ...p, sequence: e.target.value }))} placeholder="9" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> التصنيف المرحلي</h4>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المرحلة التعليمية الكبرى *</label>
              <SelectField value={form.stage} onChange={(e) => setForm(p => ({ ...p, stage: e.target.value as any }))}>
                {STAGE_OPTIONS.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </SelectField>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">مستوى نشط (Active)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل المستوى لاستقبال الشعب والطلاب</p>
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
