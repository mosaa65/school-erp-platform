"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BadgeCheck,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Settings2,
  LayoutGrid,
  Calculator,
  CalendarDays,
  GraduationCap,
  Medal,
  Info,
  Activity,
  CheckCircle2,
  FileCode,
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
import { useGradingPoliciesQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-grading-policies-query";
import {
  useCreateGradingPolicyComponentMutation,
  useDeleteGradingPolicyComponentMutation,
  useUpdateGradingPolicyComponentMutation,
} from "@/features/evaluation-policies/grading-policy-components/hooks/use-grading-policy-components-mutations";
import { useGradingPolicyComponentsQuery } from "@/features/evaluation-policies/grading-policy-components/hooks/use-grading-policy-components-query";
import { formatNameCodeLabel } from "@/lib/option-labels";
import type {
  GradingComponentCalculationMode,
  GradingPolicyComponentListItem,
} from "@/lib/api/client";

const PAGE_SIZE = 12;

const CALCULATION_MODE_OPTIONS: GradingComponentCalculationMode[] = [
  "MANUAL", "AUTO_ATTENDANCE", "AUTO_HOMEWORK", "AUTO_EXAM",
];

const calculationModeLabel = (mode: GradingComponentCalculationMode): string => {
  switch (mode) {
    case "AUTO_ATTENDANCE": return "تلقائي: الحضور";
    case "AUTO_HOMEWORK": return "تلقائي: الواجبات";
    case "AUTO_EXAM": return "تلقائي: الاختبارات";
    default: return "يدوي";
  }
};

type FormState = {
  gradingPolicyId: string;
  code: string;
  name: string;
  maxScore: string;
  calculationMode: GradingComponentCalculationMode;
  includeInMonthly: boolean;
  includeInSemester: boolean;
  sortOrder: string;
  isActive: boolean;
};

const DEFAULT_FORM: FormState = {
  gradingPolicyId: "",
  code: "",
  name: "",
  maxScore: "",
  calculationMode: "MANUAL",
  includeInMonthly: true,
  includeInSemester: true,
  sortOrder: "1",
  isActive: true,
};

function toFormState(item: GradingPolicyComponentListItem): FormState {
  return {
    gradingPolicyId: item.gradingPolicyId,
    code: item.code ?? "",
    name: item.name ?? "",
    maxScore: String(item.maxScore ?? ""),
    calculationMode: item.calculationMode,
    includeInMonthly: item.includeInMonthly,
    includeInSemester: item.includeInSemester,
    sortOrder: String(item.sortOrder ?? 1),
    isActive: item.isActive,
  };
}

export function GradingPolicyComponentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grading-policy-components.create");
  const canUpdate = hasPermission("grading-policy-components.update");
  const canDelete = hasPermission("grading-policy-components.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selectedPolicyId, setSelectedPolicyId] = React.useState("all");
  const [filterDraft, setFilterDraft] = React.useState({ policy: "all" });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const policiesQuery = useGradingPoliciesQuery({ page: 1, limit: 300, isActive: true });
  const componentsQuery = useGradingPolicyComponentsQuery({
    page, limit: PAGE_SIZE, search,
    gradingPolicyId: selectedPolicyId === "all" ? undefined : selectedPolicyId,
  });

  const createMutation = useCreateGradingPolicyComponentMutation();
  const updateMutation = useUpdateGradingPolicyComponentMutation();
  const deleteMutation = useDeleteGradingPolicyComponentMutation();

  const records = React.useMemo(() => componentsQuery.data?.data ?? [], [componentsQuery.data?.data]);
  const pagination = componentsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ policy: selectedPolicyId });
  }, [isFilterOpen, selectedPolicyId]);

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

  const handleStartEdit = (item: GradingPolicyComponentListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gradingPolicyId || !form.name || !form.maxScore) {
      setFormError("الرجاء تحديد السياسة والاسم والدرجة القصوى.");
      return;
    }

    const payload = {
      gradingPolicyId: form.gradingPolicyId,
      name: form.name.trim(),
      maxScore: Number(form.maxScore),
      calculationMode: form.calculationMode,
      includeInMonthly: form.includeInMonthly,
      includeInSemester: form.includeInSemester,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ gradingPolicyComponentId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: GradingPolicyComponentListItem) => {
    if (!canDelete || !window.confirm(`حذف المكون ${item.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setSelectedPolicyId(filterDraft.policy);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setSelectedPolicyId("all");
    setFilterDraft({ policy: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, selectedPolicyId !== "all" ? 1 : 0].reduce((acc, v) => acc + v, 0);
  }, [searchInput, selectedPolicyId]);

  return (
    <PageShell
      title="مكونات سياسات التقييم"
      subtitle="تعريف البنود التفصيلية لسياسة الدرجات (مثل الحضور، الاختبارات القصيرة، البحوث) وتحديد طريقة حسابها وأوزانها."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث في المكونات..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void componentsQuery.refetch()} disabled={componentsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${componentsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="تصفية حسب السياسة"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none px-1">سياسة التقييم الأب</label>
            <SelectField value={filterDraft.policy} onChange={(e) => setFilterDraft({ policy: e.target.value })}>
              <option value="all">كل السياسات المتاحة</option>
              {(policiesQuery.data?.data ?? []).map(p => (
                <option key={p.id} value={p.id}>{p.subject.name} - {p.gradeLevel.name} ({p.academicYear.name})</option>
              ))}
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <LayoutGrid className="h-5 w-5 text-primary" />
                هيكل مكونات السياسة
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {componentsQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل بنود السياسة...
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <FileCode className="h-3 w-3" />
                        <span>{item.code || "بدون رمز"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-bold uppercase ${item.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                        {item.isActive ? "نشط" : "معطل"}
                      </Badge>
                      <Badge variant="outline" className="h-5 text-[8px] font-bold uppercase bg-background">
                        #{item.sortOrder} الترتيب
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-primary/70 font-bold leading-none">الوزن الأقصى</span>
                        <span className="text-2xl font-black text-primary mt-1">{item.maxScore}</span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center border border-primary/10">
                        <Medal className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground px-1">
                      <Calculator className="h-3.5 w-3.5" />
                      <span>{calculationModeLabel(item.calculationMode)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                      <Badge variant="secondary" className={`h-5 text-[8px] font-bold uppercase ${item.includeInMonthly ? "bg-amber-100/50 text-amber-700 border-amber-200" : "opacity-30"}`}>شهري</Badge>
                      <Badge variant="secondary" className={`h-5 text-[8px] font-bold uppercase ${item.includeInSemester ? "bg-sky-100/50 text-sky-700 border-sky-200" : "opacity-30"}`}>فصلي</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg border-border/60 hover:border-primary/50 font-bold"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate}
                    >
                      <PencilLine className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete}
                    >
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

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة مكون" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل مكون التقييم" : "رسم مكون سياسة جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> السياسة الأم</h4>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase leading-none">ربط بسياسة التقييم المعتمدة *</label>
              <SelectField value={form.gradingPolicyId} onChange={(e) => setForm(p => ({ ...p, gradingPolicyId: e.target.value }))} disabled={isEditing}>
                <option value="">اختر السياسة الأب من القائمة</option>
                {(policiesQuery.data?.data ?? []).map(p => (
                  <option key={p.id} value={p.id}>{p.subject.name} - {p.gradeLevel.name} - {p.academicYear.name}</option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> مواصفات المكون</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">اسم المكون (عربي) *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="حضور وحضور..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">رمز المكون (اختياري)</label>
                <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="ATTND-1" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الدرجة القصوى *</label>
                <Input type="number" step="0.01" value={form.maxScore} onChange={(e) => setForm(p => ({ ...p, maxScore: e.target.value }))} placeholder="10.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">طريقة الرصد/الحساب *</label>
                <SelectField value={form.calculationMode} onChange={(e) => setForm(p => ({ ...p, calculationMode: e.target.value as any }))}>
                  {CALCULATION_MODE_OPTIONS.map(m => <option key={m} value={m}>{calculationModeLabel(m)}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">ترتيب العرض</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm(p => ({ ...p, sortOrder: e.target.value }))} placeholder="1" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الحالة</label>
                <label className="flex items-center justify-between h-10 px-3 bg-background/50 rounded-xl border border-border/50">
                  <span className="text-xs font-bold">مكون نشط</span>
                  <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> قواعد الدمج</h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 p-3 rounded-2xl border border-border/50 bg-background/50 cursor-pointer transition-colors hover:bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">الدمج الشهري</span>
                  <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.includeInMonthly} onChange={(e) => setForm(p => ({ ...p, includeInMonthly: e.target.checked }))} />
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">هل يتم احتساب هذا المكون ضمن المحصلة الشهرية؟</p>
              </label>
              <label className="flex flex-col gap-2 p-3 rounded-2xl border border-border/50 bg-background/50 cursor-pointer transition-colors hover:bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">الدمج الفصلي</span>
                  <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.includeInSemester} onChange={(e) => setForm(p => ({ ...p, includeInSemester: e.target.checked }))} />
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">هل يدخل المكون مباشرة في الدرجة النهائية للفصل؟</p>
              </label>
            </div>
          </div>

          {!form.gradingPolicyId && !isEditing && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-3 text-xs text-amber-800 leading-relaxed">
              <Info className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <p>يجب اختيار سياسة الدرجات أولاً ليتمكن النظام من وضع المكون في سياقه الأكاديمي الصحيح.</p>
            </div>
          )}

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
