"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { useRouter } from "next/navigation";
import {
  Layers2,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  GraduationCap,
  Building,
  DoorOpen,
  Users,
  Activity,
  Shuffle,
  Info,
  Layers,
  Layout,
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
  useCreateSectionMutation,
  useDeleteSectionMutation,
  useUpdateSectionMutation,
} from "@/features/sections/hooks/use-sections-mutations";
import { useBuildingOptionsQuery } from "@/features/sections/hooks/use-building-options-query";
import { useSectionsQuery } from "@/features/sections/hooks/use-sections-query";
import { useGradeLevelOptionsQuery } from "@/features/sections/hooks/use-grade-level-options-query";
import type { SectionListItem } from "@/lib/api/client";

type SectionFormState = {
  gradeLevelId: string;
  buildingLookupId: string;
  code: string;
  name: string;
  capacity: string;
  roomLabel: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: SectionFormState = {
  gradeLevelId: "",
  buildingLookupId: "",
  code: "",
  name: "",
  capacity: "",
  roomLabel: "",
  isActive: true,
};

function toFormState(section: SectionListItem): SectionFormState {
  return {
    gradeLevelId: section.gradeLevelId,
    buildingLookupId: section.buildingLookupId === null ? "" : String(section.buildingLookupId),
    code: section.code,
    name: section.name,
    capacity: section.capacity === null ? "" : String(section.capacity),
    roomLabel: section.roomLabel ?? "",
    isActive: section.isActive,
  };
}

function translateStage(stage: string): string {
  const labels: Record<string, string> = {
    KINDERGARTEN: "رياض الأطفال",
    PRIMARY: "ابتدائي",
    MIDDLE: "إعدادي/متوسط",
    SECONDARY: "ثانوي",
  };
  return labels[stage] ?? stage;
}

export function SectionsWorkspace() {
  const router = useRouter();
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("sections.create");
  const canUpdate = hasPermission("sections.update");
  const canDelete = hasPermission("sections.delete");
  const canReadGradeLevels = hasPermission("grade-levels.read");
  const canReadBuildings = hasPermission("lookup-buildings.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [gradeLevelFilter, setGradeLevelFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ gradeLevel: "all", active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<SectionFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const sectionsQuery = useSectionsQuery({
    page, limit: PAGE_SIZE, search,
    gradeLevelId: gradeLevelFilter === "all" ? undefined : gradeLevelFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const gradeLevelOptionsQuery = useGradeLevelOptionsQuery();
  const buildingOptionsQuery = useBuildingOptionsQuery();

  const createMutation = useCreateSectionMutation();
  const updateMutation = useUpdateSectionMutation();
  const deleteMutation = useDeleteSectionMutation();

  const records = React.useMemo(() => sectionsQuery.data?.data ?? [], [sectionsQuery.data?.data]);
  const pagination = sectionsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ gradeLevel: gradeLevelFilter, active: activeFilter });
  }, [activeFilter, gradeLevelFilter, isFilterOpen]);

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

  const handleStartEdit = (item: SectionListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gradeLevelId || !form.name.trim()) {
      setFormError("المرحلة الدراسية واسم الشعبة حقول مطلوبة.");
      return;
    }

    const payload = {
      gradeLevelId: form.gradeLevelId,
      buildingLookupId: form.buildingLookupId ? Number(form.buildingLookupId) : undefined,
      name: form.name.trim(),
      capacity: form.capacity.trim() ? Number(form.capacity) : undefined,
      roomLabel: form.roomLabel.trim() || undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ sectionId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: SectionListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف الشعبة ${item.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const openSectionClassroomAssignments = (item: SectionListItem) => {
    const params = new URLSearchParams({ sectionId: item.id, gradeLevelId: item.gradeLevelId, mode: "create" });
    router.push(`/app/section-classroom-assignments?${params.toString()}`);
  };

  const applyFilters = () => {
    setPage(1);
    setGradeLevelFilter(filterDraft.gradeLevel);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setGradeLevelFilter("all");
    setActiveFilter("all");
    setFilterDraft({ gradeLevel: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      gradeLevelFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, gradeLevelFilter, searchInput]);

  return (
    <PageShell
      title="إدارة الشعب الأكاديمية"
      subtitle="تنظيم الفصول الدراسية وتوزيعها حسب المستويات التعليمية والمباني المتاحة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الشعبة أو الصف..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void sectionsQuery.refetch()} disabled={sectionsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${sectionsQuery.isFetching ? "animate-spin" : ""}`} />
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
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">المرحلة الدراسية</label>
              <SelectField value={filterDraft.gradeLevel} onChange={(e) => setFilterDraft(p => ({ ...p, gradeLevel: e.target.value }))}>
                <option value="all">كل المراحل</option>
                {(gradeLevelOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الحالة</label>
              <SelectField value={filterDraft.active} onChange={(e) => setFilterDraft(p => ({ ...p, active: e.target.value as any }))}>
                <option value="all">كل الحالات</option>
                <option value="active">الشعب النشطة</option>
                <option value="inactive">الشعب الموقوفة</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Layers2 className="h-5 w-5 text-primary" />
                سجل الشعب والفصول
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {sectionsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل البيانات...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-secondary/5 border border-secondary/10 group-hover:bg-secondary/10 transition-colors">
                        <DoorOpen className="h-6 w-6 text-secondary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.name}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-muted-foreground border-border/70">
                             {item.code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <GraduationCap className="h-3.5 w-3.5" /> <span>{item.gradeLevel.name}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Badge variant="outline" className="h-4 text-[7px] border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
                            {translateStage(item.gradeLevel.stage)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Active" : "Disabled"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 italic text-stone-500">
                          <Users className="h-2.5 w-2.5 mr-1 inline" /> {item.capacity || "-"} Capacity
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5" onClick={() => openSectionClassroomAssignments(item)}>
                          <Shuffle className="h-3.5 w-3.5" /> ربط الغرف
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-2" onClick={() => handleStartEdit(item)} disabled={!canUpdate}>
                          <PencilLine className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)} disabled={!canDelete}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {item.building && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/40 bg-background/50 text-[10px] font-bold text-muted-foreground group-hover:bg-background transition-colors w-fit">
                      <Building className="h-3 w-3 text-primary/60" />
                      <span>{item.building.nameAr || item.building.name}</span>
                      {item.roomLabel && (
                        <>
                          <span className="mx-1 opacity-40">|</span>
                          <Layout className="h-3 w-3 text-emerald-600/60" />
                          <span>الغرفة: {item.roomLabel}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!sectionsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد شعب مسجلة تتوافق مع البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط العرض: توزيع الكتل الدراسية</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة شعبة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير بيانات الشعبة" : "تعريف شعبة أكاديمية جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> الهيكل الأكاديمي</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">المرحلة الدراسية / المستوى *</label>
                <SelectField value={form.gradeLevelId} onChange={(e) => setForm(p => ({ ...p, gradeLevelId: e.target.value }))}>
                  <option value="">اختر المستوى</option>
                  {(gradeLevelOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الاسم المعتمد للشعبة *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: شعبة أ / 101" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Building className="h-3.5 w-3.5" /> التخصيص والموقع</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المبنى المرتبط</label>
                <SelectField value={form.buildingLookupId} onChange={(e) => setForm(p => ({ ...p, buildingLookupId: e.target.value }))}>
                  <option value="">بدون مبنى محدد</option>
                  {(buildingOptionsQuery.data ?? []).map(b => (
                    <option key={b.id} value={String(b.id)}>{b.nameAr || b.name || `مبنى ${b.id}`}</option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">رقم الغرفة / القاعة</label>
                <Input value={form.roomLabel} onChange={(e) => setForm(p => ({ ...p, roomLabel: e.target.value }))} placeholder="مثال: RM-202" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> المعايير التشغيلية</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> السعة الاستيعابية</label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">كود الشعبة</label>
                <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="SEC-001" disabled={isEditing} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">تفعيل الشعبة (Active)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل الشعبة لاستقبال الطلاب وتوزيع الجداول الدراسية</p>
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
