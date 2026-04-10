"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { useRouter } from "next/navigation";
import {
  Building2,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  Info,
  Building,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
import { Fab } from "@/components/ui/fab";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useBuildingOptionsQuery } from "@/features/sections/hooks/use-building-options-query";
import {
  useCreateClassroomMutation,
  useDeleteClassroomMutation,
  useUpdateClassroomMutation,
} from "@/features/classrooms/hooks/use-classrooms-mutations";
import { useClassroomsQuery } from "@/features/classrooms/hooks/use-classrooms-query";
import type { ClassroomListItem } from "@/lib/api/client";

type ClassroomFormState = {
  buildingLookupId: string;
  code: string;
  name: string;
  capacity: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: ClassroomFormState = {
  buildingLookupId: "",
  code: "",
  name: "",
  capacity: "",
  notes: "",
  isActive: true,
};

function toFormState(classroom: ClassroomListItem): ClassroomFormState {
  return {
    buildingLookupId: classroom.buildingLookupId === null ? "" : String(classroom.buildingLookupId),
    code: classroom.code,
    name: classroom.name,
    capacity: classroom.capacity === null ? "" : String(classroom.capacity),
    notes: classroom.notes ?? "",
    isActive: classroom.isActive,
  };
}

export function ClassroomsWorkspace() {
  const router = useRouter();
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("classrooms.create");
  const canUpdate = hasPermission("classrooms.update");
  const canDelete = hasPermission("classrooms.delete");
  const canReadBuildings = hasPermission("lookup-buildings.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [buildingFilter, setBuildingFilter] = React.useState<string>("all");
  const [filterDraft, setFilterDraft] = React.useState<{
    active: "all" | "active" | "inactive";
    buildingLookupId: string;
  }>({ active: "all", buildingLookupId: "all" });
  const [editingItem, setEditingItem] = React.useState<ClassroomListItem | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<ClassroomFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const classroomsQuery = useClassroomsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    buildingLookupId: buildingFilter === "all" ? undefined : Number(buildingFilter),
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const buildingsQuery = useBuildingOptionsQuery("classrooms");
  const buildings = React.useMemo(() => buildingsQuery.data ?? [], [buildingsQuery.data]);

  const classrooms = React.useMemo(() => classroomsQuery.data?.data ?? [], [classroomsQuery.data?.data]);
  const pagination = classroomsQuery.data?.pagination;
  const isEditing = editingItem !== null;

  const createMutation = useCreateClassroomMutation();
  const updateMutation = useUpdateClassroomMutation();
  const deleteMutation = useDeleteClassroomMutation();

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 350, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({
      active: activeFilter,
      buildingLookupId: buildingFilter,
    });
  }, [activeFilter, buildingFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingItem(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setFormError(null);
    setEditingItem(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.name.trim()) {
      setFormError("الاسم حقل مطلوب.");
      return false;
    }
    return true;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formState.name.trim(),
      capacity: formState.capacity.trim() ? Number(formState.capacity) : undefined,
      notes: formState.notes.trim() || undefined,
      isActive: formState.isActive,
      buildingLookupId: formState.buildingLookupId ? Number(formState.buildingLookupId) : null,
    };

    if (isEditing && editingItem) {
      updateMutation.mutate(
        { classroomId: editingItem.id, payload },
        { onSuccess: resetForm }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: resetForm });
    }
  };

  const handleStartEdit = (item: ClassroomListItem) => {
    if (!canUpdate) return;
    setFormError(null);
    setEditingItem(item);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleDelete = (item: ClassroomListItem) => {
    if (!canDelete) return;
    const confirmed = window.confirm(`تأكيد حذف الفصل ${item.name}؟`);
    if (!confirmed) return;
    deleteMutation.mutate(item.id);
  };

  const openClassroomAssignments = (item: ClassroomListItem) => {
    router.push(`/app/section-classroom-assignments?classroomId=${item.id}`);
  };

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft.active);
    setBuildingFilter(filterDraft.buildingLookupId);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setBuildingFilter("all");
    setFilterDraft({ active: "all", buildingLookupId: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
      buildingFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, buildingFilter, searchInput]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageShell
      title="القاعات والفصول الدراسية"
      subtitle="إدارة فضاءات التعلم وتوزيع القاعات حسب المباني والسعة الاستيعابية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الفصل..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void classroomsQuery.refetch()}
              disabled={classroomsQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${classroomsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر القاعات"
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">المبنى</label>
              <SelectField
                value={filterDraft.buildingLookupId}
                onChange={(e) => setFilterDraft((p) => ({ ...p, buildingLookupId: e.target.value }))}
                disabled={!canReadBuildings}
              >
                <option value="all">كل المباني</option>
                {buildings.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.nameAr || b.name || `مبنى ${b.id}`}</option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة</label>
              <SelectField
                value={filterDraft.active}
                onChange={(e) => setFilterDraft((p) => ({ ...p, active: e.target.value as any }))}
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">غير نشط فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Building2 className="h-5 w-5 text-primary" />
                سجل القاعات
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              استعراض الفصول الدراسية وتتبع توزيع الشعب الأكاديمية عليها.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {classroomsQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                جارٍ تحميل بيانات القاعات...
              </div>
            )}

            {!classroomsQuery.isPending && classrooms.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لم يتم العثور على قاعات تطابق البحث.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classrooms.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Building className="h-3 w-3" />
                        <span>{item.building?.nameAr || "بدون مبنى"}</span>
                      </div>
                    </div>
                    <Badge variant={item.isActive ? "default" : "secondary"} className={`h-5 text-[9px] uppercase tracking-tighter ${item.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                      {item.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground leading-none font-bold">السعة</span>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                        <Users className="h-3.5 w-3.5 text-primary/70" />
                        <span>{item.capacity || "-"}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground leading-none font-bold">الشعب</span>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600/70" />
                        <span>{item.activeAssignmentsCount}</span>
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="italic">{item.notes}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 mt-auto border-t border-border/50 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg font-bold"
                      onClick={() => openClassroomAssignments(item)}
                    >
                      توزيع
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-2"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate || updateMutation.isPending}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
                  disabled={!pagination || pagination.page <= 1 || classroomsQuery.isFetching}
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
                  disabled={!pagination || pagination.page >= pagination.totalPages || classroomsQuery.isFetching}
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
        label="إضافة قاعة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetForm}
        title={isEditing ? "تعديل بيانات القاعة" : "إضافة قاعة جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" /> المبنى المرتبط
            </label>
            <SelectField
              value={formState.buildingLookupId}
              onChange={(e) => setFormState((p) => ({ ...p, buildingLookupId: e.target.value }))}
              disabled={!canReadBuildings}
            >
              <option value="">بدون مبنى</option>
              {buildings.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.nameAr || b.name || `مبنى ${b.id}`}</option>
              ))}
            </SelectField>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">الاسم المعتمد للقاعة *</label>
            <Input
              value={formState.name}
              onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
              placeholder="مثال: فصل الصف الأول الابتدائي (1)"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> السعة الاستيعابية
              </label>
              <Input
                type="number"
                min="1"
                value={formState.capacity}
                onChange={(e) => setFormState((p) => ({ ...p, capacity: e.target.value }))}
                placeholder="مثال: 30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">كود القاعة</label>
              <Input
                value={formState.code}
                onChange={(e) => setFormState((p) => ({ ...p, code: e.target.value }))}
                placeholder="مثال: RM-01"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" /> ملاحظات أو تجهيزات خاصة
            </label>
            <Input
              value={formState.notes}
              onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))}
              placeholder="مثال: يحتوي على جهاز عرض ذكي"
            />
          </div>

          <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
            <span className="font-bold">تفعيل القاعة للاستخدام</span>
            <input
              type="checkbox"
              className="h-5 w-5 rounded-lg border-primary/30 text-primary focus:ring-primary"
              checked={formState.isActive}
              onChange={(e) => setFormState((p) => ({ ...p, isActive: e.target.checked }))}
            />
          </label>

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
