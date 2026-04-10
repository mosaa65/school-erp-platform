"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Tag,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  ShieldAlert,
  Activity,
  CheckCircle2,
  History,
  Lock,
  FileBadge,
  Settings2,
  Info,
  Layout,
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
  useCreateAnnualStatusMutation,
  useDeleteAnnualStatusMutation,
  useUpdateAnnualStatusMutation,
} from "@/features/results-decisions/annual-statuses/hooks/use-annual-statuses-mutations";
import { useAnnualStatusesQuery } from "@/features/results-decisions/annual-statuses/hooks/use-annual-statuses-query";
import type { AnnualStatusListItem } from "@/lib/api/client";

type FormState = {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  code: "",
  name: "",
  description: "",
  isSystem: false,
  isActive: true,
};

function toFormState(item: AnnualStatusListItem): FormState {
  return {
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    isSystem: item.isSystem,
    isActive: item.isActive,
  };
}

export function AnnualStatusesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("annual-statuses.create");
  const canUpdate = hasPermission("annual-statuses.update");
  const canDelete = hasPermission("annual-statuses.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [systemFilter, setSystemFilter] = React.useState<"all" | "system" | "custom">("all");
  const [filterDraft, setFilterDraft] = React.useState({ system: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const annualStatusesQuery = useAnnualStatusesQuery({
    page, limit: PAGE_SIZE, search,
    isSystem: systemFilter === "all" ? undefined : systemFilter === "system",
  });

  const createMutation = useCreateAnnualStatusMutation();
  const updateMutation = useUpdateAnnualStatusMutation();
  const deleteMutation = useDeleteAnnualStatusMutation();

  const records = React.useMemo(() => annualStatusesQuery.data?.data ?? [], [annualStatusesQuery.data?.data]);
  const pagination = annualStatusesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ system: systemFilter });
  }, [isFilterOpen, systemFilter]);

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

  const handleStartEdit = (item: AnnualStatusListItem) => {
    if (!canUpdate || item.isSystem) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name) {
      setFormError("الاسم مطلوب.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isSystem: form.isSystem,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ annualStatusId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: AnnualStatusListItem) => {
    if (!canDelete || item.isSystem || !window.confirm(`حذف الحالة ${item.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setSystemFilter(filterDraft.system);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setSystemFilter("all");
    setFilterDraft({ system: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, systemFilter !== "all" ? 1 : 0].reduce((acc, v) => acc + v, 0);
  }, [searchInput, systemFilter]);

  return (
    <PageShell
      title="حالات النتائج السنوية"
      subtitle="تعريف التصنيفات المعتمدة للنتائج النهائية (ناجح، راسب، دور ثاني) وإدارة الحالات النظامية للترفيع الصفي."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الحالة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void annualStatusesQuery.refetch()} disabled={annualStatusesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${annualStatusesQuery.isFetching ? "animate-spin" : ""}`} />
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
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">نوع الحالة</label>
            <SelectField value={filterDraft.system} onChange={(e) => setFilterDraft({ system: e.target.value as any })}>
              <option value="all">كل الحالات</option>
              <option value="system">حالات النظام (محمية)</option>
              <option value="custom">حالات مخصصة</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileBadge className="h-5 w-5 text-primary" />
                قاموس الحالات الأكاديمية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {annualStatusesQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل البيانات...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                        <Tag className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.name}</p>
                          {item.isSystem && <Badge variant="secondary" className="h-5 text-[8px] font-black uppercase bg-stone-100 text-stone-600 border-stone-200"><ShieldAlert className="h-2.5 w-2.5 mr-1" /> System</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.description || "لا يوجد وصف لهذه الحالة."}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Active" : "Disabled"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 italic">
                          <Layers className="h-2.5 w-2.5 mr-1 inline" /> {item._count.annualGrades} Records
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5" onClick={() => handleStartEdit(item)} disabled={!canUpdate || item.isSystem}>
                          <PencilLine className="h-3.5 w-3.5" /> تعديل
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)} disabled={!canDelete || item.isSystem}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!annualStatusesQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد حالات معرفة تتوافق مع البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">أنواع البيانات: حالات منطقية للترفيع الصفي</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة حالة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير حالة النتيجة" : "تعريف تصنيف سنوي جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> الهوية والترميز</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">اسم الحالة (عربي) *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: ناجح في الدور الأول" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الرمز المختصر</label>
                <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="مثال: PASS-01" disabled={isEditing} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> التوصيف الإجرائي</label>
            <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="أدخل تفاصيل حول كيفية استخدام هذه الحالة..." />
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> خيارات الحالة</h4>
            <div className="grid gap-4">
              <label className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 cursor-pointer transition-colors hover:bg-background">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">حالة نظامية محمية</span>
                  <p className="text-[10px] text-muted-foreground">عند التفعيل، لن يكون من الممكن حذف أو تعديل الرمز مستقبلاً</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.isSystem} onChange={(e) => setForm(p => ({ ...p, isSystem: e.target.checked }))} />
              </label>
              
              <label className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 cursor-pointer transition-colors hover:bg-background">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">نشط (Active)</span>
                  <p className="text-[10px] text-muted-foreground">تفعيل الحالة لاستخدامها في رصد الدرجات السنوية</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
              </label>
            </div>
          </div>

          {!form.isActive && isEditing && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-3 text-xs text-amber-800 leading-relaxed">
              <Info className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <p>تعطيل هذه الحالة قد يمنع صدور النتائج السنوية للطلاب الذين يحملون هذا التصنيف حالياً.</p>
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
