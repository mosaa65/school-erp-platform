"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BookOpenText,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Info,
  Layout,
  Layers,
  Activity,
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
import { generateAutoCode } from "@/lib/auto-code";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateHomeworkTypeMutation,
  useDeleteHomeworkTypeMutation,
  useUpdateHomeworkTypeMutation,
} from "@/features/assignments/homework-types/hooks/use-homework-types-mutations";
import { useHomeworkTypesQuery } from "@/features/assignments/homework-types/hooks/use-homework-types-query";
import type { HomeworkTypeListItem } from "@/lib/api/client";

type HomeworkTypeFormState = {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: HomeworkTypeFormState = {
  code: "",
  name: "",
  description: "",
  isSystem: false,
  isActive: true,
};

function createNewHomeworkTypeFormState(): HomeworkTypeFormState {
  return {
    ...DEFAULT_FORM_STATE,
    code: generateAutoCode("HOMEWORK", 40),
  };
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(item: HomeworkTypeListItem): HomeworkTypeFormState {
  return {
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    isSystem: item.isSystem,
    isActive: item.isActive,
  };
}

export function HomeworkTypesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("homework-types.create");
  const canUpdate = hasPermission("homework-types.update");
  const canDelete = hasPermission("homework-types.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [systemFilter, setSystemFilter] = React.useState<"all" | "system" | "custom">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    system: "all" as "all" | "system" | "custom",
    active: "all" as "all" | "active" | "inactive",
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<HomeworkTypeFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const homeworkTypesQuery = useHomeworkTypesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isSystem: systemFilter === "all" ? undefined : systemFilter === "system",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateHomeworkTypeMutation();
  const updateMutation = useUpdateHomeworkTypeMutation();
  const deleteMutation = useDeleteHomeworkTypeMutation();

  const records = React.useMemo(() => homeworkTypesQuery.data?.data ?? [], [homeworkTypesQuery.data?.data]);
  const pagination = homeworkTypesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ system: systemFilter, active: activeFilter });
  }, [activeFilter, isFilterOpen, systemFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setFormError(null);
    setEditingId(null);
    setForm(createNewHomeworkTypeFormState());
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: HomeworkTypeListItem) => {
    if (!canUpdate || item.isSystem) return;
    setFormError(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim()) {
      setFormError("الاسم مطلوب لتعريف نوع الواجب.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: toOptionalString(form.description),
      isSystem: form.isSystem,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ homeworkTypeId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: HomeworkTypeListItem) => {
    if (!canDelete || item.isSystem || !window.confirm(`تأكيد حذف نوع الواجب ${item.code}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setSystemFilter(filterDraft.system);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setSystemFilter("all");
    setActiveFilter("all");
    setFilterDraft({ system: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      systemFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, searchInput, systemFilter]);

  return (
    <PageShell
      title="أنواع الواجبات المدرسية"
      subtitle="تحديد التصنيفات المختلفة للواجبات المدرسية (مثل: منزلي، بحث، مشروع، تقرير) وأتمتة تصنيفها."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث في الأنواع..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void homeworkTypesQuery.refetch()}
              disabled={homeworkTypesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${homeworkTypesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر أنواع الواجبات"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">التصنيف</label>
              <SelectField value={filterDraft.system} onChange={(e) => setFilterDraft(p => ({ ...p, system: e.target.value as any }))}>
                <option value="all">كل الأنواع</option>
                <option value="system">أنواع النظام</option>
                <option value="custom">أنواع مخصصة</option>
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة</label>
              <SelectField value={filterDraft.active} onChange={(e) => setFilterDraft(p => ({ ...p, active: e.target.value as any }))}>
                <option value="all">كل الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">معطل فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Layers className="h-5 w-5 text-primary" />
                قائمة تصنيفات الواجبات
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              يتم استخدام هذه الأنواع لتنظيم الواجبات وتسهيل مراجعتها من قبل الطلاب وأولياء الأمور.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {homeworkTypesQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل تصنيفات الواجبات...
              </div>
            )}

            {!homeworkTypesQuery.isPending && records.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لا توجد أنواع واجبات مسجلة تتوافق مع البحث.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <Layout className="h-3 w-3" />
                        <span>كود: {item.code}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {item.isSystem ? (
                        <Badge variant="outline" className="h-5 text-[8px] font-bold bg-sky-50 text-sky-700 border-sky-200 gap-1">
                          <ShieldAlert className="h-2.5 w-2.5" /> نظام
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-5 text-[8px] font-bold bg-amber-50 text-amber-700 border-amber-200">مخصص</Badge>
                      )}
                      <Badge variant={item.isActive ? "default" : "secondary"} className="h-5 text-[8px] font-bold">
                        {item.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span className="font-bold uppercase tracking-tight">الوصف</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description || "لا يوجد وصف إضافي لهذا النوع."}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 pt-1 mt-auto">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      الواجبات: {item._count.homeworks}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg px-2 text-[11px] gap-1.5 font-bold"
                        onClick={() => handleStartEdit(item)}
                        disabled={!canUpdate || item.isSystem || updateMutation.isPending}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(item)}
                        disabled={!canDelete || item.isSystem || deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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
                  disabled={!pagination || pagination.page <= 1 || homeworkTypesQuery.isFetching}
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
                  disabled={!pagination || pagination.page >= pagination.totalPages || homeworkTypesQuery.isFetching}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Plus className="h-5 w-5" />}
        label="إضافة نوع"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل نوع الواجب" : "إضافة نوع واجب جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <BookOpenText className="h-3.5 w-3.5" /> اسم تصنيف الواجب *
            </label>
            <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: واجب منزلي أسبوعي" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">وصف التصنيف</label>
            <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="أضف وصفاً مختصراً لاستخدامه في التقارير" />
          </div>

          <div className="grid gap-3 pt-2">
            <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm transition-all hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`h-4 w-4 ${form.isSystem ? 'text-sky-500' : 'text-muted-foreground'}`} />
                <span className="font-bold">تعيين كنوع نظامي (محمي)</span>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={form.isSystem} onChange={(e) => setForm(p => ({ ...p, isSystem: e.target.checked }))} />
            </label>
            
            <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm transition-all hover:bg-muted/30">
              <span className="font-bold text-foreground">تفعيل النوع للاستخدام العام</span>
              <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
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
